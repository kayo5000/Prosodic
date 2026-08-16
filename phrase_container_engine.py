'''
Phrase Container Engine
Detects natural compositional units in a verse using five weighted signals.
Never imposes structure — containers emerge from the writing itself.

Part of the Prosodic hip-hop lyric analysis suite.
'''
from rhyme_detection_engine import analyze_verse
from density_engine import score_full_verse
from syllable_engine import get_syllable_count
from domain.prosodic_config import (
    BOUNDARY_THRESHOLD, MIN_SIGNALS_FIRED, BOUNDARY_SIGNAL_WEIGHTS as SIGNALS,
    DENSITY_DROP_MIN_PREV, DENSITY_DROP_RATIO, SYLLABLE_RESET_RATIO,
    LINE_LENGTH_SHIFT_WORD_DIFF, REST_BAR_MAX_WORDS,
)
from domain.final_result_converter import normalize as fr_normalize

def detect_rest_bar(line):
    words = line.split()
    return len(words) <= REST_BAR_MAX_WORDS

def _line_syllable_count(line):
    total = 0
    for word in line.split():
        clean = word.strip('.,!?;:"-').lower()
        total += get_syllable_count(clean) or 1
    return total

def detect_boundaries(verse_lines):
    '''
    Returns a list of boundary dicts, one per container start:
      line           — line index this container starts at
      weight         — total signal weight that triggered this boundary
                        (None for the verse's own start at line 0 — that's
                        not a detected boundary, just where the verse begins)
      signals_fired  — which named signals contributed (empty for line 0)

    Previously returned a bare list of line indices — the weight and
    signals_fired that were computed to make each boundary decision were
    thrown away right after the threshold check, even though they're
    exactly the kind of self-knowledge ("how sure is this engine, and
    why") this heuristic-based detector actually has and could be
    surfacing instead of silently discarding. See build_containers() for
    where that becomes each container's real confidence field.
    '''
    if len(verse_lines) < 2:
        return [{'line': 0, 'weight': None, 'signals_fired': []}]
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

    boundaries = [{'line': 0, 'weight': None, 'signals_fired': []}]
    for i in range(1, len(verse_lines)):
        weight = 0.0
        signals_fired = []

        if (i - 1) in end_rhyme_lines:
            weight += SIGNALS['rhyme_resolution']
            signals_fired.append('rhyme_resolution')

        prev_d = density_scores[i-1]['scores']['internal']
        curr_d = density_scores[i]['scores']['internal']
        if prev_d > DENSITY_DROP_MIN_PREV and curr_d < prev_d * DENSITY_DROP_RATIO:
            weight += SIGNALS['density_drop']
            signals_fired.append('density_drop')

        prev_sylls = _line_syllable_count(verse_lines[i-1])
        curr_sylls = _line_syllable_count(verse_lines[i])
        if prev_sylls > 0 and curr_sylls < prev_sylls * SYLLABLE_RESET_RATIO:
            weight += SIGNALS['syllable_reset']
            signals_fired.append('syllable_reset')

        if detect_rest_bar(verse_lines[i]):
            weight += SIGNALS['rest_bar']
            signals_fired.append('rest_bar')

        prev_len = len(verse_lines[i-1].split())
        curr_len = len(verse_lines[i].split())
        if abs(prev_len - curr_len) > LINE_LENGTH_SHIFT_WORD_DIFF:
            weight += SIGNALS['line_length_shift']
            signals_fired.append('line_length_shift')

        if weight >= BOUNDARY_THRESHOLD and len(signals_fired) >= MIN_SIGNALS_FIRED:
            boundaries.append({'line': i, 'weight': weight, 'signals_fired': signals_fired})
    return boundaries

def build_containers(verse_lines):
    '''
    Each container carries a confidence field alongside the structural
    ones (bar_count/type) — this engine never imposes structure with
    certainty it doesn't have, so that uncertainty is now surfaced rather
    than silently dropped after the accept/reject decision:

      confidence       — 0.0-1.0, how strong the boundary signal was that
                          started this container (normalized via
                          final_result_converter, anchored at
                          BOUNDARY_THRESHOLD — the minimum to be accepted
                          at all — rather than 0, so a just-barely-
                          accepted boundary reads as low-but-real instead
                          of wasting the top half of the scale on weights
                          that could never occur). Always 1.0 for the
                          verse's own first container — that's not a
                          detected boundary, it's just where the verse
                          starts, so there's nothing uncertain about it.
      confidence_basis  — which named signals fired to produce that
                          confidence (empty for the first container).
    '''
    boundaries = detect_boundaries(verse_lines)
    containers = []
    for i, b in enumerate(boundaries):
        start = b['line']
        end = boundaries[i + 1]['line'] if i + 1 < len(boundaries) else len(verse_lines)
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
        confidence = 1.0 if b['weight'] is None else fr_normalize(b['weight'], 'phrase_boundary_weight')
        containers.append({
            'start_line': start,
            'end_line': end - 1,
            'bar_count': bar_count,
            'type': container_type,
            'lines': lines,
            'confidence': round(confidence, 3),
            'confidence_basis': b['signals_fired'],
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
