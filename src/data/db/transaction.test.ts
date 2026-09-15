import { createFakeDb } from './testUtils';
import { withTransaction } from './transaction';

describe('withTransaction', () => {
  test('commits and returns the callback result on success via fallback', () => {
    const { db, calls } = createFakeDb();

    const result = withTransaction(db, () => {
      db.runSync('INSERT INTO x VALUES (1)');
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(calls.map((c) => c.sql)).toEqual([
      'BEGIN IMMEDIATE TRANSACTION',
      'INSERT INTO x VALUES (1)',
      'COMMIT',
    ]);
  });

  test('rolls back and rethrows if the callback throws, without committing', () => {
    const { db, calls } = createFakeDb();

    expect(() =>
      withTransaction(db, () => {
        throw new Error('boom');
      }),
    ).toThrow('boom');

    expect(calls.map((c) => c.sql)).toEqual(['BEGIN IMMEDIATE TRANSACTION', 'ROLLBACK']);
  });

  test('delegates to native withExclusiveTransactionSync when available', () => {
    const { db } = createFakeDb();
    let nativeCalled = false;

    db.withExclusiveTransactionSync = (fn: any) => {
      nativeCalled = true;
      return fn();
    };

    const result = withTransaction(db, () => 'native_ok');
    expect(result).toBe('native_ok');
    expect(nativeCalled).toBe(true);
  });
});
