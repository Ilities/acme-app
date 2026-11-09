import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { adminRouter } from './admin/routes.js';
import { appointmentsRouter } from './appointments/routes.js';
import { loadUser, requireAcmeAdmin, requireClinicUser } from './auth/middleware.js';
import { authRouter } from './auth/routes.js';
import { createSessionMiddleware } from './auth/session.js';
import { bookingRouter } from './booking/routes.js';
import { clinicRouter } from './clinics/routes.js';
import { config } from './config.js';
import { customersRouter } from './customers/routes.js';
import { dashboardRouter } from './dashboard/routes.js';
import { db } from './db/client.js';
import { errorHandler, notFound } from './http/errors.js';
import { billingRouter } from './payments/routes.js';
import { servicesRouter } from './services/routes.js';
import { staffRouter } from './staff/routes.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (config.isProduction) {
    app.set('trust proxy', 1);
  }

  app.use(express.json({ limit: '100kb' }));
  app.use(createSessionMiddleware(db));
  app.use(loadUser);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/public', bookingRouter);
  app.use('/api/clinic', requireClinicUser, clinicRouter);
  app.use('/api/dashboard', requireClinicUser, dashboardRouter);
  app.use('/api/staff', requireClinicUser, staffRouter);
  app.use('/api/services', requireClinicUser, servicesRouter);
  app.use('/api/customers', requireClinicUser, customersRouter);
  app.use('/api/appointments', requireClinicUser, appointmentsRouter);
  app.use('/api/billing', requireClinicUser, billingRouter);
  app.use('/api/admin', requireAcmeAdmin, adminRouter);

  app.use('/api', () => {
    throw notFound('Endpoint');
  });

  const clientDir = path.resolve(process.cwd(), 'dist/client');
  if (config.isProduction && fs.existsSync(clientDir)) {
    app.use(express.static(clientDir, { index: false, maxAge: '1h' }));
    app.get('/{*path}', (_req, res) => {
      res.sendFile(path.join(clientDir, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
