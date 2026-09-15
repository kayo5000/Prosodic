'''
Final Result Converter
Pure normalization layer — converts every analysis engine's raw numeric
output onto one comparable scale (0.0-1.0, "higher always means stronger")
so scores from different engines can be blended or compared without
accidentally cancelling or inverting each other.

This module does not measure anything itself and never edits or overrides
what an engine actually computed — every function here is value in, value
out. If a number looks wrong, the bug is in whichever engine produced it,
not here.

AUDIT (feeds /analyze via feedback_engine.py, /suggest via
suggestion_engine.py — every engine either calls or is called by these two)
====================================================================
Traced every numeric output reachable from assemble_feedback() and
get_suggestions(). Recorded scale and polarity per source, not assumed:

  phoneme_engine.rhyme_score()              0.0-1.0   normal
  perceptual_family_engine.family_score /
    score_family_membership()               0.0-1.0   normal (wraps rhyme_score)
  pattern_reader_engine.activity_score      0.0-1.0   normal (already an
                                                        internally-weighted
                                                        0.40/0.35/0.25 blend)
  semantics_engine.semantic_similarity()    0.0-1.0*  normal (*spaCy cosine
                                                        similarity is
                                                        mathematically
                                                        bounded [-1, 1]; real
                                                        word-pair vectors
                                                        from en_core_web_md
                                                        land >= 0 in practice,
                                                        clipped defensively
                                                        rather than assumed)
  density_engine's internal/multisyllabic/
    motif                                   0.0-100.0 normal (percentages)
  suggestion_engine's rhyme_score field     0.0-100.0 normal (phoneme
                                                        rhyme_score * 100,
                                                        already expanded
                                                        before this module
                                                        sees it)
  suggestion_engine's thesaurus_score       0.0-100.0 normal (a hand-tiered
                                                        ladder — 0 / 30-70 /
                                                        85 / 90 / 100 — not
                                                        continuous, but
                                                        already 0-100 and
                                                        higher = stronger)
  suggestion_engine's syllable_priority     0-2       normal (ordinal rank:
                                                        0 = off-target,
                                                        1 = within one
                                                        syllable, 2 = exact —
                                                        this was the one
                                                        actually blended on
                                                        the wrong scale
                                                        before this module:
                                                        see WIRING below)
  stress_signals per-signal 'confidence'    0.0-1.0   normal (not currently
                                                        blended with any
                                                        other engine's score
                                                        anywhere in the live
                                                        pipeline — registered
                                                        here for when it is)

Explicitly checked for inverted polarity (lower raw = stronger) per
Khris's "aligned polarity" requirement: none exists anywhere in the
current live pipeline. Every engine above already treats a higher raw
number as the stronger signal. 'inverted' is fully implemented and
covered by tests below anyway — so a future engine that DOES invert (a
distance/error/edit-cost metric, where LOWER is better) gets registered
correctly instead of silently blended backwards.

WIRING
======
The only place multiple engines' numbers currently get blended together
into one score, anywhere in the live /analyze or /suggest pipeline, is
suggestion_engine.py's _layer2() composite_score calculation. (Checked
feedback_engine.py's aggregation too — it only averages density_engine's
own three same-scale metrics together, no cross-engine mixing, so there
was nothing to fix there. stress_signals.py doesn't blend anything
numeric with another engine's score either — it's categorical signal
detection, not a composite.)

_layer2's old formula was already an implicit, hand-tuned version of this
exact normalization — multiplying syllable_priority (a 0-2 ordinal) by a
magic 7.5 to make its maximum contribution (15) proportional to
rhyme_score's (55) and thesaurus_score's (30) on a 0-100 composite. Wiring
it through normalize() instead produces byte-for-byte identical output
(0.55 == 55/100, 0.30 == 30/100, 7.5 == 15/2 — the old numbers were
already doing this) — see tests/test_final_result_converter.py's
regression test — but now the scale/polarity is explicit and registered
instead of implicit in a multiplier nobody could re-derive without
reverse-engineering it.

Part of the Prosodic hip-hop lyric analysis suite.
'''

from domain.prosodic_config import BOUNDARY_THRESHOLD, BOUNDARY_SIGNAL_WEIGHTS

# ── Per-source scale + polarity registry ────────────────────────────────
# (raw_min, raw_max, polarity). polarity is 'normal' (higher raw = stronger)
# or 'inverted' (lower raw = stronger). See the audit above for how each
# entry was determined — read the source, don't guess a new one in here.
SCALES = {
    'phoneme_rhyme_score':          (0.0, 1.0,   'normal'),
    'perceptual_family_score':      (0.0, 1.0,   'normal'),
    'pattern_activity_score':       (0.0, 1.0,   'normal'),
    'semantic_similarity':          (0.0, 1.0,   'normal'),
    'density_internal':             (0.0, 100.0, 'normal'),
    'density_multisyllabic':        (0.0, 100.0, 'normal'),
    'density_motif':                (0.0, 100.0, 'normal'),
    'suggestion_rhyme_score':       (0.0, 100.0, 'normal'),
    'suggestion_thesaurus_score':   (0.0, 100.0, 'normal'),
    'suggestion_syllable_priority': (0.0, 2.0,   'normal'),
    'stress_signal_confidence':     (0.0, 1.0,   'normal'),
    # phrase_container_engine's per-boundary signal weight. Floor is
    # BOUNDARY_THRESHOLD itself (not 0) — a weight below that never
    # becomes an accepted boundary at all, so anchoring the confidence
    # scale there (rather than 0) means a just-barely-accepted boundary
    # reads as low-but-real confidence instead of wasting the whole top
    # half of the scale on weights that could never occur. Ceiling is
    # every signal firing at once — derived from BOUNDARY_SIGNAL_WEIGHTS
    # itself so it can't drift out of sync if a weight ever changes.
    'phrase_boundary_weight':       (BOUNDARY_THRESHOLD, sum(BOUNDARY_SIGNAL_WEIGHTS.values()), 'normal'),
}


def normalize(raw_value, source_key, *, clip=True):
    '''
    Converts one raw engine value to the standard 0.0-1.0, higher-always-
    stronger scale, using the (raw_min, raw_max, polarity) registered for
    source_key in SCALES.

    Raises KeyError for an unregistered source_key rather than guessing a
    scale — same "fail loud instead of silently degrading" convention as
    thesaurus_engine's schema-drift check. Register the source in SCALES
    first, with a comment explaining how its range/polarity was verified.
    '''
    if source_key not in SCALES:
        raise KeyError(
            f'"{source_key}" is not registered in final_result_converter.SCALES. '
            f'Add its (raw_min, raw_max, polarity) there first — verify the '
            f'engine\'s actual output range, never guess it.'
        )
    raw_min, raw_max, polarity = SCALES[source_key]
    return normalize_raw(raw_value, raw_min, raw_max, polarity, clip=clip)


def normalize_raw(raw_value, raw_min, raw_max, polarity='normal', *, clip=True):
    '''
    The actual conversion, for a one-off metric that doesn't warrant a
    permanent SCALES registry entry yet, or for tests.

    normal:   0.0 at raw_min, 1.0 at raw_max — higher raw = higher output.
    inverted: 1.0 at raw_min, 0.0 at raw_max — LOWER raw = higher output.
              Use for any metric where less-of-the-raw-number is the
              stronger signal (e.g. a distance/error/edit-cost metric).

    clip=True (default) clamps the result to [0.0, 1.0] — protects against
    a raw value that falls slightly outside [raw_min, raw_max] (e.g. a
    cosine similarity that dips just under 0.0) without hiding a real
    scale mismatch, since anything wildly outside the range should be
    caught by registering the correct raw_min/raw_max, not by silently
    clipping a symptom.
    '''
    if raw_max == raw_min:
        raise ValueError(f'raw_max ({raw_max}) must differ from raw_min ({raw_min})')
    if polarity not in ('normal', 'inverted'):
        raise ValueError(f"polarity must be 'normal' or 'inverted', got {polarity!r}")

    span = raw_max - raw_min
    fraction = (raw_value - raw_min) / span
    if polarity == 'inverted':
        fraction = 1.0 - fraction
    if clip:
        fraction = max(0.0, min(1.0, fraction))
    return fraction
