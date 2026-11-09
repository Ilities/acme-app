import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { config } from '../config.js';
import { db } from '../db/client.js';
import { passwordResetTokens, sessions, users } from '../db/schema.js';
import { mailer } from '../mail/mailer.js';
import { passwordResetEmail } from '../mail/templates.js';
import { hashPassword } from './password.js';
import { findUserByEmail } from './users.js';

const TOKEN_TTL_MS = 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Sends a reset link. Returns false when no account matches the email. */
export async function requestPasswordReset(email: string): Promise<boolean> {
  const user = findUserByEmail(email);
  if (!user) {
    return false;
  }

  const token = randomBytes(32).toString('base64url');
  db.insert(passwordResetTokens)
    .values({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    })
    .run();

  const resetUrl = new URL('/reset-password', config.appUrl);
  resetUrl.searchParams.set('token', token);

  await mailer.send(
    passwordResetEmail({ to: user.email, name: user.name, resetUrl: resetUrl.toString() }),
  );
  return true;
}

/** Sets a new password if the token is valid. Signs the user out everywhere. */
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const now = new Date();
  const record = db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, hashToken(token)),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now),
      ),
    )
    .get();

  if (!record) {
    return false;
  }

  const passwordHash = await hashPassword(newPassword);

  db.transaction((tx) => {
    tx.update(users).set({ passwordHash }).where(eq(users.id, record.userId)).run();
    tx.update(passwordResetTokens)
      .set({ usedAt: now })
      .where(eq(passwordResetTokens.userId, record.userId))
      .run();
    const userSessions = tx.select().from(sessions).all();
    for (const session of userSessions) {
      const data = JSON.parse(session.data) as { userId?: number };
      if (data.userId === record.userId) {
        tx.delete(sessions).where(eq(sessions.sid, session.sid)).run();
      }
    }
  });

  return true;
}
