import { describe, expect, it } from 'vitest';
import { db } from '../db/client.js';
import { appointments } from '../db/schema.js';
import { addMinutes } from '../lib/dates.js';
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
        source: 'online',
      })
      .run();

    const agent = await signedInAgent(user.email);
    const response = await agent.get('/api/dashboard').expect(200);

    expect(response.body.clinicName).toBe('Test Clinic');
    expect(response.body.upcoming[0].timeLabel).toBe('Tue 12 Jan, 10:00');
  });
});
