"""
performed_stress.py

Performed Stress Analyzer for Prosodic.

Maps the gap between lexical stress (what the dictionary prescribes) and
performed stress (what a rapper actually does to a syllable when placed on
the beat grid). Identifies stress inversions as deliberate craft choices —
not errors — and scores the degree of stress control across a line or section.

Core distinction:
    Lexical stress  — the stress pattern encoded in the CMU Pronouncing
                      Dictionary. It reflects how a word is stressed in
                      isolation in standard American English.

    Performed stress — the stress pattern that emerges when a syllable lands
                       on a specific position in the musical bar grid at a
                       specific BPM. A rapper may stress a lexically-unstressed
                       syllable by placing it on a downbeat, or de-stress a
                       lexically-stressed syllable by tucking it into an upbeat.

    Stress inversion — a syllable where lexical stress and performed stress
                       disagree. Inversions are the fingerprint of rhythmic
                       craft. A locked style (few inversions) has crisp, natural
                       delivery. A flexible style (moderate inversions) shows
                       deliberate rhythmic manipulation. An experimental style
                       (many inversions) pushes against the beat aggressively.

Beat grid model:
    16-step sixteenth-note grid per bar (standard hip-hop metric grid).
    Steps 0 and 8 are primary downbeats (strong stress positions).
    Steps 4 and 12 are backbeat positions (secondary stress).
    All other steps are unstressed positions.

    Grid stress mapping:
        Step 0, 8  → performed_stress = 2  (primary)
        Step 4, 12 → performed_stress = 1  (secondary / backbeat)
        All others → performed_stress = 0  (unstressed)

Syllable distribution formula:
    Syllables are proportionally distributed across the 16 grid positions
    using the formula: grid_position = (syllable_index * 16) // total_syllables
    This is the same formula used by pocket_engine.py and ensures consistency
    with the existing flow analysis.
"""

from __future__ import annotations

import re
from typing import Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# 16-step grid positions → inferred performed stress level
# Primary downbeats (0, 8) → 2
# Backbeat pockets (4, 12) → 1
# Everything else → 0
_GRID_STRESS: Dict[int, int] = {
    0: 2, 1: 0, 2: 0, 3: 0,
    4: 1, 5: 0, 6: 0, 7: 0,
    8: 2, 9: 0, 10: 0, 11: 0,
    12: 1, 13: 0, 14: 0, 15: 0,
}

# Stress pattern type thresholds (inversion_rate → type)
_LOCKED_MAX      = 0.20   # <= 20% inversion rate → locked
_FLEXIBLE_MAX    = 0.50   # 21–50% → flexible
# > 50% → experimental

# Minimum syllables in a line to compute meaningful stress analysis
_MIN_SYLLABLES = 3


# ---------------------------------------------------------------------------
# CMU dict access
# ---------------------------------------------------------------------------

_cmudict_cache: Optional[Dict[str, List[List[str]]]] = None


def _load_cmudict() -> Dict[str, List[List[str]]]:
    """
    Load NLTK cmudict on first call and cache it module-level.

    Returns empty dict if NLTK is unavailable.
    """
    global _cmudict_cache
    if _cmudict_cache is not None:
        return _cmudict_cache

    try:
        import nltk
        from nltk.corpus import cmudict
        try:
            cmudict.entries()
        except LookupError:
            nltk.download("cmudict", quiet=True)
            from nltk.corpus import cmudict  # noqa: F811
        from collections import defaultdict
        raw: Dict[str, List[List[str]]] = defaultdict(list)
        for word, phones in cmudict.entries():
            raw[word.lower()].append(phones)
        _cmudict_cache = dict(raw)
    except Exception:
        _cmudict_cache = {}

    return _cmudict_cache


# ---------------------------------------------------------------------------
# Lexical stress lookup
# ---------------------------------------------------------------------------

def get_lexical_stress(word: str) -> List[int]:
    """
    Return the lexical stress pattern for a word from the CMU Pronouncing Dictionary.

    Each value in the returned list corresponds to one syllable:
        0 = unstressed
        1 = primary stress
        2 = secondary stress

    Uses the first pronunciation in the CMU dict. If the word is not found,
    falls back to a simple vowel-counting heuristic: the first vowel cluster
    is marked as primary stressed (1), all others as unstressed (0).

    Args:
        word: The word to look up (case-insensitive, punctuation stripped).

    Returns:
        List of int stress values, one per syllable. Never empty for valid input —
        single-syllable OOV words return [1].

    Examples:
        get_lexical_stress("hurt")    → [1]       (HH ER1 T)
        get_lexical_stress("murder")  → [1, 0]    (M ER1 D ER0)
        get_lexical_stress("amazing") → [0, 1, 0] (AH0 M EY1 Z IH0 NG)
        get_lexical_stress("prayin")  → [1, 0]    (normalized lookup)
    """
    cmu = _load_cmudict()
    clean = re.sub(r"[^a-zA-Z']", "", word).lower().rstrip("'")

    if not clean:
        return [0]

    phonemes = None

    # Direct lookup
    if clean in cmu:
        phonemes = cmu[clean][0]
    else:
        # Try without trailing apostrophe s or common suffixes
        for variant in [clean.rstrip("s"), clean + "s", clean.rstrip("in") + "ing"]:
            if variant in cmu:
                phonemes = cmu[variant][0]
                break

    if phonemes:
        return [int(p[-1]) for p in phonemes if p[-1].isdigit()]

    # Fallback: vowel heuristic — mark first vowel cluster primary, rest unstressed
    vowel_pattern = re.findall(r'[aeiouAEIOU]+', clean)
    if not vowel_pattern:
        return [0]
    stress = []
    for i, _ in enumerate(vowel_pattern):
        stress.append(1 if i == 0 else 0)
    return stress if stress else [1]


# ---------------------------------------------------------------------------
# Syllable count from CMU dict
# ---------------------------------------------------------------------------

def _get_syllable_count(word: str) -> int:
    """
    Return the syllable count for a word using CMU dict.

    Falls back to vowel-cluster counting for OOV words.

    Args:
        word: Word string (punctuation stripped internally).

    Returns:
        Integer syllable count >= 1.
    """
    stress = get_lexical_stress(word)
    return max(1, len(stress))


# ---------------------------------------------------------------------------
# Line tokenization
# ---------------------------------------------------------------------------

def _tokenize_line(line: str) -> List[str]:
    """
    Split a lyric line into word tokens, stripping punctuation.

    Preserves contractions and hyphenated words as single tokens.
    Skips empty tokens.

    Args:
        line: Raw lyric line string.

    Returns:
        List of word strings.
    """
    tokens = re.split(r'[\s]+', line.strip())
    result = []
    for t in tokens:
        clean = re.sub(r"[^a-zA-Z'\\-]", "", t)
        if clean:
            result.append(clean)
    return result


# ---------------------------------------------------------------------------
# Grid stress inference
# ---------------------------------------------------------------------------

def _grid_position_to_stress(grid_pos: int) -> int:
    """
    Map a 16-step grid position to an inferred performed stress level.

    Args:
        grid_pos: Integer in [0, 15].

    Returns:
        Stress level: 2 (primary downbeat), 1 (backbeat), or 0 (unstressed).
    """
    return _GRID_STRESS.get(grid_pos % 16, 0)


# ---------------------------------------------------------------------------
# Core functions
# ---------------------------------------------------------------------------

def infer_performed_stress(
    line: str,
    bpm: float,
    bar_start_offset: int = 0,
) -> List[Dict]:
    """
    Infer the performed stress pattern for each syllable in a lyric line.

    Distributes all syllables in the line proportionally across a 16-step
    sixteenth-note grid (one bar), then maps each grid position to a stress
    level based on the standard hip-hop metric hierarchy.

    Distribution formula (matches pocket_engine.py):
        grid_position = (syllable_index * 16) // total_syllables

    This means a line with 16 syllables maps one-to-one onto the grid,
    while a line with 8 syllables places one syllable every two steps,
    and a line with 24 syllables compresses multiple syllables into some steps.

    Args:
        line:             The lyric line text.
        bpm:              Beats per minute of the track (used to label beat numbers).
        bar_start_offset: Grid offset (0–15) if this line does not start at beat 1.
                          Default 0 (line begins on the downbeat).

    Returns:
        List of dicts, one per syllable across all words:
            word:             str — the word this syllable belongs to
            word_index:       int — 0-based word index in line
            syllable_index:   int — 0-based syllable index within word
            global_syll_idx:  int — 0-based syllable index across whole line
            grid_position:    int — [0–15] sixteenth-note position in bar
            beat_number:      int — [1–4] beat number
            performed_stress: int — inferred stress: 2 (primary), 1 (secondary), 0 (none)
            lexical_stress:   int — dictionary stress for this syllable

    Returns empty list for blank lines or lines with no recognizable words.
    """
    if not line or not line.strip():
        return []

    tokens = _tokenize_line(line)
    if not tokens:
        return []

    # Build (word, word_index, syll_index_within_word, lexical_stress) tuples
    syllables: List[Tuple[str, int, int, int]] = []
    for wi, word in enumerate(tokens):
        word_stress = get_lexical_stress(word)
        for si, lex_stress in enumerate(word_stress):
            syllables.append((word, wi, si, lex_stress))

    total = len(syllables)
    if total == 0:
        return []

    result = []
    for gi, (word, wi, si, lex_stress) in enumerate(syllables):
        grid_pos = (bar_start_offset + (gi * 16) // total) % 16
        beat_num = (grid_pos // 4) + 1
        perf_stress = _grid_position_to_stress(grid_pos)

        result.append({
            "word":             word,
            "word_index":       wi,
            "syllable_index":   si,
            "global_syll_idx":  gi,
            "grid_position":    grid_pos,
            "beat_number":      beat_num,
            "performed_stress": perf_stress,
            "lexical_stress":   lex_stress,
        })

    return result


def find_stress_inversions(
    line: str,
    bpm: float,
    bar_start_offset: int = 0,
) -> List[Dict]:
    """
    Find syllables where performed stress diverges from lexical stress.

    A stress inversion occurs when:
        - A lexically-stressed syllable (lexical_stress > 0) lands on an
          unstressed grid position (performed_stress == 0), OR
        - A lexically-unstressed syllable (lexical_stress == 0) lands on a
          primary grid position (performed_stress == 2).

    Secondary inversions (lexical=2 on performed=0, or lexical=0 on performed=1)
    are recorded but flagged as minor.

    Args:
        line:             The lyric line text.
        bpm:              BPM of the track.
        bar_start_offset: Grid offset if line doesn't start on the downbeat.

    Returns:
        List of inversion dicts, one per inverted syllable:
            word:             str
            word_index:       int
            syllable_index:   int
            global_syll_idx:  int
            grid_position:    int
            lexical_stress:   int
            performed_stress: int
            inversion_type:   str — 'major' or 'minor'
                               major: stressed syllable on no-stress beat, or
                                      unstressed syllable on primary beat
                               minor: secondary stress mismatch

    Returns empty list if no inversions found or line is too short to analyze.
    """
    syllable_data = infer_performed_stress(line, bpm, bar_start_offset)
    inversions = []

    for syll in syllable_data:
        lex  = syll["lexical_stress"]
        perf = syll["performed_stress"]

        is_inversion = False
        inversion_type = "minor"

        # Major inversion: strong lexical stress on no-stress beat
        if lex >= 1 and perf == 0:
            is_inversion = True
            inversion_type = "major"

        # Major inversion: unstressed syllable promoted to primary beat
        elif lex == 0 and perf == 2:
            is_inversion = True
            inversion_type = "major"

        # Minor inversion: secondary stress mismatch
        elif lex == 2 and perf == 0:
            is_inversion = True
            inversion_type = "minor"

        elif lex == 0 and perf == 1:
            is_inversion = True
            inversion_type = "minor"

        if is_inversion:
            inversions.append({
                "word":             syll["word"],
                "word_index":       syll["word_index"],
                "syllable_index":   syll["syllable_index"],
                "global_syll_idx":  syll["global_syll_idx"],
                "grid_position":    syll["grid_position"],
                "lexical_stress":   lex,
                "performed_stress": perf,
                "inversion_type":   inversion_type,
            })

    return inversions


def score_stress_control(
    line: str,
    bpm: float,
    bar_start_offset: int = 0,
) -> Dict:
    """
    Score the degree of stress control a writer exhibits on a single line.

    Aggregates the inversion analysis into three key metrics:

        inversion_count:    Total number of stressed syllables that diverge
                            from the beat grid (major + minor).

        inversion_rate:     Fraction of total syllables that are inverted.
                            Range [0.0, 1.0].

        stress_pattern_type: Classification of the writer's stress approach:
            'locked'       — inversion_rate <= 0.20
                             Stress follows the grid cleanly. Crisp, natural
                             delivery. Most syllables land where expected.
            'flexible'     — inversion_rate 0.21–0.50
                             Deliberate rhythmic manipulation. Some syllables
                             push against the grid for tension or emphasis.
                             The most common style in skilled hip-hop writing.
            'experimental' — inversion_rate > 0.50
                             High divergence from grid. Either extremely
                             syncopated writing or the BPM may be incorrect.

    Args:
        line:             The lyric line text.
        bpm:              BPM of the track.
        bar_start_offset: Grid offset if line doesn't start on the downbeat.

    Returns:
        Dict with keys:
            inversion_count:    int
            major_inversions:   int  — major-type only
            minor_inversions:   int  — minor-type only
            inversion_rate:     float [0.0, 1.0]
            total_syllables:    int
            stress_pattern_type: str — 'locked'|'flexible'|'experimental'
            line_text:          str  — the input line (for reference)
            bpm:                float

    Returns all-zero result for blank or very short lines (< 3 syllables).
    """
    syllable_data = infer_performed_stress(line, bpm, bar_start_offset)
    total_syllables = len(syllable_data)

    empty_result = {
        "inversion_count":    0,
        "major_inversions":   0,
        "minor_inversions":   0,
        "inversion_rate":     0.0,
        "total_syllables":    total_syllables,
        "stress_pattern_type": "locked",
        "line_text":          line,
        "bpm":                bpm,
    }

    if total_syllables < _MIN_SYLLABLES:
        return empty_result

    inversions = find_stress_inversions(line, bpm, bar_start_offset)
    major = sum(1 for inv in inversions if inv["inversion_type"] == "major")
    minor = sum(1 for inv in inversions if inv["inversion_type"] == "minor")
    total_inv = len(inversions)

    inversion_rate = total_inv / total_syllables

    if inversion_rate <= _LOCKED_MAX:
        stress_type = "locked"
    elif inversion_rate <= _FLEXIBLE_MAX:
        stress_type = "flexible"
    else:
        stress_type = "experimental"

    return {
        "inversion_count":    total_inv,
        "major_inversions":   major,
        "minor_inversions":   minor,
        "inversion_rate":     round(inversion_rate, 4),
        "total_syllables":    total_syllables,
        "stress_pattern_type": stress_type,
        "line_text":          line,
        "bpm":                bpm,
    }


# ---------------------------------------------------------------------------
# Multi-line section scoring
# ---------------------------------------------------------------------------

def score_section_stress_control(
    verse_lines: List[str],
    bpm: float,
) -> Dict:
    """
    Score stress control across an entire section (multiple lines).

    Analyzes each line independently, then aggregates to a section-level
    stress profile. Lines are analyzed with bar_start_offset=0 (each line
    treated as starting at beat 1). This is appropriate for full-bar lines;
    for half-bar or pickup lines, use find_stress_inversions() directly
    with the appropriate offset.

    Args:
        verse_lines: List of lyric line strings.
        bpm:         BPM of the track.

    Returns:
        Dict with:
            line_scores:         List of per-line score_stress_control() results
            total_inversions:    int — sum across all lines
            total_syllables:     int — sum across all lines
            section_inversion_rate: float — aggregate rate
            section_stress_type: str — 'locked'|'flexible'|'experimental'
            dominant_type:       str — most common line-level stress_pattern_type
    """
    line_scores = []
    for line in verse_lines:
        if line.strip():
            score = score_stress_control(line, bpm)
            line_scores.append(score)

    total_inv  = sum(s["inversion_count"]  for s in line_scores)
    total_syll = sum(s["total_syllables"]  for s in line_scores)

    if total_syll < _MIN_SYLLABLES:
        return {
            "line_scores":              line_scores,
            "total_inversions":         0,
            "total_syllables":          0,
            "section_inversion_rate":   0.0,
            "section_stress_type":      "locked",
            "dominant_type":            "locked",
        }

    section_rate = total_inv / total_syll

    if section_rate <= _LOCKED_MAX:
        section_type = "locked"
    elif section_rate <= _FLEXIBLE_MAX:
        section_type = "flexible"
    else:
        section_type = "experimental"

    # Dominant type = most frequent line-level type
    type_counts: Dict[str, int] = {}
    for s in line_scores:
        t = s["stress_pattern_type"]
        type_counts[t] = type_counts.get(t, 0) + 1
    dominant = max(type_counts, key=type_counts.get) if type_counts else "locked"

    return {
        "line_scores":              line_scores,
        "total_inversions":         total_inv,
        "total_syllables":          total_syll,
        "section_inversion_rate":   round(section_rate, 4),
        "section_stress_type":      section_type,
        "dominant_type":            dominant,
    }
