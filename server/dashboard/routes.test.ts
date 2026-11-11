import { describe, expect, it } from 'vitest';
import { db } from '../db/client.js';
import { appointments } from '../db/schema.js';
import { addMinutes, toLocalDateString, zonedTimeToUtc } from '../lib/dates.js';
import { createClinicFixture, signedInAgent } from '../test/fixtures.js';

describe('dashboard routes', () => {
  it('labels upcoming appointments in the clinic time zone', async () => {
    const { clinic, user, staff, service, customer } = await createClinicFixture();
    // 08:00 UTC is 10:00 in Europe/Helsinki.
    const startsAt = new Date('2027-01-12T08:00:00.000Z');
    db.insert(appointments)
      .values({
        clinicId: clinic.id,
        serviceId: service.id,
        staffId: staff.id,
        customerId: customer.id,
        startsAt,
        endsAt: addMinutes(startsAt, 60),
        priceCents: service.priceCents,
        source: 'online',
      })
      .run();

    const agent = await signedInAgent(user.email);
    const response = await agent.get('/api/dashboard').expect(200);

    expect(response.body.clinicName).toBe('Test Clinic');
    expect(response.body.upcoming[0].timeLabel).toBe('Tue 12 Jan, 10:00');
  });

  it('totals completed visits at the price they were booked at', async () => {
    const { clinic, user, staff, service, customer } = await createClinicFixture();
    // Finished this morning in the clinic's own zone, so it is inside the month.
    const startsAt = addMinutes(
      zonedTimeToUtc(toLocalDateString(new Date(), clinic.timezone), '09:00', clinic.timezone),
      -60,
    );
    db.insert(appointments)
      .values({
        clinicId: clinic.id,
        serviceId: service.id,
        staffId: staff.id,
        customerId: customer.id,
        startsAt,
        endsAt: addMinutes(startsAt, 60),
        // The service now costs 8000; this visit was charged 6900.
        priceCents: 6900,
        status: 'completed',
        source: 'online',
      })
      .run();

    const agent = await signedInAgent(user.email);
    const response = await agent.get('/api/dashboard').expect(200);

    expect(response.body.monthRevenueCents).toBe(6900);
  });
});
