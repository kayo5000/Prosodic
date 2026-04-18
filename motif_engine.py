'''
Motif Engine
Assigns color IDs to rhyme families, detects recurring stress patterns,
and builds the unified motif map used by the density and feedback engines.

Part of the Prosodic hip-hop lyric analysis suite.
'''
from phoneme_engine import get_phonemes, FUNCTION_WORDS
from syllable_engine import syllabify_line
from rhyme_detection_engine import (
    build_verse_stream, extract_rhyme_candidates,
    find_rhyme_groups, build_compound_sequences, find_function_word_rhymes
)
from pocket_engine import enrich_stream_with_pocket

# ── Rhythmic Motif Detection ─────────────────────────────
def get_stress_pattern(line):
    '''
    Returns the binary stress pattern for a line as a tuple of 0s and 1s.
    1 = stressed syllable, 0 = unstressed.
    '''
    stream = syllabify_line(line)
    return tuple(1 if s['is_stressed'] else 0 for s in stream)

def find_recurring_stress_patterns(verse_lines, min_length=3, min_recurrence=2):
    '''
    Scans all lines for stress sub-patterns that recur across 2+ lines.
    Returns list of motifs, each with:
      pattern    — tuple of 0s/1s
      occurrences — list of (line_index, position) tuples
    '''
    line_patterns = [(i, get_stress_pattern(line)) for i, line in enumerate(verse_lines)]
    found = {}

    for li, pattern in line_patterns:
        length = len(pattern)
        for size in range(min_length, length + 1):
            for start in range(length - size + 1):
                sub = pattern[start:start + size]
                if sub not in found:
                    found[sub] = []
                found[sub].append((li, start))

    motifs = []
    for pattern, occurrences in found.items():
        lines_hit = set(li for li, _ in occurrences)
        if len(lines_hit) >= min_recurrence:
            motifs.append({
                'pattern': pattern,
                'occurrences': occurrences,
                'line_count': len(lines_hit),
                'total_hits': len(occurrences),
            })

    # Sort by number of distinct lines hit, then pattern length
    motifs.sort(key=lambda m: (m['line_count'], len(m['pattern'])), reverse=True)
    return motifs

# ── Sonic Motif Detection ────────────────────────────────
def get_onset(word):
    '''Returns the leading consonant cluster phonemes before the first vowel.'''
    phonemes = get_phonemes(word)
    if not phonemes:
        return ()
    onset = []
    for p in phonemes:
        if p[-1].isdigit():
            break
        onset.append(p)
    return tuple(onset)

def build_sonic_fingerprint(word):
    '''
    Compact sonic identity for a word:
      onset   — leading consonant cluster
      vowels  — vowel sequence (no stress markers)
    '''
    phonemes = get_phonemes(word)
    if not phonemes:
        return None
    onset = []
    vowels = []
    for p in phonemes:
        if p[-1].isdigit():
            vowels.append(p[:-1])
        elif not vowels:
            onset.append(p)
    return {'onset': tuple(onset), 'vowels': tuple(vowels)}

def sonic_similarity(word_a, word_b):
    '''
    Similarity score between two words based on shared onset + vowel sequence.
    Returns float 0.0–1.0.
    '''
    fa = build_sonic_fingerprint(word_a)
    fb = build_sonic_fingerprint(word_b)
    if not fa or not fb:
        return 0.0

    onset_match = 1.0 if fa['onset'] == fb['onset'] and fa['onset'] else 0.0
    vowel_match = 0.0
    if fa['vowels'] and fb['vowels']:
        matches = sum(a == b for a, b in zip(fa['vowels'], fb['vowels']))
        vowel_match = matches / max(len(fa['vowels']), len(fb['vowels']))

    return round(onset_match * 0.4 + vowel_match * 0.6, 3)

def find_sonic_motifs(verse_lines, threshold=0.6, min_recurrence=2):
    '''
    Finds words across lines with high sonic similarity (alliteration, assonance).
    Returns list of sonic motif clusters, each with:
      words      — list of (word, line_index) tuples
      similarity — average pairwise similarity score
    '''
    word_map = []
    for li, line in enumerate(verse_lines):
        for word in line.split():
            clean = word.strip('.,!?;:"-').lower()
            if len(clean) > 1 and clean not in FUNCTION_WORDS and get_phonemes(clean):
                word_map.append((clean, li))

    assigned = set()
    clusters = []

    for i, (word_a, li_a) in enumerate(word_map):
        if i in assigned:
            continue
        cluster = [(word_a, li_a)]
        for j, (word_b, li_b) in enumerate(word_map):
            if i == j or j in assigned:
                continue
            if word_a == word_b:
                continue
            score = sonic_similarity(word_a, word_b)
            if score >= threshold:
                cluster.append((word_b, li_b))

        lines_hit = set(li for _, li in cluster)
        if len(lines_hit) >= min_recurrence:
            pairs = [(word_a, w) for w, _ in cluster[1:]]
            avg_sim = sum(sonic_similarity(a, b) for a, b in pairs) / len(pairs) if pairs else 1.0
            for idx in [j for j, (w, _) in enumerate(word_map) if (w, _) in cluster]:
                assigned.add(idx)
            clusters.append({
                'words': cluster,
                'similarity': round(avg_sim, 3),
                'line_count': len(lines_hit),
            })

    clusters.sort(key=lambda c: (c['line_count'], c['similarity']), reverse=True)
    return clusters

# ── Motif Map (used by density_engine) ──────────────────
def build_motif_map(verse_lines, bpm=None):
    '''
    Builds a unified motif map over a verse combining rhyme groups
    and compound sequences. Each motif family gets a unique color_id.

    When bpm is provided, pocket positions are computed and only syllables
    landing on pocket positions (beat 2 or beat 4) receive a color_id.

    Returns:
      stream       — flat syllable stream with line_index
      motif_map    — dict: (word, line_index, stream_index) -> color_id
      motif_groups — list of {type, color_id, members}
      total_colors — number of distinct motif families
    '''
    stream = build_verse_stream(verse_lines)
    if bpm is not None:
        enrich_stream_with_pocket(stream, bpm)
    candidates = extract_rhyme_candidates(stream)
    rhyme_groups = find_rhyme_groups(candidates)
    compounds = build_compound_sequences(stream)

    motif_map = {}
    motif_groups = []
    color_id = 1

    for group in rhyme_groups:
        for s in group:
            # Always color all rhyme family members — pocket status is preserved
            # in the rhyme_map for other visualizations but does not gate coloring
            key = (s['word'], s['line_index'], s['stream_index'])
            motif_map[key] = color_id
        motif_groups.append({'type': 'rhyme', 'color_id': color_id, 'members': group})
        color_id += 1

    for compound in compounds:
        members = compound['seq_a'] + compound['seq_b']
        for s in members:
            key = (s['word'], s['line_index'], s['stream_index'])
            if key not in motif_map:
                motif_map[key] = color_id
        motif_groups.append({'type': 'compound', 'color_id': color_id, 'members': members})
        color_id += 1

    # ── Function word conditional coloring ───────────────────────────────────
    # Assign function words that pass positional/proximity gates to their
    # matched group's existing color_id (they join the family, not a new one).
    fw_rhymes = find_function_word_rhymes(stream, rhyme_groups)
    for fw_syll, matched_group in fw_rhymes:
        # Find the color_id already assigned to this group
        group_color = None
        for s in matched_group:
            k = (s['word'], s['line_index'], s['stream_index'])
            c = motif_map.get(k, 0)
            if c > 0:
                group_color = c
                break
        if group_color is None:
            continue
        key = (fw_syll['word'], fw_syll['line_index'], fw_syll['stream_index'])
        if motif_map.get(key, 0) == 0:
            motif_map[key] = group_color

    # ── Word-level color inheritance ──────────────────────────────────────────
    # Problem: Union-Find assigns color_id to one stressed syllable per word
    # (the detection seed). The other syllables of the same word look up their
    # own stream_index in motif_map, get 0, and render uncolored — producing
    # partial highlights on multisyllabic words like "persevered", "reverse",
    # "career", "immersed".
    #
    # Fix: group all stream entries by (line_index, word_index). If any member
    # of a word group is an earner (color_id > 0), copy that color to all other
    # members of the same word. Non-rhyming words with no earner stay at 0.
    from collections import defaultdict as _dd
    word_groups = _dd(list)
    for s in stream:
        word_groups[(s['line_index'], s['word_index'])].append(s)

    for syllables in word_groups.values():
        earner_color = 0
        for s in syllables:
            cid = motif_map.get((s['word'], s['line_index'], s['stream_index']), 0)
            if cid > 0:
                earner_color = cid
                break
        if earner_color > 0:
            for s in syllables:
                k = (s['word'], s['line_index'], s['stream_index'])
                if motif_map.get(k, 0) == 0:
                    motif_map[k] = earner_color

    return {
        'stream': stream,
        'motif_map': motif_map,
        'motif_groups': motif_groups,
        'total_colors': color_id - 1,
    }

# ── Top-Level Analysis ───────────────────────────────────
def analyze_motifs(verse_lines):
    '''
    Full motif analysis over a verse.
    Returns:
      stress_motifs — recurring stress patterns across lines
      sonic_motifs  — sonic clusters (alliteration / assonance)
    '''
    stress_motifs = find_recurring_stress_patterns(verse_lines)
    sonic_motifs = find_sonic_motifs(verse_lines)
    return {
        'stress_motifs': stress_motifs,
        'sonic_motifs': sonic_motifs,
        'line_count': len(verse_lines),
    }

# ── Test Block ───────────────────────────────────────────
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
    ]

    result = analyze_motifs(verse)
    motif_map_result = build_motif_map(verse, bpm=80)

    print('=== STRESS MOTIFS ===')
    print(f'Lines: {result["line_count"]}')
    print(f'Recurring stress patterns found: {len(result["stress_motifs"])}')
    print()
    for m in result['stress_motifs'][:8]:
        pattern_str = ' '.join('S' if p else 'u' for p in m['pattern'])
        lines_str = ', '.join(str(li + 1) for li, _ in m['occurrences'])
        print(f'  [{pattern_str}]  hits={m["total_hits"]}  lines={lines_str}')

    print()
    print('=== SONIC MOTIFS ===')
    print(f'Sonic clusters found: {len(result["sonic_motifs"])}')
    print()
    for c in result['sonic_motifs'][:8]:
        words_str = ', '.join(f'{w}(L{li+1})' for w, li in c['words'])
        print(f'  sim={c["similarity"]:.0%}  [{words_str}]')
