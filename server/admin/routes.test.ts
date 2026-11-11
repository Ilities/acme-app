import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { db } from '../db/client.js';
import { orderNotes, planOrders } from '../db/schema.js';
import {
  createAdminFixture,
  createClinicFixture,
  signedInAgent,
} from '../test/fixtures.js';

function createOrder(clinicId: number) {
  return db
    .insert(planOrders)
    .values({
      clinicId,
      plan: 'clinic',
      subtotalCents: 7900,
      vatCents: 1896,
      amountCents: 9796,
      billingName: 'Test Clinic',
      status: 'paid',
      paidAt: new Date(),
    })
    .returning()
    .get();
}

describe('admin order notes', () => {
  it('keeps clinic users and anonymous visitors out', async () => {
    const { clinic, user } = await createClinicFixture();
    const order = createOrder(clinic.id);
    const agent = await signedInAgent(user.email);

    await agent.get(`/api/admin/orders/${order.id}/notes`).expect(403);
    await agent.post(`/api/admin/orders/${order.id}/notes`).send({ body: 'Hi' }).expect(403);

    await request(createApp()).get(`/api/admin/orders/${order.id}/notes`).expect(401);
    await request(createApp()).post(`/api/admin/orders/${order.id}/notes`).send({ body: 'Hi' }).expect(401);
  });

  it('adds a note and returns it with the author and time', async () => {
    const { clinic } = await createClinicFixture();
    const order = createOrder(clinic.id);
    const { user: admin } = await createAdminFixture();
    const agent = await signedInAgent(admin.email);

    const created = await agent
      .post(`/api/admin/orders/${order.id}/notes`)
      .send({ body: '  Paid by bank transfer.  ' })
      .expect(201);

    expect(created.body.note).toMatchObject({
      body: 'Paid by bank transfer.',
      authorName: admin.name,
    });
    expect(created.body.note.createdAt).toBeTruthy();

    const list = await agent.get(`/api/admin/orders/${order.id}/notes`).expect(200);
    expect(list.body.notes).toHaveLength(1);
    expect(list.body.notes[0]).toMatchObject({ body: 'Paid by bank transfer.', authorName: admin.name });

    const orders = await agent.get('/api/admin/orders').expect(200);
    expect(orders.body.orders.find((row: { id: number }) => row.id === order.id).noteCount).toBe(1);
  });

  it('lists the newest note first', async () => {
    const { clinic } = await createClinicFixture();
    const order = createOrder(clinic.id);
    const { user: admin } = await createAdminFixture();
    const agent = await signedInAgent(admin.email);

    db.insert(orderNotes)
      .values({ orderId: order.id, authorId: admin.id, body: 'Older', createdAt: new Date('2026-01-01T09:00:00Z') })
      .run();
    db.insert(orderNotes)
      .values({ orderId: order.id, authorId: admin.id, body: 'Newer', createdAt: new Date('2026-02-01T09:00:00Z') })
      .run();

    const response = await agent.get(`/api/admin/orders/${order.id}/notes`).expect(200);
    expect(response.body.notes.map((note: { body: string }) => note.body)).toEqual(['Newer', 'Older']);
  });

  it('validates the note body', async () => {
    const { clinic } = await createClinicFixture();
    const order = createOrder(clinic.id);
    const { user: admin } = await createAdminFixture();
    const agent = await signedInAgent(admin.email);

    await agent.post(`/api/admin/orders/${order.id}/notes`).send({ body: '   ' }).expect(400);
    await agent.post(`/api/admin/orders/${order.id}/notes`).send({ body: 'x'.repeat(2001) }).expect(400);
  });

  it('returns 404 for an unknown order', async () => {
    const { user: admin } = await createAdminFixture();
    const agent = await signedInAgent(admin.email);

    await agent.get('/api/admin/orders/9999/notes').expect(404);
    await agent.post('/api/admin/orders/9999/notes').send({ body: 'Hello' }).expect(404);
  });

  it('never exposes notes on the clinic billing endpoints', async () => {
    const { clinic, user } = await createClinicFixture();
    const order = createOrder(clinic.id);
    const { user: admin } = await createAdminFixture();
    const adminAgent = await signedInAgent(admin.email);

    await adminAgent
      .post(`/api/admin/orders/${order.id}/notes`)
      .send({ body: 'Sent the invoice to their accountant.' })
      .expect(201);

    const clinicAgent = await signedInAgent(user.email);
    const response = await clinicAgent.get('/api/billing/orders').expect(200);

    expect(JSON.stringify(response.body)).not.toContain('accountant');
    for (const row of response.body.orders) {
      expect(Object.keys(row)).not.toContain('notes');
      expect(Object.keys(row)).not.toContain('noteCount');
    }
  });
});
