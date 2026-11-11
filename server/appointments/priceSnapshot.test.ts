import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createApp } from '../app.js';
import { db } from '../db/client.js';
import { appointments } from '../db/schema.js';
import { addDays, toLocalDateString } from '../lib/dates.js';
import { createClinicFixture, signedInAgent } from '../test/fixtures.js';

function today(): string {
  return toLocalDateString(new Date(), 'Europe/Helsinki');
}

/** The fixture clinic opens every day 09:00–17:00 in Europe/Helsinki. */
function bookOnline(serviceId: number) {
  const app = createApp();
  return request(app)
    .post('/api/public/clinics/test-clinic/bookings')
    .send({
      serviceId,
      startsAt: new Date(`${addDays(today(), 3)}T07:00:00.000Z`).toISOString(),
      customer: { name: 'Maija Meikäläinen', email: 'maija@example.com' },
    });
}

describe('the price a booking was made at', () => {
  it('stores the service price on an online booking', async () => {
    const { service } = await createClinicFixture();

    const response = await bookOnline(service.id).expect(201);
    const stored = db
      .select()
      .from(appointments)
      .where(eq(appointments.id, response.body.booking.appointmentId))
      .get();

    expect(stored?.priceCents).toBe(service.priceCents);
  });

  it('stores the service price on a booking staff make', async () => {
    const { user, staff, service, customer } = await createClinicFixture();
    const agent = await signedInAgent(user.email);

    const response = await agent
      .post('/api/appointments')
      .send({
        customerId: customer.id,
        serviceId: service.id,
        staffId: staff.id,
        date: addDays(today(), 3),
        time: '09:00',
      })
      .expect(201);

    expect(response.body.appointment.priceCents).toBe(service.priceCents);
  });

  it('keeps the booked price after the service is re-priced', async () => {
    const { user, staff, service, customer } = await createClinicFixture();
    const agent = await signedInAgent(user.email);

    const upcoming = await agent
      .post('/api/appointments')
      .send({
        customerId: customer.id,
        serviceId: service.id,
        staffId: staff.id,
        date: addDays(today(), 3),
        time: '09:00',
      })
      .expect(201);
    const visit = await agent
      .post('/api/appointments')
      .send({
        customerId: customer.id,
        serviceId: service.id,
        staffId: staff.id,
        date: addDays(today(), 1),
        time: '09:00',
      })
      .expect(201);
    await agent
      .patch(`/api/appointments/${visit.body.appointment.id}`)
      .send({ status: 'completed' })
      .expect(200);

    // The January price rise the owner is allowed to make.
    await agent.patch(`/api/services/${service.id}`).send({ priceCents: 12_000 }).expect(200);

    const list = await agent.get('/api/appointments?scope=upcoming').expect(200);
    expect(
      list.body.appointments.find((item: { id: number }) => item.id === upcoming.body.appointment.id)
        .priceCents,
    ).toBe(service.priceCents);

    const bookedPrice = `${(service.priceCents / 100).toFixed(2).replace('.', ',')}`;
    const csv = await agent.get('/api/appointments/export').expect(200);
    expect(csv.text).toContain(`;${bookedPrice};`);
    expect(csv.text).not.toContain('120,00');

    const dashboard = await agent.get('/api/dashboard').expect(200);
    expect(dashboard.body.monthRevenueCents).toBe(service.priceCents);

    // New bookings get the new price.
    const after = await agent
      .post('/api/appointments')
      .send({
        customerId: customer.id,
        serviceId: service.id,
        staffId: staff.id,
        date: addDays(today(), 5),
        time: '09:00',
      })
      .expect(201);
    expect(after.body.appointment.priceCents).toBe(12_000);
  });
});
