import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { clinics, services } from '../db/schema.js';
import { createClinicFixture, signedInAgent } from '../test/fixtures.js';

function serviceOfAnotherClinic() {
  const other = db
    .insert(clinics)
    .values({
      name: 'Other Clinic',
      slug: 'other-clinic',
      email: 'hello@otherclinic.example',
      city: 'Tampere',
      country: 'FI',
      timezone: 'Europe/Helsinki',
    })
    .returning()
    .get();

  return db
    .insert(services)
    .values({ clinicId: other.id, name: 'Other Assessment', durationMinutes: 30, priceCents: 4000 })
    .returning()
    .get();
}

describe('services routes', () => {
  it('lets the owner change name, price, duration and description', async () => {
    const { user, service } = await createClinicFixture();
    const agent = await signedInAgent(user.email);

    const response = await agent
      .patch(`/api/services/${service.id}`)
      .send({
        name: 'Longer assessment',
        description: 'Now with a written treatment plan.',
        durationMinutes: 45,
        priceCents: 9500,
      })
      .expect(200);

    expect(response.body.service).toMatchObject({
      id: service.id,
      name: 'Longer assessment',
      description: 'Now with a written treatment plan.',
      durationMinutes: 45,
      priceCents: 9500,
      active: true,
    });
  });

  it('keeps the deposit settings and the clinic of a service when it is edited', async () => {
    const { clinic, user, service } = await createClinicFixture();
    db.update(services)
      .set({ depositType: 'fixed', depositValue: 2000 })
      .where(eq(services.id, service.id))
      .run();

    const agent = await signedInAgent(user.email);
    const response = await agent
      .patch(`/api/services/${service.id}`)
      .send({ priceCents: 9500, durationMinutes: 30 })
      .expect(200);

    expect(response.body.service).toMatchObject({
      clinicId: clinic.id,
      name: 'Assessment',
      priceCents: 9500,
      durationMinutes: 30,
      depositType: 'fixed',
      depositValue: 2000,
    });
  });

  it('refuses staff: only the clinic owner can edit a service', async () => {
    const { user, service } = await createClinicFixture({}, 'staff');
    const agent = await signedInAgent(user.email);

    const response = await agent.patch(`/api/services/${service.id}`).send({ priceCents: 100 }).expect(403);

    expect(response.body.error).toBe('Only the clinic owner can do that');
  });

  it('refuses to edit a service belonging to another clinic', async () => {
    const { user } = await createClinicFixture();
    const foreign = serviceOfAnotherClinic();

    const agent = await signedInAgent(user.email);
    await agent.patch(`/api/services/${foreign.id}`).send({ priceCents: 100 }).expect(404);

    const untouched = db.select().from(services).where(eq(services.id, foreign.id)).get();
    expect(untouched?.priceCents).toBe(4000);
  });

  it('keeps the description of a service that is only re-priced', async () => {
    const { user, service } = await createClinicFixture();
    db.update(services)
      .set({ description: 'Full assessment and treatment plan.' })
      .where(eq(services.id, service.id))
      .run();

    const agent = await signedInAgent(user.email);
    const response = await agent.patch(`/api/services/${service.id}`).send({ priceCents: 9500 }).expect(200);

    expect(response.body.service.description).toBe('Full assessment and treatment plan.');
  });

  it('keeps the description when the service is hidden or shown again', async () => {
    const { user, service } = await createClinicFixture();
    db.update(services)
      .set({ description: 'Deep tissue massage focused on recovery.' })
      .where(eq(services.id, service.id))
      .run();

    const agent = await signedInAgent(user.email);
    const hidden = await agent.patch(`/api/services/${service.id}`).send({ active: false }).expect(200);

    expect(hidden.body.service.description).toBe('Deep tissue massage focused on recovery.');
  });

  it('lets the owner clear the description on purpose', async () => {
    const { user, service } = await createClinicFixture();
    db.update(services)
      .set({ description: 'Was here.' })
      .where(eq(services.id, service.id))
      .run();

    const agent = await signedInAgent(user.email);
    const response = await agent.patch(`/api/services/${service.id}`).send({ description: '' }).expect(200);

    expect(response.body.service.description).toBe('');
  });

  it('rejects durations that are not whole 15 minute steps between 15 and 240', async () => {
    const { user, service } = await createClinicFixture();
    const agent = await signedInAgent(user.email);

    const odd = await agent.patch(`/api/services/${service.id}`).send({ durationMinutes: 50 }).expect(400);
    expect(odd.body.details).toEqual([
      { path: 'durationMinutes', message: 'Duration must be in 15 minute steps' },
    ]);

    await agent.patch(`/api/services/${service.id}`).send({ durationMinutes: 10 }).expect(400);
    await agent.patch(`/api/services/${service.id}`).send({ durationMinutes: 255 }).expect(400);
  });

  it('rejects a missing name and a price outside the range', async () => {
    const { user, service } = await createClinicFixture();
    const agent = await signedInAgent(user.email);

    const shortName = await agent.patch(`/api/services/${service.id}`).send({ name: 'A' }).expect(400);
    expect(shortName.body.details).toEqual([{ path: 'name', message: 'Enter a name' }]);

    await agent.patch(`/api/services/${service.id}`).send({ priceCents: -1 }).expect(400);
    await agent.patch(`/api/services/${service.id}`).send({ priceCents: 1_000_001 }).expect(400);
  });

  it('still hides and shows a service', async () => {
    const { user, service } = await createClinicFixture();
    const agent = await signedInAgent(user.email);

    const hidden = await agent.patch(`/api/services/${service.id}`).send({ active: false }).expect(200);
    expect(hidden.body.service.active).toBe(false);

    const shown = await agent.patch(`/api/services/${service.id}`).send({ active: true }).expect(200);
    expect(shown.body.service.active).toBe(true);
  });

  it('rejects an update that carries no changes', async () => {
    const { user, service } = await createClinicFixture();
    const agent = await signedInAgent(user.email);

    const response = await agent.patch(`/api/services/${service.id}`).send({}).expect(400);
    expect(response.body.error).toBe('Nothing to update');
  });
});
