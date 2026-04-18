'''
Rhyme Detection Engine
Finds rhyme groups and cross-word-boundary compound sequences across a verse.
Operates on syllable streams — never raw text.

Grouping uses Union-Find (connected components) so transitivity is guaranteed:
if A rhymes with B and B rhymes with C, all three land in the same family
even if A and C never directly compare above threshold.

Part of the Prosodic hip-hop lyric analysis suite.
'''
from collections import defaultdict
from phoneme_engine import get_rhyme_unit_from_phonemes, syllable_rhyme_score, classify_r_family, FUNCTION_WORDS
from syllable_engine import syllabify_line

RHYME_THRESHOLD = 0.78  # Tight enough to block noise, R-bridge at 0.80 passes this

def build_verse_stream(verse_lines):
    '''
    Takes a list of lines.
    Returns flat syllable stream with line_index added to each syllable.
    '''
    stream = []
    for li, line in enumerate(verse_lines):
        sylls = syllabify_line(line)
        for s in sylls:
            s['line_index'] = li
            s['stream_index'] = len(stream)
            stream.append(s)
    return stream

def extract_rhyme_candidates(stream):
    '''
    Filters stream to stressed syllables only.
    Suppresses function words.

    Per-word deduplication: each (word, line_index) pair contributes only its
    LAST stressed syllable as the grouping seed. This prevents multisyllabic
    words from creating transitive bridges across unrelated rhyme families
    (e.g. "persevered" ER2 + IH1 syllables pulling unrelated words together).

    Internal rhyme and compound detection still operate on the full stream —
    this deduplication only affects which syllables seed the rhyme groups.
    '''
    # Collect all stressed syllables per (word, line_index)
    word_buckets = defaultdict(list)
    for s in stream:
        if not s['is_stressed']:
            continue
        if s['word'].lower() in FUNCTION_WORDS:
            continue
        rhyme_unit = get_rhyme_unit_from_phonemes(s['phonemes'])
        if rhyme_unit:
            s['rhyme_unit'] = rhyme_unit
            word_buckets[(s['word'].lower(), s['line_index'], s['word_index'])].append(s)

    # Keep only the last stressed syllable per word occurrence
    candidates = []
    for syll_list in word_buckets.values():
        # last stressed syllable = highest stream_index
        seed = max(syll_list, key=lambda s: s['stream_index'])
        candidates.append(seed)

    # Preserve stream order for consistent group output
    candidates.sort(key=lambda s: s['stream_index'])
    return candidates


def _r_family_compatible(fam_i, fam_j):
    '''
    Hard gate: returns True only if two R-family class codes may be compared.

    Class 0 = no R-colored vowel — always compatible with everything.
    Class 1 = ER family (worst, curse, shirt) — only matches class 1.
    Class 2 = VR family (appeared, adhere, career) — matches 2 or 3.
    Class 3 = EH+R family (rare, stare, tears) — matches 2 or 3.

    Class 1 is NEVER compatible with class 2 or 3 regardless of score.
    This gate is absolute and cannot be overridden by any threshold.
    '''
    # Non-R words are never blocked
    if fam_i == 0 or fam_j == 0:
        return True
    # Same family always compatible
    if fam_i == fam_j:
        return True
    # VR ↔ EH+R allowed (slant bridge, gated further in Pass 4)
    if {fam_i, fam_j} == {2, 3}:
        return True
    # ER (1) vs VR (2) or EH+R (3) — hard block
    return False


def find_rhyme_groups(candidates):
    '''
    Groups candidates by rhyme family using Union-Find (connected components).

    Two syllables are connected if syllable_rhyme_score >= RHYME_THRESHOLD
    AND their R-family classes are compatible (see _r_family_compatible).
    Because Union-Find is transitive, if A-B and B-C are both connected,
    A, B, and C end up in the same family even if A-C never directly compared.

    A group is only kept if it spans 2 or more distinct lines.
    Returns list of groups. Each group is a list of syllables.
    '''
    n = len(candidates)
    parent = list(range(n))

    # Pre-classify every candidate's R-family once — O(n) upstream of scoring
    r_fams = [classify_r_family(c['rhyme_unit']) for c in candidates]

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x, y):
        px, py = find(x), find(y)
        if px != py:
            parent[px] = py

    # Pass 1–3: tight threshold — exact matches, same-vowel-base, and R-bridge.
    # The R-family gate fires before any score is computed.
    for i in range(n):
        for j in range(i + 1, n):
            if not _r_family_compatible(r_fams[i], r_fams[j]):
                continue
            score = syllable_rhyme_score(candidates[i]['rhyme_unit'], candidates[j]['rhyme_unit'])
            if score >= RHYME_THRESHOLD:
                union(i, j)

    # Pass 4: EH+R ↔ EH+R or EH+R ↔ VR slant bridge.
    # Only unions when the candidate family already spans ≥ 3 distinct lines.
    # ER (class 1) is explicitly excluded — EH+R never joins the ER group.
    EH_SLANT_MIN_SCORE = 0.62
    EH_SLANT_MIN_LINES = 3
    for i in range(n):
        for j in range(i + 1, n):
            if find(i) == find(j):
                continue
            # Hard gate: ER (1) never participates in the slant bridge
            if not _r_family_compatible(r_fams[i], r_fams[j]):
                continue
            score = syllable_rhyme_score(candidates[i]['rhyme_unit'], candidates[j]['rhyme_unit'])
            if score >= EH_SLANT_MIN_SCORE:
                ri, rj = find(i), find(j)
                lines_i = {candidates[k]['line_index'] for k in range(n) if find(k) == ri}
                lines_j = {candidates[k]['line_index'] for k in range(n) if find(k) == rj}
                if len(lines_i) >= EH_SLANT_MIN_LINES or len(lines_j) >= EH_SLANT_MIN_LINES:
                    union(i, j)

    # Collect components
    components = defaultdict(list)
    for i in range(n):
        components[find(i)].append(i)

    groups = []
    for idx_list in components.values():
        if len(idx_list) < 2:
            continue
        group = [candidates[i] for i in idx_list]
        lines_in_group = set(s['line_index'] for s in group)
        if len(lines_in_group) >= 2:
            groups.append(group)

    return groups

def build_compound_sequences(stream, window=2):
    '''
    Cross-word boundary compound detection.
    Scans the syllable stream for matching sequences of 2+ syllables
    that cross word boundaries.
    Scores syllable pairs by their own phonemes — not whole-word lookups.
    Window = how many consecutive syllables to check at once.
    '''
    stressed_stream = [s for s in stream if s['is_stressed'] and s['word'].lower() not in FUNCTION_WORDS]
    # Ensure every syllable has a rhyme_unit for direct comparison
    for s in stressed_stream:
        if 'rhyme_unit' not in s:
            s['rhyme_unit'] = get_rhyme_unit_from_phonemes(s['phonemes'])
    compounds = []

    for size in range(2, window + 1):
        for i in range(len(stressed_stream) - size + 1):
            seq_a = stressed_stream[i:i+size]
            for j in range(i + 1, len(stressed_stream) - size + 1):
                seq_b = stressed_stream[j:j+size]
                lines_a = set(s['line_index'] for s in seq_a)
                lines_b = set(s['line_index'] for s in seq_b)
                if lines_a == lines_b:
                    continue
                scores = []
                blocked = False
                for sa, sb in zip(seq_a, seq_b):
                    fa = classify_r_family(sa['rhyme_unit'])
                    fb = classify_r_family(sb['rhyme_unit'])
                    if not _r_family_compatible(fa, fb):
                        blocked = True
                        break
                    scores.append(syllable_rhyme_score(sa['rhyme_unit'], sb['rhyme_unit']))
                if blocked:
                    continue
                avg_score = sum(scores) / len(scores)
                if avg_score >= RHYME_THRESHOLD:
                    compounds.append({
                        'seq_a': seq_a,
                        'seq_b': seq_b,
                        'score': avg_score,
                        'size': size
                    })
    return compounds

def find_function_word_rhymes(stream, rhyme_groups, min_group_lines=3):
    '''
    Conditionally colors function words that genuinely participate in a rhyme family.

    Two gates — either is sufficient, but the word must still score >= RHYME_THRESHOLD
    against the group to qualify:

    Gate 1 — Positional repetition:
      The function word appears at the same word-index-from-end (structural position)
      as group members in 3+ distinct lines of the same group.
      Catches words like "through" or "do" placed deliberately at the same bar position.

    Gate 2 — Adjacent anchor:
      The function word sits within 1 word (in stream order) of a confirmed group
      member in 3+ distinct lines.
      Catches cases where a function word is paired with a content rhyme word across
      multiple bars (e.g. "I'm blessed / I'm stressed / I'm dressed").

    Returns list of (syllable_dict, group_list) pairs to be merged by the caller.
    Each syllable_dict already has 'rhyme_unit' attached.
    '''
    # Compute words-per-line for position-from-end calculation
    line_word_counts = defaultdict(int)
    for s in stream:
        if s['word_index'] + 1 > line_word_counts[s['line_index']]:
            line_word_counts[s['line_index']] = s['word_index'] + 1

    # Only consider groups large enough to justify function-word inclusion
    eligible_groups = [
        g for g in rhyme_groups
        if len({s['line_index'] for s in g}) >= min_group_lines
    ]
    if not eligible_groups:
        return []

    # Build index: stream_index -> group for fast proximity lookup
    stream_idx_to_group = {}
    for g in eligible_groups:
        for s in g:
            stream_idx_to_group[s['stream_index']] = g

    # Collect stressed function-word syllables not already in a group
    grouped_stream_indices = {s['stream_index'] for g in rhyme_groups for s in g}
    fw_candidates = []
    for s in stream:
        if s['word'].lower() not in FUNCTION_WORDS:
            continue
        if not s['is_stressed']:
            continue
        if s['stream_index'] in grouped_stream_indices:
            continue
        ru = get_rhyme_unit_from_phonemes(s['phonemes'])
        if not ru:
            continue
        entry = dict(s)
        entry['rhyme_unit'] = ru
        fw_candidates.append(entry)

    results = []
    for fw in fw_candidates:
        fw_pos_from_end = line_word_counts[fw['line_index']] - fw['word_index'] - 1

        for group in eligible_groups:
            # Rhyme score gate — must pass before either structural gate
            scores = [
                syllable_rhyme_score(fw['rhyme_unit'], s['rhyme_unit'])
                for s in group if 'rhyme_unit' in s
            ]
            if not scores or max(scores) < RHYME_THRESHOLD:
                continue

            # Gate 1: same position-from-end in 3+ group lines
            same_pos_lines = {
                s['line_index'] for s in group
                if (line_word_counts[s['line_index']] - s['word_index'] - 1) == fw_pos_from_end
            }
            if len(same_pos_lines) >= min_group_lines:
                results.append((fw, group))
                break

            # Gate 2: adjacent (within 1 word_index) to group member in 3+ lines
            adjacent_lines = set()
            for s in group:
                if s['line_index'] == fw['line_index']:
                    if abs(s['word_index'] - fw['word_index']) <= 1:
                        adjacent_lines.add(s['line_index'])
                else:
                    # Check other lines: same word-distance pattern
                    # A group member in line X is 1 word from its fw counterpart —
                    # only fire when the fw in its own line is also 1 word away
                    pass
            # Simpler: count group lines where a member is within 1 stream position of fw
            close_lines = {
                s['line_index'] for s in group
                if abs(s['stream_index'] - fw['stream_index']) <= 2
                and s['line_index'] != fw['line_index']
            }
            # Also include fw's own line if it has a group member within 1 word
            own_line_match = any(
                s['line_index'] == fw['line_index'] and abs(s['word_index'] - fw['word_index']) <= 1
                for s in group
            )
            if own_line_match:
                close_lines.add(fw['line_index'])
            if len(close_lines) >= min_group_lines:
                results.append((fw, group))
                break

    return results


def analyze_verse(verse_lines):
    '''
    Main function. Takes a list of lines.
    Returns full analysis: rhyme groups + compound sequences.
    '''
    stream = build_verse_stream(verse_lines)
    candidates = extract_rhyme_candidates(stream)
    groups = find_rhyme_groups(candidates)
    compounds = build_compound_sequences(stream)
    fw_rhymes = find_function_word_rhymes(stream, groups)
    return {
        'stream': stream,
        'candidates': candidates,
        'rhyme_groups': groups,
        'compound_sequences': compounds,
        'function_word_rhymes': fw_rhymes,
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

    print('\n=== RHYME ANALYSIS ===')
    result = analyze_verse(verse)

    print(f'Lines analyzed: {result["line_count"]}')
    print(f'Rhyme candidates found: {len(result["candidates"])}')
    print(f'Rhyme groups found: {len(result["rhyme_groups"])}')
    print(f'Compound sequences found: {len(result["compound_sequences"])}')
    print()

    print('=== RHYME GROUPS ===')
    for gi, group in enumerate(result['rhyme_groups']):
        print(f'Group {gi+1}:')
        for s in group:
            print(f'  Line {s["line_index"]+1} | {s["word"]:<14} | rhyme unit: {s["rhyme_unit"]}')
        print()

    print('=== COMPOUND SEQUENCES ===')
    for c in result['compound_sequences']:
        words_a = [s['word'] for s in c['seq_a']]
        words_b = [s['word'] for s in c['seq_b']]
        print(f'  {words_a} <-> {words_b}  score={c["score"]*100:.0f}%  size={c["size"]}')
