import { beforeEach } from 'vitest';
import { db } from '../db/client.js';
import { runMigrations } from '../db/migrations.js';
import { mailer } from '../mail/mailer.js';
import { resetDatabase } from './fixtures.js';

runMigrations(db);

beforeEach(() => {
  resetDatabase();
  mailer.clear();
});
