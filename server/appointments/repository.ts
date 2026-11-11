import { and, asc, desc, eq, gte, inArray, lt, ne, type SQL } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  appointments,
  customers,
  depositPayments,
  services,
  staffMembers,
  type Appointment,
  type AppointmentStatus,
  type DepositStatus,
} from '../db/schema.js';
import { formatDateTime } from '../lib/dates.js';

export interface AppointmentFilters {
  scope?: 'upcoming' | 'past';
  status?: AppointmentStatus;
  search?: string;
  limit?: number;
  now?: Date;
  /** Time zone the appointment times are labelled in; the clinic's own time zone. */
  timeZone: string;
}

export interface AppointmentListItem {
  id: number;
  startsAt: string;
  endsAt: string;
  timeLabel: string;
  durationMinutes: number;
  status: AppointmentStatus;
  source: Appointment['source'];
  notes: string | null;
  service: { id: number; name: string; priceCents: number };
  staff: { id: number; name: string };
  customer: { id: number; name: string; email: string; phone: string | null };
  /** Deposit taken when the customer booked online; null when none was due. */
  deposit: { amountCents: number; status: DepositStatus; paidAt: string | null } | null;
}

export interface BusyInterval {
  staffId: number;
  startsAt: Date;
  endsAt: Date;
}

interface AppointmentListRow {
  id: number;
  startsAt: Date;
  endsAt: Date;
  status: AppointmentStatus;
  source: 'online' | 'staff';
  notes: string | null;
  serviceId: number;
  serviceName: string;
  servicePriceCents: number;
  staffId: number;
  staffName: string;
  customerId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  depositAmountCents: number | null;
  depositStatus: DepositStatus | null;
  depositPaidAt: Date | null;
}

function toListItem(row: AppointmentListRow, timeZone: string): AppointmentListItem {
  return {
    id: row.id,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    timeLabel: formatDateTime(row.startsAt, timeZone),
    durationMinutes: Math.round((row.endsAt.getTime() - row.startsAt.getTime()) / 60_000),
    status: row.status,
    source: row.source,
    notes: row.notes,
    service: { id: row.serviceId, name: row.serviceName, priceCents: row.servicePriceCents },
    staff: { id: row.staffId, name: row.staffName },
    customer: {
      id: row.customerId,
      name: row.customerName,
      email: row.customerEmail,
      phone: row.customerPhone,
    },
    deposit:
      row.depositAmountCents === null
        ? null
        : {
            amountCents: row.depositAmountCents,
            status: row.depositStatus as DepositStatus,
            paidAt: row.depositPaidAt ? row.depositPaidAt.toISOString() : null,
          },
  };
}

export function listAppointments(clinicId: number, filters: AppointmentFilters): AppointmentListItem[] {
  const now = filters.now ?? new Date();
  const conditions: SQL[] = [eq(appointments.clinicId, clinicId)];
  if (filters.scope === 'upcoming') {
    conditions.push(gte(appointments.startsAt, now));
  } else if (filters.scope === 'past') {
    conditions.push(lt(appointments.startsAt, now));
  }
  if (filters.status) {
    conditions.push(eq(appointments.status, filters.status));
  }

  const search = filters.search?.trim().toLowerCase();
  if (search) {
    const matchingCustomerIds = db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(eq(customers.clinicId, clinicId))
      .all()
      .filter((customer) => customer.name.toLowerCase().includes(search))
      .map((customer) => customer.id);

    if (matchingCustomerIds.length === 0) {
      return [];
    }
    conditions.push(inArray(appointments.customerId, matchingCustomerIds));
  }

  const query = db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      source: appointments.source,
      notes: appointments.notes,
      serviceId: services.id,
      serviceName: services.name,
      servicePriceCents: services.priceCents,
      staffId: staffMembers.id,
      staffName: staffMembers.name,
      customerId: customers.id,
      customerName: customers.name,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      depositAmountCents: depositPayments.amountCents,
      depositStatus: depositPayments.status,
      depositPaidAt: depositPayments.paidAt,
    })
    .from(appointments)
    .innerJoin(services, eq(services.id, appointments.serviceId))
    .innerJoin(staffMembers, eq(staffMembers.id, appointments.staffId))
    .innerJoin(customers, eq(customers.id, appointments.customerId))
    .leftJoin(depositPayments, eq(depositPayments.appointmentId, appointments.id))
    .where(and(...conditions))
    .orderBy(filters.scope === 'past' ? desc(appointments.startsAt) : asc(appointments.startsAt));
  const rows = filters.limit ? query.limit(filters.limit).all() : query.all();

  return rows.map((row) => toListItem(row, filters.timeZone));
}

export function findAppointment(clinicId: number, id: number): Appointment | undefined {
  return db
    .select()
    .from(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.clinicId, clinicId)))
    .get();
}

export function findBusyIntervals(clinicId: number, from: Date, to: Date): BusyInterval[] {
  return db
    .select({
      staffId: appointments.staffId,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.clinicId, clinicId),
        ne(appointments.status, 'cancelled'),
        lt(appointments.startsAt, to),
        gte(appointments.endsAt, from),
      ),
    )
    .all();
}

export function overlaps(interval: { startsAt: Date; endsAt: Date }, start: Date, end: Date) {
  return interval.startsAt < end && start < interval.endsAt;
}
