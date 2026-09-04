import * as SQLite from 'expo-sqlite';

import { seedCanonicalMetrics } from '../seedCanonicalMetrics';
import { assertMigrationsWellFormed, migrations } from './migrations';
import { withTransaction } from './transaction';
import type { SQLiteDatabaseLike } from './types';

const DATABASE_NAME = 'prosodic.db';

// expo-sqlite's real methods declare `params` as required (with a separate
// variadic overload for the zero-params case), which TS won't structurally
// match against SQLiteDatabaseLike's optional `params?`. Wrapping it here
// keeps that impedance mismatch in one place instead of at every call site.
function toDatabaseLike(db: SQLite.SQLiteDatabase): SQLiteDatabaseLike {
  return {
    execSync: (sql) => db.execSync(sql),
    runSync: (sql, params = []) => db.runSync(sql, params),
    getAllSync: (sql, params = []) => db.getAllSync(sql, params),
    getFirstSync: (sql, params = []) => db.getFirstSync(sql, params),
  };
}

/**
 * Runs any migrations newer than the database's current `PRAGMA
 * user_version` against it, in order, inside a transaction per migration.
 * Safe to call every app start — a fully-migrated database is a no-op.
 */
export function runMigrations(db: SQLiteDatabaseLike): void {
  assertMigrationsWellFormed(migrations);

  const row = db.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  const pending = migrations.filter((m) => m.version > currentVersion);
  for (const migration of pending) {
    try {
      withTransaction(db, () => {
        migration.up(db);
        db.execSync(`PRAGMA user_version = ${migration.version}`);
      });
    } catch (error) {
      throw new Error(
        `Migration ${migration.version} ("${migration.description}") failed: ${String(error)}`,
      );
    }
  }
}

let cachedDb: SQLiteDatabaseLike | null = null;

/**
 * Opens (or returns the cached handle to) the on-device database and
 * ensures it's migrated to the latest schema version. Every repository in
 * src/data/repositories takes the return value of this function.
 *
 * NOTE: this proves the JS call graph is correct, not that reads/writes
 * behave against real SQLite — jest-expo mocks the native module. Real
 * verification needs a device or emulator run via the dev client (see
 * CLAUDE.md's Verification protocol).
 */
export function getDb(): SQLiteDatabaseLike {
  if (!cachedDb) {
    cachedDb = toDatabaseLike(SQLite.openDatabaseSync(DATABASE_NAME));
    // SQLite ships with foreign keys off by default; every FK in the step 1
    // schema (rollups/fingerprint/goals -> metric_definitions, events ->
    // song_context) is silently unenforced without this. Must run before
    // any migration or write.
    cachedDb.execSync('PRAGMA foreign_keys = ON');
    runMigrations(cachedDb);
    // Rollups/Fingerprint/Goals all FK to metric_definitions, so the
    // canonical registry has to exist before any of them can be written.
    seedCanonicalMetrics(cachedDb);
  }
  return cachedDb;
}
