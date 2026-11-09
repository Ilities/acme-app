import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { db } from '../db/client.js';
import { clinics } from '../db/schema.js';
import { createClinicFixture } from '../test/fixtures.js';
import { checkoutPlan } from './checkout.js';
import { TEST_CARDS } from './fakeProvider.js';
import { quotePlan } from './plans.js';

const card = { number: TEST_CARDS.success, expMonth: 12, expYear: 2030, cvc: '123' };

describe('quotePlan', () => {
  it('adds Finnish VAT to the plan price', () => {
    expect(quotePlan('clinic')).toMatchObject({
      subtotalCents: 7900,
      vatCents: 2015,
      totalCents: 9915,
      currency: 'EUR',
    });
  });
});

describe('checkoutPlan', () => {
  it('records a paid order and upgrades the clinic', async () => {
    const { clinic } = await createClinicFixture();

    const result = await checkoutPlan({
      clinicId: clinic.id,
      planId: 'clinic',
      billingName: 'Test Clinic Oy',
      card,
    });

    expect(result.ok).toBe(true);
    expect(result.order).toMatchObject({ status: 'paid', plan: 'clinic', amountCents: 9915 });
    const updated = db.select().from(clinics).where(eq(clinics.id, clinic.id)).get();
    expect(updated?.plan).toBe('clinic');
  });

  it('records a failed order when the card is declined', async () => {
    const { clinic } = await createClinicFixture();

    const result = await checkoutPlan({
      clinicId: clinic.id,
      planId: 'group',
      billingName: 'Test Clinic Oy',
      card: { ...card, number: TEST_CARDS.declined },
    });

    expect(result.ok).toBe(false);
    expect(result.order).toMatchObject({ status: 'failed', failureReason: 'card_declined' });
    const updated = db.select().from(clinics).where(eq(clinics.id, clinic.id)).get();
    expect(updated?.plan).toBeNull();
  });
});
