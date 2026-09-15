# Claims — song structure, endings, and resolution

## An ending's shape changes when listeners stop tracking the beat

**Claim.** Given a hard ending, listeners stopped tapping along roughly
1.04 seconds *before* the song finished. Given a fade-out, they kept
tapping roughly 1.40 seconds *after* it had gone. A fade removes the
resolution cue, so attention runs past the end.

**Source.** Vox *Earworm*, fade-out episode, citing a tapping study.
Related production detail: engineers "chase the fade" by hand, and
because of equal-loudness contours (Fletcher-Munson), lowering all
frequencies uniformly does not sound like a uniform fade. By 1985 every
song in that year's top ten ended with a fade-out.

**Confidence.** `reported` for the tapping figures — recorded from a
transcript, and the exact numbers should be checked against the study
before they inform anything. `established` for equal-loudness contours.

**Bearing on Prosodic.** Bears on the "does this verse land or hang
open" question that has come up but has never been specified.

The transferable idea is that **resolution is a property of the ending,
separate from everything that came before it**. A verse can be dense,
varied, and rhythmically tight and still trail off. Those are different
measurements and merging them would hide the interesting one.

For a text-only verse the analogue is whether the final line resolves
the rhyme scheme it set up or leaves it open. That is computable with
what already exists — the rhyme engine knows the scheme; the question is
only whether the last line closes it.

Deliberately open endings are a real technique. Same rule as always:
describe it, never grade it. `none yet` — not built, not scheduled.

---

## Form conventions are era-bound, not fixed

**Claim.** Song-structure conventions turn over on a scale of decades.
The fade-out went from near-universal to rare. Hook placement moved
earlier as streaming and short-form video changed the first-few-seconds
economics.

**Source.** Fade-out episode; TikTok virality episode.

**Confidence.** `reported`.

**Bearing on Prosodic.** Reinforces the era caveat from
`measurement-methodology.md`. Any structural norm the app implies —
where the hook "should" be, how long a verse "usually" runs — is a
snapshot of a moving target, and a user writing against current
conventions would be measured against a baseline that has already moved.

The safest form of any structural finding is a comparison to the user's
own history rather than to an external norm. That needs Rollups to
actually be written, which they currently are not.

---

## Regional idiom can rest on a single reused element

**Claim.** New Orleans bounce is built substantially on repeated use of
a specific sampled break, functioning as a shared spine across many
records rather than as plagiarism between them.

**Source.** Vox *Earworm*, New Orleans bounce episode. Corroborating
shape in the house music and Black-folk-music/banjo episodes: lineage
runs through shared, reused material.

**Confidence.** `reported`.

**Bearing on Prosodic.** A caution for the Genre engine. Shared material
between two tracks is evidence of a common tradition at least as often
as it is evidence of imitation, and a naive similarity measure cannot
tell those apart. The banjo episode is the sharper version of the same
point: attribution errors in music have a history and a direction, and a
system that guesses confidently about lineage can repeat it at scale.

An argument for the Genre engine reporting influence with explicit
uncertainty, or not reporting it at all — which is where the backlog
already lands it.
