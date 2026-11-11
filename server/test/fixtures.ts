import request from 'supertest';
import { createApp } from '../app.js';
import { hashPassword } from '../auth/password.js';
import { db } from '../db/client.js';
import {
  appointments,
  clinics,
  customers,
  depositPayments,
  passwordResetTokens,
  planOrders,
  services,
  sessions,
  staffMembers,
  users,
  type UserRole,
} from '../db/schema.js';

export const TEST_PASSWORD = 'correct horse battery';

export function resetDatabase(): void {
  db.delete(sessions).run();
  db.delete(passwordResetTokens).run();
  db.delete(depositPayments).run();
  db.delete(appointments).run();
  db.delete(planOrders).run();
  db.delete(customers).run();
  db.delete(services).run();
  db.delete(staffMembers).run();
  db.delete(users).run();
  db.delete(clinics).run();
}

export async function createClinicFixture(
  overrides: Partial<typeof clinics.$inferInsert> = {},
  role: UserRole = 'owner',
) {
  const clinic = db
    .insert(clinics)
    .values({
      name: 'Test Clinic',
      slug: 'test-clinic',
      email: 'hello@testclinic.example',
      city: 'Helsinki',
      country: 'FI',
      timezone: 'Europe/Helsinki',
      opensAt: '09:00',
      closesAt: '17:00',
      openDays: '1,2,3,4,5,6,7',
      ...overrides,
    })
    .returning()
    .get();

  const user = db
    .insert(users)
    .values({
      clinicId: clinic.id,
      email: 'owner@testclinic.example',
      name: 'Olivia Owner',
      role,
      passwordHash: await hashPassword(TEST_PASSWORD),
    })
    .returning()
    .get();

  const staff = db
    .insert(staffMembers)
    .values({ clinicId: clinic.id, name: 'Pekka Physio', title: 'Physiotherapist' })
    .returning()
    .get();

  const service = db
    .insert(services)
    .values({ clinicId: clinic.id, name: 'Assessment', durationMinutes: 60, priceCents: 8000 })
    .returning()
    .get();

  const customer = db
    .insert(customers)
    .values({ clinicId: clinic.id, name: 'Ville Asiakas', email: 'ville@example.com' })
    .returning()
    .get();

  return { clinic, user, staff, service, customer };
}

export async function signedInAgent(email: string, password = TEST_PASSWORD) {
  const agent = request.agent(createApp());
  await agent.post('/api/auth/sign-in').send({ email, password }).expect(200);
  return agent;
}
