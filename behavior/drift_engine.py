"""
behavior/drift_engine.py

Compares two snapshots and reports directional change across aligned bars.
Preconditions: compatibility_checker passed, bar_aligner has been run.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import uuid
import statistics

_NUMERIC_FEATURES = (
    "rhyme_density", "pocket_alignment", "density_score", "breath_load",
    "energy_estimate", "emotional_directness", "assonance_score",
    "consonance_score", "syllable_count",
)

_OVERALL_DRIFT_CLASSES = (
    "technical_up_emotional_down",
    "emotional_up_technical_down",
    "density_up_clarity_down",
    "clarity_up_density_down",
    "strict_improvement",
    "strict_degradation",
    "lateral",
)

_TECHNICAL  = ("rhyme_density", "internal_rhyme_count", "pocket_alignment",
               "assonance_score", "consonance_score")
_EMOTIONAL  = ("emotional_directness", "semantic_shift")
_DENSITY    = ("syllable_count", "density_score", "breath_load")
_CLARITY    = ("emotional_directness", "pocket_alignment")

_LATERAL_THRESHOLD = 0.03


# ── helpers ───────────────────────────────────────────────────────────────────

def _bar_by_index(bar_features, bar_index):
    for b in bar_features:
        if b.get("bar_index") == bar_index:
            return b
    return None


def _mean_delta(deltas_list, keys):
    vals = []
    for deltas in deltas_list:
        for k in keys:
            if k in deltas:
                vals.append(deltas[k])
    return statistics.mean(vals) if vals else 0.0


def _classify_overall(mean_deltas_per_pair):
    """Classify the overall drift from mean deltas across matched pairs."""
    tech  = _mean_delta(mean_deltas_per_pair, _TECHNICAL)
    emot  = _mean_delta(mean_deltas_per_pair, _EMOTIONAL)
    dens  = _mean_delta(mean_deltas_per_pair, _DENSITY)
    clar  = _mean_delta(mean_deltas_per_pair, _CLARITY)

    sig = _LATERAL_THRESHOLD

    if tech > sig and emot < -sig:
        return "technical_up_emotional_down"
    if emot > sig and tech < -sig:
        return "emotional_up_technical_down"
    if dens > sig and clar < -sig:
        return "density_up_clarity_down"
    if clar > sig and dens < -sig:
        return "clarity_up_density_down"

    # All up → strict improvement; all down → strict degradation
    combined = [d for pair in mean_deltas_per_pair for d in pair.values()]
    if combined:
        pos = sum(1 for v in combined if v > sig)
        neg = sum(1 for v in combined if v < -sig)
        total = len(combined)
        if pos / total >= 0.70:
            return "strict_improvement"
        if neg / total >= 0.70:
            return "strict_degradation"

    return "lateral"


def _describe_insertion(bar_b):
    """Plain-language effect of an inserted bar."""
    effects = []
    if bar_b.get("breath_load", 0) > 0.7:
        effects.append("increases breath load")
    if bar_b.get("rhyme_density", 0) > 0.5:
        effects.append("adds rhyme density")
    if bar_b.get("motif_hits"):
        effects.append(f"introduces motif(s): {', '.join(bar_b['motif_hits'][:2])}")
    if bar_b.get("emotional_directness", 0) > 0.6:
        effects.append("raises emotional directness")
    return "Bar inserted: " + ("; ".join(effects) if effects else "no notable feature changes")


def _describe_deletion(bar_a):
    """Plain-language effect of a deleted bar."""
    effects = []
    if bar_a.get("rhyme_density", 0) > 0.5:
        effects.append("removes a high-rhyme-density bar")
    if bar_a.get("motif_hits"):
        effects.append(f"removes motif(s): {', '.join(bar_a['motif_hits'][:2])}")
    if bar_a.get("emotional_directness", 0) > 0.6:
        effects.append("removes emotionally direct material")
    return "Bar deleted: " + ("; ".join(effects) if effects else "no notable feature changes")


def _summary_evidence(per_bar_changes, overall):
    """3-5 plain-language strings naming the largest mean deltas."""
    all_deltas = {}
    for change in per_bar_changes:
        for feat, delta in (change.get("changes") or {}).items():
            all_deltas.setdefault(feat, []).append(delta)

    mean_by_feat = {
        feat: statistics.mean(vals)
        for feat, vals in all_deltas.items()
        if vals
    }
    sorted_feats = sorted(mean_by_feat, key=lambda k: abs(mean_by_feat[k]),
                          reverse=True)

    ev = []
    for feat in sorted_feats[:4]:
        delta = mean_by_feat[feat]
        sign  = "up" if delta >= 0 else "down"
        ev.append(f"{feat.replace('_', ' ')} moved {sign} "
                  f"(mean delta {delta:+.3f}) across matched bars")

    if not ev:
        ev.append(f"Overall drift classified as '{overall}'")
    ev.insert(0, f"Overall drift: {overall.replace('_', ' ')}")
    return ev[:5]


# ── public entry point ────────────────────────────────────────────────────────

def compute(snapshot_a, snapshot_b, alignment, compatibility):
    """Compute drift between two snapshots.

    Args:
        snapshot_a:    first snapshot dict with bar_features
        snapshot_b:    second snapshot dict with bar_features
        alignment:     output from bar_aligner.align()
        compatibility: output from compatibility_checker.check()

    Returns:
        drift dict matching the spec, or {"error": "requires_resegmentation"}
    """
    compat_level = compatibility.get("compatibility", "incompatible")
    action       = compatibility.get("recommended_action", "requires_resegmentation")

    if action == "requires_resegmentation":
        return {
            "error":         "requires_resegmentation",
            "compatibility": compat_level,
            "snapshot_a":    snapshot_a.get("snapshot_id"),
            "snapshot_b":    snapshot_b.get("snapshot_id"),
        }

    feats_a = {b["bar_index"]: b for b in (snapshot_a.get("bar_features") or [])}
    feats_b = {b["bar_index"]: b for b in (snapshot_b.get("bar_features") or [])}

    per_bar_changes = []
    insertions      = []
    deletions       = []
    matched_deltas  = []   # list of {feature: delta} for overall classification

    for pair in alignment.get("pairs", []):
        status    = pair["status"]
        ai        = pair.get("a_bar_index")
        bi        = pair.get("b_bar_index")

        if status == "inserted":
            bar_b = feats_b.get(bi, {})
            insertions.append({
                "b_bar_index": bi,
                "effect":      _describe_insertion(bar_b),
            })
            per_bar_changes.append({
                "a_bar_index": None,
                "b_bar_index": bi,
                "status":      "inserted",
                "changes":     {},
            })
            continue

        if status == "deleted":
            bar_a = feats_a.get(ai, {})
            deletions.append({
                "a_bar_index": ai,
                "effect":      _describe_deletion(bar_a),
            })
            per_bar_changes.append({
                "a_bar_index": ai,
                "b_bar_index": None,
                "status":      "deleted",
                "changes":     {},
            })
            continue

        # matched / shifted_match / rewritten
        bar_a = feats_a.get(ai, {})
        bar_b = feats_b.get(bi, {})

        changes = {}
        for feat in _NUMERIC_FEATURES:
            va = bar_a.get(feat)
            vb = bar_b.get(feat)
            if va is not None and vb is not None:
                changes[feat] = round(float(vb) - float(va), 4)
        # motif_hits count delta
        changes["motif_hits_count"] = (
            len(bar_b.get("motif_hits") or []) -
            len(bar_a.get("motif_hits") or [])
        )

        per_bar_changes.append({
            "a_bar_index": ai,
            "b_bar_index": bi,
            "status":      status,
            "changes":     changes,
        })
        matched_deltas.append(changes)

    overall_drift = _classify_overall(matched_deltas)

    return {
        "drift_id":        str(uuid.uuid4()),
        "snapshot_a":      snapshot_a.get("snapshot_id"),
        "snapshot_b":      snapshot_b.get("snapshot_id"),
        "alignment_id":    alignment.get("alignment_id"),
        "compatibility":   compat_level,
        "overall_drift":   overall_drift,
        "summary_evidence": _summary_evidence(per_bar_changes, overall_drift),
        "per_bar_changes": per_bar_changes,
        "insertions":      insertions,
        "deletions":       deletions,
    }
