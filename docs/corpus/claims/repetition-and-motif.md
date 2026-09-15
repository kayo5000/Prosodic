# Claims — repetition, motif, and hooks

## Repetition is measurable as a self-similarity matrix

**Claim.** Lyrical repetition can be rendered as a square matrix where
both axes are word position and each cell marks whether those two
positions hold the same word. Repeated sections appear as off-diagonal
line segments; choruses appear as dense blocks.

**Source.** Vox *Earworm*, repetition episode, citing Colin Morris's
"Song Sim" tool.

**Confidence.** `established`. Self-similarity matrices are a standard
MIR technique; this is a lyric-domain application of one.

**Bearing on Prosodic.** The most directly implementable idea in the
whole corpus.

It is a text-only technique. It needs no audio, no dictionary, no model —
just the lyrics already in `song_context.body_text`. It gives:

- a structural read (where the hook is, whether there is one)
- a repetition density figure that is genuinely descriptive rather than
  judgmental — a matrix is a picture, not a grade
- a visual the app could show directly, which is rare; most of what the
  engines produce is a number that needs a sentence of explanation

Caveats before it becomes a metric:

- Exact word matching is the naive version. "Runnin" / "running" / "run"
  are related and a raw matcher misses it. The CMU phoneme table is
  already in the schema and could back a phonetic variant.
- Section labels inferred from the matrix are an inference, not a fact.
  A dense block is evidence of a chorus, not proof of one.

Not built. Backlog — belongs with the motif engine expansion.

---

## Repetition increases perceived human authorship

**Claim.** Atonal excerpts that listeners heard as cold and mechanical
were rated as more enjoyable, and as more likely to have been composed by
a human, once the same excerpts were digitally edited to repeat sections.

**Source.** Vox *Earworm*, repetition episode, citing Elizabeth Margulis's
work with Elliott Carter excerpts. Related: the speech-to-song illusion
(Diana Deutsch, 1995), where a looped spoken phrase begins to be heard as
sung.

**Confidence.** `established` — published experimental work, recorded
here secondhand from a transcript rather than from the paper.

**Bearing on Prosodic.** Two things, one of them a warning.

The useful part: repetition is not a deficiency to be flagged. It is part
of how music becomes music. A high repetition figure should never surface
as something to fix — which is the rule already locked in the spec
("descriptive, never prescriptive"), now with a citation behind it.

The warning: pop repetition has reportedly increased in every ten-year
window measured across roughly fifty years. The baseline moves. A
repetition metric benchmarked against a fixed reference set will drift
out of calibration as the reference ages. Any comparison to "typical"
needs an era attached, or it is comparing the user to a period they are
not writing in.

---

## Motif tracking across a corpus is tractable and yields real structure

**Claim.** A single lexical motif can be counted across a genre corpus,
its rhyme partners ranked, and its usage split into distinct semantic
functions.

**Source.** Vox *Earworm*, Grey Poupon episode. 118 songs referencing the
term. Most frequent rhyme partner "coupon" (~20 occurrences), then
"futon", "crouton". Usage split roughly evenly between two functions:
affluence brag, and juxtaposition against poverty. The frequency spike
tracked to mid-2000s chart success rather than to the original ad
campaign. Interviewed artists described the usage as largely subconscious.

**Confidence.** `reported`. The counts are the journalist's own corpus
work; method not fully specified.

**Bearing on Prosodic.** Two transferable pieces.

**Rhyme-partner distribution.** A word's rhyme partners are not evenly
distributed — one or two dominate heavily. That skew is measurable per
word, and it bears directly on the rhyme-variety goal already named in
the spec. Reaching for a word whose top partner outnumbers the next 20:1
is a different act from reaching for one with a flat distribution. A
describable difference, not a better/worse one.

**Function, not just frequency.** The same word doing brag work versus
contrast work is what made the count interesting; frequency alone said
nothing. This is the concept-layer problem in miniature — and worth
noting that the episode solved it by hand-reading 118 songs, not with a
model. Nothing in Prosodic does this today, and claiming an engine can
infer rhetorical function from text would be exactly the kind of unearned
claim the verification protocol exists to catch.
