import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { clinics, planOrders, type PlanId, type PlanOrder } from '../db/schema.js';
import { getPaymentProvider } from './index.js';
import { quotePlan } from './plans.js';
import { DECLINE_MESSAGES, type CardDetails } from './provider.js';

export interface CheckoutRequest {
  clinicId: number;
  planId: PlanId;
  billingName: string;
  vatId?: string | null;
  card: CardDetails;
}

export type CheckoutResult =
  | { ok: true; order: PlanOrder }
  | { ok: false; order: PlanOrder; message: string };

export async function checkoutPlan(request: CheckoutRequest): Promise<CheckoutResult> {
  const quote = quotePlan(request.planId);

  const pending = db
    .insert(planOrders)
    .values({
      clinicId: request.clinicId,
      plan: request.planId,
      subtotalCents: quote.subtotalCents,
      vatCents: quote.vatCents,
      amountCents: quote.totalCents,
      currency: quote.currency,
      billingName: request.billingName,
      vatId: request.vatId || null,
      status: 'pending',
    })
    .returning()
    .get();

  const result = await getPaymentProvider().charge({
    amountCents: quote.totalCents,
    currency: quote.currency,
    card: request.card,
    description: `Acme Book ${quote.plan.name} plan`,
    idempotencyKey: `plan-order-${pending.id}`,
  });

  if (result.status === 'declined') {
    const order = db
      .update(planOrders)
      .set({ status: 'failed', providerReference: result.reference, failureReason: result.reason })
      .where(eq(planOrders.id, pending.id))
      .returning()
      .get();
    return { ok: false, order, message: DECLINE_MESSAGES[result.reason] };
  }

  const order = db.transaction((tx) => {
    tx.update(clinics).set({ plan: request.planId }).where(eq(clinics.id, request.clinicId)).run();
    return tx
      .update(planOrders)
      .set({ status: 'paid', providerReference: result.reference, paidAt: new Date() })
      .where(eq(planOrders.id, pending.id))
      .returning()
      .get();
  });

  return { ok: true, order };
}
