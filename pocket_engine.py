'''
Pocket Engine
Maps syllables to a 16-position sixteenth-note grid, detects flow signatures,
and enriches syllable streams with beat position data.

TEMPO-AWARE PLACEMENT: syllables are no longer spread blindly across all 16
grid slots regardless of song speed. A real 4/4 bar always HAS 16 sixteenth-
note slots, but how many syllables a performer can clearly land one-per-slot
shrinks as tempo rises — the same 16 slots take less real time at 160 BPM
than at 80 BPM. See _tempo_adjusted_span() for the model (reused from
syllable_compression.py, not reinvented — see its own docstring for why).

Part of the Prosodic hip-hop lyric analysis suite.
'''
from collections import defaultdict
from syllable_engine import syllabify_line
from syllable_compression import available_syllable_slots
from domain.prosodic_config import (
    GRID_SIZE, STRONG_POSITIONS, POCKET_POSITIONS, POCKET_WINDOW, NUDGE_WINDOW,
)


def _tempo_adjusted_span(bpm):
    '''
    Real syllable capacity for one bar at this bpm — how many sixteenth-note
    slots a performer can comfortably land one syllable on before they start
    compressing (cramming multiple syllables into the same slot) or
    stretching (spreading with gaps).

    Reuses syllable_compression.available_syllable_slots() — an already-
    built, already-documented tempo model that existed in this codebase
    before this fix, just unreachable from the live pipeline (only
    imported by the also-dormant aspiration_gap.py). Reused as-is rather
    than reimplemented, so there's exactly one tempo formula in this
    codebase, not two that could drift apart. `line=''` because that
    function's own `line` argument is documented as unused for the actual
    math (context/logging only) — bpm and bar_count are the real inputs.

    At the model's own 90 BPM reference point this returns exactly
    GRID_SIZE (16) — the same number _assign_positions always used before
    this fix — so nothing changes at 90 BPM or anywhere the tempo caps out
    at the model's maximum (any BPM <= 90). The difference only shows up
    above 90 BPM, where real compression starts.

    No bpm (None or <= 0, e.g. /suggest's optional bpm) falls back to the
    old always-16 behavior — can't be tempo-aware about a tempo nobody gave us.
    '''
    if bpm is None or bpm <= 0:
        return GRID_SIZE
    return available_syllable_slots('', bpm, bar_count=1)

def _is_near_pocket(pos):
    return any(abs(pos - p) <= POCKET_WINDOW for p in POCKET_POSITIONS)

def _is_near_strong_beat(pos):
    return any(abs(pos - p) <= POCKET_WINDOW for p in STRONG_POSITIONS)


def _nearest_strong_target(pos_mod16):
    '''
    Find the strong-beat/pocket position closest to pos_mod16 on the 16-step
    circle, within NUDGE_WINDOW. Pocket positions (4, 12) win ties over the
    other strong positions (0, 8) — consistent with this file's existing
    "where hip hop rhymes live" framing of the pocket slots.

    Returns (target, signed_delta) or (None, 0) if nothing qualifies within
    NUDGE_WINDOW. signed_delta is the shortest signed hop (mod 16) from
    pos_mod16 to target.
    '''
    best_target, best_dist = None, NUDGE_WINDOW + 1
    for t in POCKET_POSITIONS:  # checked first so ties favor the pocket
        d = min((t - pos_mod16) % GRID_SIZE, (pos_mod16 - t) % GRID_SIZE)
        if d < best_dist:
            best_dist, best_target = d, t
    for t in STRONG_POSITIONS - POCKET_POSITIONS:  # {0, 8}
        d = min((t - pos_mod16) % GRID_SIZE, (pos_mod16 - t) % GRID_SIZE)
        if d < best_dist:
            best_dist, best_target = d, t
    if best_target is None:
        return None, 0
    half_grid = GRID_SIZE // 2
    delta = (best_target - pos_mod16 + half_grid) % GRID_SIZE - half_grid
    return best_target, delta

def _assign_positions(syllables, start_position, total, span=GRID_SIZE):
    '''
    Shared position assignment. Baseline is proportional distribution across
    `span` conceptual slots (defaults to GRID_SIZE=16 for any caller that
    doesn't pass a tempo-adjusted one — see _tempo_adjusted_span). At the
    reference tempo span == GRID_SIZE and this is identical to the old
    always-16 model. Below the reference tempo (more comfortable room),
    span can also exceed the actual number of syllables, which is normal —
    it's the SAME behavior as before whenever a line already has fewer
    syllables than slots. Above the reference tempo, span shrinks below 16,
    which is the real fix: when a line's syllable count exceeds span, the
    integer-division spread naturally lands multiple syllables on the same
    base position instead of spreading them across the full bar as if there
    were room for each — that clustering IS what compressed, rushed
    delivery looks like on the grid. The final wrap to a real grid position
    (`% GRID_SIZE` below) is unchanged — span only affects the spacing
    calculation, never how many real positions exist in a bar.

    On top of that baseline, a linguistically stressed syllable (is_stressed
    True, from syllable_engine's CMU-derived stress digit) is nudged toward
    the nearest strong beat (0/4/8/12) or pocket slot (4/12) when one sits
    within NUDGE_WINDOW positions — modeling a rapper naturally landing
    emphasis on the beat rather than every syllable being spread with pure
    mechanical evenness regardless of stress. Previously this function
    ignored is_stressed entirely.

    Order is preserved: a nudge is never allowed to place a syllable before
    the one preceding it in the line.
    '''
    prev_final = start_position
    for i, s in enumerate(syllables):
        base = start_position + (i * span) // total
        final = base

        if s.get('is_stressed'):
            target, delta = _nearest_strong_target(base % GRID_SIZE)
            if target is not None:
                nudged = base + delta
                if nudged >= prev_final:
                    final = nudged

        if final < prev_final:
            final = prev_final
        prev_final = final

        s['pocket_position'] = final % GRID_SIZE
        s['beat_number'] = (s['pocket_position'] // 4) + 1
        s['on_strong_beat'] = _is_near_strong_beat(s['pocket_position'])
        s['on_pocket'] = _is_near_pocket(s['pocket_position'])


def map_line_to_pocket(line, bpm, start_position=0):
    '''
    Maps every syllable in a line to a beat position.
    start_position is which sixteenth note this line starts on.
    Syllables are distributed proportionally across a tempo-adjusted span
    (see _tempo_adjusted_span) — 16 slots at or below the model's 90 BPM
    reference point, fewer above it, so a faster song's syllables land
    measurably closer together than the same lyrics at a slower tempo.
    bpm is real, load-bearing here now — not the dead parameter it used
    to be (see the file docstring and _tempo_adjusted_span).
    '''
    syllables = syllabify_line(line)
    if not syllables:
        return []
    span = _tempo_adjusted_span(bpm)
    _assign_positions(syllables, start_position, len(syllables), span=span)
    return syllables


def enrich_stream_with_pocket(stream, bpm, start_position=0):
    '''
    Adds pocket_position, beat_number, on_strong_beat, on_pocket to each
    syllable in a stream built by build_verse_stream.
    Each line is mapped independently starting at start_position, using a
    shared tempo-adjusted span for the whole stream — see map_line_to_pocket.
    '''
    lines = defaultdict(list)
    for s in stream:
        lines[s['line_index']].append(s)
    span = _tempo_adjusted_span(bpm)
    for li in sorted(lines):
        line_sylls = lines[li]
        if line_sylls:
            _assign_positions(line_sylls, start_position, len(line_sylls), span=span)
    return stream


def get_flow_signature(verse_lines, ctx):
    '''
    BUILD SPEC 01: takes a SongContext instead of a bare bpm — this is the
    function feedback_engine calls directly for flow signature, separate
    from the bpm that also flows into build_motif_map/enrich_stream_with_pocket.
    That was the exact "separate re-supply from the feedback orchestrator
    to pocket" the spec's WHY section describes. Threading the same ctx
    object through both paths closes it.

    Internally still unwraps to ctx.bpm before calling map_line_to_pocket()
    — that function's own bpm parameter stays a bare parameter rather than
    being migrated to ctx too (its only live callers are this function and
    its own standalone/test use, so there's no cross-orchestrator drift
    risk at that leaf level to close). UPDATE: unlike when this note was
    first written, that bpm parameter is no longer dead — it now drives
    real tempo-adjusted syllable spacing (see _tempo_adjusted_span), so
    get_flow_signature's own classification is itself now tempo-sensitive,
    not just gated by whether bpm exists.
    '''
    on_beat_count = 0
    off_beat_count = 0
    pocket_count = 0
    total = 0
    for line in verse_lines:
        mapped = map_line_to_pocket(line, ctx.bpm)
        for s in mapped:
            if not s['is_stressed']:
                continue
            total += 1
            if s['on_strong_beat']:
                on_beat_count += 1
            else:
                off_beat_count += 1
            if s['on_pocket']:
                pocket_count += 1
    if total == 0:
        return 'Unknown'
    on_beat_ratio = on_beat_count / total
    pocket_ratio = pocket_count / total
    if on_beat_ratio > 0.75:
        return 'On-Grid'
    elif pocket_ratio > 0.5:
        return 'Syncopated'
    elif on_beat_ratio < 0.35:
        return 'Floating'
    else:
        return 'Pocket Jumper'

# ── TEST ─────────────────────────────────────────────────
if __name__ == '__main__':
    verse = [
        "And I swear that it's turnt",
        "It all begins with encore cheers",
        "From those wearin' my merch",
        "Fast forward through years of rehearsal",
    ]
    bpm = 80
    print(f'\n=== POCKET MAP AT {bpm} BPM ===')
    for line in verse:
        print(f'\nLine: {line}')
        mapped = map_line_to_pocket(line, bpm)
        for s in mapped:
            pocket = '[ POCKET ]' if s['on_pocket'] else ''
            strong = '[ BEAT ]' if s['on_strong_beat'] else ''
            stress = 'STRESSED' if s['is_stressed'] else 'unstressed'
            print(f'  {s["word"]:<14} beat {s["beat_number"]} pos {s["pocket_position"]:>2}  {stress}  {strong}{pocket}')
    from domain.song_context import SongContext
    sig = get_flow_signature(verse, SongContext(bpm=bpm))
    print(f'\nFlow Signature: {sig}')
