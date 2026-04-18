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

def _is_near_pocket(pos):
    return any(abs(pos - p) <= POCKET_WINDOW for p in POCKET_POSITIONS)

def _is_near_strong_beat(pos):
    return any(abs(pos - p) <= POCKET_WINDOW for p in STRONG_POSITIONS)

def get_syllable_window(bpm):
    if bpm < 80:
        return (1, 2)
    elif bpm < 100:
        return (2, 3)
    elif bpm < 120:
        return (2, 4)
    elif bpm < 140:
        return (3, 5)
    else:
        return (4, 8)

def _assign_positions(syllables, start_position, total):
    '''Shared position assignment — proportional distribution across 16 grid slots.'''
    for i, s in enumerate(syllables):
        raw_pos = start_position + (i * 16) // total
        s['pocket_position'] = raw_pos % 16
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


def is_pocket_rhyme(word, line, bpm):
    '''Returns True if this word lands on a pocket position.'''
    mapped = map_line_to_pocket(line, bpm)
    for s in mapped:
        if s['word'].lower() == word.lower() and s['on_pocket']:
            return True
    return False

def get_flow_signature(verse_lines, bpm):
    on_beat_count = 0
    off_beat_count = 0
    pocket_count = 0
    total = 0
    for line in verse_lines:
        mapped = map_line_to_pocket(line, bpm)
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
    sig = get_flow_signature(verse, bpm)
    print(f'\nFlow Signature: {sig}')
