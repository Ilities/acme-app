import { Router } from 'express';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { clinicIdOf } from '../auth/middleware.js';
import { getClinic } from '../clinics/repository.js';
import { db } from '../db/client.js';
import { APPOINTMENT_STATUSES, appointments, customers, services, staffMembers } from '../db/schema.js';
import { HttpError, notFound } from '../http/errors.js';
import { parseId } from '../http/params.js';
import { addMinutes, zonedTimeToUtc } from '../lib/dates.js';
import { findAppointment, findBusyIntervals, listAppointments, overlaps } from './repository.js';

export const appointmentsRouter = Router();

const listQuerySchema = z.object({
  scope: z.enum(['upcoming', 'past']).optional(),
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  q: z.string().max(100).optional(),
});

const createSchema = z.object({
  customerId: z.number().int().positive(),
  serviceId: z.number().int().positive(),
  staffId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Pick a time'),
  notes: z.string().trim().max(1000).optional(),
});

const updateSchema = z.object({
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

appointmentsRouter.get('/', (req, res) => {
  const { scope, status, q } = listQuerySchema.parse(req.query);
  const clinic = getClinic(clinicIdOf(req));
  const items = listAppointments(clinic.id, { scope, status, search: q, timeZone: clinic.timezone });
  res.json({ appointments: items });
});

appointmentsRouter.post('/', (req, res) => {
  const clinicId = clinicIdOf(req);
  const clinic = getClinic(clinicId);
  const input = createSchema.parse(req.body);

  const belongsToClinic = <T extends { id: number; clinicId: number }>(row: T | undefined) =>
    row && row.clinicId === clinicId ? row : undefined;

  const service = belongsToClinic(
    db.select().from(services).where(eq(services.id, input.serviceId)).get(),
  );
  const staff = belongsToClinic(
    db.select().from(staffMembers).where(eq(staffMembers.id, input.staffId)).get(),
  );
  const customer = belongsToClinic(
    db.select().from(customers).where(eq(customers.id, input.customerId)).get(),
  );
  if (!service || !staff || !customer) {
    throw new HttpError(400, 'Pick a customer, service and staff member from this clinic');
  }

  const startsAt = zonedTimeToUtc(input.date, input.time, clinic.timezone);
  const endsAt = addMinutes(startsAt, service.durationMinutes);

  const clash = findBusyIntervals(clinicId, startsAt, endsAt).some(
    (busy) => busy.staffId === staff.id && overlaps(busy, startsAt, endsAt),
  );
  if (clash) {
    throw new HttpError(409, `${staff.name} already has an appointment at that time`);
  }

  const appointment = db
    .insert(appointments)
    .values({
      clinicId,
      serviceId: service.id,
      staffId: staff.id,
      customerId: customer.id,
      startsAt,
      endsAt,
      source: 'staff',
      notes: input.notes || null,
    })
    .returning()
    .get();

  res.status(201).json({ appointment });
});

appointmentsRouter.patch('/:id', (req, res) => {
  const clinicId = clinicIdOf(req);
  const id = parseId(req.params.id);
  const changes = updateSchema.parse(req.body);

  if (!findAppointment(clinicId, id)) {
    throw notFound('Appointment');
  }

  const appointment = db
    .update(appointments)
    .set(changes)
    .where(and(eq(appointments.id, id), eq(appointments.clinicId, clinicId)))
    .returning()
    .get();
  res.json({ appointment });
});
