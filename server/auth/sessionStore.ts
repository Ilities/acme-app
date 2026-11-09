import session from 'express-session';
import { eq, lt } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { sessions } from '../db/schema.js';

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

type Callback = (err?: unknown) => void;

function expiryFor(data: session.SessionData): Date {
  const expires = data.cookie?.expires;
  return expires ? new Date(expires) : new Date(Date.now() + DEFAULT_TTL_MS);
}

export class SqliteSessionStore extends session.Store {
  constructor(private readonly db: Db) {
    super();
  }

  get(sid: string, callback: (err: unknown, data?: session.SessionData | null) => void): void {
    try {
      const row = this.db.select().from(sessions).where(eq(sessions.sid, sid)).get();
      if (!row || row.expiresAt.getTime() <= Date.now()) {
        callback(null, null);
        return;
      }
      callback(null, JSON.parse(row.data) as session.SessionData);
    } catch (err) {
      callback(err);
    }
  }

  set(sid: string, data: session.SessionData, callback?: Callback): void {
    try {
      const values = { data: JSON.stringify(data), expiresAt: expiryFor(data) };
      this.db
        .insert(sessions)
        .values({ sid, ...values })
        .onConflictDoUpdate({ target: sessions.sid, set: values })
        .run();
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  touch(sid: string, data: session.SessionData, callback?: Callback): void {
    try {
      this.db
        .update(sessions)
        .set({ expiresAt: expiryFor(data) })
        .where(eq(sessions.sid, sid))
        .run();
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  destroy(sid: string, callback?: Callback): void {
    try {
      this.db.delete(sessions).where(eq(sessions.sid, sid)).run();
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  pruneExpired(now = new Date()): number {
    return this.db.delete(sessions).where(lt(sessions.expiresAt, now)).run().changes;
  }
}
