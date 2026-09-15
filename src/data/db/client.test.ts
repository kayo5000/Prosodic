const mockOpenDatabaseSync = jest.fn();

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: (...args: unknown[]) => mockOpenDatabaseSync(...args),
}));

describe('getDb', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('enables foreign key enforcement before running migrations', () => {
    const calls: string[] = [];
    mockOpenDatabaseSync.mockReturnValue({
      execSync: (sql: string) => calls.push(`execSync:${sql}`),
      runSync: () => ({ changes: 0, lastInsertRowId: 0 }),
      getAllSync: () => [],
      getFirstSync: () => ({ user_version: 0 }),
    });

    // Re-require per test so the module's top-level `cachedDb` starts fresh.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getDb } = require('./client');
    getDb();

    const foreignKeysIndex = calls.indexOf('execSync:PRAGMA foreign_keys = ON');
    const firstMigrationDdlIndex = calls.findIndex((c) => c.includes('CREATE TABLE'));

    expect(foreignKeysIndex).toBeGreaterThanOrEqual(0);
    expect(firstMigrationDdlIndex).toBeGreaterThan(foreignKeysIndex);
  });

  test('reuses the same handle on a second call instead of reopening the database', () => {
    mockOpenDatabaseSync.mockReturnValue({
      execSync: () => {},
      runSync: () => ({ changes: 0, lastInsertRowId: 0 }),
      getAllSync: () => [],
      getFirstSync: () => ({ user_version: 1 }),
    });

    // Re-require per test so the module's top-level `cachedDb` starts fresh.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getDb } = require('./client');
    getDb();
    getDb();

    expect(mockOpenDatabaseSync).toHaveBeenCalledTimes(1);
  });

  test('seeds the canonical metric registry after migrations run', () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    mockOpenDatabaseSync.mockReturnValue({
      execSync: (sql: string) => calls.push({ sql }),
      runSync: (sql: string, params?: unknown[]) => {
        calls.push({ sql, params });
        return { changes: 0, lastInsertRowId: 0 };
      },
      getAllSync: () => [],
      getFirstSync: () => ({ user_version: 0 }),
    });

    // Re-require per test so the module's top-level `cachedDb` starts fresh.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getDb } = require('./client');
    getDb();

    const seedWrites = calls.filter(
      (c) => c.sql.includes('INSERT INTO metric_definitions'),
    );

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { CANONICAL_METRIC_DEFINITIONS } = require('../canonicalMetrics');
    expect(seedWrites.length).toBe(CANONICAL_METRIC_DEFINITIONS.length);
  });

  test('seeding runs after migrations, not before', () => {
    const calls: string[] = [];
    mockOpenDatabaseSync.mockReturnValue({
      execSync: (sql: string) => calls.push(`execSync:${sql}`),
      runSync: (sql: string) => {
        calls.push(`runSync:${sql}`);
        return { changes: 0, lastInsertRowId: 0 };
      },
      getAllSync: () => [],
      getFirstSync: () => ({ user_version: 0 }),
    });

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getDb } = require('./client');
    getDb();

    const lastMigrationDdlIndex = calls.lastIndexOf(
      calls.filter((c) => c.includes('CREATE TABLE') || c.includes('ALTER TABLE')).pop() ?? '',
    );
    const firstSeedWriteIndex = calls.findIndex((c) => c.includes('INSERT INTO metric_definitions'));

    expect(firstSeedWriteIndex).toBeGreaterThan(lastMigrationDdlIndex);
  });
});
