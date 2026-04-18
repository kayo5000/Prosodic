"""
aspiration_gap.py

Phonoaffective Signature Framework — Aspiration Gap Calculator.

Computes the gap between what a writer's language actually encodes
(the measurable emotional signature) and what the writer stated they
wanted it to feel like (the sonic aspiration label).

This is the core discovery mechanism of the Phonoaffective Signature
Framework.  The eight-component signature formula is:

    E = (PT×w1) + (PP×w2) + (SF×w3) + (CM×w4) +
        (IS×w5) + (TP×w6) + (SA×w7) + (SD×w8)

Where:
    PT = Phonemic Texture      — hard/soft consonant ratio, vowel openness
    PP = Prosodic Pressure     — syllable density, stress inversion rate
    SF = Semantic Field Gravity — vocabulary clustering, emotional valence
    CM = Cultural Memory        — era-specific vocabulary, regional phonology
    IS = Intentionality Signal  — revision frequency, override rate (telemetry)
    TP = Temporal Position      — section position, arc trajectory
    SA = Sonic Aspiration       — what the writer wanted it to feel like
    SD = Subtext Delta          — gap between surface encoding and stated meaning

Weights w1–w8 are initially set by craft judgment and eventually trained
from Research Partner data.

Design rules:
- New file only. No existing files modified.
- All public functions are silent on bad input.
- Docstrings on everything.

References:
    Juslin, P.N. & Laukka, P. (2003). Communication of emotions in vocal
        expression and music performance. Psychological Bulletin, 129(5).
    Russell, J.A. (1980). A circumplex model of affect.
        Journal of Personality and Social Psychology, 39(6), 1161–1178.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple


# ---------------------------------------------------------------------------
# Aspiration label taxonomy
# ---------------------------------------------------------------------------

#: Canonical sonic aspiration labels.  Writers choose one (or the closest
#: approximation) when saving a section through VEIL.
ASPIRATION_LABELS: List[str] = [
    "aggressive",
    "celebratory",
    "contemplative",
    "defiant",
    "desperate",
    "grieving",
    "hopeful",
    "hungry",
    "melancholic",
    "nostalgic",
    "peaceful",
    "proud",
    "raw",
    "triumphant",
    "vulnerable",
]

#: Expected phonoaffective signature profile for each aspiration label.
#: Each dict maps component name → expected score range (min, max) in [0, 1].
#: Derived from craft judgment; will be refined by Research Partner data.
_ASPIRATION_PROFILES: Dict[str, Dict[str, Tuple[float, float]]] = {
    "aggressive": {
        "PT": (0.65, 1.0),   # high hard-consonant ratio
        "PP": (0.60, 1.0),   # dense, high-pressure delivery
        "SF": (0.50, 1.0),   # charged semantic field
        "CM": (0.40, 1.0),
        "IS": (0.40, 1.0),
        "TP": (0.0,  1.0),
        "SA": (0.60, 1.0),
        "SD": (0.0,  0.50),  # surface usually matches subtext
    },
    "celebratory": {
        "PT": (0.30, 0.70),
        "PP": (0.40, 0.80),
        "SF": (0.50, 1.0),
        "CM": (0.40, 1.0),
        "IS": (0.0,  0.60),
        "TP": (0.40, 1.0),
        "SA": (0.50, 1.0),
        "SD": (0.0,  0.40),
    },
    "contemplative": {
        "PT": (0.20, 0.60),  # softer consonants
        "PP": (0.10, 0.50),  # lower pressure, measured delivery
        "SF": (0.30, 0.70),
        "CM": (0.20, 0.70),
        "IS": (0.30, 0.80),  # high revision signal
        "TP": (0.20, 0.70),
        "SA": (0.30, 0.70),
        "SD": (0.20, 0.70),
    },
    "defiant": {
        "PT": (0.50, 1.0),
        "PP": (0.50, 1.0),
        "SF": (0.40, 1.0),
        "CM": (0.40, 1.0),
        "IS": (0.20, 0.80),
        "TP": (0.20, 0.80),
        "SA": (0.50, 1.0),
        "SD": (0.10, 0.60),
    },
    "desperate": {
        "PT": (0.40, 0.80),
        "PP": (0.60, 1.0),   # high density, rushed
        "SF": (0.50, 1.0),
        "CM": (0.20, 0.70),
        "IS": (0.40, 0.90),
        "TP": (0.30, 0.80),
        "SA": (0.50, 1.0),
        "SD": (0.30, 0.80),  # often says one thing, means another
    },
    "grieving": {
        "PT": (0.10, 0.50),
        "PP": (0.10, 0.50),
        "SF": (0.30, 0.80),
        "CM": (0.20, 0.70),
        "IS": (0.40, 1.0),
        "TP": (0.20, 0.70),
        "SA": (0.30, 0.80),
        "SD": (0.30, 0.80),
    },
    "hopeful": {
        "PT": (0.20, 0.65),
        "PP": (0.20, 0.60),
        "SF": (0.40, 0.80),
        "CM": (0.20, 0.70),
        "IS": (0.20, 0.70),
        "TP": (0.30, 0.80),
        "SA": (0.40, 0.80),
        "SD": (0.10, 0.60),
    },
    "hungry": {
        "PT": (0.50, 0.90),
        "PP": (0.60, 1.0),
        "SF": (0.40, 1.0),
        "CM": (0.40, 1.0),
        "IS": (0.30, 0.80),
        "TP": (0.20, 0.70),
        "SA": (0.50, 1.0),
        "SD": (0.10, 0.50),
    },
    "melancholic": {
        "PT": (0.15, 0.55),
        "PP": (0.10, 0.50),
        "SF": (0.30, 0.70),
        "CM": (0.20, 0.65),
        "IS": (0.30, 0.80),
        "TP": (0.20, 0.65),
        "SA": (0.30, 0.70),
        "SD": (0.30, 0.75),
    },
    "nostalgic": {
        "PT": (0.20, 0.60),
        "PP": (0.15, 0.55),
        "SF": (0.40, 0.80),
        "CM": (0.50, 1.0),   # high cultural memory signal
        "IS": (0.20, 0.70),
        "TP": (0.20, 0.70),
        "SA": (0.30, 0.70),
        "SD": (0.20, 0.70),
    },
    "peaceful": {
        "PT": (0.10, 0.45),
        "PP": (0.05, 0.40),
        "SF": (0.20, 0.60),
        "CM": (0.10, 0.60),
        "IS": (0.10, 0.60),
        "TP": (0.20, 0.70),
        "SA": (0.20, 0.60),
        "SD": (0.05, 0.40),
    },
    "proud": {
        "PT": (0.40, 0.80),
        "PP": (0.40, 0.80),
        "SF": (0.40, 0.90),
        "CM": (0.40, 1.0),
        "IS": (0.20, 0.70),
        "TP": (0.30, 0.80),
        "SA": (0.40, 0.90),
        "SD": (0.10, 0.50),
    },
    "raw": {
        "PT": (0.50, 1.0),
        "PP": (0.50, 1.0),
        "SF": (0.50, 1.0),
        "CM": (0.40, 1.0),
        "IS": (0.10, 0.60),  # low revision — first instinct
        "TP": (0.0,  1.0),
        "SA": (0.50, 1.0),
        "SD": (0.20, 0.80),
    },
    "triumphant": {
        "PT": (0.50, 0.90),
        "PP": (0.50, 0.90),
        "SF": (0.50, 1.0),
        "CM": (0.40, 1.0),
        "IS": (0.20, 0.70),
        "TP": (0.50, 1.0),   # usually late in composition
        "SA": (0.60, 1.0),
        "SD": (0.05, 0.45),
    },
    "vulnerable": {
        "PT": (0.10, 0.50),
        "PP": (0.10, 0.55),
        "SF": (0.30, 0.75),
        "CM": (0.20, 0.65),
        "IS": (0.50, 1.0),   # high revision — hard to say
        "TP": (0.10, 0.70),
        "SA": (0.30, 0.75),
        "SD": (0.40, 1.0),   # often says less than it means
    },
}

#: Default initial weights for the eight signature components.
#: Set by craft judgment; trained from Research Partner data over time.
DEFAULT_WEIGHTS: Dict[str, float] = {
    "PT": 0.15,
    "PP": 0.18,
    "SF": 0.15,
    "CM": 0.10,
    "IS": 0.12,
    "TP": 0.10,
    "SA": 0.10,
    "SD": 0.10,
}

#: Gap magnitude above which research_flag is set True.
RESEARCH_FLAG_THRESHOLD: float = 0.35

#: Gap magnitude above which a dimension is considered 'divergent'.
DIVERGENCE_THRESHOLD: float = 0.20


# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------

@dataclass
class AspirationGapResult:
    """
    Result of an aspiration gap computation.

    Attributes:
        alignment_score: Float [0.0, 1.0].  1.0 = the writer's language
            perfectly matches their stated aspiration.  0.0 = maximum
            divergence — the writing encodes the opposite of what was intended.
        divergent_dimensions: List of component names (e.g. ['PT', 'SF'])
            where the signature score falls outside the expected range for
            the stated aspiration.
        gap_type: One of:
            'controlled'  — small gap (< 0.20), language matches intent.
            'leaked'      — moderate gap (0.20–0.45), emotion leaking
                            through despite conscious framing.
            'inverted'    — large gap (> 0.45), language encodes the
                            near-opposite of stated aspiration.
        research_flag: True if the gap is large enough to constitute a
            meaningful research signal (gap > RESEARCH_FLAG_THRESHOLD).
        signature_vector: The eight-component input vector.
        aspiration_label: The writer's stated sonic aspiration.
        gap_magnitude: Raw float gap score before classification.
        component_gaps: Per-component gap dict for detailed analysis.
    """
    alignment_score: float
    divergent_dimensions: List[str]
    gap_type: str
    research_flag: bool
    signature_vector: Dict[str, float]
    aspiration_label: str
    gap_magnitude: float
    component_gaps: Dict[str, float]


# ---------------------------------------------------------------------------
# Signature component computers
# ---------------------------------------------------------------------------

def compute_phonemic_texture(phonemes_flat: List[str]) -> float:
    """
    Compute PT (Phonemic Texture) from a flat list of Arpabet phonemes.

    PT measures the hard vs soft consonant ratio and vowel openness.
    Hard consonants (plosives, affricates) push PT toward 1.0.
    Open vowels (AA, AE, AO, AW) raise PT slightly.
    Soft consonants (nasals, liquids, fricatives) pull PT toward 0.0.

    Args:
        phonemes_flat: List of Arpabet phoneme symbols (stress digits stripped).

    Returns:
        Float in [0.0, 1.0].  Returns 0.5 on empty input.
    """
    if not phonemes_flat:
        return 0.5

    _HARD: frozenset = frozenset(["B", "D", "G", "K", "P", "T", "CH", "JH"])
    _SOFT: frozenset = frozenset(["M", "N", "NG", "L", "R", "W", "Y",
                                   "F", "TH", "V", "DH", "S", "Z",
                                   "SH", "ZH", "HH"])
    _OPEN_VOWELS: frozenset = frozenset(["AA", "AE", "AO", "AW"])

    hard = sum(1 for p in phonemes_flat if p in _HARD)
    soft = sum(1 for p in phonemes_flat if p in _SOFT)
    open_v = sum(1 for p in phonemes_flat if p in _OPEN_VOWELS)
    total = len(phonemes_flat)

    if total == 0:
        return 0.5

    # blend hard ratio with small open-vowel bonus
    hard_ratio = hard / total
    soft_ratio = soft / total
    open_bonus = min(0.1, open_v / total)

    pt = hard_ratio - (soft_ratio * 0.5) + open_bonus
    return round(max(0.0, min(1.0, pt + 0.5)), 4)


def compute_prosodic_pressure(
    syllable_count: int,
    available_slots: int,
    inversion_rate: float,
) -> float:
    """
    Compute PP (Prosodic Pressure) from density and stress inversion data.

    PP = 0.6 × density_ratio + 0.4 × inversion_rate

    A line crammed with syllables and heavy stress inversions scores near 1.0.
    A sparse, rhythmically locked line scores near 0.0.

    Args:
        syllable_count: Actual syllable count for the line or section.
        available_slots: Available bar grid syllable slots (from syllable_compression).
        inversion_rate: Stress inversion rate in [0.0, 1.0] (from performed_stress).

    Returns:
        Float in [0.0, 1.0].
    """
    if available_slots <= 0:
        density_ratio = 0.5
    else:
        density_ratio = min(1.0, syllable_count / available_slots)

    inversion_rate = max(0.0, min(1.0, inversion_rate))
    pp = 0.6 * density_ratio + 0.4 * inversion_rate
    return round(pp, 4)


def compute_temporal_position(
    section_index: int,
    total_sections: int,
) -> float:
    """
    Compute TP (Temporal Position) from the section's place in the composition.

    TP = section_index / (total_sections - 1), clamped to [0.0, 1.0].
    A song's first section scores 0.0 (opening); the last scores 1.0 (close).

    Args:
        section_index: 0-based index of the current section.
        total_sections: Total number of sections in the song.

    Returns:
        Float in [0.0, 1.0].  Returns 0.5 on invalid input.
    """
    if total_sections <= 1 or section_index < 0:
        return 0.5
    return round(min(1.0, section_index / (total_sections - 1)), 4)


# ---------------------------------------------------------------------------
# Core public API
# ---------------------------------------------------------------------------

def compute_signature(
    signature_components: Dict[str, float],
    weights: Optional[Dict[str, float]] = None,
) -> float:
    """
    Compute the weighted scalar emotional signature score E.

    E = Σ (component_score × weight)  for all 8 components.

    Args:
        signature_components: Dict mapping component names (PT, PP, SF, CM,
            IS, TP, SA, SD) to their scores in [0.0, 1.0].  Missing
            components default to 0.5.
        weights: Optional weight override dict.  Missing weights default
            to DEFAULT_WEIGHTS.

    Returns:
        Weighted scalar in [0.0, 1.0].
    """
    w = {**DEFAULT_WEIGHTS, **(weights or {})}
    components = ["PT", "PP", "SF", "CM", "IS", "TP", "SA", "SD"]
    total_weight = sum(w.get(c, DEFAULT_WEIGHTS[c]) for c in components)
    if total_weight == 0:
        return 0.5

    score = sum(
        signature_components.get(c, 0.5) * w.get(c, DEFAULT_WEIGHTS[c])
        for c in components
    )
    return round(max(0.0, min(1.0, score / total_weight)), 4)


def compute_aspiration_gap(
    signature_vector: Dict[str, float],
    aspiration_label: str,
    weights: Optional[Dict[str, float]] = None,
) -> AspirationGapResult:
    """
    Compute the aspiration gap between a writer's signature and their stated intent.

    Compares each component of the emotional signature against the expected
    range for the given aspiration label.  Components that fall outside
    the expected range are flagged as divergent.

    Gap magnitude is the mean absolute deviation of each component from
    the nearest edge of its expected range.

    Gap type classification:
        controlled  — gap_magnitude < 0.20
        leaked      — 0.20 <= gap_magnitude <= 0.45
        inverted    — gap_magnitude > 0.45

    Args:
        signature_vector: Dict of 8 component scores (PT, PP, SF, CM,
            IS, TP, SA, SD), each in [0.0, 1.0].  Missing components
            default to 0.5.
        aspiration_label: The writer's stated sonic aspiration.
            Must be a key in ASPIRATION_LABELS.  Unrecognized labels
            return a neutral result (alignment_score=0.5).
        weights: Optional weight override.  Passed through to
            compute_signature().

    Returns:
        AspirationGapResult with all fields populated.

    Examples:
        >>> v = {"PT": 0.8, "PP": 0.7, "SF": 0.6, "CM": 0.5,
        ...      "IS": 0.5, "TP": 0.5, "SA": 0.7, "SD": 0.2}
        >>> r = compute_aspiration_gap(v, "aggressive")
        >>> r.gap_type
        'controlled'
    """
    _neutral = AspirationGapResult(
        alignment_score=0.5,
        divergent_dimensions=[],
        gap_type="controlled",
        research_flag=False,
        signature_vector=signature_vector,
        aspiration_label=aspiration_label,
        gap_magnitude=0.0,
        component_gaps={},
    )

    try:
        label = aspiration_label.lower().strip()
        profile = _ASPIRATION_PROFILES.get(label)

        if profile is None:
            return _neutral

        components = ["PT", "PP", "SF", "CM", "IS", "TP", "SA", "SD"]
        component_gaps: Dict[str, float] = {}
        divergent: List[str] = []

        for comp in components:
            score = max(0.0, min(1.0, signature_vector.get(comp, 0.5)))
            expected = profile.get(comp, (0.0, 1.0))
            lo, hi = expected

            if score < lo:
                gap = lo - score
            elif score > hi:
                gap = score - hi
            else:
                gap = 0.0

            component_gaps[comp] = round(gap, 4)
            if gap > DIVERGENCE_THRESHOLD:
                divergent.append(comp)

        gap_magnitude = round(sum(component_gaps.values()) / len(components), 4)
        alignment_score = round(max(0.0, 1.0 - gap_magnitude), 4)

        if gap_magnitude < 0.20:
            gap_type = "controlled"
        elif gap_magnitude <= 0.45:
            gap_type = "leaked"
        else:
            gap_type = "inverted"

        research_flag = gap_magnitude > RESEARCH_FLAG_THRESHOLD

        return AspirationGapResult(
            alignment_score=alignment_score,
            divergent_dimensions=divergent,
            gap_type=gap_type,
            research_flag=research_flag,
            signature_vector=signature_vector,
            aspiration_label=label,
            gap_magnitude=gap_magnitude,
            component_gaps=component_gaps,
        )

    except Exception:
        return _neutral


def describe_gap(result: AspirationGapResult) -> str:
    """
    Return a human-readable one-sentence description of an aspiration gap result.

    Used by VEIL when presenting the discovery to the writer.

    Args:
        result: An AspirationGapResult as returned by compute_aspiration_gap().

    Returns:
        Single sentence string.  Never raises.
    """
    try:
        if result.gap_type == "controlled":
            return (
                f"Your language aligns closely with your {result.aspiration_label} "
                f"intention — the writing sounds like what you meant."
            )
        elif result.gap_type == "leaked":
            dims = ", ".join(result.divergent_dimensions) if result.divergent_dimensions else "several dimensions"
            return (
                f"There is a gap between your {result.aspiration_label} intention "
                f"and what your language encodes in {dims} — emotion leaking through "
                f"the frame."
            )
        else:  # inverted
            dims = ", ".join(result.divergent_dimensions) if result.divergent_dimensions else "multiple dimensions"
            return (
                f"Your language encodes something significantly different from your "
                f"{result.aspiration_label} intention across {dims} — "
                f"this is the 3005 / Hey Ya dimension."
            )
    except Exception:
        return "Aspiration gap analysis unavailable."


def batch_compute_gaps(
    sections: List[Dict[str, Any]],
    weights: Optional[Dict[str, float]] = None,
) -> List[AspirationGapResult]:
    """
    Compute aspiration gaps for a list of section dicts.

    Each dict in *sections* must contain:
        - ``signature_vector`` (Dict[str, float])
        - ``aspiration_label`` (str)

    Args:
        sections: List of section dicts.
        weights: Optional weight override applied to all sections.

    Returns:
        List of AspirationGapResult objects, one per section.
        Sections with missing keys return a neutral result.
    """
    results: List[AspirationGapResult] = []
    for sec in sections:
        try:
            vec = sec.get("signature_vector", {})
            label = sec.get("aspiration_label", "")
            results.append(compute_aspiration_gap(vec, label, weights))
        except Exception:
            results.append(compute_aspiration_gap({}, "", weights))
    return results
