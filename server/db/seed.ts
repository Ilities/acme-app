import { hashPassword } from '../auth/password.js';
import { addDays, addMinutes, isoWeekday, toLocalDateString, zonedTimeToUtc } from '../lib/dates.js';
import { percentOf } from '../lib/money.js';
import { quotePlan } from '../payments/plans.js';
import { db, sqlite } from './client.js';
import {
  appointments,
  clinics,
  customers,
  depositPayments,
  passwordResetTokens,
  planOrders,
  services,
  sessions,
  staffMembers,
  users,
  type AppointmentStatus,
} from './schema.js';
import { ACME_ADMINS, APPOINTMENT_NOTES, SEED_CLINICS, SEED_PASSWORD, type SeedClinic } from './seedData.js';

const DAYS_BACK = 28;
const DAYS_AHEAD = 21;
const CUSTOMERS_PER_CLINIC = 36;

function createRandom(seed: number) {
  let state = seed;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    chance: (probability: number) => next() < probability,
  };
}

type Random = ReturnType<typeof createRandom>;

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]+/g, '.');
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function toTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function pastStatus(random: Random): AppointmentStatus {
  const roll = random.next();
  if (roll < 0.84) return 'completed';
  if (roll < 0.94) return 'cancelled';
  return 'no_show';
}

function clearDatabase() {
  db.delete(sessions).run();
  db.delete(passwordResetTokens).run();
  db.delete(depositPayments).run();
  db.delete(appointments).run();
  db.delete(planOrders).run();
  db.delete(customers).run();
  db.delete(services).run();
  db.delete(staffMembers).run();
  db.delete(users).run();
  db.delete(clinics).run();
}

function seedClinic(seed: SeedClinic, passwordHash: string, random: Random, now: Date) {
  const clinic = db
    .insert(clinics)
    .values({
      name: seed.name,
      slug: seed.slug,
      email: seed.email,
      phone: seed.phone,
      addressLine: seed.addressLine,
      city: seed.city,
      country: seed.country,
      timezone: seed.timezone,
      opensAt: seed.opensAt,
      closesAt: seed.closesAt,
      openDays: seed.openDays,
      depositsEnabled: seed.depositsEnabled ?? false,
      depositRefundableHours: seed.depositRefundableHours ?? 24,
      plan: seed.plan,
      createdAt: new Date(now.getTime() - 400 * 86_400_000),
    })
    .returning()
    .get();

  for (const user of seed.users) {
    db.insert(users).values({ ...user, clinicId: clinic.id, passwordHash }).run();
  }

  const staff = seed.staff.map((member) =>
    db
      .insert(staffMembers)
      .values({ ...member, clinicId: clinic.id })
      .returning()
      .get(),
  );

  const clinicServices = seed.services.map((service) =>
    db
      .insert(services)
      .values({ ...service, clinicId: clinic.id })
      .returning()
      .get(),
  );

  const usedEmails = new Set<string>();
  const clinicCustomers = [];
  while (clinicCustomers.length < CUSTOMERS_PER_CLINIC) {
    const first = random.pick(seed.customerNames.first);
    const last = random.pick(seed.customerNames.last);
    const email = `${slugifyName(first)}.${slugifyName(last)}@${seed.emailDomain}`;
    if (usedEmails.has(email)) {
      continue;
    }
    usedEmails.add(email);
    clinicCustomers.push(
      db
        .insert(customers)
        .values({
          clinicId: clinic.id,
          name: `${first} ${last}`,
          email,
          phone: random.chance(0.7)
            ? `${seed.phonePrefix} ${random.int(100, 999)} ${random.int(1000, 9999)}`
            : null,
        })
        .returning()
        .get(),
    );
  }

  const openDays = seed.openDays.split(',').map(Number);
  const today = toLocalDateString(now, seed.timezone);
  const busy = new Map<number, { start: number; end: number }[]>();
  let created = 0;
  let attempts = 0;

  while (created < seed.appointmentCount && attempts < seed.appointmentCount * 20) {
    attempts++;
    const date = addDays(today, random.int(-DAYS_BACK, DAYS_AHEAD));
    if (!openDays.includes(isoWeekday(date))) {
      continue;
    }

    const service = random.pick(clinicServices);
    const member = random.pick(staff);
    const opensAt = toMinutes(seed.opensAt);
    const latestStart = toMinutes(seed.closesAt) - service.durationMinutes;
    const startMinutes = opensAt + random.int(0, Math.floor((latestStart - opensAt) / 30)) * 30;
    const startsAt = zonedTimeToUtc(date, toTime(startMinutes), seed.timezone);
    const endsAt = addMinutes(startsAt, service.durationMinutes);

    const staffBusy = busy.get(member.id) ?? [];
    if (staffBusy.some((slot) => slot.start < endsAt.getTime() && startsAt.getTime() < slot.end)) {
      continue;
    }
    staffBusy.push({ start: startsAt.getTime(), end: endsAt.getTime() });
    busy.set(member.id, staffBusy);

    const isPast = endsAt < now;
    const source = random.chance(0.6) ? 'online' : 'staff';
    const appointmentCreatedAt = new Date(startsAt.getTime() - random.int(1, 20) * 86_400_000);
    const appointment = db
      .insert(appointments)
      .values({
        clinicId: clinic.id,
        serviceId: service.id,
        staffId: member.id,
        customerId: random.pick(clinicCustomers).id,
        startsAt,
        endsAt,
        priceCents: service.priceCents,
        status: isPast ? pastStatus(random) : random.chance(0.92) ? 'booked' : 'cancelled',
        source,
        notes: random.chance(0.15) ? random.pick(APPOINTMENT_NOTES) : null,
        createdAt: appointmentCreatedAt,
      })
      .returning()
      .get();

    if (
      seed.depositsEnabled &&
      source === 'online' &&
      service.depositType !== 'none' &&
      service.depositValue !== null
    ) {
      const amountCents =
        service.depositType === 'fixed'
          ? service.depositValue
          : percentOf(service.priceCents, service.depositValue / 100);
      db.insert(depositPayments)
        .values({
          clinicId: clinic.id,
          appointmentId: appointment.id,
          amountCents,
          status: 'paid',
          providerReference: `fake_ch_${random.int(10 ** 9, 10 ** 10 - 1)}`,
          refundableHours: seed.depositRefundableHours ?? 24,
          paidAt: appointmentCreatedAt,
          createdAt: appointmentCreatedAt,
        })
        .run();
    }

    created++;
  }

  for (const order of seed.orders) {
    const quote = quotePlan(order.plan);
    const createdAt = new Date(now);
    createdAt.setUTCMonth(createdAt.getUTCMonth() - order.monthsAgo);
    createdAt.setUTCDate(random.int(1, 27));
    db.insert(planOrders)
      .values({
        clinicId: clinic.id,
        plan: order.plan,
        subtotalCents: quote.subtotalCents,
        vatCents: quote.vatCents,
        amountCents: quote.totalCents,
        currency: quote.currency,
        status: order.status,
        billingName: seed.name,
        providerReference: `fake_ch_${random.int(10 ** 9, 10 ** 10 - 1)}`,
        failureReason: order.status === 'failed' ? 'card_declined' : null,
        paidAt: order.status === 'paid' ? createdAt : null,
        createdAt,
      })
      .run();
  }

  return created;
}

async function main() {
  const now = new Date();
  const random = createRandom(20260412);
  const passwordHash = await hashPassword(SEED_PASSWORD);

  db.transaction(() => {
    clearDatabase();
    for (const admin of ACME_ADMINS) {
      db.insert(users).values({ ...admin, role: 'acme_admin', passwordHash }).run();
    }
    let total = 0;
    for (const clinic of SEED_CLINICS) {
      const count = seedClinic(clinic, passwordHash, random, now);
      console.info(`Seeded ${clinic.name} with ${count} appointments`);
      total += count;
    }
    console.info(`Seeded ${SEED_CLINICS.length} clinics and ${total} appointments`);
  });

  sqlite.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
