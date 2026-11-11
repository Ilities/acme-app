import { and, asc, eq } from 'drizzle-orm';
import { findBusyIntervals } from '../appointments/repository.js';
import { normalizeEmail } from '../auth/users.js';
import { findClinicBySlug, parseOpenDays } from '../clinics/repository.js';
import { db } from '../db/client.js';
import {
  appointments,
  customers,
  depositPayments,
  services,
  staffMembers,
  type Clinic,
  type Service,
} from '../db/schema.js';
import { HttpError, notFound } from '../http/errors.js';
import { addDays, formatDateTime, formatTime, toLocalDateString, zonedTimeToUtc } from '../lib/dates.js';
import { mailer } from '../mail/mailer.js';
import { bookingConfirmationEmail } from '../mail/templates.js';
import { CURRENCY } from '../payments/plans.js';
import { DECLINE_MESSAGES, type CardDetails } from '../payments/provider.js';
import { computeSlots, type Slot } from './availability.js';
import { chargeDeposit, depositDueFor, markDepositPaid } from './deposits.js';

export interface BookingRequest {
  serviceId: number;
  staffId?: number;
  startsAt: Date;
  customer: { name: string; email: string; phone?: string | null };
  card?: CardDetails;
}

export interface BookingConfirmation {
  appointmentId: number;
  clinicName: string;
  serviceName: string;
  staffName: string;
  when: string;
  depositPaidCents: number | null;
}

export function getBookableClinic(slug: string): Clinic {
  const clinic = findClinicBySlug(slug);
  if (!clinic || !clinic.bookingEnabled) {
    throw notFound('Clinic');
  }
  return clinic;
}

function activeServices(clinicId: number) {
  return db
    .select()
    .from(services)
    .where(and(eq(services.clinicId, clinicId), eq(services.active, true)))
    .orderBy(asc(services.name))
    .all();
}

function activeStaff(clinicId: number) {
  return db
    .select()
    .from(staffMembers)
    .where(and(eq(staffMembers.clinicId, clinicId), eq(staffMembers.active, true)))
    .orderBy(asc(staffMembers.name))
    .all();
}

export function getBookingPage(clinic: Clinic) {
  return {
    clinic: {
      name: clinic.name,
      slug: clinic.slug,
      city: clinic.city,
      addressLine: clinic.addressLine,
      phone: clinic.phone,
      timezone: clinic.timezone,
      opensAt: clinic.opensAt,
      closesAt: clinic.closesAt,
      openDays: parseOpenDays(clinic.openDays),
    },
    services: activeServices(clinic.id).map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      durationMinutes: service.durationMinutes,
      priceCents: service.priceCents,
      deposit: depositDueFor(clinic, service),
    })),
    staff: activeStaff(clinic.id).map((member) => ({
      id: member.id,
      name: member.name,
      title: member.title,
    })),
  };
}

function findBookableService(clinic: Clinic, serviceId: number): Service {
  const service = activeServices(clinic.id).find((candidate) => candidate.id === serviceId);
  if (!service) {
    throw new HttpError(400, 'That service is not available for online booking');
  }
  return service;
}

function slotsFor(clinic: Clinic, service: Service, date: string, staffId?: number): Slot[] {
  const staffIds = activeStaff(clinic.id)
    .map((member) => member.id)
    .filter((id) => staffId === undefined || id === staffId);

  const dayStart = zonedTimeToUtc(date, '00:00', clinic.timezone);
  const dayEnd = zonedTimeToUtc(addDays(date, 1), '00:00', clinic.timezone);

  return computeSlots({
    date,
    timeZone: clinic.timezone,
    opensAt: clinic.opensAt,
    closesAt: clinic.closesAt,
    openDays: parseOpenDays(clinic.openDays),
    durationMinutes: service.durationMinutes,
    staffIds,
    busy: findBusyIntervals(clinic.id, dayStart, dayEnd),
    now: new Date(),
  });
}

export function getAvailability(
  clinic: Clinic,
  query: { serviceId: number; date: string; staffId?: number },
) {
  const service = findBookableService(clinic, query.serviceId);
  return slotsFor(clinic, service, query.date, query.staffId).map((slot) => ({
    startsAt: slot.startsAt.toISOString(),
    label: formatTime(slot.startsAt, clinic.timezone),
    staffIds: slot.staffIds,
  }));
}

export async function createBooking(
  clinic: Clinic,
  request: BookingRequest,
): Promise<BookingConfirmation> {
  const service = findBookableService(clinic, request.serviceId);
  const deposit = depositDueFor(clinic, service);
  const card = request.card;
  if (deposit && !card) {
    throw new HttpError(400, 'This service requires a deposit. Enter your card details to book.');
  }

  const date = toLocalDateString(request.startsAt, clinic.timezone);
  const slot = slotsFor(clinic, service, date, request.staffId).find(
    (candidate) => candidate.startsAt.getTime() === request.startsAt.getTime(),
  );
  if (!slot) {
    throw new HttpError(409, 'Sorry, that time is no longer available. Please pick another.');
  }

  const staffId = slot.staffIds[0];
  const staff = activeStaff(clinic.id).find((member) => member.id === staffId);
  if (!staff) {
    throw new HttpError(409, 'Sorry, that time is no longer available. Please pick another.');
  }

  const email = normalizeEmail(request.customer.email);

  // The appointment is inserted before the card is charged: holding the slot means
  // a second request for the same time is rejected (409) before any money moves,
  // so a double submit cannot be charged twice. If the charge is then declined,
  // the appointment is deleted again below.
  const { appointment, depositPayment } = db.transaction((tx) => {
    let customer = tx
      .select()
      .from(customers)
      .where(and(eq(customers.clinicId, clinic.id), eq(customers.email, email)))
      .get();

    if (customer) {
      customer = tx
        .update(customers)
        .set({
          name: request.customer.name,
          phone: request.customer.phone ?? customer.phone,
        })
        .where(eq(customers.id, customer.id))
        .returning()
        .get();
    } else {
      customer = tx
        .insert(customers)
        .values({
          clinicId: clinic.id,
          name: request.customer.name,
          email,
          phone: request.customer.phone ?? null,
        })
        .returning()
        .get();
    }

    const created = tx
      .insert(appointments)
      .values({
        clinicId: clinic.id,
        serviceId: service.id,
        staffId: staff.id,
        customerId: customer.id,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        source: 'online',
      })
      .returning()
      .get();

    // refundableHours snapshots the clinic's cancellation rule at booking time,
    // for the later refunds task.
    const pendingDeposit = deposit
      ? tx
          .insert(depositPayments)
          .values({
            clinicId: clinic.id,
            appointmentId: created.id,
            amountCents: deposit.amountCents,
            currency: CURRENCY,
            refundableHours: deposit.refundableHours,
          })
          .returning()
          .get()
      : null;

    return { appointment: created, depositPayment: pendingDeposit };
  });

  let depositPaidCents: number | null = null;

  if (depositPayment && card) {
    const result = await chargeDeposit({
      deposit: depositPayment,
      card,
      clinicName: clinic.name,
      serviceName: service.name,
    });

    if (result.status === 'declined') {
      // No booking without a payment: free the slot again and let the deposit
      // row go with the appointment. The attempt itself is recorded by the
      // payment provider.
      db.delete(appointments).where(eq(appointments.id, appointment.id)).run();
      throw new HttpError(402, DECLINE_MESSAGES[result.reason]);
    }

    markDepositPaid(depositPayment.id, result.reference);
    depositPaidCents = depositPayment.amountCents;
  }

  const when = formatDateTime(slot.startsAt, clinic.timezone);

  await mailer.send(
    bookingConfirmationEmail({
      to: email,
      customerName: request.customer.name,
      clinicName: clinic.name,
      serviceName: service.name,
      staffName: staff.name,
      when,
      deposit: deposit
        ? { amountCents: deposit.amountCents, refundableHours: deposit.refundableHours }
        : null,
    }),
  );

  return {
    appointmentId: appointment.id,
    clinicName: clinic.name,
    serviceName: service.name,
    staffName: staff.name,
    when,
    depositPaidCents,
  };
}
