import { Router } from 'express';
import { and, count, eq, gte, lt, ne } from 'drizzle-orm';
import { listAppointments } from '../appointments/repository.js';
import { clinicIdOf } from '../auth/middleware.js';
import { getClinic } from '../clinics/repository.js';
import { db } from '../db/client.js';
import { appointments } from '../db/schema.js';
import { addDays, toLocalDateString, zonedTimeToUtc } from '../lib/dates.js';

export const dashboardRouter = Router();

function countBetween(clinicId: number, from: Date, to: Date): number {
  const [row] = db
    .select({ value: count() })
    .from(appointments)
    .where(
      and(
        eq(appointments.clinicId, clinicId),
        ne(appointments.status, 'cancelled'),
        gte(appointments.startsAt, from),
        lt(appointments.startsAt, to),
      ),
    )
    .all();
  return row.value;
}

dashboardRouter.get('/', (req, res) => {
  const clinicId = clinicIdOf(req);
  const clinic = getClinic(clinicId);
  const now = new Date();

  const today = toLocalDateString(now, clinic.timezone);
  const startOfToday = zonedTimeToUtc(today, '00:00', clinic.timezone);
  const startOfTomorrow = zonedTimeToUtc(addDays(today, 1), '00:00', clinic.timezone);
  const inSevenDays = zonedTimeToUtc(addDays(today, 7), '00:00', clinic.timezone);
  const monthStart = zonedTimeToUtc(`${today.slice(0, 8)}01`, '00:00', clinic.timezone);

  const completedThisMonth = db
    .select({ priceCents: appointments.priceCents })
    .from(appointments)
    .where(
      and(
        eq(appointments.clinicId, clinicId),
        eq(appointments.status, 'completed'),
        gte(appointments.startsAt, monthStart),
      ),
    )
    .all();

  res.json({
    clinicName: clinic.name,
    todayCount: countBetween(clinicId, startOfToday, startOfTomorrow),
    weekCount: countBetween(clinicId, startOfToday, inSevenDays),
    monthRevenueCents: completedThisMonth.reduce((total, row) => total + row.priceCents, 0),
    upcoming: listAppointments(clinicId, {
      scope: 'upcoming',
      status: 'booked',
      limit: 5,
      now,
      timeZone: clinic.timezone,
    }),
  });
});
