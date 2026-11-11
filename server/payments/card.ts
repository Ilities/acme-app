import { z } from 'zod';

/** Card details as accepted by the checkout endpoints; matches CardDetails in provider.ts. */
export const cardDetailsSchema = z.object({
  number: z.string().trim().min(12, 'Enter your card number'),
  expMonth: z.number().int().min(1).max(12),
  expYear: z.number().int().min(2000).max(2100),
  cvc: z.string().trim().min(3, 'Enter the security code'),
});
