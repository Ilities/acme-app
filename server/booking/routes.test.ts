import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { addDays, toLocalDateString } from '../lib/dates.js';
import { mailer } from '../mail/mailer.js';
import { createClinicFixture } from '../test/fixtures.js';

function bookableDate(): string {
  return addDays(toLocalDateString(new Date(), 'Europe/Helsinki'), 3);
}

describe('public booking routes', () => {
  it('shows the booking page for a clinic', async () => {
    await createClinicFixture();

    const response = await request(createApp()).get('/api/public/clinics/test-clinic').expect(200);

    expect(response.body.clinic.name).toBe('Test Clinic');
    expect(response.body.services).toHaveLength(1);
    expect(response.body.staff).toHaveLength(1);
  });

  it('hides clinics that have turned off online booking', async () => {
    await createClinicFixture({ bookingEnabled: false });

    await request(createApp()).get('/api/public/clinics/test-clinic').expect(404);
  });

  it('lists available times and books one', async () => {
    const { service } = await createClinicFixture();
    const app = createApp();
    const date = bookableDate();

    const availability = await request(app)
      .get(`/api/public/clinics/test-clinic/availability?serviceId=${service.id}&date=${date}`)
      .expect(200);
    expect(availability.body.slots[0].label).toBe('09:00');

    const response = await request(app)
      .post('/api/public/clinics/test-clinic/bookings')
      .send({
        serviceId: service.id,
        startsAt: availability.body.slots[0].startsAt,
        customer: { name: 'Maija Meikäläinen', email: 'maija@example.com' },
      })
      .expect(201);

    expect(response.body.booking).toMatchObject({
      serviceName: 'Assessment',
      staffName: 'Pekka Physio',
    });
    expect(mailer.outbox[0]).toMatchObject({
      to: 'maija@example.com',
      subject: 'Your booking at Test Clinic',
    });
  });

  it('rejects a time that is already taken', async () => {
    const { service } = await createClinicFixture();
    const app = createApp();
    const date = bookableDate();
    const availability = await request(app).get(
      `/api/public/clinics/test-clinic/availability?serviceId=${service.id}&date=${date}`,
    );
    const booking = {
      serviceId: service.id,
      startsAt: availability.body.slots[0].startsAt,
      customer: { name: 'Maija Meikäläinen', email: 'maija@example.com' },
    };

    await request(app).post('/api/public/clinics/test-clinic/bookings').send(booking).expect(201);
    await request(app).post('/api/public/clinics/test-clinic/bookings').send(booking).expect(409);
  });
});
