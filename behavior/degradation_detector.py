"""
behavior/degradation_detector.py

Reads drift output and explicitly classifies the tradeoff between drafts.
Protects artists from over-polishing by surfacing what revision costs.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import statistics

_TECHNICAL = ("rhyme_density", "internal_rhyme_count", "pocket_alignment",
              "assonance_score", "consonance_score")
_EMOTIONAL = ("emotional_directness", "semantic_shift", "motif_hits_count")
_DENSITY   = ("syllable_count", "density_score", "breath_load")
_CLARITY   = ("emotional_directness", "motif_hits_count", "pocket_alignment")

_SIG = 0.03   # minimum mean delta to count as significant movement


def _bucket_mean(per_bar_changes, keys):
    """Mean delta across all matched bars for the given feature bucket."""
    vals = []
    for change in per_bar_changes:
        deltas = change.get("changes") or {}
        for k in keys:
            if k in deltas:
                vals.append(float(deltas[k]))
    return statistics.mean(vals) if vals else 0.0


def _top_movers(per_bar_changes, direction="up"):
    """Features with the largest mean deltas in the given direction."""
    totals: dict = {}
    for change in per_bar_changes:
        for feat, val in (change.get("changes") or {}).items():
            totals.setdefault(feat, []).append(float(val))

    means = {f: statistics.mean(v) for f, v in totals.items() if v}

    if direction == "up":
        return [f for f, m in sorted(means.items(), key=lambda x: x[1], reverse=True)
                if m > _SIG]
    else:
        return [f for f, m in sorted(means.items(), key=lambda x: x[1])
                if m < -_SIG]


def _degradation_location(per_bar_changes):
    """Identify the bar range with the highest concentration of degradation."""
    negatives = []
    for change in per_bar_changes:
        deltas = change.get("changes") or {}
        neg_sum = sum(v for v in deltas.values() if isinstance(v, (int, float)) and v < 0)
        if neg_sum < 0:
            a = change.get("a_bar_index")
            b = change.get("b_bar_index")
            negatives.append((neg_sum, a, b))

    if not negatives:
        return "no significant degradation detected"

    negatives.sort(key=lambda x: x[0])  # most negative first
    worst = negatives[0]
    a, b = worst[1], worst[2]
    if a and b:
        return f"aligned bars {a} (draft A) → {b} (draft B)"
    if a:
        return f"bar {a} in draft A"
    if b:
        return f"bar {b} in draft B"
    return "concentrated degradation, exact bar range unclear"


def detect(drift_output):
    """Classify the tradeoff between drafts from drift output.

    Args:
        drift_output: dict returned by drift_engine.compute()

    Returns:
        degradation dict matching the spec.
    """
    per_bar = drift_output.get("per_bar_changes") or []

    tech  = _bucket_mean(per_bar, _TECHNICAL)
    emot  = _bucket_mean(per_bar, _EMOTIONAL)
    dens  = _bucket_mean(per_bar, _DENSITY)
    clar  = _bucket_mean(per_bar, _CLARITY)

    improvements  = _top_movers(per_bar, "up")
    degradations  = _top_movers(per_bar, "down")
    location      = _degradation_location(per_bar)

    # Classify tradeoff
    if tech > _SIG and emot < -_SIG:
        tradeoff = "technical_gain_emotional_loss"
        summary  = (
            "Technical precision improved while emotional directness dropped — "
            "the revision may be cleaner but less urgent."
        )
    elif emot > _SIG and tech < -_SIG:
        tradeoff = "emotional_gain_technical_loss"
        summary  = (
            "Emotional directness increased while technical precision dropped — "
            "the revision hits harder but rhyme structure is looser."
        )
    elif dens > _SIG and clar < -_SIG:
        tradeoff = "density_gain_clarity_loss"
        summary  = (
            "Syllabic density increased while clarity indicators fell — "
            "the revision is denser but may be harder to follow."
        )
    elif clar > _SIG and dens < -_SIG:
        tradeoff = "clarity_gain_density_loss"
        summary  = (
            "Clarity improved while syllabic density dropped — "
            "the revision is more direct but lighter."
        )
    elif not improvements and not degradations:
        # No features moved significantly in either direction
        tradeoff = "lateral"
        summary  = (
            "No features moved significantly in this revision — "
            "the verse is essentially unchanged."
        )
    elif not degradations:
        tradeoff = "strict_improvement"
        summary  = "All measured features improved or held steady in this revision."
    elif not improvements:
        tradeoff = "strict_degradation"
        summary  = "All measured features declined in this revision."
    else:
        tradeoff = "lateral"
        summary  = (
            "Changes are mixed with no clear directional pattern — "
            "the revision shifted the verse sideways rather than up or down."
        )

    return {
        "tradeoff_class": tradeoff,
        "improvements":   improvements[:6],
        "degradations":   degradations[:6],
        "location":       location,
        "summary":        summary,
    }
