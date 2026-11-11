import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createApp } from '../app.js';
import { db } from '../db/client.js';
import { appointments, depositPayments, services } from '../db/schema.js';
import { addDays, toLocalDateString } from '../lib/dates.js';
import { mailer } from '../mail/mailer.js';
import { createClinicFixture, signedInAgent } from '../test/fixtures.js';

function bookableDate(): string {
  return addDays(toLocalDateString(new Date(), 'Europe/Helsinki'), 3);
}

function validCard(number = '4242424242424242') {
  return { number, expMonth: 12, expYear: new Date().getFullYear() + 1, cvc: '123' };
}

function withDeposit(serviceId: number, depositType: 'fixed' | 'percent', depositValue: number) {
  db.update(services)
    .set({ depositType, depositValue })
    .where(eq(services.id, serviceId))
    .run();
}

async function firstSlot(app: ReturnType<typeof createApp>, serviceId: number, date: string) {
  const availability = await request(app).get(
    `/api/public/clinics/test-clinic/availability?serviceId=${serviceId}&date=${date}`,
  );
  return availability.body.slots[0].startsAt as string;
}

describe('public booking routes', () => {
  it('shows the booking page for a clinic', async () => {
    await createClinicFixture();

    const response = await request(createApp()).get('/api/public/clinics/test-clinic').expect(200);

    expect(response.body.clinic.name).toBe('Test Clinic');
    expect(response.body.services).toHaveLength(1);
    expect(response.body.staff).toHaveLength(1);
    expect(response.body.services[0].deposit).toBeNull();
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
      depositPaidCents: null,
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

describe('booking deposits', () => {
  it('shows the deposit a service asks for on the booking page', async () => {
    const { service } = await createClinicFixture({
      depositsEnabled: true,
      depositRefundableHours: 48,
    });
    withDeposit(service.id, 'fixed', 2500);

    const response = await request(createApp()).get('/api/public/clinics/test-clinic').expect(200);

    expect(response.body.services[0].deposit).toEqual({ amountCents: 2500, refundableHours: 48 });
  });

  it('computes percentage deposits from the service price', async () => {
    const { service } = await createClinicFixture({ depositsEnabled: true });
    withDeposit(service.id, 'percent', 25);

    const response = await request(createApp()).get('/api/public/clinics/test-clinic').expect(200);

    expect(response.body.services[0].deposit.amountCents).toBe(2000);
  });

  it('offers no deposit when the clinic has deposits off', async () => {
    const { service } = await createClinicFixture();
    withDeposit(service.id, 'fixed', 2500);

    const response = await request(createApp()).get('/api/public/clinics/test-clinic').expect(200);

    expect(response.body.services[0].deposit).toBeNull();
  });

  it('requires a card when the service asks for a deposit', async () => {
    const { service } = await createClinicFixture({ depositsEnabled: true });
    withDeposit(service.id, 'fixed', 2000);
    const app = createApp();
    const startsAt = await firstSlot(app, service.id, bookableDate());

    const response = await request(app)
      .post('/api/public/clinics/test-clinic/bookings')
      .send({
        serviceId: service.id,
        startsAt,
        customer: { name: 'Maija Meikäläinen', email: 'maija@example.com' },
      })
      .expect(400);

    expect(response.body.error).toMatch(/deposit/i);
    expect(db.select().from(appointments).all()).toHaveLength(0);
    expect(db.select().from(depositPayments).all()).toHaveLength(0);
  });

  it('charges the deposit and shows it as paid on the appointment', async () => {
    const { service } = await createClinicFixture({ depositsEnabled: true });
    withDeposit(service.id, 'fixed', 2000);
    const app = createApp();
    const startsAt = await firstSlot(app, service.id, bookableDate());

    const response = await request(app)
      .post('/api/public/clinics/test-clinic/bookings')
      .send({
        serviceId: service.id,
        startsAt,
        customer: { name: 'Maija Meikäläinen', email: 'maija@example.com' },
        card: validCard(),
      })
      .expect(201);

    expect(response.body.booking.depositPaidCents).toBe(2000);

    const deposit = db.select().from(depositPayments).get();
    expect(deposit).toMatchObject({
      amountCents: 2000,
      status: 'paid',
      refundableHours: 24,
      failureReason: null,
    });
    expect(deposit?.providerReference).toMatch(/^fake_ch_/);
    expect(deposit?.paidAt).toBeInstanceOf(Date);

    const agent = await signedInAgent('owner@testclinic.example');
    const list = await agent.get('/api/appointments?scope=upcoming').expect(200);
    expect(list.body.appointments).toHaveLength(1);
    expect(list.body.appointments[0].deposit).toMatchObject({ amountCents: 2000, status: 'paid' });

    expect(mailer.outbox[0].text).toContain('Deposit paid: €20.00');
    expect(mailer.outbox[0].text).toContain('Cancel at least 24 hours before');
  });

  it('leaves no booking behind when the card is declined', async () => {
    const { service } = await createClinicFixture({ depositsEnabled: true });
    withDeposit(service.id, 'fixed', 2000);
    const app = createApp();
    const startsAt = await firstSlot(app, service.id, bookableDate());
    const booking = {
      serviceId: service.id,
      startsAt,
      customer: { name: 'Maija Meikäläinen', email: 'maija@example.com' },
    };

    const declined = await request(app)
      .post('/api/public/clinics/test-clinic/bookings')
      .send({ ...booking, card: validCard('4000000000000002') })
      .expect(402);
    expect(declined.body.error).toBe('Your card was declined. Please try another card.');

    const funds = await request(app)
      .post('/api/public/clinics/test-clinic/bookings')
      .send({ ...booking, card: validCard('4000000000009995') })
      .expect(402);
    expect(funds.body.error).toBe('Your card has insufficient funds.');

    expect(db.select().from(appointments).all()).toHaveLength(0);
    expect(db.select().from(depositPayments).all()).toHaveLength(0);
    expect(mailer.outbox).toHaveLength(0);

    // The slot was freed again and can still be booked.
    await request(app)
      .post('/api/public/clinics/test-clinic/bookings')
      .send({ ...booking, card: validCard() })
      .expect(201);
  });

  it('books without a card when no deposit is due', async () => {
    const { service } = await createClinicFixture();
    const app = createApp();
    const startsAt = await firstSlot(app, service.id, bookableDate());

    const response = await request(app)
      .post('/api/public/clinics/test-clinic/bookings')
      .send({
        serviceId: service.id,
        startsAt,
        customer: { name: 'Maija Meikäläinen', email: 'maija@example.com' },
      })
      .expect(201);

    expect(response.body.booking.depositPaidCents).toBeNull();
    expect(db.select().from(depositPayments).all()).toHaveLength(0);
  });
});
