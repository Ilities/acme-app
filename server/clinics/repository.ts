import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { clinics, type Clinic } from '../db/schema.js';
import { notFound } from '../http/errors.js';

export const SUPPORTED_TIMEZONES = [
  'Europe/Helsinki',
  'Europe/Stockholm',
  'Europe/Oslo',
  'Europe/Copenhagen',
  'Europe/Tallinn',
] as const;

export function getClinic(id: number): Clinic {
  const clinic = db.select().from(clinics).where(eq(clinics.id, id)).get();
  if (!clinic) {
    throw notFound('Clinic');
  }
  return clinic;
}

export function findClinicBySlug(slug: string): Clinic | undefined {
  return db.select().from(clinics).where(eq(clinics.slug, slug)).get();
}

export function parseOpenDays(openDays: string): number[] {
  return openDays
    .split(',')
    .map(Number)
    .filter((day) => day >= 1 && day <= 7);
}
