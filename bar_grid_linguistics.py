"""
bar_grid_linguistics.py

Linguistic-musical alignment analysis for hip-hop lyrics.

Maps syllables onto the 16-position sixteenth-note bar grid and evaluates
how well prosodic phrase boundaries align with musical grid boundaries.
Mismatches (phrase boundaries that land mid-beat, or strong beats that land
mid-phrase) are 'collisions' — sometimes intentional craft, sometimes
unintentional tension.

The sixteenth-note grid (0–15 within one bar):
    Position  0 → beat 1 downbeat (strongest)
    Position  4 → beat 2 backbeat
    Position  8 → beat 3 downbeat
    Position 12 → beat 4 backbeat
    Positions 1,2,3,5,6,7,9,10,11,13,14,15 → weak subdivisions

Syllable assignment formula (matches pocket_engine.py and performed_stress.py):
    grid_position = (syllable_index * 16) // total_syllables_in_line

This ensures all three modules agree on which syllable lands where.

Design rules:
- No existing Prosodic engine files are imported or modified.
- All public functions are silent on bad input (never raise).
- Depends only on prosodic_data_objects and phoneme_resolver (new files).

References:
    Nespor, M. & Vogel, I. (1986). Prosodic Phonology. Foris Publications.
    Zsiga, E. (2013). The Sounds of Language. Wiley-Blackwell.
    Adams, K. (2009). On the metrical techniques of flow in rap music.
        Music Theory Online, 15(5).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple

from prosodic_data_objects import LyricLine, SongSection
from phoneme_resolver import resolve_line, PhonemeSequence


# ---------------------------------------------------------------------------
# Module-level constants
# ---------------------------------------------------------------------------

#: 16-position bar grid stress weights.
#: Primary downbeats (0, 8) → 2 | Backbeats (4, 12) → 1 | Subdivisions → 0
_GRID_WEIGHT: Dict[int, int] = {
    0: 2, 1: 0, 2: 0, 3: 0,
    4: 1, 5: 0, 6: 0, 7: 0,
    8: 2, 9: 0, 10: 0, 11: 0,
    12: 1, 13: 0, 14: 0, 15: 0,
}

#: Grid positions considered musically 'strong' (downbeats + backbeats).
STRONG_POSITIONS: frozenset = frozenset([0, 4, 8, 12])

#: Grid positions considered 'downbeat' (highest musical weight).
DOWNBEAT_POSITIONS: frozenset = frozenset([0, 8])

#: Linguistic phrase-boundary markers: words or punctuation that signal
#: the end of a prosodic phrase within a line.
#: Based on Nespor & Vogel (1986) phonological phrase and intonational phrase
#: boundaries, applied to lyric text heuristically.
_PHRASE_BOUNDARY_WORDS: frozenset = frozenset([
    "and", "but", "or", "nor", "so", "yet",
    "because", "while", "when", "if", "that", "which",
])

_PHRASE_BOUNDARY_PUNCT: re.Pattern = re.compile(r"[,;:—–]")


# ---------------------------------------------------------------------------
# Core data structure
# ---------------------------------------------------------------------------

@dataclass
class BarGridAlignment:
    """
    Full grid alignment result for a single lyric line.

    Attributes:
        line_text: The raw lyric line.
        bpm: Beats per minute of the track.
        bar_start_offset: Grid position (0–15) where the line begins.
        syllable_grid: List of dicts, one per syllable, containing:
            - ``word``         (str)   orthographic word
            - ``syllable_idx`` (int)   syllable index within the word
            - ``grid_pos``     (int)   grid position 0–15
            - ``beat_num``     (int)   beat number 1–4
            - ``grid_weight``  (int)   0/1/2 musical weight at this position
            - ``lex_stress``   (int)   lexical stress from CMU (0/1/2)
            - ``is_strong``    (bool)  True if grid_pos in STRONG_POSITIONS
        phrase_boundaries: List of grid positions where linguistic phrase
            boundaries were detected.
        collision_score: Float [0.0, 1.0] — fraction of phrase boundaries
            that land on weak grid positions (0.0 = perfect alignment).
        alignment_score: Float [0.0, 1.0] — overall linguistic-musical
            alignment quality (1.0 = perfect).
        total_syllables: Total syllable count for the line.
    """
    line_text: str
    bpm: float
    bar_start_offset: int = 0
    syllable_grid: List[Dict[str, Any]] = field(default_factory=list)
    phrase_boundaries: List[int] = field(default_factory=list)
    collision_score: float = 0.0
    alignment_score: float = 1.0
    total_syllables: int = 0


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _syllable_count_from_seq(seq: PhonemeSequence) -> int:
    """Return syllable count from a PhonemeSequence, minimum 1."""
    return max(1, seq.syllable_count)


def _lex_stress_for_syllable(seq: PhonemeSequence, syll_idx: int) -> int:
    """
    Return the lexical stress value for syllable *syll_idx* within *seq*.

    Returns 0 if the index is out of range (graceful degradation).
    """
    if seq.stress_pattern and 0 <= syll_idx < len(seq.stress_pattern):
        return seq.stress_pattern[syll_idx]
    return 0


def _detect_phrase_boundary_after(
    tokens: List[str],
    word_idx: int,
) -> bool:
    """
    Return True if a linguistic phrase boundary occurs after *word_idx*.

    Boundaries are detected by:
    1. Trailing punctuation on the token at *word_idx* (comma, semicolon, etc.)
    2. The *next* token being a coordinating conjunction or subordinator.

    Args:
        tokens: List of raw orthographic tokens in the line.
        word_idx: Index of the current token.

    Returns:
        True if a phrase boundary follows this word.
    """
    if not tokens or word_idx >= len(tokens):
        return False

    current = tokens[word_idx]
    # punctuation boundary
    if _PHRASE_BOUNDARY_PUNCT.search(current):
        return True

    # next word is a boundary-marking function word
    if word_idx + 1 < len(tokens):
        next_word = re.sub(r"[^a-zA-Z']", "", tokens[word_idx + 1]).lower()
        if next_word in _PHRASE_BOUNDARY_WORDS:
            return True

    return False


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def assign_syllables_to_beats(
    line: str,
    bpm: float,
    bar_start_offset: int = 0,
    prefer_aave: bool = False,
) -> BarGridAlignment:
    """
    Map every syllable in *line* onto the 16-position sixteenth-note grid.

    Uses the pocket_engine distribution formula:
        grid_position = (bar_start_offset + (syllable_index * 16) // total_syllables) % 16

    Resolves phoneme sequences through the 5-layer phoneme_resolver chain
    to obtain accurate syllable counts and lexical stress values.

    Args:
        line: Raw lyric line text.
        bpm: Beats per minute.
        bar_start_offset: Grid position (0–15) where this line begins.
            0 = line starts on the downbeat.  Use non-zero for anacrusis
            (pickup) lines or lines that share a bar with another line.
        prefer_aave: Passed to phoneme_resolver for AAVE-register lines.

    Returns:
        BarGridAlignment with syllable_grid populated.
        Returns an alignment with empty syllable_grid on blank input.

    Examples:
        >>> a = assign_syllables_to_beats("I run the streets", 90.0)
        >>> [(s['word'], s['grid_pos']) for s in a.syllable_grid]
        [('I', 0), ('run', 4), ('the', 8), ('streets', 12)]
    """
    result = BarGridAlignment(
        line_text=line,
        bpm=bpm,
        bar_start_offset=bar_start_offset,
    )

    if not line or not line.strip():
        return result

    try:
        tokens = line.split()
        seqs = resolve_line(line, prefer_aave=prefer_aave)

        if not seqs:
            return result

        # build flat syllable list: (word, word_idx, syll_idx, lex_stress)
        flat: List[Tuple[str, int, int, int]] = []
        for wi, seq in enumerate(seqs):
            n_sylls = _syllable_count_from_seq(seq)
            for si in range(n_sylls):
                flat.append((seq.word, wi, si, _lex_stress_for_syllable(seq, si)))

        total = len(flat)
        result.total_syllables = total
        if total == 0:
            return result

        syllable_grid: List[Dict[str, Any]] = []
        for gi, (word, wi, si, lex_stress) in enumerate(flat):
            grid_pos = (bar_start_offset + (gi * 16) // total) % 16
            beat_num = (grid_pos // 4) + 1
            weight = _GRID_WEIGHT.get(grid_pos, 0)
            syllable_grid.append({
                "word": word,
                "word_idx": wi,
                "syllable_idx": si,
                "grid_pos": grid_pos,
                "beat_num": beat_num,
                "grid_weight": weight,
                "lex_stress": lex_stress,
                "is_strong": grid_pos in STRONG_POSITIONS,
            })

        result.syllable_grid = syllable_grid

    except Exception:
        pass

    return result


def find_phrase_boundary_collisions(
    alignment: BarGridAlignment,
    line: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Find phrase boundaries that 'collide' with weak grid positions.

    A collision occurs when a linguistic phrase boundary (detected from
    punctuation or function-word patterns) lands at a grid position that
    has low musical weight — meaning the music 'breathes' at a different
    moment than the text.

    Conversely, a 'strong-beat clash' is when a strong grid position
    (beat 1, 2, 3, or 4) lands in the interior of a phrase rather than
    at its beginning or end.

    Args:
        alignment: A BarGridAlignment as returned by assign_syllables_to_beats().
        line: Optional raw line text.  If None, uses alignment.line_text.

    Returns:
        List of collision dicts, each containing:
            - ``type``          ('boundary_on_weak' or 'strong_beat_mid_phrase')
            - ``grid_pos``      (int) grid position of the collision
            - ``beat_num``      (int)
            - ``word``          (str) word at this grid position
            - ``grid_weight``   (int)
            - ``description``   (str) human-readable explanation

        Empty list if no collisions found or alignment has no syllable_grid.

    References:
        Nespor & Vogel (1986) §5.4 — Phonological phrase misalignment.
        Zsiga (2013) ch. 14 — Prosodic domain boundaries.
    """
    if not alignment.syllable_grid:
        return []

    raw_line = line or alignment.line_text
    tokens = raw_line.split() if raw_line else []
    if not tokens:
        return []

    # build word_idx -> last_syllable_grid_entry map
    word_last_syll: Dict[int, Dict[str, Any]] = {}
    for entry in alignment.syllable_grid:
        wi = entry["word_idx"]
        word_last_syll[wi] = entry  # last syllable of each word

    boundary_grid_positions: List[int] = []
    for wi in range(len(tokens) - 1):  # no boundary after the last word
        if _detect_phrase_boundary_after(tokens, wi):
            last_entry = word_last_syll.get(wi)
            if last_entry:
                boundary_grid_positions.append(last_entry["grid_pos"])

    alignment.phrase_boundaries = boundary_grid_positions

    collisions: List[Dict[str, Any]] = []

    # type 1: phrase boundary lands on a weak grid position
    for gpos in boundary_grid_positions:
        weight = _GRID_WEIGHT.get(gpos, 0)
        if weight == 0:
            entry = next(
                (e for e in alignment.syllable_grid if e["grid_pos"] == gpos),
                None,
            )
            word = entry["word"] if entry else "?"
            collisions.append({
                "type": "boundary_on_weak",
                "grid_pos": gpos,
                "beat_num": (gpos // 4) + 1,
                "word": word,
                "grid_weight": weight,
                "description": (
                    f"Phrase boundary after '{word}' lands on weak grid position {gpos} "
                    f"(beat {(gpos // 4) + 1}, subdivision {gpos % 4 + 1})"
                ),
            })

    # type 2: strong beats land mid-phrase (interior of a word-group, not a boundary).
    # Only meaningful when the line already contains at least one phrase boundary —
    # a single unbroken phrase spanning the bar is normal rap craft, not a collision.
    if boundary_grid_positions:
        for gpos in STRONG_POSITIONS:
            entry = next(
                (e for e in alignment.syllable_grid if e["grid_pos"] == gpos),
                None,
            )
            if entry is None:
                continue
            wi = entry["word_idx"]
            # strong beat is mid-phrase when wi > 0 and no boundary ended just before it
            if wi > 0:
                prev_entry = word_last_syll.get(wi - 1)
                prev_gpos = prev_entry["grid_pos"] if prev_entry else -1
                if prev_gpos not in boundary_grid_positions:
                    collisions.append({
                        "type": "strong_beat_mid_phrase",
                        "grid_pos": gpos,
                        "beat_num": (gpos // 4) + 1,
                        "word": entry["word"],
                        "grid_weight": _GRID_WEIGHT[gpos],
                        "description": (
                            f"Strong beat at position {gpos} (beat {(gpos // 4) + 1}) "
                            f"lands on '{entry['word']}' mid-phrase"
                        ),
                    })

    return collisions


def compute_linguistic_musical_alignment_score(
    alignment: BarGridAlignment,
    collisions: Optional[List[Dict[str, Any]]] = None,
) -> float:
    """
    Compute a [0.0, 1.0] alignment score for a line.

    Score reflects how well the line's linguistic phrase structure maps
    onto the musical bar grid.  1.0 = perfect alignment (all phrase
    boundaries land on strong beats).  0.0 = maximum misalignment.

    Scoring formula:
        base_score = 1.0
        For each 'boundary_on_weak' collision: deduct 0.15
        For each 'strong_beat_mid_phrase' collision: deduct 0.10
        Clamp result to [0.0, 1.0].

    These weights reflect the empirical observation (Adams 2009, Ohriner 2019)
    that phrase-boundary placement is a stronger signal of craft than
    strong-beat mid-phrase placement, which is often intentional syncopation.

    Args:
        alignment: A BarGridAlignment with syllable_grid populated.
        collisions: Pre-computed collision list.  If None, collisions are
            computed on the fly from the alignment object.

    Returns:
        Float in [0.0, 1.0].  Returns 1.0 for empty or minimal lines.
    """
    if not alignment.syllable_grid or alignment.total_syllables < 2:
        return 1.0

    if collisions is None:
        collisions = find_phrase_boundary_collisions(alignment)

    score = 1.0
    for c in collisions:
        if c["type"] == "boundary_on_weak":
            score -= 0.15
        elif c["type"] == "strong_beat_mid_phrase":
            score -= 0.10

    score = round(max(0.0, min(1.0, score)), 4)
    alignment.collision_score = round(1.0 - score, 4)
    alignment.alignment_score = score
    return score


def song_alignment_map(
    lines: List[Any],
    bpm: float,
    bar_start_offset: int = 0,
    prefer_aave: bool = False,
) -> Dict[str, Any]:
    """
    Compute grid alignment for every line in a song or section.

    Each line is aligned independently starting at *bar_start_offset* = 0
    (assumes one line per bar).  Override bar_start_offset to handle
    half-bar or pickup lines.

    Args:
        lines: List of lyric lines.  Each element may be a LyricLine
            dataclass (uses .text attribute) or a plain string.
        bpm: Beats per minute.
        bar_start_offset: Grid offset for all lines.  Defaults to 0.
        prefer_aave: Passed to assign_syllables_to_beats() for each line.

    Returns:
        Dict with keys:
            - ``lines``              (List[Dict]) — per-line results, each containing:
                  ``line_text``, ``alignment_score``, ``collision_score``,
                  ``total_syllables``, ``phrase_boundaries``, ``collisions``
            - ``mean_alignment_score`` (float)
            - ``total_collisions``    (int)
            - ``most_aligned_line``   (int) index of highest-scoring line
            - ``least_aligned_line``  (int) index of lowest-scoring line
            - ``bpm``                 (float)

        Returns empty-map dict on bad input.
    """
    _empty: Dict[str, Any] = {
        "lines": [],
        "mean_alignment_score": 1.0,
        "total_collisions": 0,
        "most_aligned_line": 0,
        "least_aligned_line": 0,
        "bpm": bpm,
    }

    if not lines:
        return _empty

    line_results: List[Dict[str, Any]] = []
    scores: List[float] = []
    total_collisions = 0

    for ln in lines:
        # extract text from LyricLine or plain string
        try:
            if isinstance(ln, str):
                text = ln
            elif hasattr(ln, "text"):
                text = str(ln.text)
            else:
                text = str(ln)
        except Exception:
            text = ""

        alignment = assign_syllables_to_beats(
            text, bpm, bar_start_offset, prefer_aave=prefer_aave
        )
        collisions = find_phrase_boundary_collisions(alignment)
        score = compute_linguistic_musical_alignment_score(alignment, collisions)

        scores.append(score)
        total_collisions += len(collisions)
        line_results.append({
            "line_text": text,
            "alignment_score": score,
            "collision_score": alignment.collision_score,
            "total_syllables": alignment.total_syllables,
            "phrase_boundaries": alignment.phrase_boundaries,
            "collisions": collisions,
        })

    mean_score = round(sum(scores) / len(scores), 4) if scores else 1.0
    most_idx = scores.index(max(scores)) if scores else 0
    least_idx = scores.index(min(scores)) if scores else 0

    return {
        "lines": line_results,
        "mean_alignment_score": mean_score,
        "total_collisions": total_collisions,
        "most_aligned_line": most_idx,
        "least_aligned_line": least_idx,
        "bpm": bpm,
    }
