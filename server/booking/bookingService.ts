import { and, asc, eq } from 'drizzle-orm';
import { findBusyIntervals } from '../appointments/repository.js';
import { normalizeEmail } from '../auth/users.js';
import { findClinicBySlug, parseOpenDays } from '../clinics/repository.js';
import { db } from '../db/client.js';
import {
  appointments,
  customers,
  services,
  staffMembers,
  type Clinic,
  type Service,
} from '../db/schema.js';
import { HttpError, notFound } from '../http/errors.js';
import { addDays, formatDateTime, formatTime, toLocalDateString, zonedTimeToUtc } from '../lib/dates.js';
import { mailer } from '../mail/mailer.js';
import { bookingConfirmationEmail } from '../mail/templates.js';
import { computeSlots, type Slot } from './availability.js';

export interface BookingRequest {
  serviceId: number;
  staffId?: number;
  startsAt: Date;
  customer: { name: string; email: string; phone?: string | null };
}

export interface BookingConfirmation {
  appointmentId: number;
  clinicName: string;
  serviceName: string;
  staffName: string;
  when: string;
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

  const appointment = db.transaction((tx) => {
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

    return tx
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
  });

  const when = formatDateTime(slot.startsAt, clinic.timezone);

  await mailer.send(
    bookingConfirmationEmail({
      to: email,
      customerName: request.customer.name,
      clinicName: clinic.name,
      serviceName: service.name,
      staffName: staff.name,
      when,
    }),
  );

  return {
    appointmentId: appointment.id,
    clinicName: clinic.name,
    serviceName: service.name,
    staffName: staff.name,
    when,
  };
}
