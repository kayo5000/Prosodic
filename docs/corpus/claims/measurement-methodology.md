# Claims — how others have measured music at scale

About method, not about music. The closest thing in the corpus to a model
for the Golden Master reference library.

## Human-scored markers beat algorithmic metadata for craft attributes

**Claim.** A dataset built from trained annotators scoring individual
songs across a large fixed attribute list supports finer questions than
algorithmically-derived metadata, which tends to be broad and mood-level.

**Source.** Vox *Earworm*, falsetto episode. Pandora's Music Genome
Project: roughly 2 million songs, up to ~450 individually scored markers
per song, scored by musicians. Contrasted with Spotify's algorithmic
attributes (danceability, valence, energy), described as broader.

**Confidence.** `reported`. Figures are Pandora's own published claims.

**Bearing on Prosodic.** The Genre/Era engine in the backlog needs a
labeled reference library, and this is the shape of one. The honest read
is that its value came from the annotation cost, which is a real cost,
not a shortcut.

A reference library assembled by asking a model to label artists would
inherit that model's priors and then be used to validate outputs derived
from the same priors. That is circular, and it is precisely the failure
the Golden Master pattern exists to catch.

---

## Keep correlated attributes as separate data points

**Claim.** Falsetto and vocal register were deliberately scored as two
independent markers rather than collapsed into one, because a song can
score high on one and zero on the other.

**Source.** Same episode. Worked example: Childish Gambino "Redbone"
scored 0 for falsetto and 9 for register — contradicting the popular
description of that vocal as falsetto. The analysis reported the
discrepancy rather than adjusting the score to match expectation.

**Confidence.** `established` as a methodological principle; the specific
scores are `reported`.

**Bearing on Prosodic.** The best behavioural model in the corpus, and it
backs a decision already made.

The measurement disagreed with what everyone "knows," and they published
the disagreement and explained the distinction. They did not retune until
the number matched the vibe.

That is the standard for every engine here. When a metric says something
counterintuitive the options are: find the bug, or report the number with
the caveat. Quietly nudging a threshold until output matches expectation
destroys the only thing that makes the number worth showing.

It also argues against collapsing metrics that feel like the same thing.
The canonical MetricDefinition namespace should keep near-neighbours
separate — the cost of two metrics is a row; the cost of merging them is
a permanently unanswerable question.

---

## Coverage is uneven across time and must be stated

**Claim.** A corpus matched against Billboard's Hot 100 covered roughly
50% of charting songs in 1958 and roughly 95% by 2018.

**Source.** Same episode. 20,075 songs matched.

**Confidence.** `reported`.

**Bearing on Prosodic.** Any longitudinal claim ("this was more common in
the 90s") is partly an artifact of what got digitised. If the Genre/Era
engine ships, era comparisons need a coverage caveat attached to the
finding itself, not buried in docs nobody opens.

The same principle applies inside one user's data. A fingerprint built
from three songs and one built from three hundred are not comparable, and
the interface should not render them identically. Currently it would.

---

## Confidence thresholds and the willingness to say nothing

**Claim.** Reporting an uncertain classification confidently is more
damaging than reporting nothing.

**Source.** Not one episode — the pattern recurs. The falsetto episode
publishes its own contradictory result; the repetition episode declines
to explain why repetition works beyond what the studies actually show.

**Confidence.** `reported` / editorial judgment.

**Bearing on Prosodic.** Already locked in the backlog for the Genre
engine (stay quiet below ~60-70%) and for the dream personas ("not enough
data yet" must be an allowed answer). Recorded here because the same rule
belongs on the shipped v1 engines, not only the backlogged ones.
