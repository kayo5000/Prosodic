// Narrow structural subset of expo-sqlite's SQLiteDatabase.
//
// Repositories and migrations depend on this instead of importing
// expo-sqlite directly, so unit tests can inject a plain-object fake and
// assert on the exact SQL/params produced (golden-master style) without a
// native binding. A real `openDatabaseSync(...)` result satisfies this
// interface structurally — see src/data/db/client.ts.

export type SQLiteBindValue = string | number | null;

export interface SQLiteRunResultLike {
  changes: number;
  lastInsertRowId: number;
}

export interface SQLiteDatabaseLike {
  execSync(sql: string): void;
  runSync(sql: string, params?: SQLiteBindValue[]): SQLiteRunResultLike;
  getAllSync<T>(sql: string, params?: SQLiteBindValue[]): T[];
  getFirstSync<T>(sql: string, params?: SQLiteBindValue[]): T | null;
  withExclusiveTransactionSync?<T>(fn: () => T): T;
  withTransactionSync?<T>(fn: () => T): T;
}
