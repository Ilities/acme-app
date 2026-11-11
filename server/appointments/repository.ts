import { and, asc, desc, eq, gte, lt, ne, type SQL } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  appointments,
  customers,
  services,
  staffMembers,
  type Appointment,
  type AppointmentStatus,
  type Customer,
  type Service,
  type StaffMember,
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
}

export interface BusyInterval {
  staffId: number;
  startsAt: Date;
  endsAt: Date;
}

function toListItem(
  appointment: Appointment,
  service: Service,
  staff: StaffMember,
  customer: Customer,
  timeZone: string,
): AppointmentListItem {
  return {
    id: appointment.id,
    startsAt: appointment.startsAt.toISOString(),
    endsAt: appointment.endsAt.toISOString(),
    timeLabel: formatDateTime(appointment.startsAt, timeZone),
    durationMinutes: Math.round(
      (appointment.endsAt.getTime() - appointment.startsAt.getTime()) / 60_000,
    ),
    status: appointment.status,
    source: appointment.source,
    notes: appointment.notes,
    service: { id: service.id, name: service.name, priceCents: service.priceCents },
    staff: { id: staff.id, name: staff.name },
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
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

  const query = db
    .select()
    .from(appointments)
    .where(and(...conditions))
    .orderBy(filters.scope === 'past' ? desc(appointments.startsAt) : asc(appointments.startsAt));
  const rows = filters.limit ? query.limit(filters.limit).all() : query.all();

  const search = filters.search?.trim().toLowerCase();
  const items: AppointmentListItem[] = [];

  for (const row of rows) {
    const service = db.select().from(services).where(eq(services.id, row.serviceId)).get();
    const staff = db.select().from(staffMembers).where(eq(staffMembers.id, row.staffId)).get();
    const customer = db.select().from(customers).where(eq(customers.id, row.customerId)).get();
    if (!service || !staff || !customer) {
      continue;
    }
    if (search && !customer.name.toLowerCase().includes(search)) {
      continue;
    }
    items.push(toListItem(row, service, staff, customer, filters.timeZone));
  }

  return items;
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
