import { Router } from 'express';
import { and, count, desc, eq, gte, sum, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { ORDER_STATUSES, clinics, orderNotes, planOrders, users } from '../db/schema.js';
import { notFound } from '../http/errors.js';
import { parseId } from '../http/params.js';

export const adminRouter = Router();

const ordersQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
});

const noteSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Write the note first')
    .max(2000, 'Notes are limited to 2000 characters'),
});

function requireOrder(id: number) {
  const order = db.select({ id: planOrders.id }).from(planOrders).where(eq(planOrders.id, id)).get();
  if (!order) {
    throw notFound('Order');
  }
  return order;
}

adminRouter.get('/orders', (req, res) => {
  const { status } = ordersQuerySchema.parse(req.query);
  const conditions: SQL[] = [];
  if (status) {
    conditions.push(eq(planOrders.status, status));
  }

  const orders = db
    .select({
      id: planOrders.id,
      clinicId: planOrders.clinicId,
      clinicName: clinics.name,
      plan: planOrders.plan,
      amountCents: planOrders.amountCents,
      currency: planOrders.currency,
      status: planOrders.status,
      createdAt: planOrders.createdAt,
      noteCount: count(orderNotes.id),
    })
    .from(planOrders)
    .innerJoin(clinics, eq(clinics.id, planOrders.clinicId))
    .leftJoin(orderNotes, eq(orderNotes.orderId, planOrders.id))
    .where(and(...conditions))
    .groupBy(planOrders.id)
    .orderBy(desc(planOrders.createdAt))
    .all();

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [{ paidThisMonth }] = db
    .select({ paidThisMonth: sum(planOrders.amountCents) })
    .from(planOrders)
    .where(and(eq(planOrders.status, 'paid'), gte(planOrders.createdAt, monthStart)))
    .all();

  res.json({ orders, paidThisMonthCents: Number(paidThisMonth ?? 0) });
});

adminRouter.get('/orders/:id/notes', (req, res) => {
  const orderId = parseId(req.params.id);
  requireOrder(orderId);

  const notes = db
    .select({
      id: orderNotes.id,
      body: orderNotes.body,
      authorName: users.name,
      createdAt: orderNotes.createdAt,
    })
    .from(orderNotes)
    .innerJoin(users, eq(users.id, orderNotes.authorId))
    .where(eq(orderNotes.orderId, orderId))
    .orderBy(desc(orderNotes.createdAt))
    .all();

  res.json({ notes });
});

adminRouter.post('/orders/:id/notes', (req, res) => {
  const orderId = parseId(req.params.id);
  requireOrder(orderId);
  const user = req.user!;
  const { body } = noteSchema.parse(req.body);

  const note = db
    .insert(orderNotes)
    .values({ orderId, authorId: user.id, body })
    .returning()
    .get();

  res.status(201).json({
    note: {
      id: note.id,
      body: note.body,
      authorName: user.name,
      createdAt: note.createdAt,
    },
  });
});
