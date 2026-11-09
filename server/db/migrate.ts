import { config } from '../config.js';
import { db, sqlite } from './client.js';
import { runMigrations } from './migrations.js';

runMigrations(db);
sqlite.close();
console.info(`Migrations applied to ${config.databaseUrl}`);
