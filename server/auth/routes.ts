import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../http/errors.js';
import { MIN_PASSWORD_LENGTH } from './password.js';
import { requestPasswordReset, resetPassword } from './passwordReset.js';
import { SESSION_COOKIE, destroySession, regenerateSession } from './session.js';
import { authenticate, toCurrentUser } from './users.js';

export const authRouter = Router();

const signInSchema = z.object({
  email: z.string().min(1, 'Enter your email'),
  password: z.string().min(1, 'Enter your password'),
});

const resetRequestSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
});

const resetConfirmSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`),
});

authRouter.get('/me', (req, res) => {
  res.json({ user: req.user ?? null });
});

authRouter.post('/sign-in', async (req, res) => {
  const { email, password } = signInSchema.parse(req.body);
  const user = await authenticate(email, password);
  if (!user) {
    throw new HttpError(401, 'That email and password combination is not right');
  }

  await regenerateSession(req);
  req.session.userId = user.id;
  res.json({ user: toCurrentUser(user) });
});

authRouter.post('/sign-out', async (req, res) => {
  await destroySession(req);
  res.clearCookie(SESSION_COOKIE);
  res.status(204).end();
});

authRouter.post('/password-reset', async (req, res) => {
  const { email } = resetRequestSchema.parse(req.body);
  const sent = await requestPasswordReset(email);
  if (!sent) {
    throw new HttpError(404, 'No account exists for that email address');
  }
  res.json({ ok: true });
});

authRouter.post('/password-reset/confirm', async (req, res) => {
  const { token, password } = resetConfirmSchema.parse(req.body);
  const updated = await resetPassword(token, password);
  if (!updated) {
    throw new HttpError(400, 'This reset link has expired or was already used');
  }
  res.json({ ok: true });
});
