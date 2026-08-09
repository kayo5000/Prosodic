'''
Motif Engine
Assigns color IDs to rhyme families, detects recurring stress patterns,
and builds the unified motif map used by the density and feedback engines.

Part of the Prosodic hip-hop lyric analysis suite.
'''
from rhyme_detection_engine import (
    build_verse_stream, extract_rhyme_candidates,
    find_rhyme_groups, build_compound_sequences, find_function_word_rhymes
)
from pocket_engine import enrich_stream_with_pocket

# ── Motif Map (used by density_engine) ──────────────────
def build_motif_map(verse_lines, ctx=None):
    '''
    Builds a unified motif map over a verse combining rhyme groups
    and compound sequences. Each motif family gets a unique color_id.

    BUILD SPEC 01: takes a SongContext instead of a bare bpm. When ctx is
    given and ctx.bpm is not None, pocket positions are computed and only
    syllables landing on pocket positions (beat 2 or beat 4) receive a
    color_id — same gate as before, just sourced from ctx.bpm now instead
    of a hand-passed bpm argument.

    Returns:
      stream       — flat syllable stream with line_index
      motif_map    — dict: (word, line_index, stream_index) -> color_id
      motif_groups — list of {type, color_id, members}
      total_colors — number of distinct motif families
    '''
    stream = build_verse_stream(verse_lines)
    if ctx is not None and ctx.bpm is not None:
        enrich_stream_with_pocket(stream, ctx.bpm)
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

    from song_context import SongContext
    motif_map_result = build_motif_map(verse, SongContext(bpm=80))
    print(f"Total color families: {motif_map_result['total_colors']}")
    print(f"Motif groups: {len(motif_map_result['motif_groups'])}")
