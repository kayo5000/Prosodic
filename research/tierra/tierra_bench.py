'''
Tierra calibration bench — runs the installed stack end to end.

Synthesises vowel-like stimuli with independently controllable F0, F1, F2,
spectral tilt and amplitude (the Anikin & Johansson 2019 manipulation), extracts
the three Tierra axes with the exact tools named in the Foundations doc, and
tests two competing audio->CIELAB mappings against each other.

Run: python tierra_bench.py
'''
import warnings
warnings.filterwarnings('ignore')

import numpy as np
import librosa
import pyloudnorm as pyln
import colour
from scipy.stats import spearmanr

SR = 22050
DUR = 0.60
rng = np.random.default_rng(7)

DIV = '─' * 74
def head(t):
    print(f'\n{DIV}\n  {t}\n{DIV}')


# ── 1. Formant synthesiser ────────────────────────────────────────────────────

def synth_vowel(f0, formants, tilt_db=0.0, amp=0.5, dur=DUR, sr=SR):
    '''
    Source-filter vowel synthesis.
    f0        : fundamental in Hz  -> the Z / pitch manipulation
    formants  : [(freq, bw), ...]  -> the vowel identity manipulation
    tilt_db   : spectral tilt in dB/octave; raises the spectral centroid
                WITHOUT touching f0 or the formants (Anikin's key control)
    amp       : linear amplitude    -> the Y / loudness manipulation
    '''
    n = int(dur * sr)
    t = np.arange(n) / sr

    # Glottal source: band-limited impulse train with controllable tilt.
    sig = np.zeros(n)
    n_harm = int(sr / 2 / f0)
    for k in range(1, n_harm + 1):
        # -12 dB/oct baseline glottal rolloff, modified by tilt_db
        rolloff = (-12.0 + tilt_db) * np.log2(k)
        sig += (10 ** (rolloff / 20.0)) * np.sin(2 * np.pi * k * f0 * t)

    # Resonant filter bank = the vocal tract.
    out = np.zeros(n)
    for (ff, bw) in formants:
        r = np.exp(-np.pi * bw / sr)
        theta = 2 * np.pi * ff / sr
        a = [1.0, -2 * r * np.cos(theta), r * r]
        b = [1.0 - r]
        from scipy.signal import lfilter
        out += lfilter(b, a, sig)

    out /= (np.max(np.abs(out)) + 1e-12)
    # 20 ms raised-cosine edges so onsets don't smear the spectrum
    e = int(0.02 * sr)
    w = np.ones(n)
    w[:e] = np.sin(np.linspace(0, np.pi / 2, e)) ** 2
    w[-e:] = np.cos(np.linspace(0, np.pi / 2, e)) ** 2
    return out * w * amp


# ── 2. The three Tierra axes, extracted with the named tools ─────────────────

_meter = pyln.Meter(SR)

def extract_axes(y, sr=SR):
    '''Returns the raw per-axis measurements named in the Foundations doc.'''
    # Z - pitch. Doc says CREPE or pYIN; pYIN used here (CREPE needs TensorFlow).
    f0, voiced, _ = librosa.pyin(y, fmin=60, fmax=500, sr=sr)
    f0_med = float(np.nanmedian(f0[voiced])) if voiced.any() else np.nan

    # Y - loudness. Doc says LUFS preferred.
    lufs = float(_meter.integrated_loudness(y))

    # X - timbre. Doc says MFCC.
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    mfcc_mean = mfcc.mean(axis=1)

    # Spectral centroid - the variable Anikin found actually drives the effect.
    cent = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))

    return dict(f0=f0_med, lufs=lufs, mfcc=mfcc_mean, centroid=cent)


def mcd(mfcc_a, mfcc_b):
    '''Mel-cepstral distortion, Kubichek. Coefficients 1..N, c0 excluded.'''
    d = np.asarray(mfcc_a[1:], float) - np.asarray(mfcc_b[1:], float)
    return (10.0 / np.log(10)) * np.sqrt(2.0 * np.sum(d * d))


# ── 3. The two competing mappings ────────────────────────────────────────────

D65 = np.array([95.047, 100.0, 108.883])

def _norm(v, lo, hi):
    return float(np.clip((v - lo) / (hi - lo), 0.0, 1.0))

def map_tierra(ax):
    '''
    The Foundations doc as written: raw Timbre -> X, Loudness -> Y, Pitch -> Z,
    then the standard CIE XYZ -> L*a*b* transform.
    '''
    x = _norm(ax['centroid'], 200, 3000)      # timbre proxy
    y = _norm(ax['lufs'], -45, -8)            # loudness
    z = _norm(ax['f0'], 80, 320)              # pitch
    XYZ = np.array([x, y, z]) * D65
    return colour.XYZ_to_Lab(XYZ / 100.0)

def map_evidence(ax, hue_deg):
    '''
    Evidence-led alternative (Anikin & Johansson 2019; Reymore & Lindsey 2024):
      L*  <- pitch + spectral centroid   (both map to lightness, same direction)
      C*  <- loudness                    (loudness maps to saliency/saturation)
      h   <- categorical identity        (hue carries no reliable audio signal,
                                          so it is free to encode identity)
    Built in LCh and converted to Lab, so the three inputs stay orthogonal.
    '''
    bright = 0.5 * _norm(ax['f0'], 80, 320) + 0.5 * _norm(ax['centroid'], 200, 3000)
    L = 20.0 + 70.0 * bright
    C = 10.0 + 90.0 * _norm(ax['lufs'], -45, -8)
    h = np.deg2rad(hue_deg)
    return np.array([L, C * np.cos(h), C * np.sin(h)])


# ── 4. Stimulus set ──────────────────────────────────────────────────────────

VOWELS = {                       # (F1, F2) in Hz, canonical American English
    'ER': [(490, 60), (1350, 90), (1690, 120)],
    'IY': [(270, 60), (2290, 90), (3010, 120)],
    'AA': [(730, 60), (1090, 90), (2440, 120)],
    'UW': [(300, 60), (870, 90), (2240, 120)],
}
HUE = {'ER': 25.0, 'IY': 115.0, 'AA': 205.0, 'UW': 295.0}


def main():
    head('STEP 1  Synthesise stimuli and extract the three axes')
    print('  Tools: librosa.pyin (Z) | pyloudnorm ITU-R BS.1770 (Y) | librosa MFCC (X)\n')

    stim = []
    for v, formants in VOWELS.items():
        for f0 in (110, 220):
            for tilt in (0.0, 6.0):
                for amp in (0.12, 0.9):
                    y = synth_vowel(f0, formants, tilt_db=tilt, amp=amp)
                    ax = extract_axes(y)
                    stim.append(dict(vowel=v, f0_set=f0, tilt=tilt, amp=amp, ax=ax))

    print(f'  {"VOWEL":<6} {"F0set":>6} {"tilt":>5} {"amp":>5}  |  '
          f'{"f0 meas":>8} {"LUFS":>8} {"centroid":>9}')
    print('  ' + '-' * 68)
    for s in stim[:8]:
        a = s['ax']
        print(f'  {s["vowel"]:<6} {s["f0_set"]:>6} {s["tilt"]:>5.0f} {s["amp"]:>5.2f}  |  '
              f'{a["f0"]:>8.1f} {a["lufs"]:>8.1f} {a["centroid"]:>9.1f}')
    print(f'  ... {len(stim)} stimuli total')

    # ── STEP 2: the orthogonality test ───────────────────────────────────────
    head('STEP 2  Axis independence: does changing ONE audio property move only ONE Lab axis?')

    base = dict(vowel='ER', f0_set=110, tilt=0.0, amp=0.12)
    b_ax = extract_axes(synth_vowel(110, VOWELS['ER'], 0.0, 0.12))

    def delta_report(label, ax2):
        t1, t2 = map_tierra(b_ax), map_tierra(ax2)
        e1, e2 = map_evidence(b_ax, HUE['ER']), map_evidence(ax2, HUE['ER'])
        dt, de = t2 - t1, e2 - e1
        print(f'  {label}')
        print(f'     Tierra  (X=timbre,Y=loud,Z=pitch)   dL*={dt[0]:+7.2f}  da*={dt[1]:+7.2f}  db*={dt[2]:+7.2f}')
        print(f'     Evidence (L<-pitch, C<-loud, h<-id) dL*={de[0]:+7.2f}  da*={de[1]:+7.2f}  db*={de[2]:+7.2f}')
        return dt, de

    print('  Baseline: ER vowel, F0 110 Hz, no tilt, amp 0.12\n')
    loud_ax = extract_axes(synth_vowel(110, VOWELS['ER'], 0.0, 0.9))
    dt_loud, de_loud = delta_report('CHANGE LOUDNESS ONLY (amp 0.12 -> 0.90):', loud_ax)
    print()
    pitch_ax = extract_axes(synth_vowel(220, VOWELS['ER'], 0.0, 0.12))
    delta_report('CHANGE PITCH ONLY (F0 110 -> 220 Hz):', pitch_ax)

    print('\n  READING: under the Tierra mapping a pure loudness change moves')
    print(f'  a* by {dt_loud[1]:+.2f} and b* by {dt_loud[2]:+.2f} - i.e. it shifts HUE.')
    print('  This is structural, not a tuning error: the CIE transform is')
    print('    a* = 500[f(X/Xn) - f(Y/Yn)]      b* = 200[f(Y/Yn) - f(Z/Zn)]')
    print('  so Y (loudness) is an input to BOTH chromatic axes by definition.')
    print(f'  Under the evidence mapping the same change moves a*/b* by '
          f'{de_loud[1]:+.2f}/{de_loud[2]:+.2f} at fixed hue angle.')

    # ── STEP 3: identity stability ───────────────────────────────────────────
    head('STEP 3  UI identifier stability: does a vowel keep its colour across performances?')
    print('  A UI identifier must survive loudness and pitch variation. Measuring the')
    print('  hue-angle spread of each vowel across all 8 of its recorded conditions.\n')

    print(f'  {"VOWEL":<7} {"Tierra hue spread":>20} {"Evidence hue spread":>22}')
    print('  ' + '-' * 52)
    t_spreads, e_spreads = [], []
    for v in VOWELS:
        rows = [s for s in stim if s['vowel'] == v]
        th = [np.rad2deg(np.arctan2(*map_tierra(s['ax'])[[2, 1]])) % 360 for s in rows]
        eh = [np.rad2deg(np.arctan2(*map_evidence(s['ax'], HUE[v])[[2, 1]])) % 360 for s in rows]
        ts, es = float(np.ptp(th)), float(np.ptp(eh))
        t_spreads.append(ts); e_spreads.append(es)
        print(f'  {v:<7} {ts:>19.1f}° {es:>21.1f}°')
    print(f'\n  mean hue drift   Tierra {np.mean(t_spreads):.1f}°   '
          f'Evidence {np.mean(e_spreads):.1f}°')
    print('  (A vowel whose hue wanders tens of degrees cannot serve as an identifier.)')

    # ── STEP 4: rank correlation against ground truth ────────────────────────
    head('STEP 4  Spearman rank correlation of ΔE against known manipulation size')
    print('  Foundations doc step 6. Ground truth = how many properties actually differ,')
    print('  weighted by manipulation magnitude. MCD included as the doc specifies.\n')

    pairs = []
    for i in range(len(stim)):
        for j in range(i + 1, len(stim)):
            a, b = stim[i], stim[j]
            truth = (2.0 * (a['vowel'] != b['vowel'])
                     + 1.0 * (a['f0_set'] != b['f0_set'])
                     + 1.0 * (a['amp'] != b['amp'])
                     + 0.5 * (a['tilt'] != b['tilt']))
            de_t = colour.delta_E(map_tierra(a['ax']), map_tierra(b['ax']), method='CIE 2000')
            de_e = colour.delta_E(map_evidence(a['ax'], HUE[a['vowel']]),
                                  map_evidence(b['ax'], HUE[b['vowel']]), method='CIE 2000')
            pairs.append((truth, float(de_t), float(de_e),
                          mcd(a['ax']['mfcc'], b['ax']['mfcc'])))

    truth, dt, de, dm = map(np.array, zip(*pairs))
    for label, v in (('Tierra  ΔE2000', dt), ('Evidence ΔE2000', de), ('MCD (timbre only)', dm)):
        rho, p = spearmanr(truth, v)
        flag = '' if p < 0.05 else '   (n.s.)'
        print(f'  {label:<20} rho = {rho:+.3f}   p = {p:.2e}   n = {len(truth)}{flag}')

    rho_t = spearmanr(truth, dt)[0]
    rho_e = spearmanr(truth, de)[0]
    head('RESULT')
    print(f'  Tierra mapping as written : rho = {rho_t:+.3f}')
    print(f'  Evidence-led mapping      : rho = {rho_e:+.3f}')
    print(f'  Difference                : {rho_e - rho_t:+.3f} in favour of '
          f'{"the evidence-led mapping" if rho_e > rho_t else "the Tierra mapping"}')
    print(f'\n  Mean hue drift per vowel  : Tierra {np.mean(t_spreads):.1f}°  '
          f'vs  Evidence {np.mean(e_spreads):.1f}°')


if __name__ == '__main__':
    main()
