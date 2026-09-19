import type { SQLiteDatabaseLike } from './types';

export interface Migration {
  version: number;
  description: string;
  up: (db: SQLiteDatabaseLike) => void;
}

// Ordered, additive. Never edit a migration once it has shipped to a real
// device — add a new one instead, same as any other SQLite migration
// discipline. `version` must be strictly increasing by 1.
export const migrations: Migration[] = [
  {
    version: 1,
    description:
      'Initial data shape: metric_definitions, song_context, events, rollups, fingerprint, goals',
    up: (db) => {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS metric_definitions (
          metric_id TEXT PRIMARY KEY,
          family TEXT NOT NULL,
          score_type TEXT NOT NULL,
          unit TEXT,
          direction TEXT NOT NULL,
          aggregation TEXT NOT NULL,
          display_json TEXT NOT NULL,
          version INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS song_context (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          input_mode TEXT NOT NULL,
          bpm REAL,
          bpm_source TEXT,
          structure_json TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS events (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          song_id TEXT REFERENCES song_context(id),
          occurred_at TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          synced_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_events_song_id ON events(song_id);
        CREATE INDEX IF NOT EXISTS idx_events_type_occurred_at ON events(type, occurred_at);

        CREATE TABLE IF NOT EXISTS rollups (
          id TEXT PRIMARY KEY,
          metric_id TEXT NOT NULL REFERENCES metric_definitions(metric_id),
          period TEXT NOT NULL,
          period_start TEXT NOT NULL,
          value REAL NOT NULL,
          metric_version INTEGER NOT NULL,
          computed_at TEXT NOT NULL,
          UNIQUE(metric_id, period, period_start)
        );

        CREATE TABLE IF NOT EXISTS fingerprint (
          metric_id TEXT PRIMARY KEY REFERENCES metric_definitions(metric_id),
          value REAL NOT NULL,
          metric_version INTEGER NOT NULL,
          computed_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS goals (
          id TEXT PRIMARY KEY,
          metric_id TEXT NOT NULL REFERENCES metric_definitions(metric_id),
          direction TEXT NOT NULL,
          target_value REAL,
          active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          archived_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_goals_metric_active ON goals(metric_id, active);
      `);
    },
  },
  {
    version: 2,
    description: 'song_context.body_text — the actual written/transcribed content of a song',
    up: (db) => {
      db.execSync(`ALTER TABLE song_context ADD COLUMN body_text TEXT;`);
    },
  },
  {
    version: 3,
    description: 'cmu_phonemes table — local SQLite pronouncing dictionary & phonetic resolver',
    up: (db) => {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS cmu_phonemes (
          word TEXT PRIMARY KEY,
          phonemes TEXT NOT NULL,
          primary_vowel TEXT NOT NULL,
          syllable_count INTEGER NOT NULL,
          is_aave_variant INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_cmu_primary_vowel ON cmu_phonemes(primary_vowel);
      `);
    },
  },
  {
    version: 4,
    description: 'voice_takes table — recorded audio takes attached to a song (step 5)',
    up: (db) => {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS voice_takes (
          id TEXT PRIMARY KEY,
          song_id TEXT NOT NULL REFERENCES song_context(id),
          uri TEXT NOT NULL,
          duration_ms INTEGER NOT NULL,
          recorded_at TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_voice_takes_song_id ON voice_takes(song_id);
      `);
    },
  },
  {
    version: 5,
    description:
      'line_edits table — per-line revision capture. Cannot be backfilled: which line an ' +
      'edit touched and what kind of edit it was only exists at the moment of typing.',
    up: (db) => {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS line_edits (
          id TEXT PRIMARY KEY,
          song_id TEXT NOT NULL REFERENCES song_context(id),
          line_index INTEGER NOT NULL,
          line_hash TEXT NOT NULL,
          kind TEXT NOT NULL,
          chars_added INTEGER NOT NULL,
          chars_removed INTEGER NOT NULL,
          occurred_at TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_line_edits_song_id ON line_edits(song_id);
        CREATE INDEX IF NOT EXISTS idx_line_edits_song_line ON line_edits(song_id, line_index);
      `);
    },
  },
  {
    version: 6,
    description:
      'song_context.backing_track_uri / audio_offset_ms — the imported instrumental. ' +
      'SongContext has declared these fields since step 1 but no column ever existed, ' +
      'so they type-checked and then silently vanished on save.',
    up: (db) => {
      db.execSync(`ALTER TABLE song_context ADD COLUMN backing_track_uri TEXT;`);
      db.execSync(`ALTER TABLE song_context ADD COLUMN audio_offset_ms INTEGER;`);
    },
  },
  {
    version: 7,
    description:
      'voice_takes.performance_mode — freestyle vs written vs someone else\'s. Cannot be ' +
      'backfilled: nobody can say later whether a take from months ago was off the top. ' +
      'Null means unclassified, which is honest — it is never assumed to be freestyle.',
    up: (db) => {
      db.execSync(`ALTER TABLE voice_takes ADD COLUMN performance_mode TEXT;`);
      db.execSync(`ALTER TABLE voice_takes ADD COLUMN mode_set_at TEXT;`);
    },
  },
  {
    version: 8,
    description:
      'mastery_state — committed practice time toward the 10,000 hours (step 6). One row, ' +
      'enforced by CHECK. Events keep the audit trail; this is the fast read.',
    up: (db) => {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS mastery_state (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          committed_ms INTEGER NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
    },
  },
  {
    version: 9,
    description:
      'fingerprint.value / rollups.value become nullable, plus not_measured_reason. ' +
      'Both were REAL NOT NULL, which made the absence of a measurement unrepresentable: ' +
      '"scored zero" and "never measured" were the same row. An empty song still produced ' +
      'a full confident profile because every metric was obliged to have a number. ' +
      'SQLite cannot drop NOT NULL in place, so both tables are rebuilt. Safe with ' +
      'foreign_keys ON: both are children of metric_definitions and nothing references them.',
    up: (db) => {
      db.execSync(`
        CREATE TABLE fingerprint_v9 (
          metric_id TEXT PRIMARY KEY REFERENCES metric_definitions(metric_id),
          value REAL,
          not_measured_reason TEXT,
          metric_version INTEGER NOT NULL,
          computed_at TEXT NOT NULL,
          CHECK (value IS NOT NULL OR not_measured_reason IS NOT NULL)
        );
        INSERT INTO fingerprint_v9 (metric_id, value, not_measured_reason, metric_version, computed_at)
          SELECT metric_id, value, NULL, metric_version, computed_at FROM fingerprint;
        DROP TABLE fingerprint;
        ALTER TABLE fingerprint_v9 RENAME TO fingerprint;

        CREATE TABLE rollups_v9 (
          id TEXT PRIMARY KEY,
          metric_id TEXT NOT NULL REFERENCES metric_definitions(metric_id),
          period TEXT NOT NULL,
          period_start TEXT NOT NULL,
          value REAL,
          not_measured_reason TEXT,
          metric_version INTEGER NOT NULL,
          computed_at TEXT NOT NULL,
          UNIQUE(metric_id, period, period_start),
          CHECK (value IS NOT NULL OR not_measured_reason IS NOT NULL)
        );
        INSERT INTO rollups_v9 (id, metric_id, period, period_start, value, not_measured_reason, metric_version, computed_at)
          SELECT id, metric_id, period, period_start, value, NULL, metric_version, computed_at FROM rollups;
        DROP TABLE rollups;
        ALTER TABLE rollups_v9 RENAME TO rollups;
      `);
    },
  },
  {
    version: 10,
    description: 'Add is_pinned to song_context for Claude-style sidebar, and create song_attachments for Apple Journal-style vision board.',
    up: (db) => {
      // 1. Add is_pinned to song_context
      db.execSync(`ALTER TABLE song_context ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;`);
      
      // 2. Create song_attachments table for Vision Board media
      db.execSync(`
        CREATE TABLE IF NOT EXISTS song_attachments (
          id TEXT PRIMARY KEY,
          song_id TEXT NOT NULL REFERENCES song_context(id),
          type TEXT NOT NULL, /* 'image', 'audio', 'map', 'link' */
          uri TEXT NOT NULL,
          metadata_json TEXT, /* e.g. duration, location coordinates, caption */
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_song_attachments_song_id ON song_attachments(song_id);
      `);
    },
  },
];

export function assertMigrationsWellFormed(list: Migration[]): void {
  for (let i = 0; i < list.length; i += 1) {
    const expected = i + 1;
    if (list[i].version !== expected) {
      throw new Error(
        `Migration list is out of order or has a gap: expected version ${expected} at index ${i}, got ${list[i].version}`,
      );
    }
  }
}
