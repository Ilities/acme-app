import { describe, expect, it } from 'vitest';
import { FakePaymentProvider, TEST_CARDS, passesLuhnCheck } from './fakeProvider.js';
import type { ChargeRequest } from './provider.js';

const clock = () => new Date('2026-05-01T00:00:00Z');

function chargeRequest(overrides: Partial<ChargeRequest['card']> = {}, key = 'order-1'): ChargeRequest {
  return {
    amountCents: 9915,
    currency: 'EUR',
    description: 'Clinic plan',
    idempotencyKey: key,
    card: { number: TEST_CARDS.success, expMonth: 12, expYear: 2028, cvc: '123', ...overrides },
  };
}

describe('passesLuhnCheck', () => {
  it('accepts valid card numbers', () => {
    expect(passesLuhnCheck('4242424242424242')).toBe(true);
  });

  it('rejects invalid card numbers', () => {
    expect(passesLuhnCheck('4242424242424241')).toBe(false);
    expect(passesLuhnCheck('abcd')).toBe(false);
  });
});

describe('FakePaymentProvider', () => {
  it('charges a valid card', async () => {
    const provider = new FakePaymentProvider(clock);
    const result = await provider.charge(chargeRequest());
    expect(result.status).toBe('succeeded');
    expect(provider.getCharge(result.reference)?.amountCents).toBe(9915);
  });

  it('declines the decline test card', async () => {
    const provider = new FakePaymentProvider(clock);
    const result = await provider.charge(chargeRequest({ number: TEST_CARDS.declined }));
    expect(result).toMatchObject({ status: 'declined', reason: 'card_declined' });
  });

  it('declines expired cards', async () => {
    const provider = new FakePaymentProvider(clock);
    const result = await provider.charge(chargeRequest({ expMonth: 3, expYear: 2026 }));
    expect(result).toMatchObject({ status: 'declined', reason: 'expired_card' });
  });

  it('returns the same result for a repeated idempotency key', async () => {
    const provider = new FakePaymentProvider(clock);
    const first = await provider.charge(chargeRequest());
    const second = await provider.charge(chargeRequest());
    expect(second.reference).toBe(first.reference);
  });

  it('refunds a charge', async () => {
    const provider = new FakePaymentProvider(clock);
    const result = await provider.charge(chargeRequest());
    await provider.refund(result.reference);
    expect(provider.getCharge(result.reference)?.refunded).toBe(true);
  });
});
