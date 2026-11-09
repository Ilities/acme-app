import { randomUUID } from 'node:crypto';
import type { ChargeRequest, ChargeResult, DeclineReason, PaymentProvider } from './provider.js';

/** Card numbers that always fail, mirroring the test cards of real providers. */
export const TEST_CARDS = {
  success: '4242424242424242',
  declined: '4000000000000002',
  insufficientFunds: '4000000000009995',
} as const;

const FORCED_DECLINES: Record<string, DeclineReason> = {
  [TEST_CARDS.declined]: 'card_declined',
  [TEST_CARDS.insufficientFunds]: 'insufficient_funds',
};

export function passesLuhnCheck(cardNumber: string): boolean {
  if (!/^\d{12,19}$/.test(cardNumber)) {
    return false;
  }
  let sum = 0;
  let double = false;
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = Number(cardNumber[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

interface StoredCharge {
  reference: string;
  amountCents: number;
  currency: string;
  refunded: boolean;
}

/**
 * In-process payment provider. Applies the same validation a real provider
 * would, but never talks to a network service.
 */
export class FakePaymentProvider implements PaymentProvider {
  readonly name = 'fake';
  private readonly charges = new Map<string, StoredCharge>();
  private readonly byIdempotencyKey = new Map<string, ChargeResult>();

  constructor(private readonly clock: () => Date = () => new Date()) {}

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    const previous = this.byIdempotencyKey.get(request.idempotencyKey);
    if (previous) {
      return previous;
    }

    const result = this.evaluate(request);
    this.byIdempotencyKey.set(request.idempotencyKey, result);
    if (result.status === 'succeeded') {
      this.charges.set(result.reference, {
        reference: result.reference,
        amountCents: request.amountCents,
        currency: request.currency,
        refunded: false,
      });
    }
    return result;
  }

  async refund(reference: string): Promise<void> {
    const charge = this.charges.get(reference);
    if (!charge) {
      throw new Error(`Unknown charge ${reference}`);
    }
    charge.refunded = true;
  }

  getCharge(reference: string): StoredCharge | undefined {
    return this.charges.get(reference);
  }

  private evaluate(request: ChargeRequest): ChargeResult {
    const reference = `fake_ch_${randomUUID().replaceAll('-', '')}`;
    const number = request.card.number.replace(/\s+/g, '');

    if (!passesLuhnCheck(number)) {
      return { status: 'declined', reference, reason: 'invalid_card' };
    }
    if (!/^\d{3,4}$/.test(request.card.cvc)) {
      return { status: 'declined', reference, reason: 'incorrect_cvc' };
    }

    const now = this.clock();
    const expiry = new Date(Date.UTC(request.card.expYear, request.card.expMonth, 1));
    if (expiry <= now) {
      return { status: 'declined', reference, reason: 'expired_card' };
    }

    const forced = FORCED_DECLINES[number];
    if (forced) {
      return { status: 'declined', reference, reason: forced };
    }

    return { status: 'succeeded', reference };
  }
}
