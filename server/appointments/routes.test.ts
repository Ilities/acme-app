import { describe, expect, it } from 'vitest';
import { db } from '../db/client.js';
import { appointments, clinics, customers, depositPayments } from '../db/schema.js';
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

  it('labels appointment times in the clinic time zone (Helsinki)', async () => {
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
    const response = await agent.get('/api/appointments?scope=upcoming').expect(200);

    expect(response.body.appointments[0].timeLabel).toBe('Tue 12 Jan, 10:00');
  });

  it('labels appointment times in the clinic time zone (Stockholm)', async () => {
    const { clinic, user, staff, service, customer } = await createClinicFixture({
      timezone: 'Europe/Stockholm',
    });
    // 08:00 UTC is 09:00 in Europe/Stockholm.
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
    const response = await agent.get('/api/appointments?scope=upcoming').expect(200);

    expect(response.body.appointments[0].timeLabel).toBe('Tue 12 Jan, 09:00');
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

  it('lists past appointments newest first', async () => {
    const { clinic, user, staff, service, customer } = await createClinicFixture();
    const older = addMinutes(new Date(), -2 * 24 * 60);
    const newer = addMinutes(new Date(), -24 * 60);
    for (const startsAt of [older, newer]) {
      db.insert(appointments)
        .values({
          clinicId: clinic.id,
          serviceId: service.id,
          staffId: staff.id,
          customerId: customer.id,
          startsAt,
          endsAt: addMinutes(startsAt, 60),
          source: 'staff',
          status: 'completed',
        })
        .run();
    }

    const agent = await signedInAgent(user.email);
    const response = await agent.get('/api/appointments?scope=past').expect(200);

    expect(response.body.appointments.map((item: { startsAt: string }) => item.startsAt)).toEqual([
      newer.toISOString(),
      older.toISOString(),
    ]);
  });

  it('filters by customer name as a case-insensitive substring', async () => {
    const { clinic, user, staff, service, customer } = await createClinicFixture();
    const accented = db
      .insert(customers)
      .values({ clinicId: clinic.id, name: 'Älli Öhman', email: 'alli@example.com' })
      .returning()
      .get();
    const startsAt = addMinutes(new Date(), 24 * 60);
    for (const customerId of [customer.id, accented.id]) {
      db.insert(appointments)
        .values({
          clinicId: clinic.id,
          serviceId: service.id,
          staffId: staff.id,
          customerId,
          startsAt,
          endsAt: addMinutes(startsAt, 60),
          source: 'online',
        })
        .run();
    }

    const agent = await signedInAgent(user.email);
    const response = await agent
      .get('/api/appointments')
      .query({ scope: 'upcoming', q: 'ÄLLI' })
      .expect(200);

    expect(response.body.appointments).toHaveLength(1);
    expect(response.body.appointments[0].customer.name).toBe('Älli Öhman');
  });

  it('treats LIKE wildcards in the search as literal characters', async () => {
    const { clinic, user, staff, service, customer } = await createClinicFixture();
    const percent = db
      .insert(customers)
      .values({ clinicId: clinic.id, name: 'Percent % Customer', email: 'percent@example.com' })
      .returning()
      .get();
    const startsAt = addMinutes(new Date(), 24 * 60);
    for (const customerId of [customer.id, percent.id]) {
      db.insert(appointments)
        .values({
          clinicId: clinic.id,
          serviceId: service.id,
          staffId: staff.id,
          customerId,
          startsAt: addMinutes(startsAt, 60),
          endsAt: addMinutes(startsAt, 120),
          source: 'online',
        })
        .run();
    }

    const agent = await signedInAgent(user.email);
    const response = await agent
      .get('/api/appointments')
      .query({ scope: 'upcoming', q: '%' })
      .expect(200);

    expect(response.body.appointments).toHaveLength(1);
    expect(response.body.appointments[0].customer.name).toBe('Percent % Customer');
  });

  it('returns deposits when present and null when absent', async () => {
    const { clinic, user, staff, service, customer } = await createClinicFixture();
    const startsAt = addMinutes(new Date(), 24 * 60);
    const withDeposit = db
      .insert(appointments)
      .values({
        clinicId: clinic.id,
        serviceId: service.id,
        staffId: staff.id,
        customerId: customer.id,
        startsAt,
        endsAt: addMinutes(startsAt, 60),
        source: 'online',
      })
      .returning()
      .get();
    db.insert(appointments)
      .values({
        clinicId: clinic.id,
        serviceId: service.id,
        staffId: staff.id,
        customerId: customer.id,
        startsAt: addMinutes(startsAt, 120),
        endsAt: addMinutes(startsAt, 180),
        source: 'staff',
      })
      .run();
    const paidAt = new Date('2027-01-01T10:00:00.000Z');
    db.insert(depositPayments)
      .values({
        clinicId: clinic.id,
        appointmentId: withDeposit.id,
        amountCents: 2500,
        status: 'paid',
        refundableHours: 24,
        paidAt,
      })
      .run();

    const agent = await signedInAgent(user.email);
    const response = await agent.get('/api/appointments?scope=upcoming').expect(200);

    expect(response.body.appointments).toHaveLength(2);
    expect(response.body.appointments[0].deposit).toMatchObject({
      amountCents: 2500,
      status: 'paid',
      paidAt: paidAt.toISOString(),
    });
    expect(response.body.appointments[1].deposit).toBeNull();
  });

  it('does not return appointments from another clinic', async () => {
    const { clinic, user, staff, service, customer } = await createClinicFixture();
    const otherClinic = db
      .insert(clinics)
      .values({
        name: 'Other Clinic',
        slug: 'other-clinic',
        email: 'hello@otherclinic.example',
        city: 'Helsinki',
        country: 'FI',
      })
      .returning()
      .get();
    const startsAt = addMinutes(new Date(), 24 * 60);
    for (const clinicId of [clinic.id, otherClinic.id]) {
      db.insert(appointments)
        .values({
          clinicId,
          serviceId: service.id,
          staffId: staff.id,
          customerId: customer.id,
          startsAt,
          endsAt: addMinutes(startsAt, 60),
          source: 'online',
        })
        .run();
    }

    const agent = await signedInAgent(user.email);
    const response = await agent.get('/api/appointments?scope=upcoming').expect(200);

    expect(response.body.appointments).toHaveLength(1);
  });
});
