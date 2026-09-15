import type { SQLiteBindValue, SQLiteDatabaseLike } from './types';

export interface RecordedCall {
  method: 'execSync' | 'runSync' | 'getAllSync' | 'getFirstSync';
  sql: string;
  params?: SQLiteBindValue[];
}

interface FakeDbOptions {
  getFirstResult?: unknown;
  getAllResult?: unknown[];
  /** Throw this from execSync on the given call index (0-based, across execSync calls only). */
  throwOnExecSyncCall?: number;
}

/**
 * In-memory stand-in for SQLiteDatabaseLike that records every call
 * instead of touching real SQLite. Used for golden-master-style
 * assertions on the exact SQL/params our data layer produces — this
 * proves the JS logic is correct, not that SQLite itself accepts the SQL
 * (see the Verification protocol in CLAUDE.md for why that gap is called
 * out explicitly rather than papered over).
 */
export function createFakeDb(options: FakeDbOptions = {}): {
  db: SQLiteDatabaseLike;
  calls: RecordedCall[];
} {
  const calls: RecordedCall[] = [];
  let execSyncCount = 0;

  const db: SQLiteDatabaseLike = {
    execSync(sql) {
      calls.push({ method: 'execSync', sql });
      if (options.throwOnExecSyncCall === execSyncCount) {
        execSyncCount += 1;
        throw new Error(`simulated failure on execSync call ${options.throwOnExecSyncCall}`);
      }
      execSyncCount += 1;
    },
    runSync(sql, params) {
      calls.push({ method: 'runSync', sql, params });
      return { changes: 1, lastInsertRowId: 1 };
    },
    getAllSync<T>(sql: string, params?: SQLiteBindValue[]) {
      calls.push({ method: 'getAllSync', sql, params });
      return (options.getAllResult ?? []) as T[];
    },
    getFirstSync<T>(sql: string, params?: SQLiteBindValue[]) {
      calls.push({ method: 'getFirstSync', sql, params });
      return (options.getFirstResult ?? null) as T | null;
    },
  };

  return { db, calls };
}
