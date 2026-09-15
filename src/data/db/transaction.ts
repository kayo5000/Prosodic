import type { SQLiteDatabaseLike } from './types';

/**
 * Runs `fn` inside a SQLite transaction: commits if it returns normally,
 * rolls back and rethrows if it throws. Use this any time more than one
 * write must land together — e.g. saving a song's body text and logging
 * the `song_saved` event that describes it. Without this, a failure
 * between the two writes leaves the append-only event stream
 * inconsistent with what's actually stored.
 *
 * Uses native expo-sqlite `withExclusiveTransactionSync` when available,
 * or atomic IMMEDIATE transaction blocks with safe error preservation.
 */
export function withTransaction<T>(db: SQLiteDatabaseLike, fn: () => T): T {
  if (typeof db.withExclusiveTransactionSync === 'function') {
    return db.withExclusiveTransactionSync(fn);
  }
  if (typeof db.withTransactionSync === 'function') {
    return db.withTransactionSync(fn);
  }

  db.execSync('BEGIN IMMEDIATE TRANSACTION');
  try {
    const result = fn();
    db.execSync('COMMIT');
    return result;
  } catch (error) {
    try {
      db.execSync('ROLLBACK');
    } catch {
      // Intentionally silent: never mask the root error if rollback encounters a closed connection
    }
    throw error;
  }
}
