import path from 'node:path';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { Db } from './client.js';

export const migrationsFolder = path.resolve(process.cwd(), 'server/db/migrations');

export function runMigrations(db: Db): void {
  migrate(db, { migrationsFolder });
}
