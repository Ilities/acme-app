import type { PlanId } from '../db/schema.js';
import { percentOf } from '../lib/money.js';

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  priceCents: number;
  staffLimit: number | null;
  features: string[];
}

export const VAT_RATE = 0.255;
export const CURRENCY = 'EUR';

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'For solo practitioners getting started with online booking.',
    priceCents: 2900,
    staffLimit: 2,
    features: ['Up to 2 staff members', 'Online booking page', 'Email confirmations'],
  },
  clinic: {
    id: 'clinic',
    name: 'Clinic',
    description: 'For growing clinics and studios with a full team.',
    priceCents: 7900,
    staffLimit: 10,
    features: [
      'Up to 10 staff members',
      'Online booking page',
      'Email confirmations',
      'Customer history',
    ],
  },
  group: {
    id: 'group',
    name: 'Group',
    description: 'For groups running several locations.',
    priceCents: 19900,
    staffLimit: null,
    features: [
      'Unlimited staff members',
      'Online booking page',
      'Email confirmations',
      'Customer history',
      'Priority support',
    ],
  },
};

export interface PlanQuote {
  plan: Plan;
  subtotalCents: number;
  vatRate: number;
  vatCents: number;
  totalCents: number;
  currency: string;
}

export function isPlanId(value: string): value is PlanId {
  return Object.hasOwn(PLANS, value);
}

export function quotePlan(planId: PlanId): PlanQuote {
  const plan = PLANS[planId];
  const vatCents = percentOf(plan.priceCents, VAT_RATE);
  return {
    plan,
    subtotalCents: plan.priceCents,
    vatRate: VAT_RATE,
    vatCents,
    totalCents: plan.priceCents + vatCents,
    currency: CURRENCY,
  };
}
