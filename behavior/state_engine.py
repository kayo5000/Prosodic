"""
behavior/state_engine.py

Reads a single snapshot's bar features and produces a state label describing
what the verse is doing, plus a state_path showing how the label evolves
across the verse.

Six labels only — do not add more.
Every prediction is logged via label_capture before being returned.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import statistics

_LABELS = ("Locked", "Tightening", "Pushing", "Slipping", "Flat", "Exposed")
_WINDOW = 4   # bars per state_path window


# ── math helpers ──────────────────────────────────────────────────────────────

def _slope(values):
    """Linear regression slope across index positions."""
    n = len(values)
    if n < 2:
        return 0.0
    xs = list(range(n))
    xm = sum(xs) / n
    ym = sum(values) / n
    num = sum((x - xm) * (y - ym) for x, y in zip(xs, values))
    den = sum((x - xm) ** 2 for x in xs)
    return num / den if den else 0.0


def _variance(values):
    if len(values) < 2:
        return 0.0
    return statistics.variance(values)


def _clamp(v, lo=0.0, hi=1.0):
    return max(lo, min(hi, v))


def _norm_slope(s, scale=0.10):
    """Normalise a slope value to [0, 1] centred at 0."""
    return _clamp((s + scale) / (2 * scale))


# ── feature extraction ────────────────────────────────────────────────────────

def _extract(bar_features):
    """Pull per-bar time series from the feature vector list."""
    def col(key, default=0.0):
        return [b.get(key, default) for b in bar_features]

    rhyme       = col("rhyme_density")
    pocket      = col("pocket_alignment")
    density     = col("density_score")
    breath      = col("breath_load")
    energy      = col("energy_estimate")
    emotional   = col("emotional_directness")
    motif_count = [len(b.get("motif_hits") or []) for b in bar_features]
    stress_vars = []
    for b in bar_features:
        sp = b.get("stress_pattern", "")
        if sp:
            bits = [int(c) for c in sp if c in "01"]
            stress_vars.append(_variance(bits) if len(bits) > 1 else 0.0)
        else:
            stress_vars.append(0.0)

    return {
        "rhyme":       rhyme,
        "pocket":      pocket,
        "density":     density,
        "breath":      breath,
        "energy":      energy,
        "emotional":   emotional,
        "motif_count": motif_count,
        "stress_var":  stress_vars,
    }


# ── per-label scoring ─────────────────────────────────────────────────────────

def _score_label(label, series):
    """Return a 0-1 match score for how well series matches label's signature."""

    s_rhyme      = _slope(series["rhyme"])
    s_pocket     = _slope(series["pocket"])
    s_density    = _slope(series["density"])
    s_breath     = _slope(series["breath"])
    s_stress_var = _slope(series["stress_var"])

    v_rhyme  = _variance(series["rhyme"])
    v_pocket = _variance(series["pocket"])

    m_energy   = statistics.mean(series["energy"])   if series["energy"]   else 0.0
    m_rhyme    = statistics.mean(series["rhyme"])     if series["rhyme"]    else 0.0
    m_density  = statistics.mean(series["density"])  if series["density"]  else 0.0
    m_pocket   = statistics.mean(series["pocket"])   if series["pocket"]   else 0.5
    m_emotional= statistics.mean(series["emotional"])if series["emotional"] else 0.0
    m_motif    = statistics.mean(series["motif_count"]) if series["motif_count"] else 0.0

    scale = 0.10   # slope normalisation window

    if label == "Locked":
        # Low variance, slopes near zero, AND features must be at a meaningful
        # level — a flat/dead verse is Flat, not Locked.
        low_var    = _clamp(1.0 - v_rhyme  / 0.05)
        low_var_p  = _clamp(1.0 - v_pocket / 0.05)
        flat_rhyme = _clamp(1.0 - abs(s_rhyme)  / scale)
        flat_pock  = _clamp(1.0 - abs(s_pocket) / scale)
        # energy must be above ~0.35 to qualify as Locked (not just lifeless)
        base_level = _clamp((m_energy - 0.25) / 0.40)
        return (low_var * 0.25 + low_var_p * 0.25 +
                flat_rhyme * 0.15 + flat_pock * 0.15 +
                base_level * 0.20)

    if label == "Tightening":
        # Rising rhyme density AND rising pocket alignment, stable variance
        rising_rhyme  = _norm_slope(s_rhyme,  scale)
        rising_pocket = _norm_slope(s_pocket, scale)
        stable_var    = _clamp(1.0 - max(0.0, s_stress_var) / scale)
        return (rising_rhyme  * 0.35 +
                rising_pocket * 0.35 +
                stable_var    * 0.30)

    if label == "Pushing":
        # Rising density AND rising breath, pocket holding above 0.5
        rising_dens  = _norm_slope(s_density, scale)
        rising_breath= _norm_slope(s_breath,  scale)
        pocket_hold  = _clamp((m_pocket - 0.5) / 0.5 + 0.5)
        return (rising_dens  * 0.35 +
                rising_breath* 0.35 +
                pocket_hold  * 0.30)

    if label == "Slipping":
        # Falling pocket OR rising stress variance, while density rises
        falling_pocket = _clamp(1.0 - _norm_slope(s_pocket, scale))
        rising_stress  = _norm_slope(s_stress_var, scale)
        rising_dens    = _norm_slope(s_density, scale)
        return (falling_pocket * 0.35 +
                rising_stress  * 0.30 +
                rising_dens    * 0.35)

    if label == "Flat":
        # Low energy, low rhyme, low motif
        low_energy = _clamp(1.0 - m_energy)
        low_rhyme  = _clamp(1.0 - m_rhyme)
        low_motif  = _clamp(1.0 - m_motif / 3.0)
        return (low_energy * 0.40 +
                low_rhyme  * 0.35 +
                low_motif  * 0.25)

    if label == "Exposed":
        # Low density, low rhyme, high emotional directness
        low_density = _clamp(1.0 - m_density)
        low_rhyme   = _clamp(1.0 - m_rhyme)
        high_emot   = _clamp(m_emotional)
        return (low_density * 0.35 +
                low_rhyme   * 0.30 +
                high_emot   * 0.35)

    return 0.0


# ── evidence strings ──────────────────────────────────────────────────────────

def _build_evidence(label, series, bar_count):
    """Return 2-4 plain-language strings grounded in slopes/variances."""
    ev = []
    s_rhyme  = _slope(series["rhyme"])
    s_pocket = _slope(series["pocket"])
    s_density= _slope(series["density"])
    s_breath = _slope(series["breath"])
    v_rhyme  = _variance(series["rhyme"])
    v_pocket = _variance(series["pocket"])
    m_rhyme  = statistics.mean(series["rhyme"])  if series["rhyme"]  else 0.0
    m_energy = statistics.mean(series["energy"]) if series["energy"] else 0.0
    m_emot   = statistics.mean(series["emotional"]) if series["emotional"] else 0.0

    def fmt_slope(name, val):
        sign = "+" if val >= 0 else ""
        return f"{name} slope {sign}{val:.3f} across {bar_count} bars"

    if label == "Locked":
        ev.append(f"Rhyme density variance {v_rhyme:.4f} (near zero = stable)")
        ev.append(f"Pocket alignment variance {v_pocket:.4f}")
        ev.append(fmt_slope("Rhyme density", s_rhyme))
    elif label == "Tightening":
        ev.append(fmt_slope("Rhyme density", s_rhyme))
        ev.append(fmt_slope("Pocket alignment", s_pocket))
        if _variance(series["stress_var"]) < 0.01:
            ev.append("Stress variance is stable while density climbs")
    elif label == "Pushing":
        ev.append(fmt_slope("Syllabic density", s_density))
        ev.append(fmt_slope("Breath load", s_breath))
        ev.append(f"Pocket alignment holding at mean {statistics.mean(series['pocket']):.2f}")
    elif label == "Slipping":
        ev.append(fmt_slope("Pocket alignment", s_pocket))
        ev.append(fmt_slope("Syllabic density", s_density))
        ev.append(f"Stress pattern variance rising: slope {_slope(series['stress_var']):.3f}")
    elif label == "Flat":
        ev.append(f"Mean energy estimate {m_energy:.2f} (low activity)")
        ev.append(f"Mean rhyme density {m_rhyme:.2f}")
        ev.append(f"Motif activity near zero across {bar_count} bars")
    elif label == "Exposed":
        ev.append(f"Mean density {statistics.mean(series['density']):.2f} (sparse)")
        ev.append(f"Mean rhyme density {m_rhyme:.2f}")
        ev.append(f"Emotional directness mean {m_emot:.2f}")

    return ev[:4] if ev else [f"Label '{label}' selected from {bar_count}-bar feature window"]


# ── single-window classifier ──────────────────────────────────────────────────

def _classify_window(bar_features):
    """Return (label, confidence, evidence) for a window of bar features."""
    if not bar_features:
        return "Flat", 0.5, ["No bar features available"]

    series = _extract(bar_features)
    scores = {lbl: _score_label(lbl, series) for lbl in _LABELS}
    best_label = max(scores, key=scores.__getitem__)
    confidence = round(scores[best_label], 3)
    evidence   = _build_evidence(best_label, series, len(bar_features))
    return best_label, confidence, evidence


# ── public entry point ────────────────────────────────────────────────────────

def classify(snapshot):
    """Classify the behavioral state of a snapshot.

    Args:
        snapshot: dict with at minimum {"snapshot_id": str, "bar_features": [...]}

    Returns:
        state dict matching the spec, after logging via label_capture.
    """
    snap_id      = snapshot.get("snapshot_id", "unknown")
    bar_features = snapshot.get("bar_features") or []

    # Full-verse classification
    section_state, confidence, evidence = _classify_window(bar_features)

    # state_path: non-overlapping windows of _WINDOW bars
    state_path = []
    n = len(bar_features)
    i = 0
    while i < n:
        window = bar_features[i: i + _WINDOW]
        lbl, conf, _ = _classify_window(window)
        start_bar = bar_features[i]["bar_index"]
        end_bar   = bar_features[min(i + _WINDOW - 1, n - 1)]["bar_index"]
        bar_range = (f"{start_bar}" if start_bar == end_bar
                     else f"{start_bar}-{end_bar}")
        state_path.append({
            "bars":       bar_range,
            "state":      lbl,
            "confidence": conf,
        })
        i += _WINDOW

    # Build rule_path for label_capture
    series    = _extract(bar_features)
    rule_path = {lbl: round(_score_label(lbl, series), 4) for lbl in _LABELS}

    result = {
        "snapshot_id":   snap_id,
        "section_state": section_state,
        "confidence":    confidence,
        "state_path":    state_path,
        "evidence":      evidence,
    }

    # Mandatory: log every prediction before returning
    try:
        from behavior.label_capture import capture_prediction
        capture_prediction(
            snapshot_id=snap_id,
            bar_features=bar_features,
            predicted_state=section_state,
            confidence=confidence,
            rule_path=rule_path,
        )
    except Exception:
        pass  # label_capture failure must never crash the pipeline

    return result
