'''
Feedback Engine
Assembles output from all analysis engines into a single feedback object
ready for UI consumption. This is the top-level entry point for the pipeline.

Part of the Prosodic hip-hop lyric analysis suite.
'''
from motif_engine import build_motif_map
from density_engine import score_full_verse
from pocket_engine import get_flow_signature
from phrase_container_engine import build_containers
import perceptual_family_engine
import pattern_reader_engine

def assemble_feedback(verse_lines, bpm):
    '''
    Main function. Takes verse lines and a BPM number.
    BPM is required. Will not run without it.
    Returns complete feedback object ready for the UI.
    '''
    if bpm is None or bpm <= 0:
        raise ValueError('BPM is required. Select a BPM before running analysis.')

    motif_result = build_motif_map(verse_lines, bpm)
    density_result = score_full_verse(verse_lines, motif_result=motif_result)
    containers = build_containers(verse_lines)
    flow_signature = get_flow_signature(verse_lines, bpm)

    rhyme_map = []
    for s in motif_result['stream']:
        key = (s['word'], s['line_index'], s['stream_index'])
        color_id = motif_result['motif_map'].get(key, 0)
        rhyme_map.append({
            'word': s['word'],
            'line_index': s['line_index'],
            'syllable_index': s['index'],
            'stream_index': s['stream_index'],
            'word_index': s['word_index'],
            'char_start': s.get('char_start', 0),
            'char_end': s.get('char_end', len(s['word'])),
            'color_id': color_id,
            'is_stressed': s['is_stressed'],
            'on_pocket': s.get('on_pocket', False),
        })

    # Remap color_ids to a compact 1-N sequence.
    # The motif engine assigns ids that can be non-contiguous and arbitrarily large
    # (e.g. 1, 3, 7, 177, 318) because it skips ids when groups are merged or
    # discarded. Remapping ensures ids always fit within the palette (1–44).
    raw_ids = sorted({e['color_id'] for e in rhyme_map if e['color_id']})
    id_remap = {old: new for new, old in enumerate(raw_ids, start=1)}
    for e in rhyme_map:
        if e['color_id']:
            e['color_id'] = id_remap[e['color_id']]
    for g in motif_result['motif_groups']:
        if g.get('color_id') in id_remap:
            g['color_id'] = id_remap[g['color_id']]

    total_families = len(raw_ids)

    tagged = perceptual_family_engine.tag_verse_words(verse_lines)
    pattern = pattern_reader_engine.read_patterns(tagged, verse_lines)

    if pattern['active_families']:
        for entry in rhyme_map:
            family = perceptual_family_engine.get_family(entry['word'])
            if family is not None and family not in pattern['active_families']:
                entry['color_id'] = 0

    avg_internal = sum(r['scores']['internal'] for r in density_result) / len(density_result)
    avg_multi = sum(r['scores']['multisyllabic'] for r in density_result) / len(density_result)
    avg_motif = sum(r['scores']['motif'] for r in density_result) / len(density_result)

    return {
        'rhyme_map': rhyme_map,
        'motif_groups': motif_result['motif_groups'],
        'total_color_families': total_families,
        'density_per_line': density_result,
        'density_summary': {
            'internal': round(avg_internal, 1),
            'multisyllabic': round(avg_multi, 1),
            'motif': round(avg_motif, 1)
        },
        'phrase_containers': containers,
        'flow_signature': flow_signature,
        'bpm': bpm,
        'line_count': len(verse_lines),
        'perceptual_pattern': pattern,
    }

def print_feedback_summary(feedback):
    print(f'\n=== PROSODIC ANALYSIS ===')
    print(f'Lines: {feedback["line_count"]}  |  BPM: {feedback["bpm"]}  |  Flow: {feedback["flow_signature"]}')
    print()
    d = feedback['density_summary']
    print('DENSITY SUMMARY')
    print(f'  Internal rhyme:    {d["internal"]}%')
    print(f'  Multisyllabic:     {d["multisyllabic"]}%')
    print(f'  Motif recurrence:  {d["motif"]}%')
    print()
    print(f'COLOR FAMILIES: {feedback["total_color_families"]}')
    for group in feedback['motif_groups']:
        gtype = group['type'].upper()
        print(f'  Color {group["color_id"]} [{gtype}]: {len(group["members"])} syllables')
    print()
    print(f'PHRASE CONTAINERS: {len(feedback["phrase_containers"])}')
    for c in feedback['phrase_containers']:
        print(f'  Container: Lines {c["start_line"]+1}-{c["end_line"]+1} | {c["bar_count"]} bars | {c["type"]}')

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
    ]
    bpm = 80
    feedback = assemble_feedback(verse, bpm)
    print_feedback_summary(feedback)
