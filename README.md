# Acme Book

Appointment booking for small clinics and studios, built by Acme Inc in Helsinki.

Clinic staff sign in to manage their staff, services, customers and appointments. Customers book online through each clinic's public booking page. Clinics pay for a plan (Starter, Clinic or Group) through an in-app checkout, and Acme's own team has an admin area for plan orders.

## Stack

- React 19 + Vite, React Router
- Express 5 API
- SQLite via Drizzle ORM (better-sqlite3)
- Cookie sessions stored in SQLite, passwords hashed with bcrypt
- Vitest for server and client tests
- TypeScript throughout, ESLint for linting

## Getting started

Requires Node.js 22.12 or newer.

```sh
npm install
cp .env.example .env    # optional, defaults work for local development
npm run db:migrate
npm run seed
npm run dev
```

The app runs on http://localhost:5173 and proxies `/api` to the API on http://localhost:3001.

If your npm config has `ignore-scripts` enabled, build the SQLite driver once after installing:

```sh
npm rebuild better-sqlite3 --ignore-scripts=false
```

## Sample accounts

The seed script creates four clinics in Helsinki and Stockholm with staff, services, customers and a few hundred appointments around today's date. Every account uses the password `password123`.

| Account                   | Role                                      |
| ------------------------- | ----------------------------------------- |
| `aino@kalliophysio.example`    | Owner, Kallio Physiotherapy (Helsinki)    |
| `mikko@kalliophysio.example`   | Staff, Kallio Physiotherapy (Helsinki)    |
| `jenni@studiolumo.example`     | Owner, Studio Lumo (Helsinki)             |
| `karin@sodermalmhud.example`   | Owner, Södermalm Hudklinik (Stockholm)    |
| `erik@vasastanfysio.example`   | Owner, Vasastan Fysio & Massage (Stockholm) |
| `sanna@acme.example`           | Acme admin                                |

Public booking pages live at `/book/<clinic-slug>`, for example http://localhost:5173/book/kallio-physio.

## Scripts

| Script                | What it does                                              |
| --------------------- | --------------------------------------------------------- |
| `npm run dev`         | API (with reload) and Vite dev server together            |
| `npm run build`       | Type-checks and builds the API to `dist/server` and the client to `dist/client` |
| `npm start`           | Runs the built app; the API also serves the client        |
| `npm test`            | Runs all tests once                                       |
| `npm run test:watch`  | Runs tests in watch mode                                  |
| `npm run lint`        | Lints the whole project                                   |
| `npm run db:generate` | Generates a migration after changing `server/db/schema.ts` |
| `npm run db:migrate`  | Applies pending migrations                                |
| `npm run seed`        | Replaces all data with the sample data set                |

## Configuration

| Variable         | Default                    | Notes                                    |
| ---------------- | -------------------------- | ---------------------------------------- |
| `PORT`           | `3001`                     | API port                                 |
| `DATABASE_URL`   | `data/acme.db`             | Path to the SQLite file                  |
| `SESSION_SECRET` | development value          | Required in production                   |
| `APP_URL`        | `http://localhost:5173`    | Used for links in emails                 |
| `BCRYPT_ROUNDS`  | `10`                       | Lowered in tests                         |

## Project layout

```
client/                 React app (Vite root)
  src/api/              fetch wrapper and API types
  src/auth/             auth context and route guard
  src/components/       shared UI pieces
  src/pages/            one file per screen
server/
  admin/                Acme admin endpoints
  appointments/         clinic appointment list and management
  auth/                 sign-in, sessions, password reset
  booking/              public booking page and availability
  clinics/              clinic settings
  customers/ services/ staff/
  dashboard/            dashboard summary
  db/                   schema, migrations, seed
  mail/                 mailer and email templates
  payments/             plans, checkout and the payment provider
```

### Email

Outgoing email goes through `server/mail/mailer.ts`. In development the `DevMailer` prints each message to the API console, so password reset links show up in the terminal running `npm run dev`.

### Payments

Checkout talks to a `PaymentProvider` (`server/payments/provider.ts`). The app ships with `FakePaymentProvider`, which validates cards locally and never makes network calls. Use these card numbers with any future expiry date and any three-digit CVC:

| Card number        | Result             |
| ------------------ | ------------------ |
| `4242 4242 4242 4242` | Succeeds        |
| `4000 0000 0000 0002` | Declined        |
| `4000 0000 0000 9995` | Insufficient funds |

### Time zones

Each clinic has a time zone (`clinics.timezone`). Appointment times are stored as UTC timestamps. Opening hours and booking slots are worked out in the clinic's own time zone.
