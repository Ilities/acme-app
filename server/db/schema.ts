import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const PLAN_IDS = ['starter', 'clinic', 'group'] as const;
export const USER_ROLES = ['owner', 'staff', 'acme_admin'] as const;
export const APPOINTMENT_STATUSES = ['booked', 'completed', 'cancelled', 'no_show'] as const;
export const APPOINTMENT_SOURCES = ['online', 'staff'] as const;
export const ORDER_STATUSES = ['pending', 'paid', 'failed'] as const;

const createdAt = () =>
  integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date());

export const clinics = sqliteTable('clinics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  email: text('email').notNull(),
  phone: text('phone'),
  addressLine: text('address_line'),
  city: text('city').notNull(),
  country: text('country').notNull(),
  timezone: text('timezone').notNull().default('Europe/Helsinki'),
  opensAt: text('opens_at').notNull().default('09:00'),
  closesAt: text('closes_at').notNull().default('17:00'),
  openDays: text('open_days').notNull().default('1,2,3,4,5'),
  bookingEnabled: integer('booking_enabled', { mode: 'boolean' }).notNull().default(true),
  plan: text('plan', { enum: PLAN_IDS }),
  createdAt: createdAt(),
});

export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    clinicId: integer('clinic_id').references(() => clinics.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: text('role', { enum: USER_ROLES }).notNull(),
    lastSignInAt: integer('last_sign_in_at', { mode: 'timestamp_ms' }),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex('users_email_idx').on(table.email)],
);

export const passwordResetTokens = sqliteTable('password_reset_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  usedAt: integer('used_at', { mode: 'timestamp_ms' }),
  createdAt: createdAt(),
});

export const sessions = sqliteTable('sessions', {
  sid: text('sid').primaryKey(),
  data: text('data').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
});

export const staffMembers = sqliteTable(
  'staff_members',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    clinicId: integer('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    title: text('title').notNull(),
    email: text('email'),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    createdAt: createdAt(),
  },
  (table) => [index('staff_clinic_idx').on(table.clinicId)],
);

export const services = sqliteTable(
  'services',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    clinicId: integer('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    durationMinutes: integer('duration_minutes').notNull(),
    priceCents: integer('price_cents').notNull(),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    createdAt: createdAt(),
  },
  (table) => [index('services_clinic_idx').on(table.clinicId)],
);

export const customers = sqliteTable(
  'customers',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    clinicId: integer('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex('customers_clinic_email_idx').on(table.clinicId, table.email)],
);

export const appointments = sqliteTable(
  'appointments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    clinicId: integer('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    serviceId: integer('service_id')
      .notNull()
      .references(() => services.id),
    staffId: integer('staff_id')
      .notNull()
      .references(() => staffMembers.id),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id),
    startsAt: integer('starts_at', { mode: 'timestamp_ms' }).notNull(),
    endsAt: integer('ends_at', { mode: 'timestamp_ms' }).notNull(),
    status: text('status', { enum: APPOINTMENT_STATUSES }).notNull().default('booked'),
    source: text('source', { enum: APPOINTMENT_SOURCES }).notNull(),
    notes: text('notes'),
    createdAt: createdAt(),
  },
  (table) => [
    index('appointments_clinic_starts_idx').on(table.clinicId, table.startsAt),
    index('appointments_staff_starts_idx').on(table.staffId, table.startsAt),
  ],
);

export const planOrders = sqliteTable(
  'plan_orders',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    clinicId: integer('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    plan: text('plan', { enum: PLAN_IDS }).notNull(),
    subtotalCents: integer('subtotal_cents').notNull(),
    vatCents: integer('vat_cents').notNull(),
    amountCents: integer('amount_cents').notNull(),
    currency: text('currency').notNull().default('EUR'),
    status: text('status', { enum: ORDER_STATUSES }).notNull().default('pending'),
    billingName: text('billing_name').notNull(),
    vatId: text('vat_id'),
    providerReference: text('provider_reference'),
    failureReason: text('failure_reason'),
    paidAt: integer('paid_at', { mode: 'timestamp_ms' }),
    createdAt: createdAt(),
  },
  (table) => [index('plan_orders_clinic_idx').on(table.clinicId)],
);

export type Clinic = typeof clinics.$inferSelect;
export type User = typeof users.$inferSelect;
export type StaffMember = typeof staffMembers.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type PlanOrder = typeof planOrders.$inferSelect;
export type PlanId = (typeof PLAN_IDS)[number];
export type UserRole = (typeof USER_ROLES)[number];
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];
