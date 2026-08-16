"""
song_context.py

SongContext — facts that are constant for an entire song. Created once at
the API boundary (api.py) when a request comes in, read by every engine
downstream instead of bpm being hand-threaded through each function call.

BUILD SPEC 01. Behavior-preserving plumbing — this changes HOW data
travels through the request, never WHAT any engine computes from it.

Discipline (so this doesn't rot into a god object): SongContext holds
ONLY song-constant facts — bpm now, key/genre/time_signature later, if
ever. It does NOT hold verse lines, request flags, trigger modes, target
words, or anything that changes call-to-call within the same song. If a
fact isn't true for the whole song, it does not belong here.

bpm optionality: the context always carries `bpm: float | None`. Whether
a missing bpm is an error is decided ONCE, at the API boundary
(/analyze requires it, /suggest doesn't) — never re-decided deep inside
an engine. The context itself is agnostic to that rule; it just carries
whatever the border already validated.

Part of the Prosodic hip-hop lyric analysis suite.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class SongContext:
    """Facts that are constant for an entire song. Created once at the API
    boundary, read by every engine. Never holds per-request transient state."""
    bpm: float | None = None
    # future: key, genre, time_signature — add ONLY things that are
    # 'always true for this whole song'. Not a grab-bag.
