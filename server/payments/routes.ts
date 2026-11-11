import { Router } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { clinicIdOf, requireOwner } from '../auth/middleware.js';
import { getClinic } from '../clinics/repository.js';
import { db } from '../db/client.js';
import { PLAN_IDS, planOrders } from '../db/schema.js';
import { HttpError, notFound } from '../http/errors.js';
import { parseId, queryString } from '../http/params.js';
import { checkoutPlan } from './checkout.js';
import { cardDetailsSchema } from './card.js';
import { PLANS, isPlanId, quotePlan } from './plans.js';

export const billingRouter = Router();

const checkoutSchema = z.object({
  plan: z.enum(PLAN_IDS),
  billingName: z.string().trim().min(2, 'Enter the name on the invoice').max(120),
  vatId: z.string().trim().max(20).nullable().optional(),
  card: cardDetailsSchema,
});

billingRouter.get('/plans', (req, res) => {
  const clinic = getClinic(clinicIdOf(req));
  res.json({ currentPlan: clinic.plan, plans: Object.values(PLANS) });
});

billingRouter.get('/quote', (req, res) => {
  const plan = queryString(req.query.plan);
  if (!plan || !isPlanId(plan)) {
    throw new HttpError(400, 'Unknown plan');
  }
  res.json({ quote: quotePlan(plan) });
});

billingRouter.post('/checkout', requireOwner, async (req, res) => {
  const input = checkoutSchema.parse(req.body);
  const result = await checkoutPlan({
    clinicId: clinicIdOf(req),
    planId: input.plan,
    billingName: input.billingName,
    vatId: input.vatId,
    card: input.card,
  });

  if (!result.ok) {
    throw new HttpError(402, result.message, { orderId: result.order.id });
  }
  res.status(201).json({ order: result.order });
});

billingRouter.get('/orders', (req, res) => {
  const orders = db
    .select()
    .from(planOrders)
    .where(eq(planOrders.clinicId, clinicIdOf(req)))
    .orderBy(desc(planOrders.createdAt))
    .all();
  res.json({ orders });
});

billingRouter.get('/orders/:id', (req, res) => {
  const order = db
    .select()
    .from(planOrders)
    .where(and(eq(planOrders.id, parseId(req.params.id)), eq(planOrders.clinicId, clinicIdOf(req))))
    .get();
  if (!order) {
    throw notFound('Order');
  }
  res.json({ order });
});
