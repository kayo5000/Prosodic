"""
density_gradient.py

Lyric density analysis: per-bar syllable density, rolling gradient,
arc classification, and full section profile.

'Density gradient' refers to how the syllable load per bar rises and
falls across a section.  A verse that builds from sparse bars to a
packed close has a BUILDING gradient; a post-chorus that exhales has a
RELEASING gradient.  These shapes are a measurable dimension of flow craft.

Design rules:
- Zero external dependencies beyond prosodic_data_objects (stdlib only).
- All public functions are silent on bad input (return neutral/empty values).
- No existing Prosodic engine files are imported or modified.

References:
    Adams, K. (2009). On the metrical techniques of flow in rap music.
        Music Theory Online, 15(5).
    Ohriner, M. (2019). Flow: The Rhythmic Voice in Rap Music.
        University of Michigan Press.
"""

from __future__ import annotations

import re
from typing import List, Dict, Any, Optional, Tuple

from prosodic_data_objects import ArcType, LyricLine, SongSection


# ---------------------------------------------------------------------------
# Module-level constants
# ---------------------------------------------------------------------------

#: Minimum syllable density per bar — bars with fewer syllables than this
#: are considered 'sparse' (rests, holds, or breath points).
SPARSE_THRESHOLD: int = 4

#: Maximum syllable density per bar before a bar is flagged as 'packed'.
PACKED_THRESHOLD: int = 20

#: Default rolling-window size (in bars) for gradient smoothing.
GRADIENT_WINDOW: int = 3

#: Ratio of (max_density - min_density) / max_density below which a
#: section is classified as FLAT.  Sections with variance below this
#: look rhythmically uniform across bars.
FLAT_VARIANCE_RATIO: float = 0.20

#: Fraction of the section duration that must sustain a peak before
#: classify_arc returns PEAK_AND_RELEASE instead of COMPLEX.
PEAK_DURATION_RATIO: float = 0.25


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _count_syllables_in_text(text: str) -> int:
    """
    Estimate syllable count for a raw text string.

    Uses a vowel-group heuristic: each contiguous run of vowels (including
    'y' in non-initial position) counts as one syllable nucleus.  Silent-E
    rule applied for words ending in a consonant + 'e'.  Minimum of 1 per
    non-empty word.

    This is intentionally a lightweight fallback — callers that have
    PhonemeSequence objects should sum token.syllable_count directly.

    Args:
        text: Raw lyric text, may contain punctuation.

    Returns:
        Non-negative integer syllable estimate.
    """
    if not text or not text.strip():
        return 0

    total = 0
    # tokenise on whitespace, strip punctuation
    for raw_word in text.split():
        word = re.sub(r"[^a-zA-Z']", "", raw_word).lower()
        if not word:
            continue
        # count vowel groups
        vowels = re.findall(r"[aeiouy]+", word)
        count = len(vowels)
        # silent-E correction: word ends in consonant+e and has >1 vowel group
        if len(word) > 2 and word[-1] == "e" and word[-2] not in "aeiouy" and count > 1:
            count -= 1
        total += max(1, count)

    return total


def _line_syllable_count(line: Any) -> int:
    """
    Return the syllable count for a line object or plain string.

    Accepts:
      - LyricLine dataclass (sums token.syllable_count)
      - Plain str (falls back to heuristic counter)
      - Any object with a .text attribute (extracts text, then counts)

    Args:
        line: A LyricLine, plain string, or text-bearing object.

    Returns:
        Non-negative integer syllable count.
    """
    if isinstance(line, str):
        return _count_syllables_in_text(line)

    # LyricLine with tokens
    try:
        if hasattr(line, "tokens") and line.tokens:
            return sum(t.syllable_count for t in line.tokens)
    except Exception:
        pass

    # LyricLine.total_syllables shortcut
    try:
        if hasattr(line, "total_syllables") and line.total_syllables:
            return int(line.total_syllables)
    except Exception:
        pass

    # fallback: parse .text attribute
    try:
        if hasattr(line, "text"):
            return _count_syllables_in_text(str(line.text))
    except Exception:
        pass

    return 0


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def compute_bar_density(
    lines: List[Any],
    bars_per_line: int = 1,
) -> List[int]:
    """
    Return a list of syllable counts, one entry per bar.

    Each LyricLine is assumed to occupy *bars_per_line* bars.  If the line
    contains a ``bar_index`` attribute, that attribute is used to position
    the line's syllables into the output list directly (the bars_per_line
    argument is then ignored for that line).

    Args:
        lines: Ordered list of lines.  Each element may be a LyricLine,
            plain string, or any object with a ``.text`` attribute.
        bars_per_line: How many bars each line occupies when no ``bar_index``
            attribute is present.  Defaults to 1.

    Returns:
        List of non-negative integers, one per bar.  Length equals the
        total number of bars inferred from the input.  Empty list on empty
        or invalid input.

    Examples:
        >>> compute_bar_density(["I run it back", "the beat is heavy"])
        [4, 5]
    """
    if not lines:
        return []

    # check whether any line carries explicit bar_index
    has_bar_index = any(
        hasattr(ln, "bar_index") and ln.bar_index is not None
        for ln in lines
        if not isinstance(ln, str)
    )

    if has_bar_index:
        # build density by absolute bar index
        bar_map: Dict[int, int] = {}
        for ln in lines:
            if isinstance(ln, str):
                continue
            try:
                idx = int(ln.bar_index)
                syllables = _line_syllable_count(ln)
                bar_map[idx] = bar_map.get(idx, 0) + syllables
            except Exception:
                continue

        if not bar_map:
            return []

        max_bar = max(bar_map.keys())
        return [bar_map.get(i, 0) for i in range(max_bar + 1)]

    else:
        # lay lines out sequentially
        if bars_per_line < 1:
            bars_per_line = 1
        density: List[int] = []
        for ln in lines:
            syllables = _line_syllable_count(ln)
            # distribute syllables evenly across the bars this line fills
            per_bar = syllables // bars_per_line
            remainder = syllables % bars_per_line
            for b in range(bars_per_line):
                density.append(per_bar + (1 if b < remainder else 0))
        return density


def compute_density_gradient(
    bar_densities: List[int],
    window: int = GRADIENT_WINDOW,
) -> List[float]:
    """
    Compute a rolling-average smoothed density gradient from per-bar counts.

    The gradient at position *i* is the mean density of the window
    centred on bar *i* (left-padded and right-padded with edge values
    where the window would extend beyond the list).

    Args:
        bar_densities: Raw syllable counts per bar, as returned by
            ``compute_bar_density()``.
        window: Number of bars to average over.  Must be >= 1.
            If larger than the input list, the entire list is averaged
            and a single value is returned.

    Returns:
        List of floats of the same length as *bar_densities*.
        Empty list when *bar_densities* is empty.

    Examples:
        >>> compute_density_gradient([4, 8, 12, 8, 4], window=3)
        [5.33, 8.0, 9.33, 8.0, 5.33]   # approximate
    """
    if not bar_densities:
        return []

    if window < 1:
        window = 1

    n = len(bar_densities)
    gradient: List[float] = []
    half = window // 2

    for i in range(n):
        start = max(0, i - half)
        end = min(n, i + half + 1)
        segment = bar_densities[start:end]
        gradient.append(round(sum(segment) / len(segment), 4))

    return gradient


def classify_arc(
    bar_densities: List[int],
) -> ArcType:
    """
    Classify the density arc shape of a section from its per-bar counts.

    Classification logic (applied in order):

    1.  **FLAT** — (max - min) / max < FLAT_VARIANCE_RATIO, or section
        has fewer than 2 bars.
    2.  **BUILDING** — the smoothed gradient's last bar is higher than
        its first bar by more than the flat threshold, and the trend is
        monotonically non-decreasing.
    3.  **RELEASING** — the smoothed gradient's last bar is lower than
        its first bar, trend is monotonically non-increasing.
    4.  **PEAK_AND_RELEASE** — there is a clear interior peak (not at
        either end) that accounts for PEAK_DURATION_RATIO of the section,
        followed by descent.
    5.  **COMPLEX** — everything else (multiple peaks, jagged, irregular).

    Args:
        bar_densities: Per-bar syllable counts.

    Returns:
        ArcType enum value.

    Examples:
        >>> classify_arc([4, 6, 8, 10, 12])
        ArcType.BUILDING
        >>> classify_arc([12, 10, 8, 6, 4])
        ArcType.RELEASING
        >>> classify_arc([8, 8, 8, 8])
        ArcType.FLAT
    """
    if not bar_densities or len(bar_densities) < 2:
        return ArcType.FLAT

    max_d = max(bar_densities)
    min_d = min(bar_densities)

    # all-zero edge case
    if max_d == 0:
        return ArcType.FLAT

    variance_ratio = (max_d - min_d) / max_d
    if variance_ratio < FLAT_VARIANCE_RATIO:
        return ArcType.FLAT

    smoothed = compute_density_gradient(bar_densities)

    first = smoothed[0]
    last = smoothed[-1]
    n = len(smoothed)

    # BUILDING: end > start and overall non-decreasing
    if last > first:
        non_decreasing = all(
            smoothed[i] <= smoothed[i + 1] + (max_d * FLAT_VARIANCE_RATIO)
            for i in range(n - 1)
        )
        if non_decreasing:
            return ArcType.BUILDING

    # RELEASING: start > end and overall non-increasing
    if first > last:
        non_increasing = all(
            smoothed[i] >= smoothed[i + 1] - (max_d * FLAT_VARIANCE_RATIO)
            for i in range(n - 1)
        )
        if non_increasing:
            return ArcType.RELEASING

    # PEAK_AND_RELEASE: interior peak followed by sustained descent
    peak_idx = smoothed.index(max(smoothed))
    if 0 < peak_idx < n - 1:
        # peak must not be at either end
        post_peak = smoothed[peak_idx:]
        # post-peak segment should be non-increasing and long enough
        descending = all(
            post_peak[i] >= post_peak[i + 1] - (max_d * FLAT_VARIANCE_RATIO)
            for i in range(len(post_peak) - 1)
        )
        peak_covers_ratio = (n - peak_idx) / n >= PEAK_DURATION_RATIO
        if descending and peak_covers_ratio:
            return ArcType.PEAK_AND_RELEASE

    return ArcType.COMPLEX


def section_density_profile(
    section: Any,
    bpm: Optional[float] = None,
    bars_per_line: int = 1,
) -> Dict[str, Any]:
    """
    Compute and return the full density profile for a section.

    Accepts either a SongSection dataclass or a plain list of lines.
    When passed a SongSection, the function also writes back the computed
    density_gradient and arc_type onto the object for downstream consumers.

    Args:
        section: A SongSection dataclass or a list of line objects / strings.
        bpm: Optional BPM.  If provided and the section is a SongSection,
            overrides section.bpm for any BPM-aware sub-calculations.
            Currently stored in the returned dict for caller convenience;
            not used directly by density math.
        bars_per_line: How many bars each line occupies when bar_index
            attributes are absent.  Defaults to 1.

    Returns:
        Dictionary with keys:
            - ``bar_densities``  (List[int])  — syllables per bar
            - ``density_gradient`` (List[float]) — smoothed gradient
            - ``arc_type``       (str)         — ArcType.value
            - ``bar_count``      (int)
            - ``total_syllables`` (int)
            - ``mean_density``   (float)       — mean syllables per bar
            - ``peak_bar``       (int)         — index of densest bar
            - ``sparse_bars``    (List[int])   — bar indices below SPARSE_THRESHOLD
            - ``packed_bars``    (List[int])   — bar indices above PACKED_THRESHOLD
            - ``bpm``            (Optional[float])

        Returns an empty-profile dict with zero/empty values on bad input.

    Examples:
        >>> lines = ["I run it back real fast", "the beat is heavy now"]
        >>> p = section_density_profile(lines)
        >>> p["arc_type"]  # "flat" or "building" depending on counts
        'flat'
    """
    _empty: Dict[str, Any] = {
        "bar_densities": [],
        "density_gradient": [],
        "arc_type": ArcType.FLAT.value,
        "bar_count": 0,
        "total_syllables": 0,
        "mean_density": 0.0,
        "peak_bar": 0,
        "sparse_bars": [],
        "packed_bars": [],
        "bpm": bpm,
    }

    try:
        # resolve lines list and optional bpm from SongSection
        if isinstance(section, SongSection):
            lines = section.lines
            resolved_bpm = bpm if bpm is not None else section.bpm
        elif isinstance(section, list):
            lines = section
            resolved_bpm = bpm
        else:
            return _empty

        if not lines:
            return _empty

        bar_densities = compute_bar_density(lines, bars_per_line=bars_per_line)
        if not bar_densities:
            return _empty

        density_gradient = compute_density_gradient(bar_densities)
        arc = classify_arc(bar_densities)
        total = sum(bar_densities)
        bar_count = len(bar_densities)
        mean_d = round(total / bar_count, 4) if bar_count else 0.0
        peak_bar = bar_densities.index(max(bar_densities)) if bar_densities else 0
        sparse = [i for i, d in enumerate(bar_densities) if d < SPARSE_THRESHOLD]
        packed = [i for i, d in enumerate(bar_densities) if d > PACKED_THRESHOLD]

        # write back to SongSection if provided
        if isinstance(section, SongSection):
            try:
                section.density_gradient = density_gradient
                section.arc_type = arc
            except Exception:
                pass

        return {
            "bar_densities": bar_densities,
            "density_gradient": density_gradient,
            "arc_type": arc.value,
            "bar_count": bar_count,
            "total_syllables": total,
            "mean_density": mean_d,
            "peak_bar": peak_bar,
            "sparse_bars": sparse,
            "packed_bars": packed,
            "bpm": resolved_bpm,
        }

    except Exception:
        return _empty


# ---------------------------------------------------------------------------
# Convenience: multi-section analysis
# ---------------------------------------------------------------------------

def song_density_map(
    sections: List[Any],
    bpm: Optional[float] = None,
    bars_per_line: int = 1,
) -> List[Dict[str, Any]]:
    """
    Return density profiles for every section in a song.

    Iterates over *sections*, calling ``section_density_profile()`` on each,
    and annotates each result with the section label when available.

    Args:
        sections: List of SongSection objects or line lists.
        bpm: Optional BPM applied to all sections unless each SongSection
            carries its own .bpm attribute.
        bars_per_line: Passed through to section_density_profile().

    Returns:
        List of profile dicts, one per section, in input order.
        Each dict has an additional ``section_label`` key (str or None).
    """
    results: List[Dict[str, Any]] = []

    for sec in sections:
        profile = section_density_profile(sec, bpm=bpm, bars_per_line=bars_per_line)
        label: Optional[str] = None
        try:
            if hasattr(sec, "label"):
                label = str(sec.label)
        except Exception:
            pass
        profile["section_label"] = label
        results.append(profile)

    return results
