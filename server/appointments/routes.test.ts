import { describe, expect, it } from 'vitest';
import { db } from '../db/client.js';
import { appointments } from '../db/schema.js';
import { addMinutes } from '../lib/dates.js';
import { createClinicFixture, signedInAgent } from '../test/fixtures.js';

describe('appointments routes', () => {
  it('lists upcoming appointments with service, staff and customer', async () => {
    const { clinic, user, staff, service, customer } = await createClinicFixture();
    const startsAt = addMinutes(new Date(), 24 * 60);
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
    const response = await agent.get('/api/appointments?scope=upcoming').expect(200);

    expect(response.body.appointments).toHaveLength(1);
    expect(response.body.appointments[0]).toMatchObject({
      startsAt: startsAt.toISOString(),
      durationMinutes: 60,
      status: 'booked',
      service: { name: 'Assessment' },
      staff: { name: 'Pekka Physio' },
      customer: { name: 'Ville Asiakas' },
    });
  });

  it('creates an appointment in clinic local time', async () => {
    const { user, staff, service, customer } = await createClinicFixture();
    const agent = await signedInAgent(user.email);

    const response = await agent
      .post('/api/appointments')
      .send({
        customerId: customer.id,
        serviceId: service.id,
        staffId: staff.id,
        date: '2027-01-12',
        time: '10:00',
      })
      .expect(201);

    expect(response.body.appointment.startsAt).toBe('2027-01-12T08:00:00.000Z');
  });

  it('refuses to double-book a staff member', async () => {
    const { user, staff, service, customer } = await createClinicFixture();
    const agent = await signedInAgent(user.email);
    const body = {
      customerId: customer.id,
      serviceId: service.id,
      staffId: staff.id,
      date: '2027-01-12',
      time: '10:00',
    };

    await agent.post('/api/appointments').send(body).expect(201);
    const response = await agent
      .post('/api/appointments')
      .send({ ...body, time: '10:30' })
      .expect(409);

    expect(response.body.error).toContain('Pekka Physio');
  });

  it('updates the status of an appointment', async () => {
    const { user, staff, service, customer } = await createClinicFixture();
    const agent = await signedInAgent(user.email);
    const created = await agent.post('/api/appointments').send({
      customerId: customer.id,
      serviceId: service.id,
      staffId: staff.id,
      date: '2027-01-12',
      time: '13:00',
    });

    const response = await agent
      .patch(`/api/appointments/${created.body.appointment.id}`)
      .send({ status: 'cancelled' })
      .expect(200);

    expect(response.body.appointment.status).toBe('cancelled');
  });
});
