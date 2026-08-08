"""
bar_aligner.py

Content-aware alignment of bars across two snapshots using a DTW-style
matching algorithm. Prevents phantom degradation when bars are inserted
or deleted.

Precondition: compatibility_checker has been called and returned
  recommended_action != "requires_resegmentation".
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import uuid

_METHOD = "content_aware_v1"

# Similarity thresholds
_MATCH_SIM         = 0.75   # same index, high sim → "matched"
_SHIFTED_SIM       = 0.75   # different index, high sim → "shifted_match"
_REWRITTEN_SIM_MAX = 0.40   # same index, low sim → "rewritten"

# DTW penalties
_INS_PENALTY = 0.30
_DEL_PENALTY = 0.30


# ── feature similarity ────────────────────────────────────────────────────────

def _jaccard(set_a, set_b):
    if not set_a and not set_b:
        return 1.0
    a, b = set(set_a), set(set_b)
    union = a | b
    return len(a & b) / len(union) if union else 1.0


def _stress_sim(sp_a, sp_b):
    if not sp_a or not sp_b:
        return 0.5
    max_len = max(len(sp_a), len(sp_b))
    a_pad = sp_a.ljust(max_len, "0")
    b_pad = sp_b.ljust(max_len, "0")
    diff = sum(c1 != c2 for c1, c2 in zip(a_pad, b_pad))
    return 1.0 - diff / max_len


def _syl_sim(sc_a, sc_b):
    mx = max(sc_a, sc_b, 1)
    return 1.0 - abs(sc_a - sc_b) / mx


def _lexical_sim(text_a, text_b):
    words_a = set((text_a or "").lower().split())
    words_b = set((text_b or "").lower().split())
    return _jaccard(words_a, words_b)


def _feature_similarity(bar_a, bar_b):
    """Weighted similarity between two bar feature vectors.

    Returns (score: float 0-1, contributions: dict of feature→weighted_score).
    """
    rhyme_sim  = _jaccard(
        bar_a.get("end_rhyme_families") or [],
        bar_b.get("end_rhyme_families") or [],
    )
    motif_sim  = _jaccard(
        bar_a.get("motif_hits") or [],
        bar_b.get("motif_hits") or [],
    )
    stress_sim = _stress_sim(
        bar_a.get("stress_pattern", ""),
        bar_b.get("stress_pattern", ""),
    )
    syl_sim    = _syl_sim(
        bar_a.get("syllable_count", 0),
        bar_b.get("syllable_count", 0),
    )
    lex_sim    = _lexical_sim(
        bar_a.get("text", ""),
        bar_b.get("text", ""),
    )

    weights = {
        "rhyme_family_overlap": (rhyme_sim,  0.25),
        "motif_overlap":        (motif_sim,  0.20),
        "stress_pattern":       (stress_sim, 0.15),
        "syllable_proximity":   (syl_sim,    0.15),
        "lexical_overlap":      (lex_sim,    0.25),
    }

    score         = sum(v * w for v, w in weights.values())
    contributions = {k: round(v * w, 4) for k, (v, w) in weights.items()}
    return round(score, 4), contributions


# ── DTW alignment ─────────────────────────────────────────────────────────────

def _build_similarity_matrix(features_a, features_b):
    n, m = len(features_a), len(features_b)
    sim   = [[0.0] * m for _ in range(n)]
    contr = [[{}]  * m for _ in range(n)]
    for i in range(n):
        for j in range(m):
            s, c = _feature_similarity(features_a[i], features_b[j])
            sim[i][j]   = s
            contr[i][j] = c
    return sim, contr


def _dtw_traceback(features_a, features_b):
    """Return list of (i|None, j|None) index pairs via DTW traceback."""
    n, m = len(features_a), len(features_b)
    if n == 0 and m == 0:
        return []

    sim, _ = _build_similarity_matrix(features_a, features_b)

    INF = float("inf")
    # cost[i][j] = accumulated DTW cost up to (i,j); indices are 1-based
    cost = [[INF] * (m + 1) for _ in range(n + 1)]
    cost[0][0] = 0.0
    for i in range(1, n + 1):
        cost[i][0] = cost[i - 1][0] + _DEL_PENALTY
    for j in range(1, m + 1):
        cost[0][j] = cost[0][j - 1] + _INS_PENALTY

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            step_cost = 1.0 - sim[i - 1][j - 1]
            cost[i][j] = step_cost + min(
                cost[i - 1][j - 1],
                cost[i - 1][j] + _DEL_PENALTY,
                cost[i][j - 1] + _INS_PENALTY,
            )

    # traceback
    path = []
    i, j = n, m
    while i > 0 or j > 0:
        if i == 0:
            path.append((None, j - 1))
            j -= 1
        elif j == 0:
            path.append((i - 1, None))
            i -= 1
        else:
            diag = cost[i - 1][j - 1]
            up   = cost[i - 1][j]
            left = cost[i][j - 1]
            best = min(diag, up, left)
            if best == diag:
                path.append((i - 1, j - 1))
                i -= 1
                j -= 1
            elif best == up:
                path.append((i - 1, None))
                i -= 1
            else:
                path.append((None, j - 1))
                j -= 1

    path.reverse()
    return path, sim


# ── public entry point ────────────────────────────────────────────────────────

def align(snapshot_a, snapshot_b):
    """Content-aware bar alignment between two snapshots.

    Args:
        snapshot_a: snapshot dict with bar_features list
        snapshot_b: snapshot dict with bar_features list

    Returns:
        alignment dict matching the bar_aligner spec.
    """
    feats_a = snapshot_a.get("bar_features") or []
    feats_b = snapshot_b.get("bar_features") or []

    draft_a = snapshot_a.get("snapshot_id", "unknown_a")
    draft_b = snapshot_b.get("snapshot_id", "unknown_b")

    if not feats_a and not feats_b:
        return {
            "alignment_id":     str(uuid.uuid4()),
            "alignment_method": _METHOD,
            "draft_a":          draft_a,
            "draft_b":          draft_b,
            "pairs":            [],
        }

    sim_matrix = None
    if feats_a and feats_b:
        result = _dtw_traceback(feats_a, feats_b)
        path, sim_matrix = result
    else:
        # one side is empty — everything is inserted or deleted
        path = []
        for i in range(len(feats_a)):
            path.append((i, None))
        for j in range(len(feats_b)):
            path.append((None, j))

    pairs = []
    for (ai, bi) in path:
        if ai is None:
            # inserted in B
            pairs.append({
                "a_bar_index": None,
                "b_bar_index": feats_b[bi]["bar_index"],
                "status":      "inserted",
                "similarity":  None,
                "anchors":     [],
            })
            continue
        if bi is None:
            # deleted from A
            pairs.append({
                "a_bar_index": feats_a[ai]["bar_index"],
                "b_bar_index": None,
                "status":      "deleted",
                "similarity":  None,
                "anchors":     [],
            })
            continue

        sim   = sim_matrix[ai][bi]
        _, contr = _feature_similarity(feats_a[ai], feats_b[bi])

        # top-3 contributing features
        top3 = sorted(contr, key=lambda k: contr[k], reverse=True)[:3]

        # classify status
        same_pos = (feats_a[ai]["bar_index"] == feats_b[bi]["bar_index"])
        if sim >= _MATCH_SIM and same_pos:
            status = "matched"
        elif sim >= _SHIFTED_SIM and not same_pos:
            status = "shifted_match"
        elif sim < _REWRITTEN_SIM_MAX and same_pos:
            status = "rewritten"
        elif sim >= _MATCH_SIM:          # high sim but different position
            status = "shifted_match"
        else:
            status = "rewritten"

        pairs.append({
            "a_bar_index": feats_a[ai]["bar_index"],
            "b_bar_index": feats_b[bi]["bar_index"],
            "status":      status,
            "similarity":  round(sim, 4),
            "anchors":     top3,
        })

    return {
        "alignment_id":     str(uuid.uuid4()),
        "alignment_method": _METHOD,
        "draft_a":          draft_a,
        "draft_b":          draft_b,
        "pairs":            pairs,
    }
