import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { hashPassword } from '../auth/password.js';
import { db } from '../db/client.js';
import { appointments, clinics, customers, depositPayments, users } from '../db/schema.js';
import { addMinutes } from '../lib/dates.js';
import { createClinicFixture, signedInAgent, TEST_PASSWORD } from '../test/fixtures.js';

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
        priceCents: service.priceCents,
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
        priceCents: service.priceCents,
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
        priceCents: service.priceCents,
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
          priceCents: service.priceCents,
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
          priceCents: service.priceCents,
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

  it('filters by customer email and phone, ignoring phone spaces', async () => {
    const { clinic, user, staff, service } = await createClinicFixture();
    const customer = db
      .insert(customers)
      .values({
        clinicId: clinic.id,
        name: 'Caller Customer',
        email: 'caller@example.com',
        phone: '040 123 4567',
      })
      .returning()
      .get();
    insertAppointment(clinic.id, service.id, staff.id, customer.id, '2027-01-12T08:00:00.000Z');

    const agent = await signedInAgent(user.email);
    const byEmail = await agent.get('/api/appointments?q=CALLER%40EXAMPLE.COM').expect(200);
    expect(byEmail.body.appointments.map((item: { customer: { name: string } }) => item.customer.name)).toEqual([
      'Caller Customer',
    ]);

    const byUnspacedPhone = await agent.get('/api/appointments?q=0401234567').expect(200);
    expect(byUnspacedPhone.body.appointments.map((item: { customer: { name: string } }) => item.customer.name)).toEqual([
      'Caller Customer',
    ]);

    const bySpacedPhone = await agent.get('/api/appointments').query({ q: '040 123 4567' }).expect(200);
    expect(bySpacedPhone.body.appointments.map((item: { customer: { name: string } }) => item.customer.name)).toEqual([
      'Caller Customer',
    ]);
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
          priceCents: service.priceCents,
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
        priceCents: service.priceCents,
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
        priceCents: service.priceCents,
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
          priceCents: service.priceCents,
          source: 'online',
        })
        .run();
    }

    const agent = await signedInAgent(user.email);
    const response = await agent.get('/api/appointments?scope=upcoming').expect(200);

    expect(response.body.appointments).toHaveLength(1);
  });
});

function insertAppointment(
  clinicId: number,
  serviceId: number,
  staffId: number,
  customerId: number,
  startsAt: string,
  overrides: Partial<typeof appointments.$inferInsert> = {},
) {
  db.insert(appointments)
    .values({
      clinicId,
      serviceId,
      staffId,
      customerId,
      startsAt: new Date(startsAt),
      endsAt: addMinutes(new Date(startsAt), 60),
      priceCents: 8000, // the fixture service's price
      source: 'online',
      ...overrides,
    })
    .run();
}

describe('appointment date range', () => {
  it('filters by an inclusive date range in the clinic time zone (Helsinki)', async () => {
    const { clinic, user, staff, service, customer } = await createClinicFixture();
    // Europe/Helsinki is UTC+2 in January: local days start at 22:00 UTC the day before.
    insertAppointment(clinic.id, service.id, staff.id, customer.id, '2027-01-11T21:59:00.000Z'); // 23:59 local Mon 11 — outside
    insertAppointment(clinic.id, service.id, staff.id, customer.id, '2027-01-11T22:00:00.000Z'); // 00:00 local Tue 12 — first moment
    insertAppointment(clinic.id, service.id, staff.id, customer.id, '2027-01-12T20:00:00.000Z'); // 22:00 local Tue 12 — inside
    insertAppointment(clinic.id, service.id, staff.id, customer.id, '2027-01-12T22:00:00.000Z'); // 00:00 local Wed 13 — outside

    const agent = await signedInAgent(user.email);
    const response = await agent
      .get('/api/appointments?from=2027-01-12&to=2027-01-12')
      .expect(200);

    expect(response.body.appointments.map((item: { startsAt: string }) => item.startsAt)).toEqual([
      '2027-01-11T22:00:00.000Z',
      '2027-01-12T20:00:00.000Z',
    ]);
  });

  it('filters by the date range in the clinic time zone (Stockholm)', async () => {
    const { clinic, user, staff, service, customer } = await createClinicFixture({
      timezone: 'Europe/Stockholm',
    });
    // Europe/Stockholm is UTC+1 in January.
    insertAppointment(clinic.id, service.id, staff.id, customer.id, '2027-01-11T22:59:00.000Z'); // 23:59 local Mon 11 — outside
    insertAppointment(clinic.id, service.id, staff.id, customer.id, '2027-01-11T23:00:00.000Z'); // 00:00 local Tue 12 — inside

    const agent = await signedInAgent(user.email);
    const response = await agent
      .get('/api/appointments?from=2027-01-12&to=2027-01-12')
      .expect(200);

    expect(response.body.appointments.map((item: { startsAt: string }) => item.startsAt)).toEqual([
      '2027-01-11T23:00:00.000Z',
    ]);
  });

  it('rejects a range where from is after to', async () => {
    const { user } = await createClinicFixture();
    const agent = await signedInAgent(user.email);

    const response = await agent
      .get('/api/appointments?from=2027-02-01&to=2027-01-01')
      .expect(400);

    expect(response.body.error).toBe('From date must be before To date');
  });

  it('lets the range take precedence over the scope tabs', async () => {
    const { clinic, user, staff, service, customer } = await createClinicFixture();
    insertAppointment(clinic.id, service.id, staff.id, customer.id, '2027-01-12T10:00:00.000Z');

    const agent = await signedInAgent(user.email);
    const response = await agent
      .get('/api/appointments?scope=past&from=2027-01-12&to=2027-01-12')
      .expect(200);

    expect(response.body.appointments).toHaveLength(1);
  });

  it('combines the range with the status filter and the name search', async () => {
    const { clinic, user, staff, service, customer } = await createClinicFixture();
    const accented = db
      .insert(customers)
      .values({ clinicId: clinic.id, name: 'Älli Öhman', email: 'alli@example.com' })
      .returning()
      .get();
    insertAppointment(clinic.id, service.id, staff.id, customer.id, '2027-01-12T08:00:00.000Z', {
      status: 'completed',
    });
    insertAppointment(clinic.id, service.id, staff.id, accented.id, '2027-01-12T09:00:00.000Z', {
      status: 'booked',
    });

    const agent = await signedInAgent(user.email);
    const byStatus = await agent
      .get('/api/appointments?from=2027-01-12&to=2027-01-12&status=completed')
      .expect(200);
    expect(byStatus.body.appointments).toHaveLength(1);
    expect(byStatus.body.appointments[0].customer.name).toBe('Ville Asiakas');

    const bySearch = await agent
      .get('/api/appointments?from=2027-01-12&to=2027-01-12&q=ÄLLI')
      .expect(200);
    expect(bySearch.body.appointments).toHaveLength(1);
    expect(bySearch.body.appointments[0].customer.name).toBe('Älli Öhman');
  });
});

describe('appointments export', () => {
  it('requires sign-in', async () => {
    await request(createApp()).get('/api/appointments/export').expect(401);
  });

  it('rejects Acme admin accounts', async () => {
    const admin = db
      .insert(users)
      .values({
        clinicId: null,
        email: 'sanna@acme.example',
        name: 'Sanna Admin',
        role: 'acme_admin',
        passwordHash: await hashPassword(TEST_PASSWORD),
      })
      .returning()
      .get();
    const agent = await signedInAgent(admin.email);

    await agent.get('/api/appointments/export').expect(403);
  });

  it('downloads a CSV with BOM, header and one row per appointment for the owner', async () => {
    const { clinic, user, staff, service, customer } = await createClinicFixture();
    const withDeposit = db
      .insert(appointments)
      .values({
        clinicId: clinic.id,
        serviceId: service.id,
        staffId: staff.id,
        customerId: customer.id,
        startsAt: new Date('2027-01-12T08:00:00.000Z'), // 10:00 in Helsinki
        endsAt: new Date('2027-01-12T09:00:00.000Z'),
        priceCents: service.priceCents,
        source: 'online',
      })
      .returning()
      .get();
    db.insert(depositPayments)
      .values({
        clinicId: clinic.id,
        appointmentId: withDeposit.id,
        amountCents: 2500,
        status: 'paid',
        refundableHours: 24,
        paidAt: new Date('2027-01-01T10:00:00.000Z'),
      })
      .run();

    const agent = await signedInAgent(user.email);
    const response = await agent
      .get('/api/appointments/export?from=2027-01-12&to=2027-01-12')
      .expect(200);

    expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="appointments-2027-01-12_2027-01-12.csv"',
    );
    expect(response.text.startsWith('\uFEFF' + 'Date;Time;Customer;')).toBe(true);
    expect(response.text).toContain(
      '2027-01-12;10:00;Ville Asiakas;ville@example.com;;Assessment;Pekka Physio;Booked;80,00;25,00;',
    );
  });

  it('downloads for staff accounts too', async () => {
    const { user } = await createClinicFixture({}, 'staff');
    const agent = await signedInAgent(user.email);

    await agent.get('/api/appointments/export').expect(200);
  });

  it('applies the list filters to the export', async () => {
    const { clinic, user, staff, service, customer } = await createClinicFixture();
    insertAppointment(clinic.id, service.id, staff.id, customer.id, '2027-01-12T08:00:00.000Z', {
      status: 'completed',
    });
    insertAppointment(clinic.id, service.id, staff.id, customer.id, '2027-01-12T09:00:00.000Z', {
      status: 'cancelled',
    });

    const agent = await signedInAgent(user.email);
    const response = await agent
      .get('/api/appointments/export?from=2027-01-12&to=2027-01-12&status=completed')
      .expect(200);

    const lines = response.text.split('\r\n');
    expect(lines).toHaveLength(3); // header + one row + the empty tail after the final CRLF
    expect(lines[1]).toContain(';Completed;');
    expect(response.text).not.toContain('Cancelled');
  });

  it('keeps other clinics out of the export', async () => {
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
    insertAppointment(clinic.id, service.id, staff.id, customer.id, '2027-01-12T08:00:00.000Z');
    insertAppointment(otherClinic.id, service.id, staff.id, customer.id, '2027-01-12T09:00:00.000Z');

    const agent = await signedInAgent(user.email);
    const response = await agent
      .get('/api/appointments/export?from=2027-01-12&to=2027-01-12')
      .expect(200);

    expect(response.text.split('\r\n')).toHaveLength(3); // header + own clinic's row only
  });
});
