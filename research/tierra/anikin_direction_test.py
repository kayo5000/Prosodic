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

import pyloudnorm as pyln

from tierra_bench import (
    synth_vowel, extract_axes, map_tierra, map_evidence, map_evidence_v2,
    VOWELS, HUE, SR,
)

_METER = pyln.Meter(SR)

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
    ('pitch',    'hue',     0, 'null',  'nothing registers on hue'),
    ('loudness', 'hue',     0, 'null',  'nothing registers on hue'),
]

# Why 'hue' and not 'a*': Anikin's hue contrasts pitted red against green at
# CONSTANT luminance and saturation, so his null says "at fixed chroma, hue
# carries no acoustic signal" — not "the a* coordinate never moves". Those are
# different claims. a* = C·cos(h), so any mapping that legitimately raises
# saturation also moves a* at a fixed hue; scoring a* would punish a mapping for
# obeying Anikin's own saturation results. Hue angle is the faithful test.

BASE = dict(f0=110, formants=VOWELS['ER'], tilt=0.0, amp=0.45)


def _audio(**over):
    p = dict(BASE); p.update(over)
    return synth_vowel(p['f0'], p['formants'], p['tilt'], p['amp'])


def _match_loudness(sig, target_lufs):
    '''
    Renormalise sig to a target integrated loudness.

    Needed because changing spectral tilt or formants also changes how loud a
    sound measures — on the first version of this test the tilt contrast moved
    loudness by -3.3 LUFS, so the "brightness" rows were really measuring a
    loudness drop. Anikin controlled this in his stimuli; so should we.
    '''
    cur = _METER.integrated_loudness(sig)
    out = sig * (10.0 ** ((target_lufs - cur) / 20.0))
    peak = np.max(np.abs(out))
    return out / peak * 0.98 if peak > 0.98 else out


def contrasts():
    '''
    One pair per acoustic property, moving ONLY that property.

    Every pair except the loudness pair is loudness-matched to the baseline, so
    a colour shift cannot be loudness leaking in through the back door. The
    loudness pair is deliberately left unmatched — loudness is its variable.
    '''
    base_sig = _audio()
    base_lufs = _METER.integrated_loudness(base_sig)
    base = extract_axes(base_sig)

    f1_formants = [(730, 60), (1350, 90), (1690, 120)]   # F1 only: 490 -> 730
    f2_formants = [(490, 60), (2290, 90), (2600, 120)]   # F2 only: 1350 -> 2290

    def matched(**over):
        return extract_axes(_match_loudness(_audio(**over), base_lufs))

    return {
        'pitch':    (base, matched(f0=220)),
        'loudness': (base, extract_axes(_audio(amp=0.95))),   # unmatched on purpose
        'centroid': (base, matched(tilt=6.0)),
        'F1':       (base, matched(formants=f1_formants)),
        'F2':       (base, matched(formants=f2_formants)),
    }


def hue_deg(Lab):
    return float(np.degrees(np.arctan2(Lab[2], Lab[1]))) % 360.0


def axis_delta(lo, hi, mapper):
    a, b = mapper(lo), mapper(hi)
    dh = (hue_deg(b) - hue_deg(a) + 180.0) % 360.0 - 180.0   # shortest way round
    return {
        'L*':     b[0] - a[0],
        'a*':     b[1] - a[1],
        'chroma': chroma(b) - chroma(a),
        'hue':    dh,
    }


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
    print('\n  Every row except loudness is loudness-matched to the baseline, so a')
    print('  colour shift cannot be loudness leaking in. The F1/F2 rows still carry a')
    print('  small centroid shift, which Anikin minimised too and still found nothing.')

    t = score(map_tierra, pairs, 'TIERRA as written  (timbre→X, loudness→Y, pitch→Z)')
    e1 = score(lambda ax: map_evidence(ax, HUE['ER']), pairs,
               'EVIDENCE-LED v1  (one input per channel)')
    e2 = score(lambda ax: map_evidence_v2(ax, HUE['ER']), pairs,
               'EVIDENCE-LED v2  (L* and C* each take all three, weighted by AJ effect sizes)')

    print(f'\n{DIV}\n  RESULT vs. published human data\n{DIV}')
    print(f'  Tierra as written : {t} / {len(PREDICTIONS)}')
    print(f'  Evidence-led v1   : {e1} / {len(PREDICTIONS)}')
    print(f'  Evidence-led v2   : {e2} / {len(PREDICTIONS)}')
    print('\n  READ v2\'s SCORE CAREFULLY. v2 takes its weights from the same table this')
    print('  test scores against, so its result is NOT independent evidence — it only')
    print('  confirms the implementation does what was intended. v1 and the Tierra')
    print('  mapping were written before this test existed, so their scores are real.')
    print('  Validating v2 needs held-out data: Reymore\'s colour selections, or new')
    print('  listeners of your own.')


if __name__ == '__main__':
    main()
