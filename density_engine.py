'''
Density Engine
Scores each bar on three metrics: internal rhyme density, multisyllabic density,
and motif recurrence. Feeds the feedback bars shown in the UI.

Part of the Prosodic hip-hop lyric analysis suite.
'''
from motif_engine import build_motif_map

def score_bar_density(verse_lines, line_index, motif_result=None):
    if motif_result is None:
        motif_result = build_motif_map(verse_lines)
    stream = motif_result['stream']
    motif_map = motif_result['motif_map']
    motif_groups = motif_result['motif_groups']
    total_colors = motif_result['total_colors']

    line_syllables = [s for s in stream if s['line_index'] == line_index]
    total_syllables = len(line_syllables)
    if total_syllables == 0:
        return {'internal': 0, 'multisyllabic': 0, 'motif': 0}

    highlighted = 0
    for s in line_syllables:
        key = (s['word'], s['line_index'], s['stream_index'])
        if motif_map.get(key, 0) > 0:
            highlighted += 1
    internal_density = (highlighted / total_syllables) * 100

    # Deduplicate by verse_stream_index so a syllable in multiple compounds counts once
    compound_indices = set()
    compound_groups = [g for g in motif_groups if g['type'] == 'compound']
    for group in compound_groups:
        for m in group['members']:
            if m['line_index'] == line_index:
                compound_indices.add(m['stream_index'])
    multisyllabic_density = (len(compound_indices) / total_syllables) * 100

    colors_in_line = set()
    for s in line_syllables:
        key = (s['word'], s['line_index'], s['stream_index'])
        cid = motif_map.get(key, 0)
        if cid > 0:
            colors_in_line.add(cid)
    motif_density = (len(colors_in_line) / total_colors * 100) if total_colors > 0 else 0

    return {
        'internal': round(internal_density, 1),
        'multisyllabic': round(multisyllabic_density, 1),
        'motif': round(motif_density, 1)
    }

def score_full_verse(verse_lines, motif_result=None):
    if motif_result is None:
        motif_result = build_motif_map(verse_lines)
    scores = []
    for i, line in enumerate(verse_lines):
        score = score_bar_density(verse_lines, i, motif_result=motif_result)
        scores.append({'line': line, 'index': i, 'scores': score})
    return scores

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
    print('\n=== DENSITY SCORES PER BAR ===')
    print(f'{"LINE":<45} {"INTERNAL":>10} {"MULTI":>8} {"MOTIF":>8}')
    print('-' * 75)
    results = score_full_verse(verse)
    for r in results:
        line_short = r['line'][:43]
        s = r['scores']
        print(f'{line_short:<45} {s["internal"]:>9.1f}% {s["multisyllabic"]:>7.1f}% {s["motif"]:>7.1f}%')
