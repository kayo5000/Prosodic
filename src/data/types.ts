// Canonical data-shape types for build order step 1.
// See CLAUDE.md "V1 scope — locked > Data shape" for the spec these mirror.
//
// Nothing in this file stores a raw engine score. MetricDefinition,
// Rollup, Fingerprint, and Goal all reference `metricId`, which only
// exists in the canonical namespace once the calibration boundary
// (build order step 4) has run. Until then this is structure only.

export type MetricFamily =
  | 'rhyme'
  | 'cadence'
  | 'density'
  | 'motif'
  | 'stress'
  | 'audio'
  | 'mastery'
  | 'timbre'
  | 'device'
  | 'phonoaffective';

export type MetricScoreType =
  | 'continuous'
  | 'count'
  | 'categorical'
  | 'duration_seconds'
  | 'boolean';

export type MetricDirection = 'higher_is_better' | 'lower_is_better' | 'neutral';

export type MetricAggregation = 'mean' | 'sum' | 'latest' | 'max' | 'min' | 'weighted_mean';

export interface MetricDisplayMeta {
  label: string;
  shortLabel?: string;
  description?: string;
  /** Presentational only, e.g. "percent", "0-1", "bpm", "seconds". */
  format?: string;
}

/** The canonical metric registry. Events/Rollups/Fingerprint/Goals all reference metricId here. */
export interface MetricDefinition {
  metricId: string; // e.g. "rhyme.density" — namespaced, stable once assigned
  family: MetricFamily;
  scoreType: MetricScoreType;
  unit: string | null;
  direction: MetricDirection;
  aggregation: MetricAggregation;
  display: MetricDisplayMeta;
  /** Bumped whenever this metric's calibration changes meaning; Rollup/Fingerprint rows carry the version they were computed under. */
  version: number;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export type EventType =
  | 'song_saved'
  | 'session_started'
  | 'session_ended'
  | 'keystroke_timer_tick'
  | 'voice_detection_tick'
  | 'mastery_checkpoint'
  | 'challenge_completed'
  /** Calibrated analysis landed. Payload carries canonical metrics only — never a raw engine score. */
  | 'analysis_calibrated';

/** Raw, dated snapshot of something that happened. The Mastery Countdown reads these directly. */
export interface Event<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  id: string; // uuid
  type: EventType;
  songId: string | null;
  occurredAt: string; // ISO 8601
  payload: TPayload;
  createdAt: string; // ISO 8601, when the row was written locally
  syncedAt: string | null; // ISO 8601, when it was last confirmed synced
}

export type RollupPeriod = 'weekly' | 'monthly';

/** Precomputed weekly/monthly summary for dashboard speed. Metric-agnostic by design. */
export interface Rollup {
  id: string;
  metricId: string;
  period: RollupPeriod;
  periodStart: string; // ISO date, start of the week/month this rollup covers
  /** Null when the input could not support the measurement. See notMeasuredReason. */
  value: number | null;
  /** Why `value` is null. Null when the metric was measured. */
  notMeasuredReason: string | null;
  metricVersion: number; // MetricDefinition.version at the time this was computed
  computedAt: string; // ISO 8601
}

/** Current-state aggregate style profile — one row per metric, replaced (not appended) as it updates. */
export interface Fingerprint {
  metricId: string;
  /**
   * Null when the input could not support the measurement. A zero and an
   * absence are different facts: "no internal rhyme" is a finding, "we
   * never looked" is not, and collapsing them lets an empty song render
   * as a full profile.
   */
  value: number | null;
  /** Why `value` is null. Null when the metric was measured. */
  notMeasuredReason: string | null;
  metricVersion: number;
  computedAt: string; // ISO 8601
}

export type GoalDirection = 'increase' | 'decrease' | 'maintain';

/** User-set, per-metric. Gates everything the flaw detector may surface. */
export interface Goal {
  id: string;
  metricId: string;
  direction: GoalDirection;
  targetValue: number | null;
  active: boolean;
  createdAt: string; // ISO 8601
  archivedAt: string | null; // ISO 8601
}

/**
 * What a take actually was. Asked, never inferred — the same performance
 * judged as a freestyle and as a written verse yields opposite conclusions,
 * so guessing wrong inverts every reading built on it.
 *
 * `other_artist` exists so quoting or practising someone else's verse has a
 * truthful answer. Without it an honest user has no correct option, and the
 * system has taught them to lie to it.
 */
export type PerformanceMode = 'freestyle' | 'written' | 'other_artist' | 'mixed';

/**
 * A recorded audio take attached to a song. A song can hold many takes
 * (record, try again, compare) — this is not a single field on
 * SongContext because "how many takes exist" and "which one is current"
 * are UI/user decisions, not spine state.
 */
export interface VoiceTake {
  id: string;
  songId: string;
  uri: string; // local file:// URI from expo-audio; never a remote URL in v1
  durationMs: number;
  recordedAt: string; // ISO 8601, when recording finished
  /** Null until the user answers. Null is never treated as freestyle. */
  performanceMode: PerformanceMode | null;
  /** When the mode was last set — a later correction moves this forward. */
  modeSetAt: string | null;
  createdAt: string; // ISO 8601, when the row was written
}

/**
 * One recorded revision to one line. Append-only.
 *
 * This is capture, not analysis — nothing reads it yet. It exists because the
 * edit that produced a line cannot be recovered from the line afterwards, so
 * any verse written before this table existed can never yield revision
 * findings, no matter how good the analysis gets later.
 *
 * `lineHash` is what survives re-indexing: when a line moves, its content
 * fingerprint still identifies it.
 */
export interface LineEdit {
  id: string;
  songId: string;
  lineIndex: number;
  lineHash: string;
  kind: 'insert' | 'delete' | 'modify';
  charsAdded: number;
  charsRemoved: number;
  occurredAt: string; // ISO 8601
  createdAt: string; // ISO 8601
}

export type BpmSource = 'user' | 'detected';
export type InputMode = 'text' | 'record' | 'import_mp3';

export interface SongStructureSection {
  label: string; // "verse" | "hook" | "bridge" | freeform
  startBar: number | null;
  endBar: number | null;
}

/** Spine object for song-level state, threaded through Input -> Analysis -> Mastery Countdown. */
export interface SongContext {
  id: string;
  title: string;
  inputMode: InputMode;
  bpm: number | null;
  bpmSource: BpmSource | null;
  structure: SongStructureSection[] | null;
  /** The written or transcribed lyrics. Null for a recorded/imported song with no transcript yet. */
  bodyText: string | null;
  /** Instrumental / Backing track URI if imported (Step 2/5 instrumental awareness). */
  backingTrackUri?: string | null;
  /** Offset in milliseconds for beat alignment. */
  audioOffsetMs?: number | null;
  /** Is this project pinned to the Claude-style sidebar? */
  isPinned: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export type AttachmentType = 'image' | 'audio' | 'map' | 'link';

/** Vision Board / Apple Journal style media attachments tied to a Song. */
export interface SongAttachment {
  id: string;
  songId: string;
  type: AttachmentType;
  uri: string;
  metadata?: string | null; // e.g. location, duration, caption
  createdAt: string;
  updatedAt: string;
}
