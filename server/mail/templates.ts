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
      '',
      'If you need to change or cancel, please contact the clinic directly.',
      '',
      `${input.clinicName} via Acme Book`,
    ].join('\n'),
  };
}
