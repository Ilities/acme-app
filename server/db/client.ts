import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { config } from '../config.js';
import * as schema from './schema.js';

function openDatabase(url: string): Database.Database {
  if (url !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(url)), { recursive: true });
  }
  const sqlite = new Database(url);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return sqlite;
}

export const sqlite = openDatabase(config.databaseUrl);
export const db = drizzle(sqlite, { schema });

export type Db = typeof db;
