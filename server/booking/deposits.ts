import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { depositPayments, type Clinic, type DepositPayment, type Service } from '../db/schema.js';
import { percentOf } from '../lib/money.js';
import { getPaymentProvider } from '../payments/index.js';
import type { CardDetails, ChargeResult } from '../payments/provider.js';

export interface DepositDue {
  amountCents: number;
  refundableHours: number;
}

/**
 * A deposit is only collected for online booking at clinics that have deposits on,
 * and only for services configured with one. Returns null when nothing is due.
 */
export function depositDueFor(clinic: Clinic, service: Service): DepositDue | null {
  if (!clinic.depositsEnabled || service.depositType === 'none' || service.depositValue === null) {
    return null;
  }
  const amountCents =
    service.depositType === 'fixed'
      ? service.depositValue
      : percentOf(service.priceCents, service.depositValue / 100);
  return { amountCents, refundableHours: clinic.depositRefundableHours };
}

/**
 * Charge a deposit that has a pending deposit_payments row. The row id makes the
 * idempotency key, so a retried charge for the same row is not taken twice — the
 * same scheme plan checkout uses.
 */
export function chargeDeposit(input: {
  deposit: DepositPayment;
  card: CardDetails;
  clinicName: string;
  serviceName: string;
}): Promise<ChargeResult> {
  return getPaymentProvider().charge({
    amountCents: input.deposit.amountCents,
    currency: input.deposit.currency,
    card: input.card,
    description: `Acme Book deposit for ${input.serviceName} at ${input.clinicName}`,
    idempotencyKey: `deposit-${input.deposit.id}`,
  });
}

export function markDepositPaid(id: number, reference: string): void {
  db.update(depositPayments)
    .set({ status: 'paid', providerReference: reference, paidAt: new Date() })
    .where(eq(depositPayments.id, id))
    .run();
}
