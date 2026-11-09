import { Router } from 'express';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { clinicIdOf, requireOwner } from '../auth/middleware.js';
import { db } from '../db/client.js';
import { staffMembers } from '../db/schema.js';
import { notFound } from '../http/errors.js';
import { parseId } from '../http/params.js';

export const staffRouter = Router();

const staffSchema = z.object({
  name: z.string().trim().min(2, 'Enter a name').max(120),
  title: z.string().trim().min(2, 'Enter a job title').max(80),
  email: z.string().trim().email().nullable().optional(),
  active: z.boolean().optional(),
});

staffRouter.get('/', (req, res) => {
  const staff = db
    .select()
    .from(staffMembers)
    .where(eq(staffMembers.clinicId, clinicIdOf(req)))
    .orderBy(asc(staffMembers.name))
    .all();
  res.json({ staff });
});

staffRouter.post('/', requireOwner, (req, res) => {
  const input = staffSchema.parse(req.body);
  const member = db
    .insert(staffMembers)
    .values({ ...input, clinicId: clinicIdOf(req) })
    .returning()
    .get();
  res.status(201).json({ staffMember: member });
});

staffRouter.patch('/:id', requireOwner, (req, res) => {
  const changes = staffSchema.partial().parse(req.body);
  const member = db
    .update(staffMembers)
    .set(changes)
    .where(and(eq(staffMembers.id, parseId(req.params.id)), eq(staffMembers.clinicId, clinicIdOf(req))))
    .returning()
    .get();
  if (!member) {
    throw notFound('Staff member');
  }
  res.json({ staffMember: member });
});
