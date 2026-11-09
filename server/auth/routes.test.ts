import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { TEST_PASSWORD, createClinicFixture, signedInAgent } from '../test/fixtures.js';

describe('auth routes', () => {
  it('signs in and returns the current user', async () => {
    const { user } = await createClinicFixture();
    const agent = await signedInAgent(user.email);

    const response = await agent.get('/api/auth/me').expect(200);

    expect(response.body.user).toMatchObject({ email: user.email, role: 'owner' });
  });

  it('accepts the email with different casing and whitespace', async () => {
    await createClinicFixture();

    await request(createApp())
      .post('/api/auth/sign-in')
      .send({ email: '  Owner@TestClinic.example ', password: TEST_PASSWORD })
      .expect(200);
  });

  it('rejects a wrong password', async () => {
    const { user } = await createClinicFixture();

    const response = await request(createApp())
      .post('/api/auth/sign-in')
      .send({ email: user.email, password: 'not the password' })
      .expect(401);

    expect(response.body.error).toMatch(/not right/);
  });

  it('protects clinic routes', async () => {
    await request(createApp()).get('/api/appointments').expect(401);
  });

  it('signs out', async () => {
    const { user } = await createClinicFixture();
    const agent = await signedInAgent(user.email);

    await agent.post('/api/auth/sign-out').expect(204);

    const response = await agent.get('/api/auth/me').expect(200);
    expect(response.body.user).toBeNull();
  });

  it('keeps clinic users out of the admin area', async () => {
    const { user } = await createClinicFixture();
    const agent = await signedInAgent(user.email);

    await agent.get('/api/admin/orders').expect(403);
  });
});
