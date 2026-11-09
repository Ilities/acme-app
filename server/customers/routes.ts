import { Router } from 'express';
import { and, asc, eq, like, or } from 'drizzle-orm';
import { z } from 'zod';
import { clinicIdOf } from '../auth/middleware.js';
import { normalizeEmail } from '../auth/users.js';
import { db } from '../db/client.js';
import { customers } from '../db/schema.js';
import { HttpError } from '../http/errors.js';
import { queryString } from '../http/params.js';

export const customersRouter = Router();

const customerSchema = z.object({
  name: z.string().trim().min(2, 'Enter a name').max(120),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z.string().trim().max(40).nullable().optional(),
});

customersRouter.get('/', (req, res) => {
  const clinicId = clinicIdOf(req);
  const search = queryString(req.query.q);
  const filter = search
    ? and(
        eq(customers.clinicId, clinicId),
        or(like(customers.name, `%${search}%`), like(customers.email, `%${search}%`)),
      )
    : eq(customers.clinicId, clinicId);

  const rows = db.select().from(customers).where(filter).orderBy(asc(customers.name)).all();
  res.json({ customers: rows });
});

customersRouter.post('/', (req, res) => {
  const clinicId = clinicIdOf(req);
  const input = customerSchema.parse(req.body);
  const email = normalizeEmail(input.email);

  const existing = db
    .select()
    .from(customers)
    .where(and(eq(customers.clinicId, clinicId), eq(customers.email, email)))
    .get();
  if (existing) {
    throw new HttpError(409, 'A customer with that email already exists');
  }

  const customer = db
    .insert(customers)
    .values({ ...input, email, clinicId })
    .returning()
    .get();
  res.status(201).json({ customer });
});
