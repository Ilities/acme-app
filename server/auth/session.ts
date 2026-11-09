import type { Request } from 'express';
import session from 'express-session';
import { config } from '../config.js';
import type { Db } from '../db/client.js';
import { SqliteSessionStore } from './sessionStore.js';

declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_COOKIE = 'acme.sid';

export function createSessionMiddleware(db: Db) {
  const store = new SqliteSessionStore(db);
  if (!config.isTest) {
    setInterval(() => store.pruneExpired(), 60 * 60 * 1000).unref();
  }

  return session({
    name: SESSION_COOKIE,
    secret: config.sessionSecret,
    store,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.isProduction,
      maxAge: SESSION_MAX_AGE_MS,
    },
  });
}

export function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
}

export function destroySession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => (err ? reject(err) : resolve()));
  });
}
