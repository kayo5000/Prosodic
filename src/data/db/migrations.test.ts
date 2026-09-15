import { runMigrations } from './client';
import { assertMigrationsWellFormed, migrations, type Migration } from './migrations';
import { createFakeDb } from './testUtils';

describe('assertMigrationsWellFormed', () => {
  test('the real migration list is well formed', () => {
    expect(() => assertMigrationsWellFormed(migrations)).not.toThrow();
  });

  test('rejects a gap in version numbers', () => {
    const bad: Migration[] = [
      { version: 1, description: 'a', up: () => {} },
      { version: 3, description: 'b', up: () => {} },
    ];
    expect(() => assertMigrationsWellFormed(bad)).toThrow(/expected version 2/);
  });

  test('rejects out-of-order versions', () => {
    const bad: Migration[] = [
      { version: 2, description: 'a', up: () => {} },
      { version: 1, description: 'b', up: () => {} },
    ];
    expect(() => assertMigrationsWellFormed(bad)).toThrow();
  });
});

describe('runMigrations', () => {
  test('applies every migration from a fresh database (user_version 0)', () => {
    const { db, calls } = createFakeDb({ getFirstResult: { user_version: 0 } });

    runMigrations(db);

    const pragmaSets = calls.filter(
      (c) => c.method === 'execSync' && c.sql.includes('PRAGMA user_version ='),
    );
    expect(pragmaSets).toHaveLength(migrations.length);
    expect(pragmaSets[pragmaSets.length - 1].sql).toContain(
      `PRAGMA user_version = ${migrations.length}`,
    );

    const commits = calls.filter((c) => c.method === 'execSync' && c.sql === 'COMMIT');
    expect(commits).toHaveLength(migrations.length);
  });

  test('is a no-op once the database is already at the latest version', () => {
    const { db, calls } = createFakeDb({ getFirstResult: { user_version: migrations.length } });

    runMigrations(db);

    expect(calls.filter((c) => c.method === 'execSync')).toHaveLength(0);
  });

  test('rolls back and rethrows if a migration fails', () => {
    // execSync call 0 is BEGIN TRANSACTION, call 1 is migration.up()'s DDL —
    // fail there to simulate a bad migration.
    const { db, calls } = createFakeDb({
      getFirstResult: { user_version: 0 },
      throwOnExecSyncCall: 1,
    });

    expect(() => runMigrations(db)).toThrow(/Migration 1 .* failed: .*simulated failure/);
    expect(calls.some((c) => c.sql === 'ROLLBACK')).toBe(true);
    expect(calls.some((c) => c.sql.includes('PRAGMA user_version ='))).toBe(false);
  });
});
