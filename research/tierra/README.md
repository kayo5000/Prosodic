# Tierra — Concept Handoff

**What Tierra is:** a perceptual model that maps sound onto colour, so a
listener can *see* sound the way CIELAB lets someone see colour. The intended
use is a visual layer for musicians studying their own craft — you look at a
take and read its shape.

**Status:** working theory, partially tested. One candidate mapping has been
eliminated with certainty. A replacement exists and behaves well, but has not
been validated against human listeners. No product code exists.

Planned as its own project, separate from Prosodic. The code here has zero
coupling to Prosodic (it imports only numpy, librosa, pyloudnorm, colour and
scipy), so it lifts out as a straight copy whenever the split happens.

Written 2026-09-12.

---

## 1. The original arrangement

CIELAB starts from three tristimulus values — X, Y, Z — and converts them into
L\* (lightness), a\* (green–red) and b\* (blue–yellow). The Foundations document
proposed mirroring that with three established psychoacoustic dimensions:

| CIELAB | Sound | Reasoning given |
|---|---|---|
| X | **Timbre** | X integrates a mixture of wavelengths; timbre integrates a mixture of harmonics. Same *kind* of quantity. |
| Y | **Loudness** | Y is a single direct intensity measurement; so is loudness. Called "locked, no change needed". |
| Z | **Pitch** | Flagged as a known mismatch — Z is a mixture-integration, pitch is a single raw value — accepted because pitch breaks ties the other two can't. |

Two decisions were made deliberately and both still hold:

- **Phonemes are not a fourth input.** A phoneme is not measured separately; it
  is *what produces* a particular reading, the way a specific red is a point
  inside CIELAB rather than an input to it.
- **Spatial position and room acoustics are deferred**, not solved. They answer
  "where is this sound" and "what room is it in", not "what does this sound
  consist of".

The structural instinct behind X = Timbre was sound. What broke was not that
pairing.

---

## 2. What is settled, and won't change

**Feeding X/Y/Z cannot produce independent Lab axes.** CIELAB defines:

```
a* = 500 · [ f(X/Xn) − f(Y/Yn) ]
b* = 200 · [ f(Y/Yn) − f(Z/Zn) ]
```

**Y appears in both chromatic axes.** So putting loudness on Y means loudness
writes into hue by construction. Measured on a pure loudness change with pitch
and vowel held fixed: Δa\* = −93.9, Δb\* = +37.6. Getting louder changes the
colour's hue.

This is arithmetic, not evidence — no future study overturns it. And there is
no escape hatch: solving for the XYZ that yields a desired Lab is isomorphic to
designing in Lab/LCh directly, which is abandoning the XYZ framing rather than
rescuing it.

**The consequence for identity, measured:** mean hue drift per vowel across
loudness and pitch conditions is **25.8°**. All four test vowels land within
three hex steps of the same green, and at high loudness become bit-identical at
`#00FF00`. Vowel identity is invisible; only performance shows.

The damage enters through **Y**, the axis marked "locked, no change needed" —
not through Z, the one flagged as a known mismatch.

---

## 3. What the human evidence says

Two published studies, both using real listeners, both directly on this mapping.

### Anikin & Johansson (2019) — 22 implicit-association experiments

Colours sampled from CIE-Lab; sounds from a formant synthesiser that moves one
acoustic property at a time. Congruent directions, with effect sizes as
error-rate gaps:

| Sound property | Colour channel | Direction | Effect |
|---|---|---|---|
| Pitch ↑ | saturation | more saturated | 4.9% |
| Loudness ↑ | saturation | more saturated | 4.1% |
| Spectral centroid ↑ | lightness | lighter | 4.0% |
| Loudness ↑ | lightness | **darker** | 3.9% |
| Spectral centroid ↑ | saturation | more saturated | 3.5% |
| Pitch ↑ | lightness | lighter | 3.2% |
| Formants F1 / F2 | anything | **no association** | null |
| Any property | a\* green–red | **no association** | null, 6 of 6 |

Three things fall out:

1. **Lightness and saturation carry nearly all the signal.**
2. **Loud pairs with dark**, not light — the opposite of the folk intuition the
   original Y assignment encodes. The authors note this polarity is
   *background-dependent*, which matters for an app with light and dark themes.
3. **Formants show nothing**, which supports the original "phonemes are not a
   fourth input" decision from an independent direction: vowel identity is not
   a perceptual dimension colour tracks. What tracks is overall spectral
   balance.

### Reymore & Lindsey (2025) — timbre-to-colour matching

Participants heard instrument timbres and chose colours. Semantic timbre
ratings predicted **lightness and saturation** of the chosen colours. The
warm–cool *hue* relationship appeared in one experiment only, at marginal
R² of 0.01–0.02.

Same conclusion by a different method: lightness and saturation do the work.

### The reframe that matters

Hue showed no reliable acoustic association. Read as a null result that is
disappointing; read as a **design constraint it is the most useful finding in
either paper**: hue is the least contested channel, so it is free to carry
arbitrary categorical identity — a phoneme, a rhyme family — without fighting a
built-in listener expectation.

**Stated honestly:** a null is not proof of absence. Anikin's detected effects
run at 3–5%, so the study may lack power to resolve a hue effect that exists,
and he did find a weak pitch → blue association on b\*. The defensible claim is
that no reliable hue correspondence was *detected in this paradigm*. The design
inference is ours, not the paper's.

---

## 4. The current arrangement

Build the colour in **CIE LCh** and convert to Lab at the end, rather than
feeding XYZ. LCh is the same space in polar form, so ΔE2000 still applies
unchanged — but the inputs stay orthogonal and each lands on the channel the
evidence assigns it.

| Channel | Takes | Why |
|---|---|---|
| **L\*** lightness | pitch ↑, spectral centroid ↑, loudness ↓ | all three map to lightness; loudness negatively |
| **C\*** chroma | pitch ↑, loudness ↑, centroid ↑ | all three map to saturation |
| **h** hue | categorical identity only, fixed | unclaimed channel; keeps identity stable |

Two properties this buys:

- **Hue drift per vowel: 0.0°.** A vowel keeps its colour no matter how loudly
  or highly it is sung, which is what an identifier requires.
- **Performance reads as lightness and chroma.** You can see pitch, loudness and
  brightness at once without losing which sound it is.

The weights come from Anikin's published effect sizes in proportion, not from
hand-tuning.

### The lesson that produced v2

An earlier version gave each colour channel exactly one input — pitch to
lightness, loudness to saturation. Clean and tidy. It scored 7/10 against the
human data because **people are not tidy**: in Anikin's results pitch drives
lightness *and* saturation, loudness drives saturation *and* darkness.
Everything touches two things. A mapping that is too orthogonal cannot match a
perceptual system that is cross-coupled.

Hue is the one channel that legitimately stays single-purpose.

---

## 5. What is proven and what is not

| Claim | Status |
|---|---|
| The X/Y/Z mapping fails; loudness eats hue | **Proven.** Arithmetic. |
| Vowels collapse to one colour under it | **Measured.** 25.8° drift, identical hex at volume. |
| Lightness and saturation carry the signal | **Published human data**, two independent studies. |
| Hue is free for identity | **Inference from a null.** Reasonable, not established. |
| v2 is the right mapping | **Not established.** |

Scores against Anikin's directions — ten checks, six directional and four null:

```
Original X/Y/Z mapping : 4 / 10
v1 (one input each)    : 7 / 10
v2 (current)           : 10 / 10
```

**Read v2's score correctly.** Its weights come from the same table it is scored
against, so 10/10 is *not* independent evidence — it only confirms the
implementation does what was intended. The other two scores predate the test and
are real. Validating v2 requires held-out data.

---

## 6. Open questions

1. **Is CIELAB even the right target space?** It is not perceptually uniform in
   the blue region, which is awkward when ΔE is supposed to mean "just
   noticeable difference" and hue carries identity. CAM16-UCS or
   J<sub>z</sub>a<sub>z</sub>b<sub>z</sub> may be better. `colorspacious` is
   installed; the comparison has not been run.
2. **Theme polarity.** Loudness→lightness is background-dependent, so the
   correct polarity is likely *different in light and dark mode*. A single locked
   constant cannot be right in both. Never tested.
3. **Does fine-grain timbre belong in the colour at all?** Currently only its
   brightness component (spectral centroid) is in; the MFCC residue is used for
   distance instead. This sits in tension with Reymore, whose central claim is
   that timbre is what colour encodes. Treat as a working proposal.
4. **Does Prosodic call Tierra, or are they fully independent?** If Prosodic's
   visuals use this mapping, Tierra becomes a dependency and that shapes the
   repo split.

---

## 7. What would settle it

Both papers give **priors about direction**, not calibration. They say which way
things move, not by how much.

- **Reymore & Lindsey's raw colour-matching data** — participants choosing
  actual colours for actual sounds is the closest thing to ground truth for this
  mapping. Their data availability statement offers it on request; a request has
  been sent to `lreymore@asu.edu`.
- **Or a listener study of your own** — forced choice: play a probe and two
  candidate colours, record the pick, report inter-rater agreement. A few
  hundred trials is enough to start. Draw pairs from where channels meet, since
  that is where disagreement concentrates.

Either gives held-out data that v2 was not fitted to, which is the only thing
that turns it from a good theory into a calibrated one.

---

## 8. The code

Three files, no Prosodic imports, nothing ships.

| File | Role |
|---|---|
| `tierra_bench.py` | The instrument — synthesises stimuli, extracts pitch / loudness / timbre, holds all three mappings |
| `anikin_direction_test.py` | The experiment — scores mappings against published human directions |
| `requirements-tierra.txt` | Dependencies, plus why three named tools could not be used |

```bash
pip install -r requirements-tierra.txt
python tierra_bench.py
python anikin_direction_test.py
```

Extraction uses the tools the Foundations document named: `librosa.pyin` for
pitch (the doc's stated alternative to CREPE, which needs TensorFlow),
`pyloudnorm` for ITU-R BS.1770 LUFS, `librosa` MFCC for timbre. MCD is
implemented inline because both PyPI packages depend on `fastdtw`, whose C
extension no longer builds on Python 3.11.

**Everything here is lab equipment.** When the concept settles, the product
surface is roughly thirty lines: audio in, colour out.
