import { Router } from 'express';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { clinicIdOf, requireOwner } from '../auth/middleware.js';
import { db } from '../db/client.js';
import { services } from '../db/schema.js';
import { HttpError, notFound } from '../http/errors.js';
import { parseId } from '../http/params.js';

export const servicesRouter = Router();

const serviceFields = {
  name: z.string().trim().min(2, 'Enter a name').max(120),
  description: z.string().trim().max(500),
  durationMinutes: z
    .number()
    .int()
    .min(15)
    .max(240)
    .refine((minutes) => minutes % 15 === 0, 'Duration must be in 15 minute steps'),
  priceCents: z.number().int().min(0).max(1_000_000),
  active: z.boolean().optional(),
};

// An omitted description means "no description" when creating, and "leave it
// alone" when updating. `.partial()` keeps a ZodDefault, so sharing one schema
// made every PATCH write an empty description — hiding a service wiped it.
const newServiceSchema = z.object({
  ...serviceFields,
  description: serviceFields.description.default(''),
});
const serviceChangesSchema = z.object(serviceFields).partial();

servicesRouter.get('/', (req, res) => {
  const rows = db
    .select()
    .from(services)
    .where(eq(services.clinicId, clinicIdOf(req)))
    .orderBy(asc(services.name))
    .all();
  res.json({ services: rows });
});

servicesRouter.post('/', requireOwner, (req, res) => {
  const input = newServiceSchema.parse(req.body);
  const service = db
    .insert(services)
    .values({ ...input, clinicId: clinicIdOf(req) })
    .returning()
    .get();
  res.status(201).json({ service });
});

servicesRouter.patch('/:id', requireOwner, (req, res) => {
  const changes = serviceChangesSchema.parse(req.body);
  if (Object.keys(changes).length === 0) {
    throw new HttpError(400, 'Nothing to update');
  }
  const service = db
    .update(services)
    .set(changes)
    .where(and(eq(services.id, parseId(req.params.id)), eq(services.clinicId, clinicIdOf(req))))
    .returning()
    .get();
  if (!service) {
    throw notFound('Service');
  }
  res.json({ service });
});
