import { createFakeDb } from './testUtils';
import type { SQLiteDatabaseLike } from './types';

let cachedDb: SQLiteDatabaseLike | null = null;

export function runMigrations(_db: SQLiteDatabaseLike): void {
  // In-memory fake DB on web; no migrations needed.
}

export function getDb(): SQLiteDatabaseLike {
  if (!cachedDb) {
    cachedDb = createFakeDb().db;
  }
  return cachedDb;
}
