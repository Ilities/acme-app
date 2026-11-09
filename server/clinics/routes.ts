import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { clinicIdOf, requireOwner } from '../auth/middleware.js';
import { db } from '../db/client.js';
import { clinics, type Clinic } from '../db/schema.js';
import { HttpError } from '../http/errors.js';
import { SUPPORTED_TIMEZONES, getClinic, parseOpenDays } from './repository.js';

export const clinicRouter = Router();

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use the format HH:MM');

const updateClinicSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    phone: z.string().trim().max(40).nullable(),
    addressLine: z.string().trim().max(200).nullable(),
    city: z.string().trim().min(1).max(80),
    timezone: z.enum(SUPPORTED_TIMEZONES),
    opensAt: time,
    closesAt: time,
    openDays: z.array(z.number().int().min(1).max(7)).min(1, 'Pick at least one day'),
    bookingEnabled: z.boolean(),
  })
  .partial();

function serializeClinic(clinic: Clinic) {
  return { ...clinic, openDays: parseOpenDays(clinic.openDays) };
}

clinicRouter.get('/', (req, res) => {
  res.json({ clinic: serializeClinic(getClinic(clinicIdOf(req))) });
});

clinicRouter.patch('/', requireOwner, (req, res) => {
  const clinicId = clinicIdOf(req);
  const { openDays, ...changes } = updateClinicSchema.parse(req.body);
  const current = getClinic(clinicId);

  const opensAt = changes.opensAt ?? current.opensAt;
  const closesAt = changes.closesAt ?? current.closesAt;
  if (opensAt >= closesAt) {
    throw new HttpError(400, 'Closing time must be after opening time');
  }

  db.update(clinics)
    .set({
      ...changes,
      ...(openDays ? { openDays: [...new Set(openDays)].sort().join(',') } : {}),
    })
    .where(eq(clinics.id, clinicId))
    .run();

  res.json({ clinic: serializeClinic(getClinic(clinicId)) });
});
