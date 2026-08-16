"""
syllable_compression.py

Syllable Compression Detector for Prosodic.

Detects when a writer is compressing or extending syllables to fit the bar
grid at a specific BPM. Shows which words are likely candidates for elision —
the craft technique of reducing a multi-syllable word to fewer syllables in
performance to make it fit the available beat grid space.

Core concepts:

    Syllable capacity — the comfortable maximum number of syllables that
        can be clearly articulated in one bar at a given BPM. Determined
        by tempo (faster = fewer comfortable syllables per beat) and the
        16-step sixteenth-note grid model from pocket_engine.py.

    Compression — when a line contains more syllables than the comfortable
        capacity for its bar, the writer (or performer) must compress some
        words — articulating them in less time than natural delivery would
        allow. Severity scales from none to heavy based on how many extra
        syllables must be absorbed.

    Elision — specific phonological processes that reduce syllable count
        in performance: -ing → -in', unstressed vowel deletion, vowel
        contraction. find_compression_candidates() identifies which words
        in a line are most likely compressed using English elision patterns.

Tempo model:
    At any BPM, one bar = 16 sixteenth-note positions = 4 beats.
    The "comfortable" syllable rate scales with tempo:

        syllables_per_beat = min(4.0, 4.0 * (REFERENCE_BPM / bpm))

    Where REFERENCE_BPM = 90 (the center of the hip-hop tempo range).
    This gives 4.0 syllables/beat at 90 BPM, 3.0 at 120 BPM, 4.0 (capped)
    below 90 BPM — matching the empirical observation that faster tempos
    compress the available articulation window per beat.

    Available slots for one bar = syllables_per_beat * 4 (beats per bar).

Compression severity thresholds:
    none     — actual <= available (no compression needed)
    mild     — 1–2 syllables over capacity
    moderate — 3–4 syllables over capacity
    heavy    — 5+ syllables over capacity
"""

from __future__ import annotations

import re
from typing import Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Reference BPM for the comfortable syllable rate model.
# At REFERENCE_BPM, syllables_per_beat = 4.0 (one per sixteenth note).
REFERENCE_BPM: float = 90.0

# Absolute minimum syllables per beat (applies at very high tempos)
MIN_SYLLABLES_PER_BEAT: float = 1.5

# Absolute maximum syllables per beat (capped regardless of tempo)
MAX_SYLLABLES_PER_BEAT: float = 4.0

# Beats per bar (standard 4/4 time)
BEATS_PER_BAR: int = 4

# Compression severity thresholds (delta = actual - available)
_MILD_THRESHOLD     = 2   # 1–2 over → mild
_MODERATE_THRESHOLD = 4   # 3–4 over → moderate
# >= 5 over → heavy

# Extension thresholds (delta = available - actual, line has fewer syllables than expected)
_SPARSE_THRESHOLD = 4   # 4+ under capacity → sparse (padded delivery expected)


# ---------------------------------------------------------------------------
# CMU dict access
# ---------------------------------------------------------------------------

_cmudict_cache: Optional[Dict[str, List[List[str]]]] = None


def _load_cmudict() -> Dict[str, List[List[str]]]:
    """
    Load NLTK cmudict lazily and cache module-level.

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
# Syllable count
# ---------------------------------------------------------------------------

def _count_syllables_cmu(word: str) -> int:
    """
    Count syllables in a word via CMU dict. Falls back to vowel counting.

    Args:
        word: Word string (punctuation stripped internally).

    Returns:
        Syllable count >= 1.
    """
    cmu = _load_cmudict()
    clean = re.sub(r"[^a-zA-Z']", "", word).lower().rstrip("'")
    if not clean:
        return 0

    phonemes = None
    if clean in cmu:
        phonemes = cmu[clean][0]
    else:
        for variant in [clean.rstrip("s"), clean + "s", clean.rstrip("in") + "ing",
                        clean + "in", clean + "ed", clean.rstrip("ed")]:
            if variant and variant in cmu:
                phonemes = cmu[variant][0]
                break

    if phonemes:
        return max(1, sum(1 for p in phonemes if p[-1].isdigit()))

    # Vowel cluster fallback
    vowel_clusters = re.findall(r"[aeiouAEIOU]+", clean)
    return max(1, len(vowel_clusters))


def _count_syllables_line(line: str) -> Tuple[int, List[Tuple[str, int]]]:
    """
    Count total syllables in a lyric line and return per-word counts.

    Args:
        line: Lyric line text.

    Returns:
        Tuple of (total_syllable_count, [(word, syllable_count), ...])
    """
    tokens = [re.sub(r"[^a-zA-Z'-]", "", t) for t in line.split()]
    tokens = [t for t in tokens if t]

    word_counts = [(word, _count_syllables_cmu(word)) for word in tokens]
    total = sum(count for _, count in word_counts)
    return total, word_counts


# ---------------------------------------------------------------------------
# Core tempo functions
# ---------------------------------------------------------------------------

def syllables_per_beat(bpm: float) -> float:
    """
    Return the comfortable syllable rate per beat at a given BPM.

    Scales linearly with tempo relative to the 90 BPM reference point.
    At 90 BPM → 4.0 syllables/beat (one per sixteenth note).
    At 120 BPM → 3.0 syllables/beat.
    At 140 BPM → 2.57 syllables/beat.
    Capped at MAX_SYLLABLES_PER_BEAT (4.0) regardless of how slow the tempo.
    Floored at MIN_SYLLABLES_PER_BEAT (1.5) for very fast tempos.

    The formula models the empirical reality that faster tempos compress
    the articulation window per beat, reducing how many distinct syllables
    can be clearly delivered on each beat.

    Args:
        bpm: Beats per minute. Must be > 0.

    Returns:
        Float syllables per beat in [MIN_SYLLABLES_PER_BEAT, MAX_SYLLABLES_PER_BEAT].

    Examples:
        syllables_per_beat(90)  → 4.0
        syllables_per_beat(120) → 3.0
        syllables_per_beat(70)  → 4.0  (capped at max)
        syllables_per_beat(140) → 2.57
        syllables_per_beat(180) → 2.0  (floored prevents < 1.5)
    """
    if bpm <= 0:
        return MAX_SYLLABLES_PER_BEAT

    rate = MAX_SYLLABLES_PER_BEAT * (REFERENCE_BPM / bpm)
    return round(max(MIN_SYLLABLES_PER_BEAT, min(MAX_SYLLABLES_PER_BEAT, rate)), 4)


def available_syllable_slots(line: str, bpm: float, bar_count: int = 1) -> int:
    """
    Return the comfortable syllable capacity for a lyric line.

    Computes how many syllables can be clearly delivered in the line's
    allotted bar space at the given BPM.

        capacity = syllables_per_beat(bpm) * BEATS_PER_BAR * bar_count

    Rounded to the nearest integer since syllable counts are discrete.

    Args:
        line:      The lyric line text (used only for context/logging; the
                   syllable capacity depends on BPM and bar_count, not content).
        bpm:       Beats per minute of the track.
        bar_count: Number of bars the line occupies (default 1).
                   Most hip-hop lines = 1 bar. Extended phrases = 2 bars.

    Returns:
        Integer syllable capacity. Minimum 1.

    Examples:
        available_syllable_slots("...", 90, 1)  → 16   (4.0 × 4 × 1)
        available_syllable_slots("...", 120, 1) → 12   (3.0 × 4 × 1)
        available_syllable_slots("...", 90, 2)  → 32   (4.0 × 4 × 2)
    """
    rate = syllables_per_beat(bpm)
    return max(1, round(rate * BEATS_PER_BAR * bar_count))


# ---------------------------------------------------------------------------
# Compression detection
# ---------------------------------------------------------------------------

def detect_compression(
    line: str,
    bpm: float,
    bar_count: int = 1,
) -> Dict:
    """
    Detect whether a lyric line requires syllable compression to fit its bar grid.

    Compares the actual syllable count of the line to the comfortable capacity
    at the given BPM. Returns the delta, a compression_required flag, and a
    severity classification.

    Args:
        line:      The lyric line text.
        bpm:       BPM of the track.
        bar_count: Number of bars this line occupies (default 1).

    Returns:
        Dict with:
            actual_syllables:   int — syllables counted in the line
            available_slots:    int — comfortable capacity at this BPM
            delta:              int — actual_syllables - available_slots
                                      positive = over capacity (compression needed)
                                      negative = under capacity (sparse delivery)
                                      zero     = perfect fit
            compression_required: bool — True if delta > 0
            severity:           str — 'none'|'mild'|'moderate'|'heavy'
                                      'sparse' if delta is strongly negative
            syllables_per_beat: float — the per-beat rate used
            bpm:                float
            bar_count:          int
            line_text:          str

    Examples:
        A line with 18 syllables at 90 BPM (capacity=16):
            delta=2, severity='mild', compression_required=True

        A line with 22 syllables at 90 BPM (capacity=16):
            delta=6, severity='heavy', compression_required=True

        A line with 10 syllables at 90 BPM (capacity=16):
            delta=-6, severity='sparse', compression_required=False
    """
    total_sylls, _ = _count_syllables_line(line)
    capacity = available_syllable_slots(line, bpm, bar_count)
    spb = syllables_per_beat(bpm)
    delta = total_sylls - capacity

    if delta <= 0:
        if delta <= -_SPARSE_THRESHOLD:
            severity = "sparse"
        else:
            severity = "none"
        compression_required = False
    elif delta <= _MILD_THRESHOLD:
        severity = "mild"
        compression_required = True
    elif delta <= _MODERATE_THRESHOLD:
        severity = "moderate"
        compression_required = True
    else:
        severity = "heavy"
        compression_required = True

    return {
        "actual_syllables":     total_sylls,
        "available_slots":      capacity,
        "delta":                delta,
        "compression_required": compression_required,
        "severity":             severity,
        "syllables_per_beat":   spb,
        "bpm":                  bpm,
        "bar_count":            bar_count,
        "line_text":            line,
    }


# ---------------------------------------------------------------------------
# Elision patterns
# ---------------------------------------------------------------------------

# English elision patterns for find_compression_candidates().
# Each entry: (pattern_name, regex, reduced_syllable_count_delta, description)
# reduced_syllable_count_delta is negative — how many syllables are saved by elision.

_ELISION_PATTERNS: List[Tuple[str, str, int, str]] = [
    # -ing ending → -in' (most common in AAVE and hip-hop delivery)
    # "going" (2) → "goin'" (1 in performance), "praying" (2) → "prayin'" (1)
    ("ing_reduction",   r"[a-z]{3,}in[g]?$",        -1, "-ing -> -in' (gerund/participle reduction)"),

    # -tion / -sion ending (pronounced 'shun' / 'zhun' — but can blur to 1 syllable in fast rap)
    # "nation" (2) → compressed to ~1.5 syllable feel
    ("tion_compression", r"[a-z]{3,}tions?$",        -1, "-tion -> compressed in fast delivery"),
    ("sion_compression", r"[a-z]{3,}sions?$",        -1, "-sion -> compressed in fast delivery"),

    # -er / -or ending (unstressed schwa+R — r-vocalized in AAVE, feels like 1 syllable ending)
    # "murder" (2) → "mur'er" or "murda" (still 2 but often feels like 1.5)
    ("er_weakening",    r"[a-z]{3,}[eo]rs?$",        -1, "-er/-or weakening (schwa+R reduction)"),

    # "every" → "ev'ry" (classic poetic elision, 3→2)
    ("every_elision",   r"^every$",                   -1, "every -> ev'ry"),

    # "over" → "o'er" in formal elision, but in hip-hop often just compressed
    ("over_elision",    r"^over$",                    -1, "over -> o'er or compressed"),

    # "even" → "ev'n" (2→1 in rapid delivery)
    ("even_elision",    r"^even$",                    -1, "even -> ev'n"),

    # "being" → "bein'" (2→1)
    ("being_elision",   r"^bein[g]?$",                -1, "being -> bein'"),

    # Unstressed "the" before vowels — often elided or compressed to near-nothing
    ("the_before_vowel", r"^the$",                    0,  "the (may reduce before vowels)"),

    # Words ending in unstressed -y / -ey (3+ syllables) — final -y can be swallowed
    # "family" (3) → "fam'ly" (2), "usually" (4) → "usu'ly" (3)
    ("y_reduction",     r"[a-z]{4,}[aeio][ul]?[l]?y$", -1, "unstressed -y ending — medial syllable swallowed"),

    # Vowel cluster in unstressed medial position: "-ious", "-eous", "-uous"
    # "serious" (3) → "ser'ous" (2), "furious" (4) → "fur'ous" (2)
    ("ious_compression", r"[a-z]{4,}[iau]ous$",       -1, "-ious/-eous/-uous -> medial vowel swallowed"),

    # -en ending after alveolar: "happen" (2) → "happ'n" (1.5 → effectively 1)
    # "golden" (2) → "gold'n", "broken" (2) → "brok'n"
    ("en_reduction",    r"[a-z]{3,}[dtsnl]en$",       -1, "-ten/-den/-nen/-len -> -t'n/-d'n (schwa deleted)"),

    # Compound-style words with unstressed middle syllable
    # "comfortable" (4) → "com'ftable" (3), "interest" (3) → "int'rest" (2)
    ("medial_schwa",    r"[a-z]{7,}",                  -1, "long word — possible medial schwa deletion"),

    # -ed past tense on 1-syllable verbs (doesn't add a syllable in speech)
    # "walked" (1, not 2), "talked" (1) — but cmudict already handles this
    # Include for cases where OOV fallback overcounts
    ("ed_no_syllable",  r"[bcdfghjklmnpqrstvwxyz]ed$", 0,  "-ed on consonant stem (no extra syllable in speech)"),
]


def find_compression_candidates(
    line: str,
    bpm: float,
    bar_count: int = 1,
) -> List[Dict]:
    """
    Identify specific words in a line that are likely candidates for elision.

    Uses English elision patterns to flag words that hip-hop writers and
    performers commonly compress in delivery — words where a syllable is
    swallowed, weakened, or merged with adjacent sounds to fit the bar grid.

    Only returns candidates when the line is at or near compression
    (delta >= -2, meaning the line is within 2 syllables of capacity).
    Lines comfortably under capacity are returned as an empty list since
    compression is not likely needed.

    Args:
        line:      The lyric line text.
        bpm:       BPM of the track.
        bar_count: Number of bars this line occupies.

    Returns:
        List of candidate dicts, one per likely-compressed word:
            word:               str — the word
            word_index:         int — 0-based position in line
            original_syllables: int — syllable count before elision
            compressed_syllables: int — estimated syllable count after elision
            savings:            int — how many syllables the elision saves (>= 1)
            pattern:            str — name of the elision pattern matched
            description:        str — human-readable explanation
            position_in_line:   float — word position as fraction of line [0.0, 1.0]

        Returns empty list if no compression is needed or no candidates found.

    Examples:
        For "Fast forward through years of rehearsal" at 90 BPM:
            → [{"word": "forward", "pattern": "er_weakening", ...},
               {"word": "rehearsal", "pattern": "er_weakening", ...}]

        For "From those wearin' my merch" at 80 BPM:
            → [] (line fits comfortably, no compression needed)
    """
    compression = detect_compression(line, bpm, bar_count)

    # Only hunt for candidates if line is at or over capacity
    # (within 2 syllables of the limit)
    if compression["delta"] < -2:
        return []

    tokens = line.split()
    clean_tokens = []
    for t in tokens:
        clean = re.sub(r"[^a-zA-Z'-]", "", t)
        if clean:
            clean_tokens.append(clean)

    total_words = len(clean_tokens)
    candidates = []

    for wi, word in enumerate(clean_tokens):
        word_lower = word.lower().rstrip("'")
        syll_count = _count_syllables_cmu(word)

        # Words with only 1 syllable have nothing to compress
        if syll_count <= 1:
            continue

        for pattern_name, pattern_re, delta, description in _ELISION_PATTERNS:
            if re.search(pattern_re, word_lower):
                savings = abs(delta) if delta < 0 else 0
                compressed = max(1, syll_count + delta)

                # Skip if pattern saves 0 syllables or word is already minimal
                if savings == 0 and delta == 0:
                    # Only include informational (delta=0) patterns if line is over capacity
                    if compression["delta"] <= 0:
                        continue

                position = wi / max(total_words - 1, 1)

                candidates.append({
                    "word":                 word,
                    "word_index":           wi,
                    "original_syllables":   syll_count,
                    "compressed_syllables": compressed,
                    "savings":              savings,
                    "pattern":              pattern_name,
                    "description":          description,
                    "position_in_line":     round(position, 3),
                })
                break  # only report the first matching pattern per word

    # Sort by savings descending (most compressible first), then position
    candidates.sort(key=lambda c: (-c["savings"], c["word_index"]))
    return candidates


# ---------------------------------------------------------------------------
# Multi-line section analysis
# ---------------------------------------------------------------------------

def analyze_section_compression(
    verse_lines: List[str],
    bpm: float,
    bar_count_per_line: int = 1,
) -> Dict:
    """
    Analyze compression requirements across an entire section.

    Provides per-line compression results and a section-level summary
    that identifies the most compression-heavy lines and the overall
    syllable load profile.

    Args:
        verse_lines:          List of lyric line strings.
        bpm:                  BPM of the track.
        bar_count_per_line:   Bars per line (default 1 — standard hip-hop).

    Returns:
        Dict with:
            line_results:   List of detect_compression() results per line
            candidates:     List of (line_index, candidates) tuples for lines
                            that have compression candidates
            section_summary:
                total_lines:        int
                total_syllables:    int
                total_capacity:     int
                section_delta:      int
                heaviest_line:      int (index) or None
                severity_counts:    Dict[str, int] — count per severity level
                avg_syllables_per_bar: float
    """
    line_results = []
    all_candidates = []

    for i, line in enumerate(verse_lines):
        if not line.strip():
            continue
        result = detect_compression(line, bpm, bar_count_per_line)
        line_results.append((i, result))

        candidates = find_compression_candidates(line, bpm, bar_count_per_line)
        if candidates:
            all_candidates.append((i, candidates))

    total_sylls = sum(r["actual_syllables"] for _, r in line_results)
    total_cap   = sum(r["available_slots"]  for _, r in line_results)
    section_delta = total_sylls - total_cap

    severity_counts: Dict[str, int] = {"none": 0, "mild": 0, "moderate": 0, "heavy": 0, "sparse": 0}
    for _, r in line_results:
        severity_counts[r["severity"]] = severity_counts.get(r["severity"], 0) + 1

    heaviest = None
    if line_results:
        heaviest_idx = max(range(len(line_results)), key=lambda i: line_results[i][1]["delta"])
        if line_results[heaviest_idx][1]["delta"] > 0:
            heaviest = line_results[heaviest_idx][0]

    n_lines = len(line_results)
    avg_spb = round(total_sylls / max(n_lines, 1) / bar_count_per_line, 2)

    return {
        "line_results":  [r for _, r in line_results],
        "candidates":    all_candidates,
        "section_summary": {
            "total_lines":          n_lines,
            "total_syllables":      total_sylls,
            "total_capacity":       total_cap,
            "section_delta":        section_delta,
            "heaviest_line":        heaviest,
            "severity_counts":      severity_counts,
            "avg_syllables_per_bar": avg_spb,
        },
    }
