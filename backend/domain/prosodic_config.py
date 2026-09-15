'''
prosodic_config.py
Single source of truth for magic numbers scattered across the live
/analyze + /suggest pipeline — the beat grid, pocket positions, rhyme/
boundary/density thresholds. Pulling these into one place means a future
tuning pass changes one number in one file instead of hunting down every
place it was silently copy-pasted (and risking the copies drifting apart
— the exact "three separate recomputes" class of bug already found and
fixed once this session, just for constants instead of logic).

SCOPE: this covers constants actually read by the live pipeline behind
/analyze and /suggest (feedback_engine.py and suggestion_engine.py's real
dependency graph — the same graph audited for final_result_converter.py).
It deliberately does NOT reach into:
  - cantos/, analysis/, behavior/ — the Behavioral Layer and Cantos
    package are built but not wired into any live/default path (see
    feature-flag work); their own constants get centralized when/if they
    go live, not preemptively guessed at now.
  - train_rhyme_model.py, data_generator.py, ml/ — offline training
    scripts, not runtime code.
  - Values that happen to share a number but mean genuinely different
    things (e.g. several unrelated 0.75s and 0.4s exist elsewhere in the
    codebase — aspiration_gap.py's PP formula weight, bar_aligner.py's
    similarity cutoffs, train_rhyme_model.py's score bounds). Centralizing
    those together would be actively wrong — it would imply they're the
    same tunable value when they're not. Only real duplicates (the same
    concept, hardcoded more than once) and the specific constants Khris
    named are collected here.

Part of the Prosodic hip-hop lyric analysis suite.
'''

# ── Beat grid (pocket_engine.py, performed_stress.py via stress_signals.py) ─
# Every bar is divided into 16 sixteenth-note slots. Previously a bare `16`
# repeated inline in both files (a third file, bar_grid_linguistics.py, has
# its own copy too — but that module has zero importers anywhere in the
# repo, live or dormant, so it's out of scope here; flagged separately as
# dead code).
GRID_SIZE = 16

# Beat 1/2/3/4 downbeats — grid positions 0, 4, 8, 12.
STRONG_POSITIONS = {0, 4, 8, 12}

# Beat 2 and Beat 4 — "the pocket," where hip-hop rhymes live. In 1-indexed
# human terms (the way Khris described it) these are box 5 and box 13;
# internally the grid is 0-indexed, so that's positions 4 and 12 — same
# two slots as STRONG_POSITIONS' beat-2/beat-4 members, named separately
# here because "on a strong beat" and "on the pocket" are asked about
# independently throughout pocket_engine.py.
POCKET_POSITIONS = {4, 12}

# ±1 sixteenth note still counts as "on pocket" / "on a strong beat".
POCKET_WINDOW = 1

# Max grid positions a stressed syllable may be nudged toward the nearest
# strong/pocket beat during stress-aware placement.
NUDGE_WINDOW = 2


# ── Rhyme thresholds (rhyme_detection_engine.py, phoneme_engine.py,
#    suggestion_engine.py, api.py) ──────────────────────────────────────
# Minimum syllable_rhyme_score to count two syllables as rhyming at all.
# Tight enough to block noise; the R-bridge case sits at 0.80, comfortably
# above this.
RHYME_THRESHOLD = 0.78

# Same vowel base, different stress digit or R-coloring (e.g. ER1 vs ER2) —
# a near-rhyme, not a perfect one. This exact value was previously
# hardcoded separately in phoneme_engine.py, suggestion_engine.py (four
# separate call sites), and api.py's docstring — the real duplication this
# module exists to close.
NEAR_RHYME_SAME_VOWEL_SCORE = 0.75


# ── Phrase container boundary detection (phrase_container_engine.py) ────
# Total signal weight needed (AND at least MIN_SIGNALS_FIRED individual
# signals) before a line boundary is confirmed as a container break.
BOUNDARY_THRESHOLD = 1.5
MIN_SIGNALS_FIRED = 2

# Per-signal weights when detecting a container boundary between two lines.
BOUNDARY_SIGNAL_WEIGHTS = {
    'rhyme_resolution':  0.8,
    'density_drop':      0.6,
    'syllable_reset':    0.5,
    'line_length_shift': 0.4,
    'rest_bar':          0.7,
}

# "density_drop" fires when the previous line's internal-rhyme density was
# at least this (a percentage, 0-100) AND the current line's density falls
# below DENSITY_DROP_RATIO of it — i.e. a drop of more than
# (1 - DENSITY_DROP_RATIO) = 40%. This is the "40% density-drop cutoff"
# Khris named — previously two bare literals (40 and 0.6) inline with no
# name at all.
DENSITY_DROP_MIN_PREV = 40
DENSITY_DROP_RATIO = 0.6

# "syllable_reset" fires when the current line's syllable count falls
# below this ratio of the previous line's. Numerically the same 0.6 as
# DENSITY_DROP_RATIO today, but a conceptually distinct dial (syllable
# count, not rhyme density) — kept as its own named constant on purpose
# so tuning one doesn't silently move the other.
SYLLABLE_RESET_RATIO = 0.6

# "line_length_shift" fires when consecutive lines' word counts differ by
# more than this.
LINE_LENGTH_SHIFT_WORD_DIFF = 4

# A line with this many words or fewer counts as a "rest bar".
REST_BAR_MAX_WORDS = 3


# ── Stress/cadence signals (stress_signals.py) ───────────────────────────
# 3+ consecutive unstressed syllables = a stress_lapse.
LAPSE_RUN_LENGTH = 3

# A word must recur on this many DIFFERENT lines before a mismatch signal
# on it can be upgraded to 'possible_deliberate' — matches motif_engine's
# own recurrence bar for "this is intentional, not noise".
RECURRENCE_MIN = 2
