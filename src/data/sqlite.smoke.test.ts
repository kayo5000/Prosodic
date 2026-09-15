import * as SQLite from 'expo-sqlite';

// jest-expo mocks the native module but has no real SQLite binding behind it,
// so this only proves the package is installed and its JS surface is wired
// correctly — not that reads/writes work. That requires a device or emulator
// run via the dev client (see build order step 0 notes).
test('expo-sqlite exposes the expected API surface', () => {
  expect(typeof SQLite.openDatabaseSync).toBe('function');
  expect(typeof SQLite.deleteDatabaseAsync).toBe('function');
});
