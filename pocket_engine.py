'''
Pocket Engine
Maps syllables to a 16-position sixteenth-note grid, detects flow signatures,
and enriches syllable streams with beat position data.

Part of the Prosodic hip-hop lyric analysis suite.
'''
from collections import defaultdict
from syllable_engine import syllabify_line

# Beat 2 and Beat 4 are the pocket positions --- where hip hop rhymes live
STRONG_POSITIONS = {0, 4, 8, 12}
POCKET_POSITIONS = {4, 12}
POCKET_WINDOW = 1  # ±1 sixteenth note counts as on-pocket
NUDGE_WINDOW = 2    # max positions a stressed syllable may be pulled toward
                     # a strong/pocket beat — see _assign_positions

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
        d = min((t - pos_mod16) % 16, (pos_mod16 - t) % 16)
        if d < best_dist:
            best_dist, best_target = d, t
    for t in STRONG_POSITIONS - POCKET_POSITIONS:  # {0, 8}
        d = min((t - pos_mod16) % 16, (pos_mod16 - t) % 16)
        if d < best_dist:
            best_dist, best_target = d, t
    if best_target is None:
        return None, 0
    delta = (best_target - pos_mod16 + 8) % 16 - 8
    return best_target, delta

def _assign_positions(syllables, start_position, total):
    '''
    Shared position assignment. Baseline is proportional distribution across
    16 grid slots (unchanged from the original model — this still sets the
    overall spacing). On top of that baseline, a linguistically stressed
    syllable (is_stressed True, from syllable_engine's CMU-derived stress
    digit) is nudged toward the nearest strong beat (0/4/8/12) or pocket
    slot (4/12) when one sits within NUDGE_WINDOW positions — modeling a
    rapper naturally landing emphasis on the beat rather than every
    syllable being spread with pure mechanical evenness regardless of
    stress. Previously this function ignored is_stressed entirely.

    Order is preserved: a nudge is never allowed to place a syllable before
    the one preceding it in the line.
    '''
    prev_final = start_position
    for i, s in enumerate(syllables):
        base = start_position + (i * 16) // total
        final = base

        if s.get('is_stressed'):
            target, delta = _nearest_strong_target(base % 16)
            if target is not None:
                nudged = base + delta
                if nudged >= prev_final:
                    final = nudged

        if final < prev_final:
            final = prev_final
        prev_final = final

        s['pocket_position'] = final % 16
        s['beat_number'] = (s['pocket_position'] // 4) + 1
        s['on_strong_beat'] = _is_near_strong_beat(s['pocket_position'])
        s['on_pocket'] = _is_near_pocket(s['pocket_position'])


def map_line_to_pocket(line, bpm, start_position=0):
    '''
    Maps every syllable in a line to a beat position.
    start_position is which sixteenth note this line starts on.
    Syllables are distributed proportionally across 16 positions so every
    part of the bar is reachable regardless of syllable count.
    '''
    syllables = syllabify_line(line)
    if not syllables:
        return []
    _assign_positions(syllables, start_position, len(syllables))
    return syllables


def enrich_stream_with_pocket(stream, bpm, start_position=0):
    '''
    Adds pocket_position, beat_number, on_strong_beat, on_pocket to each
    syllable in a stream built by build_verse_stream.
    Each line is mapped independently starting at start_position.
    '''
    lines = defaultdict(list)
    for s in stream:
        lines[s['line_index']].append(s)
    for li in sorted(lines):
        line_sylls = lines[li]
        if line_sylls:
            _assign_positions(line_sylls, start_position, len(line_sylls))
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
    — that function's own bpm parameter is never actually read for any
    position math (confirmed; same for _assign_positions underneath it),
    so it stays a bare bpm parameter rather than being migrated too. Its
    only live callers are this function and its own standalone/test use;
    there's no cross-orchestrator drift risk at that leaf level to close.
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
    from song_context import SongContext
    sig = get_flow_signature(verse, SongContext(bpm=bpm))
    print(f'\nFlow Signature: {sig}')
