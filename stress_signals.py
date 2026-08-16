"""
stress_signals.py

Craft-signal taxonomy for stress/rhythm mismatches between a word's
dictionary (lexical) stress and where it actually lands on the beat grid
(performed stress) — i.e. cadence signals.

No signal-type taxonomy existed anywhere in this codebase before this file
(confirmed by search — no SignalType/craft_signal/enum/registry of any
kind). This is modeled on the nearest existing precedent found in the
Prosodic engine suite: behavior/drift_engine.py's _NUMERIC_FEATURES +
category-tuple pattern (a flat tuple of names, plus secondary groupings
built from them).

This module does NOT recompute lexical stress or grid placement itself —
it reuses performed_stress.py's existing lexical-vs-performed comparison
primitives (get_lexical_stress, get_lexical_stress_variants,
infer_performed_stress_from_stream) and classifies their output into the
taxonomy below. The actual grid placement it reads comes from
pocket_engine's real (now stress-aware) syllable positions, not a second
independent guess — see infer_performed_stress_from_stream()'s docstring
in performed_stress.py for why that distinction matters.

Part of the Prosodic hip-hop lyric analysis suite.


SIGNAL TYPES
============
  promotion              — a lexically weak syllable (stress 0) lands on a
                            stressed grid slot (performed_stress >= 1).
  demotion                — a lexically stressed syllable (stress 1 or 2)
                            lands on an unstressed grid slot, but within
                            POCKET_WINDOW of a strong/pocket beat — a near
                            miss, not a real displacement.
  syncopation             — the highest-value flow signal: a lexically
                            stressed syllable lands on an unstressed grid
                            slot AND further than POCKET_WINDOW from any
                            strong/pocket beat — genuinely between the
                            pulses, not just adjacent to one. Every
                            syncopation would also qualify as a demotion by
                            the raw stress-mismatch test; this module only
                            ever emits the more specific label.
  trochaic_inversion      — two adjacent syllables where the grid rises in
                            prominence (performed_stress[i+1] >
                            performed_stress[i] — a weak-then-STRONG,
                            iambic-shaped slot) but the word supplies a
                            falling one (lexical_stress[i] >= 1,
                            lexical_stress[i+1] == 0 — a trochee).
  stress_clash            — two adjacent syllables (by sequence, not
                            necessarily by grid slot) that are BOTH
                            lexically stressed with nothing unstressed
                            between them. A property of the words chosen,
                            independent of the grid — and the exact
                            environment where English's Rhythm Rule
                            automatically retracts stress to avoid the
                            clash (thirTEEN -> THIRteen men). See the
                            deliberateness gate below.
  stress_lapse            — LAPSE_RUN_LENGTH+ consecutive unstressed
                            syllables in a row. Also purely lexical.
  secondary_recruitment   — a word's SECONDARY-stress syllable (CMU level
                            2) lands on/near a strong beat while its
                            PRIMARY-stress syllable (level 1) does not —
                            the grid is anchoring on the word's secondary
                            prominence instead of its main one.
  level_stress_ambiguity  — CMU itself lists multiple pronunciations for
                            this word that disagree on which syllable is
                            primary-stressed (contested-prominence
                            compounds). Independent of grid placement.


DELIBERATENESS GATE — read before using this data anywhere artist-facing
==========================================================================
promotion / demotion / syncopation / trochaic_inversion are all "the grid
and the dictionary disagree" signals. That disagreement has (at least) two
real, very different causes:

  1. WRENCHED ACCENT — the artist deliberately distorted the natural
     stress for effect. Real craft, worth naming as a choice.
  2. THE RHYTHM RULE — English automatically shifts phrasal stress to
     avoid two stressed syllables colliding (a stress clash), e.g.
     "thirTEEN" on its own becomes "THIRteen men" in the phrase — nobody
     decided that, it's just how the phrase is pronounced fluently.

This module cannot reliably tell those apart from text alone, and does not
try to guess. Every mismatch signal carries a `deliberateness` field with
exactly one of three values — and NEVER a bare "deliberate":

  'likely_automatic'     — the syllable sits inside a detected stress_clash
                            — the Rhythm-Rule environment is present, so
                            this mismatch is plausibly just automatic
                            pronunciation, not a choice.
  'possible_deliberate'   — no clash context, AND the same word recurs on
                            2+ other lines in the verse — this codebase's
                            own existing bar for "this is intentional, not
                            noise" (see motif_engine's min_recurrence=2).
  'uncertain'             — everything else. This is the default and will
                            be the MOST COMMON label. Under-claim rather
                            than over-claim.

Consumers (UI, VEIL) must never present an 'uncertain' or 'likely_automatic'
signal as "you chose to do X" — only 'possible_deliberate', and even then
it should be hedged, not asserted as fact. Each signal also carries a
numeric `confidence` in [0, 1] for the same reason — nothing here is
ever confidence 1.0.
"""
import logging
from collections import Counter

from pocket_engine import STRONG_POSITIONS, POCKET_POSITIONS, POCKET_WINDOW
from performed_stress import (
    infer_performed_stress_from_stream,
    get_lexical_stress_variants,
)
from phoneme_engine import FUNCTION_WORDS
from domain.prosodic_config import LAPSE_RUN_LENGTH, RECURRENCE_MIN

log = logging.getLogger(__name__)

# ── Taxonomy ──────────────────────────────────────────────────────────────

SIGNAL_TYPES = (
    'promotion', 'demotion', 'syncopation', 'trochaic_inversion',
    'stress_clash', 'stress_lapse', 'secondary_recruitment',
    'level_stress_ambiguity',
)

# Grid-vs-lexical disagreement signals — subject to the deliberateness gate.
MISMATCH_SIGNALS = ('promotion', 'demotion', 'syncopation', 'trochaic_inversion')

# Properties of the words themselves, independent of grid placement.
LEXICAL_SIGNALS = ('stress_clash', 'stress_lapse', 'level_stress_ambiguity')

RECRUITMENT_SIGNALS = ('secondary_recruitment',)

DELIBERATE_UNCERTAIN = 'uncertain'
DELIBERATE_AUTOMATIC = 'likely_automatic'
DELIBERATE_POSSIBLE  = 'possible_deliberate'

_STRONG_OR_POCKET = STRONG_POSITIONS | POCKET_POSITIONS


def _near_beat(grid_pos):
    return any(abs(grid_pos - p) <= POCKET_WINDOW for p in _STRONG_OR_POCKET)


def _on_pocket(grid_pos):
    return any(abs(grid_pos - p) <= POCKET_WINDOW for p in POCKET_POSITIONS)


def _effective_lexical_stress(s):
    '''
    Function words are treated as stress-0 for THIS taxonomy's detection
    logic unless they land on a pocket position (beat 2 or beat 4) — the
    same "function words suppressed unless on pocket position" rule this
    codebase already applies elsewhere (motif/rhyme detection). CMU marks
    a function word's vowel with a stress digit because that reflects its
    CITATION form (said alone); in a phrase it's normally unstressed
    unless the flow deliberately puts weight on it. Without this, nearly
    every adjacent pair of monosyllabic function words (I/that/it's/with)
    registers as a stress_clash — confirmed empirically while building
    this — which is noise, not signal.

    Only affects internal classification; the ORIGINAL CMU lexical_stress
    is still what gets reported in each signal's output dict.
    '''
    if s['word'].lower() in FUNCTION_WORDS and not _on_pocket(s['grid_position']):
        return 0
    return s['lexical_stress']


def _deliberateness(word, is_clash_adjacent, word_recurrence):
    '''
    Never returns a bare "deliberate". See module docstring — this is the
    single most important design constraint in this file.
    '''
    if is_clash_adjacent:
        return DELIBERATE_AUTOMATIC, 0.3
    if word_recurrence.get(word.lower(), 0) >= RECURRENCE_MIN:
        return DELIBERATE_POSSIBLE, 0.55
    return DELIBERATE_UNCERTAIN, 0.3


def _base_signal(sig_type, s, deliberateness=None, confidence=None, **extra):
    d = {
        'type':             sig_type,
        'word':             s['word'],
        'word_index':       s['word_index'],
        'syllable_index':   s['syllable_index'],
        'global_syll_idx':  s['global_syll_idx'],
        'grid_position':    s['grid_position'],
        'lexical_stress':   s['lexical_stress'],
        'performed_stress': s['performed_stress'],
    }
    if deliberateness is not None:
        d['deliberateness'] = deliberateness
        d['confidence'] = confidence
    d.update(extra)
    return d


# ── Per-line detection ───────────────────────────────────────────────────

def detect_line_signals(syllable_data, word_recurrence=None):
    '''
    syllable_data: list of per-syllable dicts shaped like
        performed_stress.infer_performed_stress()/infer_performed_stress_from_stream()
        output — word, word_index, syllable_index, global_syll_idx,
        grid_position, performed_stress, lexical_stress.
    word_recurrence: optional {word.lower(): line_count} map used only to
        upgrade deliberateness to 'possible_deliberate'. Without it, every
        mismatch signal defaults to 'uncertain' or 'likely_automatic'.

    Returns a flat list of signal dicts (see module docstring for the
    taxonomy and the deliberateness gate).
    '''
    word_recurrence = word_recurrence or {}
    signals = []
    if not syllable_data:
        return signals

    # Effective lexical stress per syllable — function words suppressed to
    # 0 unless on-pocket (see _effective_lexical_stress). Everything below
    # classifies against THIS, not the raw CMU value; each emitted signal
    # still reports the true CMU lexical_stress in its output dict.
    eff = {s['global_syll_idx']: _effective_lexical_stress(s) for s in syllable_data}

    # ── stress_clash (adjacent, both lexically stressed) + track which
    #    global_syll_idx values are clash-adjacent, for the gate below ──
    clash_adjacent = set()
    for i in range(1, len(syllable_data)):
        prev, cur = syllable_data[i - 1], syllable_data[i]
        if eff[prev['global_syll_idx']] >= 1 and eff[cur['global_syll_idx']] >= 1:
            clash_adjacent.update((prev['global_syll_idx'], cur['global_syll_idx']))
            label = cur['word'] if cur['word'] == prev['word'] else f"{prev['word']}/{cur['word']}"
            sig = _base_signal('stress_clash', cur, DELIBERATE_UNCERTAIN, 0.9)
            sig['word'] = label
            signals.append(sig)

    # ── stress_lapse (runs of LAPSE_RUN_LENGTH+ unstressed syllables) ───
    run_start = None
    for i, s in enumerate(syllable_data):
        if eff[s['global_syll_idx']] == 0:
            if run_start is None:
                run_start = i
        else:
            if run_start is not None and i - run_start >= LAPSE_RUN_LENGTH:
                signals.append(_lapse_signal(syllable_data[run_start:i]))
            run_start = None
    if run_start is not None and len(syllable_data) - run_start >= LAPSE_RUN_LENGTH:
        signals.append(_lapse_signal(syllable_data[run_start:]))

    # ── promotion / demotion / syncopation ───────────────────────────────
    for s in syllable_data:
        lex, perf, pos = eff[s['global_syll_idx']], s['performed_stress'], s['grid_position']
        is_clash = s['global_syll_idx'] in clash_adjacent
        deliberateness, confidence = _deliberateness(s['word'], is_clash, word_recurrence)

        if lex == 0 and perf >= 1:
            signals.append(_base_signal('promotion', s, deliberateness, confidence))
        elif lex >= 1 and perf == 0:
            sig_type = 'demotion' if _near_beat(pos) else 'syncopation'
            signals.append(_base_signal(sig_type, s, deliberateness, confidence))

    # ── trochaic_inversion (adjacent pair, grid rises, word falls) ──────
    for i in range(len(syllable_data) - 1):
        a, b = syllable_data[i], syllable_data[i + 1]
        if (b['performed_stress'] > a['performed_stress']
                and eff[a['global_syll_idx']] >= 1 and eff[b['global_syll_idx']] == 0):
            is_clash = (a['global_syll_idx'] in clash_adjacent
                        or b['global_syll_idx'] in clash_adjacent)
            deliberateness, confidence = _deliberateness(a['word'], is_clash, word_recurrence)
            label = a['word'] if a['word'] == b['word'] else f"{a['word']} {b['word']}"
            sig = _base_signal('trochaic_inversion', a, deliberateness, confidence,
                                second_syllable_index=b['syllable_index'],
                                second_grid_position=b['grid_position'])
            sig['word'] = label
            signals.append(sig)

    # ── secondary_recruitment (per-word: level-2 near beat, level-1 not) ─
    # Not gated by _effective_lexical_stress — CMU levels 1/2 already only
    # apply to multi-syllable words, which aren't in FUNCTION_WORDS anyway.
    by_word = {}
    for s in syllable_data:
        by_word.setdefault(s['word_index'], []).append(s)
    for sylls in by_word.values():
        primary   = [s for s in sylls if s['lexical_stress'] == 1]
        secondary = [s for s in sylls if s['lexical_stress'] == 2]
        if not (primary and secondary):
            continue
        prim_near = any(_near_beat(s['grid_position']) for s in primary)
        sec_near  = any(_near_beat(s['grid_position']) for s in secondary)
        if sec_near and not prim_near:
            s0 = secondary[0]
            deliberateness, confidence = _deliberateness(s0['word'], False, word_recurrence)
            signals.append(_base_signal('secondary_recruitment', s0, deliberateness, confidence))

    return signals


def _lapse_signal(run):
    first = run[0]
    words = list(dict.fromkeys(r['word'] for r in run))
    sig = _base_signal('stress_lapse', first, DELIBERATE_UNCERTAIN, 0.7,
                        run_length=len(run))
    sig['word'] = ' '.join(words)
    return sig


def detect_ambiguous_words(words):
    '''
    Lexical-only signal: words where CMU lists multiple pronunciations that
    disagree on which syllable is primary-stressed. `words` is a flat list
    of word strings (order-preserving duplicates OK — first occurrence wins).
    '''
    signals = []
    seen = set()
    for wi, word in enumerate(words):
        wl = word.lower()
        if wl in seen or not wl:
            continue
        seen.add(wl)
        variants = get_lexical_stress_variants(word)
        if len(variants) < 2:
            continue
        primary_positions = {v.index(1) for v in variants if 1 in v}
        if len(primary_positions) > 1:
            signals.append({
                'type':           'level_stress_ambiguity',
                'word':           word,
                'word_index':     wi,
                'variants':       variants,
                'deliberateness': DELIBERATE_UNCERTAIN,
                'confidence':     0.6,
            })
    return signals


# ── Verse-level entry point (live pipeline) ─────────────────────────────

def analyze_verse_stream(stream, ctx):
    '''
    Live-pipeline entry point. `stream` is motif_result['stream'] — the
    full syllable stream feedback_engine already built, enriched with real
    pocket positions by pocket_engine (via motif_engine.build_motif_map
    when ctx.bpm is given).

    BUILD SPEC 01: takes a SongContext instead of a bare bpm. Note on bpm
    itself, unchanged from before: matches pocket_engine's own behavior —
    bpm gates WHETHER this runs (no pocket positions exist without it) but
    its numeric value does not change the grid math. Not pretending
    otherwise here.

    Returns:
        {
          'signals':       flat list of all signal dicts across the verse,
                            each with a 'line_index' key added,
          'signal_counts': {signal_type: count, ...} — every SIGNAL_TYPES
                            key present even at 0, so this can never look
                            like it silently no-op'd vs. just finding nothing,
          'lines_analyzed': int,
        }
    '''
    empty = {
        'signals': [],
        'signal_counts': {t: 0 for t in SIGNAL_TYPES},
        'lines_analyzed': 0,
    }
    if not stream or ctx is None or ctx.bpm is None:
        return empty

    lines = {}
    for s in stream:
        lines.setdefault(s['line_index'], []).append(s)
    if not lines:
        return empty

    # Word recurrence across the whole verse — feeds the deliberateness gate.
    # A word counts once per line it appears on (not once per occurrence),
    # matching the "recurrence across DIFFERENT lines" bar used elsewhere
    # in this codebase (motif_engine's min_recurrence=2).
    word_recurrence = Counter()
    for sylls in lines.values():
        for w in {s['word'].lower() for s in sylls}:
            word_recurrence[w] += 1

    all_signals = []
    for li in sorted(lines):
        line_stream = lines[li]
        syll_data = infer_performed_stress_from_stream(line_stream)

        words, seen_wi = [], set()
        for s in line_stream:
            if s['word_index'] not in seen_wi:
                words.append(s['word'])
                seen_wi.add(s['word_index'])

        line_signals = detect_line_signals(syll_data, word_recurrence=word_recurrence)
        line_signals += detect_ambiguous_words(words)
        for sig in line_signals:
            sig['line_index'] = li
        all_signals.extend(line_signals)

    counts = {t: 0 for t in SIGNAL_TYPES}
    for sig in all_signals:
        counts[sig['type']] = counts.get(sig['type'], 0) + 1

    return {
        'signals': all_signals,
        'signal_counts': counts,
        'lines_analyzed': len(lines),
    }


# ── TEST ─────────────────────────────────────────────────
if __name__ == '__main__':
    from motif_engine import build_motif_map
    from domain.song_context import SongContext
    verse = [
        "Getting to the money",
        "And I swear that it's turnt",
        "It all begins with encore cheers",
        "From those wearin' my merch",
    ]
    ctx = SongContext(bpm=90)
    motif_result = build_motif_map(verse, ctx)
    result = analyze_verse_stream(motif_result['stream'], ctx)
    print(f"\nLines analyzed: {result['lines_analyzed']}")
    print(f"Signal counts: {result['signal_counts']}\n")
    for sig in result['signals']:
        print(f"  line {sig['line_index']}  {sig['type']:<22} "
              f"word={sig.get('word'):<20} "
              f"deliberateness={sig.get('deliberateness')} "
              f"confidence={sig.get('confidence')}")
