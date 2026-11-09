export interface CardDetails {
  number: string;
  expMonth: number;
  expYear: number;
  cvc: string;
}

export interface ChargeRequest {
  amountCents: number;
  currency: string;
  card: CardDetails;
  description: string;
  idempotencyKey: string;
}

export type ChargeResult =
  | { status: 'succeeded'; reference: string }
  | { status: 'declined'; reference: string; reason: DeclineReason };

export type DeclineReason =
  | 'card_declined'
  | 'insufficient_funds'
  | 'expired_card'
  | 'invalid_card'
  | 'incorrect_cvc';

export interface PaymentProvider {
  readonly name: string;
  charge(request: ChargeRequest): Promise<ChargeResult>;
  refund(reference: string): Promise<void>;
}

export const DECLINE_MESSAGES: Record<DeclineReason, string> = {
  card_declined: 'Your card was declined. Please try another card.',
  insufficient_funds: 'Your card has insufficient funds.',
  expired_card: 'Your card has expired.',
  invalid_card: 'The card number is not valid.',
  incorrect_cvc: 'The security code is not correct.',
};
