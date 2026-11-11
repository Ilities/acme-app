import { describe, expect, it } from 'vitest';
import { db } from '../db/client.js';
import { customers } from '../db/schema.js';
import { createClinicFixture, signedInAgent } from '../test/fixtures.js';

describe('customers routes', () => {
  it('searches names case-insensitively, including Swedish letters', async () => {
    const { clinic, user } = await createClinicFixture();
    db.insert(customers)
      .values([
        { clinicId: clinic.id, name: 'Lars Öberg', email: 'lars.oberg@example.com' },
        { clinicId: clinic.id, name: 'Åsa Lind', email: 'asa.lind@example.com' },
      ])
      .run();

    const agent = await signedInAgent(user.email);
    const ob = await agent.get('/api/customers?q=öberg').expect(200);
    const asa = await agent.get('/api/customers?q=åsa').expect(200);

    expect(ob.body.customers.map((customer: { name: string }) => customer.name)).toEqual(['Lars Öberg']);
    expect(asa.body.customers.map((customer: { name: string }) => customer.name)).toEqual(['Åsa Lind']);
  });

  it('searches email case-insensitively, including Swedish letters', async () => {
    const { clinic, user } = await createClinicFixture();
    db.insert(customers)
      .values({ clinicId: clinic.id, name: 'Lars Öberg', email: 'lars.öberg@example.com' })
      .run();

    const agent = await signedInAgent(user.email);
    const response = await agent.get('/api/customers?q=LARS.ÖBERG').expect(200);

    expect(response.body.customers.map((customer: { email: string }) => customer.email)).toEqual([
      'lars.öberg@example.com',
    ]);
  });
});
