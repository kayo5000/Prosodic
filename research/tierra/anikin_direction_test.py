'''
Anikin direction test — scores a mapping against published human data.

The bench (tierra_bench.py) scores mappings against a ground truth we invented,
which is exactly the weakness that made its MCD comparison unusable. This file
replaces that ground truth with an external one: the congruent directions from
Anikin & Johansson (2019), Table 4, which came from 22 implicit-association
experiments with human participants.

Each check moves ONE acoustic property and asks whether the mapping's colour
moves the way Anikin's listeners said it should. Nothing here is tuned; the
predictions were fixed before either mapping was written.

Run: python anikin_direction_test.py
'''
import warnings
warnings.filterwarnings('ignore')

import numpy as np

from tierra_bench import (
    synth_vowel, extract_axes, map_tierra, map_evidence, VOWELS, HUE,
)

# A colour move smaller than this is treated as "no change". CIELAB's own
# just-noticeable difference is ~1 unit; 2.0 keeps us clear of synthesis noise.
JND = 2.0

DIV = '─' * 76


def chroma(Lab):
    return float(np.hypot(Lab[1], Lab[2]))


# ── Anikin & Johansson 2019, Table 4 ─────────────────────────────────────────
# (acoustic contrast, visual axis, expected sign, effect size, note)
#   +1 = the property going UP should make the axis go UP
#   -1 = ... should make it go DOWN
#    0 = no reliable association was detected (a null, not proof of absence)
PREDICTIONS = [
    ('pitch',    'L*',     +1, '3.2%',  'high pitch -> light'),
    ('pitch',    'chroma', +1, '4.9%',  'high pitch -> saturated'),
    ('loudness', 'chroma', +1, '4.1%',  'loud -> saturated'),
    ('loudness', 'L*',     -1, '3.9%',  'loud -> DARK (not light)'),
    ('centroid', 'L*',     +1, '4.0%',  'high freq -> light'),
    ('centroid', 'chroma', +1, '3.5%',  'high freq -> saturated'),
    ('F1',       'L*',      0, 'null',  'formant shift -> no colour change'),
    ('F2',       'L*',      0, 'null',  'formant shift -> no colour change'),
    ('pitch',    'a*',      0, 'null',  'nothing registers on green-red'),
]

BASE = dict(f0=110, formants=VOWELS['ER'], tilt=0.0, amp=0.45)


def _stim(**over):
    p = dict(BASE); p.update(over)
    return extract_axes(synth_vowel(p['f0'], p['formants'], p['tilt'], p['amp']))


def contrasts():
    '''One pair per acoustic property, moving only that property.'''
    base = _stim()
    f1_formants = [(730, 60), (1350, 90), (1690, 120)]   # F1 only: 490 -> 730
    f2_formants = [(490, 60), (2290, 90), (2600, 120)]   # F2 only: 1350 -> 2290
    return {
        'pitch':    (base, _stim(f0=220)),
        'loudness': (base, _stim(amp=0.95)),
        'centroid': (base, _stim(tilt=6.0)),
        'F1':       (base, _stim(formants=f1_formants)),
        'F2':       (base, _stim(formants=f2_formants)),
    }


def axis_delta(lo, hi, mapper):
    a, b = mapper(lo), mapper(hi)
    return {'L*': b[0] - a[0], 'a*': b[1] - a[1], 'chroma': chroma(b) - chroma(a)}


def score(mapper, pairs, label):
    print(f'\n{DIV}\n  {label}\n{DIV}')
    print(f'  {"MOVE":<10} {"AXIS":<7} {"ANIKIN SAYS":<26} {"MEASURED":>10}  VERDICT')
    print('  ' + '-' * 72)

    hits = 0
    for prop, axis, expect, size, note in PREDICTIONS:
        lo, hi = pairs[prop]
        d = axis_delta(lo, hi, mapper)[axis]

        if expect == 0:
            ok = abs(d) < JND
        else:
            ok = (abs(d) >= JND) and (np.sign(d) == expect)
        hits += ok

        says = f'{note} ({size})'
        print(f'  {prop:<10} {axis:<7} {says:<26} {d:>+10.2f}  '
              f'{"MATCH" if ok else "MISS"}')

    print('  ' + '-' * 72)
    print(f'  agrees with human data on {hits} of {len(PREDICTIONS)} checks')
    return hits


def main():
    pairs = contrasts()

    print(f'\n{DIV}\n  Manipulation check — did each contrast move only its own property?\n{DIV}')
    print(f'  {"MOVE":<10} {"Δf0 Hz":>9} {"ΔLUFS":>9} {"Δcentroid Hz":>14}')
    print('  ' + '-' * 46)
    for prop, (lo, hi) in pairs.items():
        print(f'  {prop:<10} {hi["f0"]-lo["f0"]:>9.1f} {hi["lufs"]-lo["lufs"]:>9.1f} '
              f'{hi["centroid"]-lo["centroid"]:>14.1f}')
    print('\n  NOTE: the F1/F2 rows carry a centroid shift. Anikin minimised this and')
    print('  still found nothing; here any colour movement on those rows may be the')
    print('  centroid leaking in, not the formant. Read those two verdicts as soft.')

    t = score(map_tierra, pairs, 'TIERRA as written  (timbre→X, loudness→Y, pitch→Z)')
    e = score(lambda ax: map_evidence(ax, HUE['ER']), pairs,
              'EVIDENCE-LED  (pitch+centroid→L*, loudness→C*, identity→hue)')

    print(f'\n{DIV}\n  RESULT vs. published human data\n{DIV}')
    print(f'  Tierra as written : {t} / {len(PREDICTIONS)}')
    print(f'  Evidence-led      : {e} / {len(PREDICTIONS)}')
    print('\n  This scorer contains no numbers we chose. The predictions are Anikin &')
    print('  Johansson (2019) Table 4; the tolerance is CIELAB\'s own JND.')


if __name__ == '__main__':
    main()
