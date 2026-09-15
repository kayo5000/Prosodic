"""
mastery_engine.py

Computes per-artist mastery scores across all lyric craft dimensions
tracked by the Prosodic engine suite.

Trigger rules (all must pass before mastery data is surfaced):
  - >= 3 distinct songs with song_analyses entries
  - >= 40 rhyme_events total
  - >= 20 cadence_events total
  - >= 15 total bars analyzed

Progress tracking splits analyses chronologically:
  early window  = first 40% of song_analyses by created_at
  recent window = last 40% of song_analyses by created_at
  delta = recent_score - early_score

Returns a dict safe to jsonify. All DB errors are silent.
"""

import sqlite3
import json
import os
import statistics
from collections import Counter

from device_detection_engine import compute_device_usage

# Same physical DB as feature_store.py/device_detection_engine.py/telemetry.py/
# usage_history.py — PROSODIC_FEATURES_DB_PATH must stay identical across
# all five or they silently split onto different files.
DB_PATH = os.environ.get('PROSODIC_FEATURES_DB_PATH') or os.path.join(os.path.dirname(__file__), "prosodic_features.db")

# ── Trigger thresholds ────────────────────────────────────────────────────────
TRIGGER_MIN_SONGS          = 3
TRIGGER_MIN_RHYME_EVENTS   = 40
TRIGGER_MIN_CADENCE_EVENTS = 20
TRIGGER_MIN_BARS           = 15

# ── Level labels ──────────────────────────────────────────────────────────────
def _level(score):
    if score >= 82: return "Exemplary"
    if score >= 65: return "Competent"
    if score >= 40: return "Approaching"
    return "Developing"

def _level_color(score):
    if score >= 82: return "#4ADE80"
    if score >= 65: return "#F5C518"
    if score >= 40: return "#F97316"
    return "#9B9B9B"

def _clamp(v, lo=0, hi=100):
    return max(lo, min(hi, v))


# ── DB helpers ────────────────────────────────────────────────────────────────

def _conn():
    c = sqlite3.connect(DB_PATH, check_same_thread=False)
    c.row_factory = sqlite3.Row
    return c


def _fetch(conn, sql, params=()):
    try:
        return conn.execute(sql, params).fetchall()
    except Exception:
        return []


def _fetchone(conn, sql, params=()):
    try:
        return conn.execute(sql, params).fetchone()
    except Exception:
        return None


# ── Snapshot counts ───────────────────────────────────────────────────────────

def _snapshot(conn):
    songs = _fetchone(conn, "SELECT COUNT(*) AS n FROM song_analyses")
    rhymes = _fetchone(conn, "SELECT COUNT(*) AS n FROM rhyme_events")
    cadences = _fetchone(conn, "SELECT COUNT(*) AS n FROM cadence_events")
    bars_row = _fetchone(conn, "SELECT SUM(total_bars) AS n FROM song_analyses")
    return {
        "songs_analyzed":        (songs["n"]    if songs    else 0),
        "total_rhyme_events":    (rhymes["n"]   if rhymes   else 0),
        "total_cadence_events":  (cadences["n"] if cadences else 0),
        "total_bars":            int(bars_row["n"] or 0) if bars_row else 0,
    }


def _check_trigger(snap):
    return (
        snap["songs_analyzed"]       >= TRIGGER_MIN_SONGS          and
        snap["total_rhyme_events"]   >= TRIGGER_MIN_RHYME_EVENTS   and
        snap["total_cadence_events"] >= TRIGGER_MIN_CADENCE_EVENTS and
        snap["total_bars"]           >= TRIGGER_MIN_BARS
    )


# ── Chronological song split for trend ───────────────────────────────────────

def _song_id_windows(conn):
    """Return (early_ids, recent_ids) — each ~40% of all songs by created_at."""
    rows = _fetch(conn, "SELECT song_id FROM song_analyses ORDER BY created_at ASC")
    ids = [r["song_id"] for r in rows]
    n = len(ids)
    if n < 2:
        return ids, ids
    cut = max(1, int(n * 0.4))
    return ids[:cut], ids[max(cut, n - cut):]


# ── Category scorers ──────────────────────────────────────────────────────────

def _score_flow(conn, song_ids=None):
    """
    Flow & Cadence — syllabic density control, cadence class distribution.
    Ideal syllables_per_beat range: 2.5–4.5 (sweet spot for hip-hop pocketing).
    """
    where = ""
    params = []
    if song_ids:
        placeholders = ",".join("?" * len(song_ids))
        where = f"WHERE song_id IN ({placeholders})"
        params = song_ids

    rows = _fetch(conn, f"""
        SELECT syllables_per_beat, cadence_class, inversion_rate, compression_flag
        FROM cadence_events {where}
    """, params)

    if not rows:
        return None

    spb_vals = [r["syllables_per_beat"] for r in rows]
    avg_spb = statistics.mean(spb_vals)

    # Density control: how consistently they hit the 2.5–4.5 window
    in_window = sum(1 for v in spb_vals if 2.5 <= v <= 4.5)
    density_control = (in_window / len(spb_vals)) * 100

    # Cadence variety: using more than one cadence class = more developed
    classes = [r["cadence_class"] for r in rows if r["cadence_class"]]
    class_counter = Counter(classes)
    unique_classes = len(class_counter)
    variety_bonus = min(20, (unique_classes - 1) * 5)

    # Inversion control: ideal 0.10–0.35 (some syncopation, not chaos)
    inv_rates = [r["inversion_rate"] for r in rows]
    avg_inv = statistics.mean(inv_rates)
    if 0.10 <= avg_inv <= 0.35:
        inv_score = 100
    elif avg_inv < 0.10:
        inv_score = int((avg_inv / 0.10) * 80)
    else:
        inv_score = max(0, int(100 - (avg_inv - 0.35) * 200))

    score = _clamp(int(density_control * 0.55 + inv_score * 0.3 + variety_bonus * 0.15))
    most_used = class_counter.most_common(1)[0][0] if class_counter else "—"

    return {
        "score": score,
        "most_used_cadence": most_used,
        "avg_syllables_per_beat": round(avg_spb, 2),
        "avg_inversion_rate": round(avg_inv, 3),
        "cadence_variety": unique_classes,
        "density_control_pct": round(density_control, 1),
    }


def _score_rhyme_architecture(conn, song_ids=None):
    """
    Rhyme Architecture — precision (similarity score), type distribution, density.
    """
    where = ""
    params = []
    if song_ids:
        placeholders = ",".join("?" * len(song_ids))
        where = f"WHERE song_id IN ({placeholders})"
        params = song_ids

    rows = _fetch(conn, f"""
        SELECT similarity_score, rhyme_type, aave_bridge, song_id
        FROM rhyme_events {where}
    """, params)

    if not rows:
        return None

    sim_vals = [r["similarity_score"] for r in rows]
    avg_sim = statistics.mean(sim_vals)
    type_counter = Counter(r["rhyme_type"] for r in rows if r["rhyme_type"])
    aave_count = sum(1 for r in rows if r["aave_bridge"])
    aave_pct = (aave_count / len(rows)) * 100

    # Quality bonus: higher avg similarity = more precise rhyming
    quality_score = avg_sim * 80

    # Diversity: using nucleus/vowel-tier alongside exact = more skilled
    has_exact = "exact" in type_counter
    has_nucleus = "nucleus" in type_counter
    diversity_bonus = 10 if (has_exact and has_nucleus) else 0
    diversity_bonus += 10 if len(type_counter) >= 3 else 0

    score = _clamp(int(quality_score + diversity_bonus))
    most_used = type_counter.most_common(1)[0][0] if type_counter else "—"

    return {
        "score": score,
        "most_used_rhyme_type": most_used,
        "avg_similarity_score": round(avg_sim, 3),
        "rhyme_type_breakdown": dict(type_counter.most_common()),
        "aave_bridge_pct": round(aave_pct, 1),
        "total_rhyme_pairs": len(rows),
    }


def _score_internal_rhyme(conn, song_ids=None):
    """
    Internal Rhyme Density — avg density_gradient values from song_sections.
    density_gradient is a JSON list of per-bar density floats (0.0–1.0).
    """
    where = ""
    params = []
    if song_ids:
        placeholders = ",".join("?" * len(song_ids))
        where = f"WHERE song_id IN ({placeholders})"
        params = song_ids

    rows = _fetch(conn, f"""
        SELECT density_gradient, average_syllables_per_bar
        FROM song_sections {where}
    """, params)

    all_densities = []
    for r in rows:
        try:
            vals = json.loads(r["density_gradient"] or "[]")
            all_densities.extend([v for v in vals if isinstance(v, (int, float))])
        except Exception:
            pass

    if not all_densities:
        return None

    avg_density = statistics.mean(all_densities)
    peak = max(all_densities)
    consistency = 100 - (statistics.stdev(all_densities) * 100 if len(all_densities) > 1 else 0)

    score = _clamp(int(avg_density * 70 + (consistency * 0.3)))

    return {
        "score": score,
        "avg_density_pct": round(avg_density * 100, 1),
        "peak_density_pct": round(peak * 100, 1),
        "density_consistency": round(_clamp(consistency), 1),
        "bars_measured": len(all_densities),
    }


def _score_multisyllabic(conn, song_ids=None):
    """
    Multisyllabic Flow — compression usage and syllabic density over 3.5 spb.
    """
    where = ""
    params = []
    if song_ids:
        placeholders = ",".join("?" * len(song_ids))
        where = f"WHERE song_id IN ({placeholders})"
        params = song_ids

    rows = _fetch(conn, f"""
        SELECT syllables_per_beat, compression_flag
        FROM cadence_events {where}
    """, params)

    if not rows:
        return None

    compression_rate = sum(1 for r in rows if r["compression_flag"]) / len(rows)
    high_density_rate = sum(1 for r in rows if r["syllables_per_beat"] > 3.5) / len(rows)
    avg_spb = statistics.mean(r["syllables_per_beat"] for r in rows)

    # Higher compression + high density = more multisyllabic skill
    score = _clamp(int(compression_rate * 60 + high_density_rate * 40))

    return {
        "score": score,
        "compression_rate_pct": round(compression_rate * 100, 1),
        "high_density_lines_pct": round(high_density_rate * 100, 1),
        "avg_syllables_per_beat": round(avg_spb, 2),
    }


def _score_motif_work(conn, song_ids=None):
    """
    Motif & Semantic Architecture — cluster strength, semantic field diversity.
    """
    where = ""
    params = []
    if song_ids:
        placeholders = ",".join("?" * len(song_ids))
        where = f"WHERE song_id IN ({placeholders})"
        params = song_ids

    rows = _fetch(conn, f"""
        SELECT cluster_strength, semantic_field, anchor_word
        FROM motif_events {where}
    """, params)

    if not rows:
        return {"score": 0, "motifs_found": 0, "unique_fields": 0, "avg_cluster_strength": 0.0}

    strengths = [r["cluster_strength"] for r in rows if r["cluster_strength"] is not None]
    fields = set(r["semantic_field"] for r in rows if r["semantic_field"])
    avg_strength = statistics.mean(strengths) if strengths else 0.0

    field_diversity_bonus = min(25, len(fields) * 3)
    strength_score = avg_strength * 75

    score = _clamp(int(strength_score + field_diversity_bonus))
    most_used_field = Counter(r["semantic_field"] for r in rows if r["semantic_field"]).most_common(1)

    return {
        "score": score,
        "motifs_found": len(rows),
        "unique_fields": len(fields),
        "avg_cluster_strength": round(avg_strength, 3),
        "most_used_field": most_used_field[0][0] if most_used_field else "—",
    }


def _score_stress_architecture(conn, song_ids=None):
    """
    Stress Architecture — stress pattern diversity and controlled inversion use.
    Optimal inversion rate: 0.15–0.30. Too low = rigid, too high = chaotic.
    """
    where = ""
    params = []
    if song_ids:
        placeholders = ",".join("?" * len(song_ids))
        where = f"WHERE song_id IN ({placeholders})"
        params = song_ids

    rows = _fetch(conn, f"""
        SELECT stress_pattern, inversion_count, inversion_rate
        FROM cadence_events {where}
    """, params)

    if not rows:
        return None

    inv_rates = [r["inversion_rate"] for r in rows]
    avg_inv = statistics.mean(inv_rates)

    # Ideal range = 0.15–0.30 → score 100, degrades outward
    if 0.15 <= avg_inv <= 0.30:
        control_score = 100
    elif avg_inv < 0.15:
        control_score = int((avg_inv / 0.15) * 75)
    else:
        control_score = max(0, int(100 - (avg_inv - 0.30) * 250))

    # Stress pattern diversity
    patterns = [r["stress_pattern"] for r in rows if r["stress_pattern"]]
    unique_patterns = len(set(patterns))
    diversity_score = min(100, unique_patterns * 4)

    score = _clamp(int(control_score * 0.65 + diversity_score * 0.35))

    avg_inversions = statistics.mean(r["inversion_count"] for r in rows)

    return {
        "score": score,
        "avg_inversion_rate": round(avg_inv, 3),
        "avg_inversions_per_line": round(avg_inversions, 2),
        "stress_pattern_variety": unique_patterns,
        "control_score": round(control_score, 1),
    }


def _score_rhyme_diversity(conn, song_ids=None):
    """
    Phoneme Family Range — how many distinct rhyme families the artist uses.
    Measures breadth: pulling rhymes from diverse phoneme families.
    """
    where = ""
    params = []
    if song_ids:
        placeholders = ",".join("?" * len(song_ids))
        where = f"WHERE song_id IN ({placeholders})"
        params = song_ids

    rows = _fetch(conn, f"""
        SELECT word_a, word_b, phonemes_a, rhyme_type
        FROM rhyme_events {where}
    """, params)

    if not rows:
        return None

    # Unique words used in rhyme pairs = vocabulary breadth
    unique_words = set()
    for r in rows:
        unique_words.add(r["word_a"].lower())
        unique_words.add(r["word_b"].lower())

    # Distinct phoneme tail endings (last 2 phonemes of phonemes_a)
    tails = set()
    for r in rows:
        try:
            ph = json.loads(r["phonemes_a"] or "[]")
            if len(ph) >= 2:
                tails.add(tuple(ph[-2:]))
        except Exception:
            pass

    vocab_score = min(70, len(unique_words) * 1.2)
    phoneme_score = min(30, len(tails) * 0.8)
    score = _clamp(int(vocab_score + phoneme_score))

    return {
        "score": score,
        "unique_rhyme_words": len(unique_words),
        "distinct_phoneme_tails": len(tails),
    }


def _score_output_volume(conn):
    """
    Output Volume — total work analyzed. Not a skill per se, but shows commitment.
    Reaches Competent at 10 songs / 100 bars, Exemplary at 25 songs / 300 bars.
    """
    snap = _snapshot(conn)
    songs_score = min(100, (snap["songs_analyzed"] / 25) * 100)
    bars_score = min(100, (snap["total_bars"] / 300) * 100)
    score = _clamp(int(songs_score * 0.5 + bars_score * 0.5))
    return {
        "score": score,
        "songs_analyzed": snap["songs_analyzed"],
        "total_bars": snap["total_bars"],
        "total_rhyme_events": snap["total_rhyme_events"],
    }


# ── Example lyric lines per category ─────────────────────────────────────────

def _get_example_lines(conn, category_id):
    """
    Pull 1–2 representative lyric lines from the DB for the given category.
    Returns a list of text strings (may be empty if DB is sparse).
    """
    queries = {
        "flow": """
            SELECT DISTINCT ll.text
            FROM lyric_lines ll
            JOIN cadence_events ce ON ll.song_id = ce.song_id AND ll.bar_index = ce.line_index
            WHERE ll.text != '' AND length(ll.text) > 20
            ORDER BY ce.syllables_per_beat DESC
            LIMIT 2
        """,
        "rhyme_architecture": """
            SELECT DISTINCT ll.text
            FROM lyric_lines ll
            JOIN rhyme_events re ON ll.song_id = re.song_id AND ll.bar_index = re.line_index_a
            WHERE ll.text != '' AND length(ll.text) > 20
            ORDER BY re.similarity_score DESC
            LIMIT 2
        """,
        "internal_rhyme": """
            SELECT ll.text
            FROM lyric_lines ll
            WHERE ll.text != '' AND length(ll.text) > 20
            ORDER BY ll.total_syllables DESC
            LIMIT 2
        """,
        "multisyllabic": """
            SELECT DISTINCT ll.text
            FROM lyric_lines ll
            JOIN cadence_events ce ON ll.song_id = ce.song_id AND ll.bar_index = ce.line_index
            WHERE ll.text != '' AND length(ll.text) > 20 AND ce.compression_flag = 1
            LIMIT 2
        """,
        "motif": """
            SELECT DISTINCT ll.text
            FROM lyric_lines ll
            JOIN motif_events me ON ll.song_id = me.song_id
            WHERE ll.text != '' AND length(ll.text) > 20
            ORDER BY me.cluster_strength DESC
            LIMIT 2
        """,
        "stress": """
            SELECT DISTINCT ll.text
            FROM lyric_lines ll
            JOIN cadence_events ce ON ll.song_id = ce.song_id AND ll.bar_index = ce.line_index
            WHERE ll.text != '' AND length(ll.text) > 20
              AND ce.inversion_rate BETWEEN 0.10 AND 0.40
            LIMIT 2
        """,
        "rhyme_diversity": """
            SELECT DISTINCT ll.text
            FROM lyric_lines ll
            JOIN rhyme_events re ON ll.song_id = re.song_id AND ll.bar_index = re.line_index_a
            WHERE ll.text != '' AND length(ll.text) > 20
            ORDER BY re.similarity_score ASC
            LIMIT 2
        """,
    }
    sql = queries.get(category_id)
    if not sql:
        return []
    rows = _fetch(conn, sql)
    return [r["text"].strip() for r in rows if r["text"].strip()]


# ── Trend computation ─────────────────────────────────────────────────────────

def _trend(early_result, recent_result):
    if early_result is None or recent_result is None:
        return {"direction": "neutral", "delta": 0, "early_score": 0, "recent_score": 0}
    es = early_result["score"]
    rs = recent_result["score"]
    delta = rs - es
    direction = "up" if delta >= 5 else ("down" if delta <= -5 else "neutral")
    return {
        "direction": direction,
        "delta": delta,
        "early_score": es,
        "recent_score": rs,
    }


# ── Public entry point ────────────────────────────────────────────────────────

def compute_mastery():
    """
    Returns the full mastery report dict.
    If the trigger threshold is not met, returns {ready: False, ...}.
    """
    try:
        conn = _conn()
    except Exception:
        return {"ready": False, "reason": "Database unavailable"}

    snap = _snapshot(conn)

    if not _check_trigger(snap):
        missing = []
        if snap["songs_analyzed"] < TRIGGER_MIN_SONGS:
            remaining = TRIGGER_MIN_SONGS - snap["songs_analyzed"]
            missing.append(f"{remaining} more song{'s' if remaining != 1 else ''} analyzed")
        if snap["total_rhyme_events"] < TRIGGER_MIN_RHYME_EVENTS:
            missing.append(f"more rhyme data (need {TRIGGER_MIN_RHYME_EVENTS - snap['total_rhyme_events']} more pairs)")
        if snap["total_bars"] < TRIGGER_MIN_BARS:
            missing.append(f"{TRIGGER_MIN_BARS - snap['total_bars']} more bars analyzed")
        return {
            "ready": False,
            "reason": "Keep writing — mastery unlocks once you have enough material.",
            "missing": missing,
            "data_snapshot": snap,
        }

    early_ids, recent_ids = _song_id_windows(conn)

    # ── Score all categories ───────────────────────────────────────────────────
    scorers = [
        {
            "id": "flow",
            "name": "Flow & Cadence",
            "description": "Syllabic density control, pocket consistency, and cadence variety.",
            "fn": _score_flow,
        },
        {
            "id": "rhyme_architecture",
            "name": "Rhyme Architecture",
            "description": "Precision and range of your rhyme structures.",
            "fn": _score_rhyme_architecture,
        },
        {
            "id": "internal_rhyme",
            "name": "Internal Rhyme Density",
            "description": "How densely rhyme sound appears within and across bars.",
            "fn": _score_internal_rhyme,
        },
        {
            "id": "multisyllabic",
            "name": "Multisyllabic Flow",
            "description": "Compression and high-syllable-count line construction.",
            "fn": _score_multisyllabic,
        },
        {
            "id": "motif",
            "name": "Motif Architecture",
            "description": "Semantic field depth, cluster strength, and thematic recurrence.",
            "fn": _score_motif_work,
        },
        {
            "id": "stress",
            "name": "Stress Architecture",
            "description": "Controlled use of stress inversions and pattern diversity.",
            "fn": _score_stress_architecture,
        },
        {
            "id": "rhyme_diversity",
            "name": "Phoneme Family Range",
            "description": "Breadth of distinct rhyme families and phoneme vocabulary.",
            "fn": _score_rhyme_diversity,
        },
    ]

    categories = []
    for cat in scorers:
        fn = cat["fn"]
        all_data  = fn(conn)
        early_data  = fn(conn, song_ids=early_ids)
        recent_data = fn(conn, song_ids=recent_ids)

        if all_data is None:
            all_data = {"score": 0}

        score = all_data["score"]
        trend = _trend(early_data, recent_data)
        example_lines = _get_example_lines(conn, cat["id"])

        categories.append({
            "id": cat["id"],
            "name": cat["name"],
            "description": cat["description"],
            "score": score,
            "level": _level(score),
            "level_color": _level_color(score),
            "details": {k: v for k, v in all_data.items() if k != "score"},
            "trend": trend,
            "example_lines": example_lines,
        })

    # Volume is special — always shown, not in the skill grid
    volume = _score_output_volume(conn)

    devices = compute_device_usage()

    return {
        "ready": True,
        "data_snapshot": snap,
        "categories": categories,
        "volume": volume,
        "devices": devices,
    }
