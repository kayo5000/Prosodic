# Claims — rhythm, meter, and tempo

## The space precondition for triplet flow

**Claim.** Triplet flow did not become viable because rappers got faster.
It became viable because the beat underneath it got more spacious — the
snare landing half as often, leaving room for a three-per-beat vocal
subdivision to be heard as a pattern rather than a blur.

**Source.** Vox *Earworm*, triplet flow episode. Traces the lineage from
Public Enemy "Bring the Noise" and Dismasters "Small Time Hustler" (both
1987, isolated instances), through the Ohio-to-Tennessee corridor in the
mid-90s — Bone Thugs-N-Harmony, Three 6 Mafia (Lord Infamous), Tommy
Wright III — to Migos "Versace" (2013) and mainstream trap.

**Confidence.** `reported`. The historical lineage is well-documented.
The causal claim ("needed space to steal the show") is the episode's
thesis, argued rather than measured.

**Bearing on Prosodic.** Significant — see "two rhythmic lanes" below.

---

## Two rhythmic lanes

**Claim.** The same audio can be counted at two tempos an octave apart,
and which one a listener perceives depends on where the snare falls. A
beat with the snare on 2 and 4 of a *halved* count feels downtempo while
its actual BPM is double.

**Source.** Same episode. Worked example: Notorious B.I.G. / Bone Thugs
"Notorious Thugs" — the instrumental reads as slow and spacious, but the
underlying grid is running at twice the felt tempo, which is what leaves
room for the triplets.

**Confidence.** `established`. This is standard metric ambiguity —
half-time vs double-time feel — not a contested claim.

**Bearing on Prosodic — this changes a design conclusion.**

The earlier conclusion here was that triplet-flow detection needs audio
onset detection, because you cannot tell from text whether someone is
rapping in threes. That is still true for *confirming* triplets. It is
not true for *predicting* them.

The precondition is structural and cheap to check:

- If a user-supplied or detected BPM sits in the range where a half-time
  reading is plausible, the grid is ambiguous by construction.
- A syllable-per-bar count that does not resolve cleanly against a
  4-or-8 subdivision, but does resolve against 12, is evidence for the
  triplet lane rather than noise in the duple lane.

That makes triplet flow a **hypothesis the text layer can raise and the
audio layer confirms**, instead of a metric that waits entirely on DSP.

Consequence for the schema: a single `bpm` on SongContext cannot express
"this could be read at 70 or at 140." Storing one number silently picks
a lane. Any cadence metric computed against the wrong lane is not
slightly off — it is off by a factor of two, which is the difference
between "dense" and "sparse" as a reported finding.

**Not built. Logged in the backlog.** This is Step 5/backlog territory,
not current scope.

---

## Perceived downbeat can diverge from the actual downbeat

**Claim.** When the kick drum reinforces a syncopated melodic figure
instead of marking the downbeat, listeners lose the beat-1 anchor —
including trained musicians, including the people who recorded it.

**Source.** Vox *Earworm*, Radiohead "Videotape" episode. The piano is
displaced by an eighth note, landing on the "and" before the downbeat;
the kick follows the piano rather than the meter. Audiences clap in the
wrong place. The band's own drummer reportedly had trouble locating beat
one. Tempo given as 154.78 BPM, roughly double the felt pulse.

**Confidence.** `reported` for the anecdote, `established` for the
underlying mechanism (syncopation removing the metric anchor).

**Bearing on Prosodic.** Directly limits what a pocket/microtiming
metric may assert.

If a grid is inferred from audio and the audio is genuinely ambiguous,
every downstream deviation figure is measured against a grid that may
be displaced by an eighth note. The deviations would be real numbers
computed against the wrong zero.

This is an argument for a **grid-confidence value that travels with the
measurement**, not a separate quality flag checked later. Low grid
confidence must suppress the finding rather than lower its score —
"you're rushing" computed against a misplaced downbeat is not a weak
finding, it is a false one.

Consistent with the gate already agreed for cadence: fail loud, output
nothing, rather than output something shaky.

---

## Syncopation is a deliberate technique, not an error

**Claim.** Displacing accents off the metric grid is a compositional
choice with a long documented history, and the resulting listener
disorientation is often the intended effect.

**Source.** Radiohead episode; corroborated across the *Trout Mask
Replica* polymeter episode and the New Orleans bounce episode.

**Confidence.** `established`.

**Bearing on Prosodic.** Reinforces the standing rule that deviation is
described, never graded. A rapper consistently landing behind the grid
has a pocket, not a problem. Any wording that implies otherwise is a bug
in the copy, not a tuning issue in the engine.
