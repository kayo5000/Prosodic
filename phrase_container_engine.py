'''
Phrase Container Engine
Detects natural compositional units in a verse using five weighted signals.
Never imposes structure — containers emerge from the writing itself.

Part of the Prosodic hip-hop lyric analysis suite.
'''
from rhyme_detection_engine import analyze_verse
from density_engine import score_full_verse
from syllable_engine import get_syllable_count

BOUNDARY_THRESHOLD = 1.5

SIGNALS = {
    'rhyme_resolution': 0.8,
    'density_drop': 0.6,
    'syllable_reset': 0.5,
    'line_length_shift': 0.4,
    'rest_bar': 0.7,
}

def detect_rest_bar(line):
    words = line.split()
    return len(words) <= 3

def _line_syllable_count(line):
    total = 0
    for word in line.split():
        clean = word.strip('.,!?;:"-').lower()
        total += get_syllable_count(clean) or 1
    return total

def detect_boundaries(verse_lines):
    if len(verse_lines) < 2:
        return [0]
    density_scores = score_full_verse(verse_lines)
    rhyme_result = analyze_verse(verse_lines)

    # End rhyme: rhyming word is the last word on the line
    end_rhyme_lines = set()
    for group in rhyme_result['rhyme_groups']:
        for s in group:
            line_words = verse_lines[s['line_index']].split()
            last_word = line_words[-1].strip('.,!?;:"-').lower() if line_words else ''
            if s['word'].lower() == last_word:
                end_rhyme_lines.add(s['line_index'])

    boundaries = [0]
    for i in range(1, len(verse_lines)):
        weight = 0.0
        signals_fired = []

        if (i - 1) in end_rhyme_lines:
            weight += SIGNALS['rhyme_resolution']
            signals_fired.append('rhyme_resolution')

        prev_d = density_scores[i-1]['scores']['internal']
        curr_d = density_scores[i]['scores']['internal']
        if prev_d > 40 and curr_d < prev_d * 0.6:
            weight += SIGNALS['density_drop']
            signals_fired.append('density_drop')

        prev_sylls = _line_syllable_count(verse_lines[i-1])
        curr_sylls = _line_syllable_count(verse_lines[i])
        if prev_sylls > 0 and curr_sylls < prev_sylls * 0.6:
            weight += SIGNALS['syllable_reset']
            signals_fired.append('syllable_reset')

        if detect_rest_bar(verse_lines[i]):
            weight += SIGNALS['rest_bar']
            signals_fired.append('rest_bar')

        prev_len = len(verse_lines[i-1].split())
        curr_len = len(verse_lines[i].split())
        if abs(prev_len - curr_len) > 4:
            weight += SIGNALS['line_length_shift']
            signals_fired.append('line_length_shift')

        if weight >= BOUNDARY_THRESHOLD and len(signals_fired) >= 2:
            boundaries.append(i)
    return boundaries

def build_containers(verse_lines):
    boundaries = detect_boundaries(verse_lines)
    containers = []
    for i, start in enumerate(boundaries):
        end = boundaries[i + 1] if i + 1 < len(boundaries) else len(verse_lines)
        lines = verse_lines[start:end]
        bar_count = end - start
        if bar_count <= 2:
            container_type = 'compressed'
        elif bar_count <= 4:
            container_type = '4-bar'
        elif bar_count <= 8:
            container_type = '8-bar'
        else:
            container_type = 'extended'
        containers.append({
            'start_line': start,
            'end_line': end - 1,
            'bar_count': bar_count,
            'type': container_type,
            'lines': lines
        })
    return containers

# ── TEST ─────────────────────────────────────────────────
if __name__ == '__main__':
    verse = [
        "And I swear that it's turnt",
        "It all begins with encore cheers",
        "From those wearin' my merch",
        "Fast forward through years of rehearsal",
        "Losin', winnin', bank account thinnin'",
        "Income streams nowhere near as diverse",
        "And though I'm blessed I seen you stressin'",
        "From hearin' the chirps and naysayers",
        "Who only days later I don't care to convert",
        "On cloud nine now signed to my hero",
        "One of the so-called kings of this rap thing",
        "That I swear to usurp",
    ]
    print('\n=== PHRASE CONTAINERS ===')
    containers = build_containers(verse)
    for ci, c in enumerate(containers):
        print(f'Container {ci+1}: Lines {c["start_line"]+1}-{c["end_line"]+1} | {c["bar_count"]} bars | {c["type"]}')
        for line in c['lines']:
            print(f'  {line}')
        print()
