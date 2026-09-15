# Graph Report - V1_Launch_Prosodic  (2026-09-10)

## Corpus Check
- Large corpus: 240 files · ~731,503 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 965 nodes · 1913 edges · 73 communities (59 shown, 7 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 121 edges (avg confidence: 0.82)
- Token cost: 169,044 input · 0 output

## Community Hubs (Navigation)
- Analysis Engines
- Song View & Mastery Clock
- Calibration Boundary
- Expo App Config
- Phonetics & AAVE Lexicon
- Theme & UI Primitives
- Dev Dependencies
- Runtime Dependencies
- Voice Takes & Recorder
- Measurement Discipline
- Product Vision & Roadmap
- Verification & Audit
- Literary Device Glossary
- Architecture Views
- Genre & Corpus Method
- Mastery Engine Concepts
- Sync Layer
- Rollups & Data Types
- Translation Layer
- Rhythm & Tempo Claims
- Database Layer
- Dissect Screen & Vault
- Isolated Node 22
- Isolated Node 23
- Isolated Node 24
- Isolated Node 25
- Isolated Node 26
- Isolated Node 27
- Isolated Node 28
- Isolated Node 29
- Isolated Node 30
- Isolated Node 31
- Isolated Node 32
- Isolated Node 33
- Isolated Node 34
- Isolated Node 35
- Isolated Node 36
- Isolated Node 37
- Isolated Node 38
- Isolated Node 39
- Isolated Node 40
- Isolated Node 41
- Isolated Node 42
- Isolated Node 43
- Isolated Node 44
- Isolated Node 45
- Isolated Node 46
- Isolated Node 47
- Isolated Node 48
- Isolated Node 49
- Isolated Node 50
- Isolated Node 51
- Isolated Node 52
- Isolated Node 53
- Isolated Node 54
- Isolated Node 55
- Isolated Node 56
- Isolated Node 57
- Isolated Node 58
- Isolated Node 59
- Isolated Node 60
- Isolated Node 61
- Isolated Node 62
- Isolated Node 65
- Isolated Node 66
- Isolated Node 67

## God Nodes (most connected - your core abstractions)
1. `ThinkPadScreen()` - 29 edges
2. `react-native` - 26 edges
3. `SQLiteDatabaseLike` - 24 edges
4. `react` - 21 edges
5. `expo` - 16 edges
6. `TimeSignature` - 16 edges
7. `createFakeDb()` - 15 edges
8. `useMasteryClock` - 15 edges
9. `MasterProsodicReport` - 14 edges
10. `getDb()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Trend tracking (early vs recent 40% windows)` --semantically_similar_to--> `Rollups (precomputed summaries)`  [INFERRED] [semantically similar]
  METRICS_SPECIFICATION.pdf → CLAUDE.md
- `The 16-step beat grid` --semantically_similar_to--> `Beat grid extraction (two onset maps)`  [INFERRED] [semantically similar]
  METRICS_SPECIFICATION.pdf → CLAUDE.md
- `The 16-step beat grid` --semantically_similar_to--> `Two rhythmic lanes (half-time vs double-time)`  [INFERRED] [semantically similar]
  METRICS_SPECIFICATION.pdf → docs/corpus/claims/rhythm-and-tempo.md
- `12 literary and rhetorical device detectors` --semantically_similar_to--> `Onomatopoeia`  [INFERRED] [semantically similar]
  METRICS_SPECIFICATION.pdf → entries_chronological.txt
- `Deliberateness gate (under-claims intent)` --semantically_similar_to--> `Flaw detection — descriptive, never prescriptive`  [INFERRED] [semantically similar]
  METRICS_SPECIFICATION.pdf → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **The encoder boundary - raw engine output to canonical metrics** — docs_architecture_components_engine_registry, docs_architecture_components_encoder_boundary, claude_calibration_boundary, claude_measurability, metrics_specification_final_result_converter [EXTRACTED 1.00]
- **Mastery Countdown - model, clock, constants, prior art** — claude_mastery_countdown, claude_balloon_model, docs_architecture_components_use_mastery_clock, docs_architecture_sequence_typing_timing_constants, metrics_specification_mastery_engine, roadmap_vad [INFERRED 0.85]
- **Uncertainty discipline - confidence suppresses rather than softens** — claude_three_verdict_rule, claude_confidence_travels, claude_count_vs_judgment, docs_corpus_claims_rhythm_and_tempo_grid_confidence, claude_transcription_confidence, docs_corpus_claims_measurement_methodology_confidence_threshold [INFERRED 0.85]

## Communities (73 total, 7 thin omitted)

### Community 0 - "Analysis Engines"
Cohesion: 0.06
Nodes (67): ReactorHubProps, aspirationGapEngine, concretenessEngine, dissectionEngine, earwormEngine, ENGINE_IDS, LYRIC_ENGINES, LyricAnalysisInput (+59 more)

### Community 1 - "Song View & Mastery Clock"
Cohesion: 0.08
Nodes (53): expo-document-picker, DissectScreen(), createNewDraft(), loadInitialSong(), styles, ThinkPadScreen(), FloatingDock(), FloatingDockProps (+45 more)

### Community 2 - "Calibration Boundary"
Cohesion: 0.09
Nodes (30): upsertFingerprint(), useProsodicEngine(), CalibratedScore, CalibratedSessionEnvelope, calibrateEngineOutput(), add(), clamp(), MetricDirection (+22 more)

### Community 3 - "Expo App Config"
Cohesion: 0.05
Nodes (36): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, permissions, predictiveBackGestureEnabled (+28 more)

### Community 4 - "Phonetics & AAVE Lexicon"
Cohesion: 0.12
Nodes (30): LexiconModal(), LexiconModalProps, styles, BOUNDARY_WORD_FLAGS, getPerceptualFamily(), PERCEPTUAL_FAMILIES, PerceptualFamilyMeta, PerceptualFamilyName (+22 more)

### Community 5 - "Theme & UI Primitives"
Cohesion: 0.15
Nodes (18): styles, AppTabs(), HintRowProps, styles, styles, ThemedText(), ThemedTextProps, ThemedView() (+10 more)

### Community 6 - "Dev Dependencies"
Cohesion: 0.07
Nodes (27): main, name, private, version, eslint, eslint-config-expo, expo, expo-asset (+19 more)

### Community 7 - "Runtime Dependencies"
Cohesion: 0.07
Nodes (28): dependencies, expo, expo-asset, expo-audio, expo-constants, expo-dev-client, expo-device, expo-document-picker (+20 more)

### Community 8 - "Voice Takes & Recorder"
Cohesion: 0.12
Nodes (22): expo-audio, formatDurationMs(), formatRecordedAt(), MODE_LABEL, MODE_ORDER, PlannerModal(), PlannerModalProps, styles (+14 more)

### Community 9 - "Measurement Discipline"
Cohesion: 0.10
Nodes (26): A count needs no reference, a judgment does, Thresholds must be definitional, not tuned, Flaw detection — descriptive, never prescriptive, internal_weave_density is a boolean in decimal costume, measurability gate, The floor is a test (null-condition suite), pocketTendency is a genre stereotype, not a measurement, Syllable counter treats punctuation as content (+18 more)

### Community 10 - "Product Vision & Roadmap"
Cohesion: 0.11
Nodes (24): Keep the balloon up, Dream Window (persona dreaming transcript), The edit is the judge (Osborne is not), Mastery Countdown (10,000 hours), No anti-cheat, No claim without a value behind it, Osborne (AI Mentor), Post-zero flip (+16 more)

### Community 11 - "Verification & Audit"
Cohesion: 0.12
Nodes (24): Calibration is a wrapper, not a parallel pass, Events (raw dated snapshots), Goals (user-set, per-metric), Golden-master tests for engine logic, MetricDefinition (canonical metric registry), Old Prosodic codebase (read-only reference), Verification protocol — no self-review, The encoder boundary (enforced interface) (+16 more)

### Community 12 - "Literary Device Glossary"
Cohesion: 0.09
Nodes (24): Alliteration, Assonance, Caesura, Enjambement, Figurative language, Foot, Abrams glossary — chronological entry index, Meter (+16 more)

### Community 13 - "Architecture Views"
Cohesion: 0.13
Nodes (23): Read the exact versioned Expo SDK 57 docs first, Audio analysis split by where it can run, Build order — locked, with user-observable exit criteria, Song View, Storage — mobile local-first (SQLite primary), Component view, The engine registry (runEngines), Development view — layer rules (+15 more)

### Community 14 - "Genre & Corpus Method"
Cohesion: 0.12
Nodes (20): Absence must be representable (migration v9), Fingerprint (current-state style profile), Genre/Era/Geography Engine, Rollups (precomputed summaries), It's okay to not know — single / plural / not_measurable, A model-labeled reference library is circular, Coverage is uneven across time and must be stated, Human-scored markers beat algorithmic metadata (+12 more)

### Community 15 - "Mastery Engine Concepts"
Cohesion: 0.12
Nodes (20): Perceptual family activity score formula, Longitudinal mastery and progress tracking, Proficiency tiers (developing to exemplary), The 6 core skill category scoring models, Density control window — 2.5 to 4.5 SPB, Trend tracking (early vs recent 40% windows), The 12 canonical perceptual vowel families, B2B enterprise licensing ecosystem (+12 more)

### Community 16 - "Sync Layer"
Cohesion: 0.14
Nodes (11): env, isSyncableTable(), SYNCABLE_TABLES, SyncableTable, SyncPullResponse, SyncPushRequest, SyncPushResponse, createRailwaySyncClient() (+3 more)

### Community 17 - "Rollups & Data Types"
Cohesion: 0.14
Nodes (17): fromRow(), listRollupsForMetric(), RollupRow, sample, upsertRollup(), BpmSource, EventType, GoalDirection (+9 more)

### Community 18 - "Translation Layer"
Cohesion: 0.29
Nodes (14): ReactorHub(), styles, ConceptTranslation, DialectEntry, ExplanationMode, getTranslation(), TRANSLATION_DICTIONARY, TranslationContext (+6 more)

### Community 19 - "Rhythm & Tempo Claims"
Cohesion: 0.16
Nodes (18): BPM lane ambiguity, Perceived acceleration without measured acceleration, Lyric self-similarity matrix (backlog), SongContext (song-level spine object), Triplet flow as a text-raised hypothesis, Keep correlated attributes as separate data points, Redbone falsetto-vs-register discrepancy, Jean-Claude Risset (+10 more)

### Community 20 - "Database Layer"
Cohesion: 0.27
Nodes (8): NOTE: this proves the JS call graph is correct, not that reads/writes, runMigrations(), toDatabaseLike(), assertMigrationsWellFormed(), Migration, migrations, withTransaction(), SQLiteDatabaseLike

### Community 21 - "Dissect Screen & Vault"
Cohesion: 0.23
Nodes (12): react-native-safe-area-context, styles, FramedArtModal(), FramedArtModalProps, styles, SocialCardModal(), SocialCardModalProps, styles (+4 more)

### Community 22 - "Isolated Node 22"
Cohesion: 0.16
Nodes (11): react, react-native, CadenceBottomSheet(), CadenceBottomSheetProps, styles, DynamicIslandHUD(), DynamicIslandHUDProps, styles (+3 more)

### Community 23 - "Isolated Node 23"
Cohesion: 0.24
Nodes (11): styles, SyllableGutter(), SyllableGutterProps, LineSyllableAnalysis, BarMetrics, getBarMetrics(), getDensityHeatColor(), getSyllablePocketStatus() (+3 more)

### Community 24 - "Isolated Node 24"
Cohesion: 0.20
Nodes (8): COMMON_BPMS, styles, TempoDensityHeader(), TempoDensityHeaderProps, TIME_SIGNATURES, TapTempoCalculator, StylePresetKey, VisualDensityMode

### Community 25 - "Isolated Node 25"
Cohesion: 0.21
Nodes (13): App icon, Prosodic logo board, Flat 2D mark, Hero luminous wave with metric ticks, Tagline — turn intuition into metrics, Brand palette and wave gradient, Prosodic brand core idea, Dark mode tokens (+5 more)

### Community 26 - "Isolated Node 26"
Cohesion: 0.18
Nodes (9): expo-image, expo-splash-screen, react-native-reanimated, react-native-worklets, AnimatedSplashOverlay(), glowKeyframe, keyframe, logoKeyframe (+1 more)

### Community 27 - "Isolated Node 27"
Cohesion: 0.17
Nodes (12): aspirationGap engine (declared requires), Fade-out tapping study, Resolution is a property of the ending alone, Refrain, Sonnet, Stanza, Density gradient arc shapes (ArcType), Aspiration gap score (+4 more)

### Community 28 - "Isolated Node 28"
Cohesion: 0.17
Nodes (12): scripts, android, format, format:check, ios, lint, reset-project, start (+4 more)

### Community 29 - "Isolated Node 29"
Cohesion: 0.24
Nodes (7): Draw-GradientStroke(), Draw-Wave(), Draw-WaveBox(), Export-Layer(), New-Bitmap(), Save(), WavePath()

### Community 30 - "Isolated Node 30"
Cohesion: 0.29
Nodes (7): CANONICAL_METRIC_DEFINITIONS, CRAFT_CHALLENGES, CraftChallengeBlueprint, mockOpenDatabaseSync, CANONICAL_METRIC_IDS, CANONICAL_METRIC_VERSIONS, seedCanonicalMetrics()

### Community 31 - "Isolated Node 31"
Cohesion: 0.35
Nodes (8): EventRow, fromRow(), listEventsBySongId(), listEventsByType(), listUnsyncedEvents(), markEventsSynced(), sample, Event

### Community 32 - "Isolated Node 32"
Cohesion: 0.31
Nodes (8): createFakeDb(), FingerprintRow, fromRow(), getFingerprint(), listFingerprint(), listMeasuredFingerprint(), sample, Fingerprint

### Community 33 - "Isolated Node 33"
Cohesion: 0.24
Nodes (3): Draw-GradientPath(), Draw-Wave(), New-WavePath()

### Community 34 - "Isolated Node 34"
Cohesion: 0.28
Nodes (9): Beat grid extraction (two onset maps), Confidence travels with the measurement, Freestyle performance analysis, Grid confidence must travel with the measurement, Transcription confidence must travel with the measurement, Phonemic restoration, Richard Warren, Grid confidence must suppress, not soften, a finding (+1 more)

### Community 35 - "Isolated Node 35"
Cohesion: 0.22
Nodes (9): devDependencies, eslint, eslint-config-expo, jest, jest-expo, prettier, @types/jest, @types/react (+1 more)

### Community 36 - "Isolated Node 36"
Cohesion: 0.22
Nodes (8): expo/tsconfig.base, compilerOptions, paths, strict, types, extends, include, @/assets/*

### Community 37 - "Isolated Node 37"
Cohesion: 0.22
Nodes (7): exampleDirPath, fs, oldDirs, path, readline, rl, root

### Community 38 - "Isolated Node 38"
Cohesion: 0.36
Nodes (7): archiveGoal(), fromRow(), GoalRow, insertGoal(), listActiveGoals(), sample, Goal

### Community 39 - "Isolated Node 39"
Cohesion: 0.39
Nodes (7): fromRow(), getMetricDefinition(), listMetricDefinitions(), MetricDefinitionRow, sample, upsertMetricDefinition(), MetricDefinition

### Community 40 - "Isolated Node 40"
Cohesion: 0.39
Nodes (6): countEditsByLine(), fromRow(), LineEditRow, listLineEditsBySongId(), sample, LineEdit

### Community 41 - "Isolated Node 41"
Cohesion: 0.29
Nodes (5): args, filesToAudit, fs, path, promptPath

### Community 42 - "Isolated Node 42"
Cohesion: 0.40
Nodes (5): styles, VerseXRayView(), VerseXRayViewProps, DissectedLine, DissectedWord

### Community 43 - "Isolated Node 43"
Cohesion: 0.47
Nodes (4): FakeDbOptions, RecordedCall, SQLiteBindValue, SQLiteRunResultLike

### Community 44 - "Isolated Node 44"
Cohesion: 0.33
Nodes (3): fs, path, scratchDir

### Community 45 - "Isolated Node 45"
Cohesion: 0.33
Nodes (3): files, fs, path

### Community 46 - "Isolated Node 46"
Cohesion: 0.33
Nodes (3): fs, path, scratchDir

### Community 47 - "Isolated Node 47"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

### Community 48 - "Isolated Node 48"
Cohesion: 0.40
Nodes (3): expo-router, expo-web-browser, Props

### Community 49 - "Isolated Node 49"
Cohesion: 0.40
Nodes (3): fs, path, scratchDir

### Community 50 - "Isolated Node 50"
Cohesion: 0.70
Nodes (4): Color-Distance(), Export-Crop(), Get-BackgroundColor(), New-Transparent()

### Community 51 - "Isolated Node 51"
Cohesion: 0.50
Nodes (4): fetchFigmaFile(), traverse(), fs, path

### Community 52 - "Isolated Node 52"
Cohesion: 0.67
Nodes (3): SideColumnDrawer(), styles, useTranslation()

### Community 53 - "Isolated Node 53"
Cohesion: 0.50
Nodes (3): fs, path, target

### Community 54 - "Isolated Node 54"
Cohesion: 0.50
Nodes (3): fs, path, scratchDir

### Community 55 - "Isolated Node 55"
Cohesion: 0.50
Nodes (3): fs, path, target

### Community 56 - "Isolated Node 56"
Cohesion: 0.50
Nodes (3): fs, path, scratchDir

### Community 57 - "Isolated Node 57"
Cohesion: 0.50
Nodes (3): fs, path, scratchDir

### Community 58 - "Isolated Node 58"
Cohesion: 0.67
Nodes (3): Brainstorm Mode protocol, Don't Build Yet trigger, Process rule — name the step, backlog the rest

## Knowledge Gaps
- **314 isolated node(s):** `singleQuote`, `semi`, `trailingComma`, `printWidth`, `name` (+309 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 370 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Isolated Node 22` to `Song View & Mastery Clock`, `Calibration Boundary`, `Phonetics & AAVE Lexicon`, `Theme & UI Primitives`, `Dev Dependencies`, `Voice Takes & Recorder`, `Isolated Node 48`, `Translation Layer`, `Isolated Node 52`, `Dissect Screen & Vault`, `Isolated Node 24`, `Isolated Node 26`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `react-native` connect `Isolated Node 22` to `Song View & Mastery Clock`, `Phonetics & AAVE Lexicon`, `Theme & UI Primitives`, `Dev Dependencies`, `Voice Takes & Recorder`, `Isolated Node 42`, `Translation Layer`, `Isolated Node 52`, `Dissect Screen & Vault`, `Isolated Node 23`, `Isolated Node 24`, `Isolated Node 26`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Runtime Dependencies` to `Dev Dependencies`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `singleQuote`, `semi`, `trailingComma` to the rest of the system?**
  _314 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Analysis Engines` be split into smaller, more focused modules?**
  _Cohesion score 0.05524537173082574 - nodes in this community are weakly interconnected._
- **Should `Song View & Mastery Clock` be split into smaller, more focused modules?**
  _Cohesion score 0.08033362598770852 - nodes in this community are weakly interconnected._
- **Should `Calibration Boundary` be split into smaller, more focused modules?**
  _Cohesion score 0.08974358974358974 - nodes in this community are weakly interconnected._