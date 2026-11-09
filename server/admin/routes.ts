import { Router } from 'express';
import { and, desc, eq, gte, sum, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { ORDER_STATUSES, clinics, planOrders } from '../db/schema.js';

export const adminRouter = Router();

const ordersQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
});

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
    })
    .from(planOrders)
    .innerJoin(clinics, eq(clinics.id, planOrders.clinicId))
    .where(and(...conditions))
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
