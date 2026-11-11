import { formatMoney } from '../lib/money.js';
import type { MailMessage } from './mailer.js';

export function passwordResetEmail(input: {
  to: string;
  name: string;
  resetUrl: string;
}): MailMessage {
  return {
    to: input.to,
    subject: 'Reset your Acme Book password',
    text: [
      `Hi ${input.name},`,
      '',
      'Someone asked to reset the password for your Acme Book account.',
      'Use the link below to choose a new password. The link expires in one hour.',
      '',
      input.resetUrl,
      '',
      "If you didn't ask for this, you can ignore this email.",
      '',
      'Acme Book',
    ].join('\n'),
  };
}

export function bookingConfirmationEmail(input: {
  to: string;
  customerName: string;
  clinicName: string;
  serviceName: string;
  staffName: string;
  when: string;
  /** Deposit charged at booking, if the service asked for one. */
  deposit?: { amountCents: number; refundableHours: number } | null;
}): MailMessage {
  return {
    to: input.to,
    subject: `Your booking at ${input.clinicName}`,
    text: [
      `Hi ${input.customerName},`,
      '',
      `Your appointment at ${input.clinicName} is confirmed.`,
      '',
      `Service: ${input.serviceName}`,
      `With: ${input.staffName}`,
      `When: ${input.when}`,
      ...(input.deposit
        ? [
            '',
            `Deposit paid: ${formatMoney(input.deposit.amountCents)} (this counts towards the price of your visit).`,
            input.deposit.refundableHours > 0
              ? `Cancel at least ${input.deposit.refundableHours} hours before your appointment to get the deposit back.`
              : 'Cancel any time before your appointment to get the deposit back.',
          ]
        : []),
      '',
      'If you need to change or cancel, please contact the clinic directly.',
      '',
      `${input.clinicName} via Acme Book`,
    ].join('\n'),
  };
}
