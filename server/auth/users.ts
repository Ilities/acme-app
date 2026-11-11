import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, type User, type UserRole } from '../db/schema.js';
import { verifyPassword } from './password.js';

export interface CurrentUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  clinicId: number | null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function toCurrentUser(user: User): CurrentUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    clinicId: user.clinicId,
  };
}

export function findUserById(id: number): User | undefined {
  return db.select().from(users).where(eq(users.id, id)).get();
}

export function findUserByEmail(email: string): User | undefined {
  return db.select().from(users).where(eq(users.email, normalizeEmail(email))).get();
}

export async function authenticate(email: string, password: string): Promise<User | null> {
  const user = findUserByEmail(email);
  if (!user) {
    return null;
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return null;
  }
  db.update(users).set({ lastSignInAt: new Date() }).where(eq(users.id, user.id)).run();
  return user;
}
