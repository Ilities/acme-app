import { describe, expect, it } from 'vitest';
import { mailer } from '../mail/mailer.js';
import { createClinicFixture } from '../test/fixtures.js';
import { requestPasswordReset, resetPassword } from './passwordReset.js';
import { authenticate } from './users.js';

function tokenFromLastEmail(): string {
  const message = mailer.outbox.at(-1);
  const url = message?.text.match(/https?:\/\/\S+/)?.[0];
  if (!url) {
    throw new Error('No reset link was sent');
  }
  return new URL(url).searchParams.get('token') ?? '';
}

describe('password reset', () => {
  it('emails a reset link to the account owner', async () => {
    const { user } = await createClinicFixture();

    await expect(requestPasswordReset(user.email)).resolves.toBe(true);

    expect(mailer.outbox).toHaveLength(1);
    expect(mailer.outbox[0]).toMatchObject({
      to: user.email,
      subject: 'Reset your Acme Book password',
    });
  });

  it('does not send anything for an unknown email', async () => {
    await createClinicFixture();

    await expect(requestPasswordReset('nobody@example.com')).resolves.toBe(false);
    expect(mailer.outbox).toHaveLength(0);
  });

  it('sets a new password with a valid token', async () => {
    const { user } = await createClinicFixture();
    await requestPasswordReset(user.email);

    await expect(resetPassword(tokenFromLastEmail(), 'a brand new password')).resolves.toBe(true);

    expect(await authenticate(user.email, 'a brand new password')).not.toBeNull();
  });

  it('only accepts a token once', async () => {
    const { user } = await createClinicFixture();
    await requestPasswordReset(user.email);
    const token = tokenFromLastEmail();

    await resetPassword(token, 'first new password');

    await expect(resetPassword(token, 'second new password')).resolves.toBe(false);
  });
});
