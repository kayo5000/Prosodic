# Claims — auditory illusions, or where measurement and perception diverge

## Sourcing caveat, read first

Unlike the other files here, this one is not drawn from a transcript. It
is written from general knowledge of psychoacoustics. The phenomena are
`established` — standard, replicated, textbook material. The **specific
names, dates, and attributions below have not been checked against a
primary source** and must be before any of them is cited to a user or
turned into a threshold.

Treat the mechanisms as reliable and the citations as unverified.

## Why this file exists

`measurement-methodology.md` records the Redbone case: the measurement
said 0 falsetto, popular perception said falsetto, and the honest move
was to report the disagreement rather than retune until it matched.

Auditory illusions are that gap catalogued. They are the cases where a
signal measures one way and is heard another way *by design*, and they
are the standing argument for why an engine's number is not the last word
on what happened. Any DSP work in step 5 or later runs into these.

---

## Shepard tone / Shepard–Risset glissando

**What.** A pitch that appears to rise (or fall) forever without ever
getting higher.

**Mechanism.** Sine components spaced an octave apart, sweeping upward
together, with their loudness set by a *fixed* bell-shaped spectral
envelope. Components entering at the top fade in; components leaving at
the top fade out. Pitch class climbs continuously; the spectral centre of
mass never moves.

**Attribution.** Roger Shepard (discrete steps, 1960s); Jean-Claude
Risset (continuous glissando).

**Where heard.** Christopher Nolan uses it as a structural device —
*Dunkirk* most explicitly, also the Batpod in *The Dark Knight* and
*Interstellar*. Also the endless staircase in Super Mario 64 and Pink
Floyd's "Echoes."

**Bearing on Prosodic.** `none directly`. Rappers do not build Shepard
tones. It is here as the clearest illustration of the category, and as
material Osborne could cite when a user describes a hook that feels like
it keeps climbing.

---

## Risset rhythm — the one that actually matters here

**What.** The tempo version of the Shepard tone. A rhythm that seems to
accelerate forever while the actual tempo returns to where it started.

**Mechanism.** Identical in shape: layers running at octave-related
tempos, crossfading, so the felt pulse climbs while the underlying grid
cycles.

**Bearing on Prosodic.** This is the same mechanism as the "two rhythmic
lanes" entry in `rhythm-and-tempo.md`, deliberately exploited instead of
accidentally ambiguous.

That matters for the BPM lane problem already in the backlog. A grid
detector confronted with octave-related tempo layers does not have a
noisy signal — it has two genuinely correct answers and no way to pick.
Reinforces the standing rule: low grid confidence must suppress the
finding, not soften it.

---

## Missing fundamental (virtual pitch)

**What.** A harmonic series with its lowest partial physically absent is
still heard at that absent pitch. It is why a phone speaker that cannot
reproduce 60 Hz still conveys the bass line.

**Bearing on Prosodic.** A hard constraint on any pitch tracking in the
server-side DSP.

A naive detector that reports "lowest frequency present" is wrong on
exactly the material rap lives in — vocals over sub-heavy production
played back on small speakers. Established pitch algorithms that work on
periodicity rather than on spectral peaks (autocorrelation-family, YIN
and its descendants) handle this inherently.

**Practical instruction: do not hand-roll pitch detection.** Use an
established algorithm. This is the specific trap that makes a hand-rolled
detector look correct on clean test tones and fail on real audio.

---

## Speech-to-song illusion

**What.** A spoken phrase looped without alteration begins to be heard as
sung.

**Attribution.** Diana Deutsch, around 1995.

**Bearing on Prosodic.** Already recorded in `repetition-and-motif.md`.
Noted here so the illusion catalogue is complete, and because it is the
one illusion in this file that is *about* repetition — the mechanism the
self-similarity matrix measures.

Worth stating the limit plainly: the precondition (an exactly repeated
segment) is detectable. The percept is not. Nothing in the audio changes
when the flip happens; the listener changes.

---

## Tritone paradox

**What.** A pair of Shepard tones separated by a tritone. Whether it is
heard as rising or falling differs between listeners, and the split
reportedly correlates with the listener's language and regional dialect
background.

**Attribution.** Diana Deutsch.

**Bearing on Prosodic.** The strongest caution in this file.

Here is a stimulus where the *correct* perceptual answer depends on who
is listening, and specifically on where they are from. Any engine output
phrased as a fact about the music — "this rises," "this sits behind the
beat" — is at some level a claim about a listener, and for some
properties there is no single listener to appeal to.

Bears directly on the Genre/Era/Geography engine in the backlog, which
proposes to infer regional influence. A system that reads dialect signals
should be built knowing that dialect is documented to change perception
itself, not only production.

---

## Phonemic restoration

**What.** A phoneme deleted from a recording and replaced with noise is
still heard as present. Listeners typically cannot say which sound was
missing.

**Attribution.** Richard Warren, around 1970.

**Bearing on Prosodic.** A caution for any transcription-dependent
feature — which includes the "slow" half of freestyle analysis already in
the backlog (filler rate, self-repetition, rhyme-search latency).

A human listener and a transcriber will disagree about what words are
present in a masked or mumbled passage, and **the human is not wrong**.
They heard it. A transcript-versus-perception mismatch on dense or
low-clarity audio is the expected outcome, not a bug to be tuned away.

Practical consequence: transcription confidence has to travel with any
finding derived from it, the same way grid confidence does.

---

## Detectability, honestly ranked

Whether an engine could identify each of these from audio:

| Phenomenon | Detectable? | Notes |
|---|---|---|
| Shepard tone | **Yes** | Specific signature — octave-spaced partials, spectral centroid flat while pitch class sweeps monotonically |
| Risset rhythm | **Yes, harder** | Needs multi-scale onset detection; octave-related tempo layers crossfading |
| Missing fundamental | **Yes — and mandatory** | Any competent pitch algorithm handles it; the risk is hand-rolling one that does not |
| Speech-to-song | **Precondition only** | The repeated segment is findable; the percept is a listener state, not a signal property |
| Tritone paradox | **Stimulus only, never outcome** | The result varies by listener by definition |
| McGurk effect | **N/A** | Requires video |

The pattern: **the signal side is detectable, the percept side is not.**
Every entry that measures cleanly is one where the illusion lives in the
waveform. Every entry that resists measurement is one where it lives in
the listener.

That boundary is worth having written down, because it marks where an
engine may speak and where it can only describe the setup.

---

## The rap analogue — flagged as hypothesis, not claim

**Not sourced. Inference, recorded so it can be tested or discarded.**

Rappers do not use Shepard tones, but the underlying trick — *a pattern
that feels like it escalates while the measurement stays flat* — has a
plausible rap form: **the feeling of acceleration produced by removing
rests rather than by adding syllables.**

Same syllables per bar, but the gaps consolidate into longer unbroken
runs. Perceptually that reads as speeding up. A density metric reads it
as unchanged.

If it holds, it is worth having, because it is exactly the shape of
finding the app should be able to produce and currently cannot: the
number and the feeling disagree, and the app can say *why*. It is also
computable from data already captured — syllable positions and gaps —
without new DSP.

**Status: untested.** It needs real verses measured before it is anything
more than a plausible story. Recorded, not built.
