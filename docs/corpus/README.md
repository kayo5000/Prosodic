# Reference corpus

Outside material about how music actually works, stored so it can be
cited rather than remembered.

## Why this exists

Two different jobs need outside knowledge, and they need it stored
differently:

1. **Engine design.** When a design decision rests on a claim about
   music ("triplets need space", "perceived tempo can be half the real
   tempo"), that claim should be written down with its source. Otherwise
   the reasoning behind a threshold is lost the moment the conversation
   ends, and the next person to touch it — including a future Claude —
   changes it based on vibes.

2. **Osborne's voice.** The mentor is only credible if what he says
   traces back to something real. Same rule as the metric claims in the
   Dream Window design: no source, no line. A corpus entry is something
   he may cite. It is not something he may paraphrase into a confident
   claim of his own.

## The discipline

Every claim file follows the same shape:

- **Claim** — one sentence, stated plainly.
- **Source** — where it came from, specifically enough to check.
- **Confidence** — `established` (measured/replicated), `reported`
  (a practitioner or journalist asserts it), or `anecdotal`.
- **Bearing on Prosodic** — what it changes here, or `none yet`.

`anecdotal` claims are kept, not discarded. A producer saying "we did it
because it sounded good" is real information about how music gets made.
It is just not evidence about what is measurable, and the label keeps
those two from blurring.

## What this is not

Not training data. Not a scraped dataset. Not something an engine reads
at runtime. These are notes with citations, read by humans and by whoever
is designing the next engine.

Claims here have **not** been independently verified against primary
sources unless a file says so explicitly. They are secondhand from music
journalism, which is a reasonable starting point for design intuition and
a bad basis for a shipped metric. Anything that becomes a threshold in
code needs its own validation.

## Files

- `sources.md` — what the corpus was built from
- `claims/rhythm-and-tempo.md` — meter, triplets, syncopation, tempo perception
- `claims/repetition-and-motif.md` — repetition, self-similarity, hooks
- `claims/measurement-methodology.md` — how others have measured music at scale
- `claims/structure-and-endings.md` — song form, fade-outs, resolution
- `claims/perceptual-illusions.md` — where measurement and perception diverge;
  carries its own sourcing caveat (written from general knowledge, not from a
  checked primary source)
