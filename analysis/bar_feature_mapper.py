"""
bar_feature_mapper.py

Projects existing engine outputs onto the frozen bar boundaries from
bar_segmenter. This is the translation layer between independent engines
and unified bar-level feature vectors.

Accepts the output of feedback_engine.assemble_feedback() as engine_outputs.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import re
import logging
from collections import Counter

log = logging.getLogger(__name__)

_TARGET_SYLLABLES = 12  # must match bar_segmenter.py


# ── helpers ───────────────────────────────────────────────────────────────────

def _count_syllables(text):
    try:
        from domain.syllable_engine import syllabify_line
        syls = syllabify_line(text)
        return len(syls), syls
    except Exception:
        count = max(1, len(re.findall(r'[aeiouAEIOU]+', text)))
        return count, []


def _stress_pattern(syl_list):
    return "".join("1" if s.get("is_stressed") else "0" for s in syl_list)


def _safe_mean(values, default=0.0):
    return sum(values) / len(values) if values else default


# ── public entry point ────────────────────────────────────────────────────────

def map_features(segmentation, engine_outputs):
    """Map engine outputs onto bar boundaries.

    Args:
        segmentation:   output dict from bar_segmenter.segment()
        engine_outputs: output dict from feedback_engine.assemble_feedback(),
                        keyed by the feedback_engine field names.

    Returns:
        list of bar feature dicts, one per bar, in bar_index order.
    """
    bars = segmentation.get("bars", [])

    # ── unpack engine outputs ─────────────────────────────────────────────────
    rhyme_map      = engine_outputs.get("rhyme_map") or []
    motif_groups   = engine_outputs.get("motif_groups") or []
    density_lines  = engine_outputs.get("density_per_line") or []

    # density by line_index → scores dict
    density_by_line = {}
    for item in density_lines:
        idx = item.get("index")
        if idx is not None:
            density_by_line[idx] = item.get("scores", {})

    # motif hits by line_index → list of color_id strings
    motif_by_line = {}
    for group in motif_groups:
        if not isinstance(group, dict):
            continue
        cid = str(group.get("color_id") or group.get("id") or "")
        # members list carries line_index per word
        for member in group.get("members", []):
            li = member.get("line_index")
            if li is not None:
                motif_by_line.setdefault(li, [])
                if cid and cid not in motif_by_line[li]:
                    motif_by_line[li].append(cid)
        # fallback: some engines store occurrences as (line_index, pos) tuples
        for occ in group.get("occurrences", []):
            if isinstance(occ, (list, tuple)) and len(occ) >= 1:
                li = occ[0]
                motif_by_line.setdefault(li, [])
                if cid and cid not in motif_by_line[li]:
                    motif_by_line[li].append(cid)

    bar_features = []

    for bar in bars:
        line_indices = bar.get("line_indices", [])
        bar_text     = bar.get("text", "")
        bar_start    = bar.get("start_char", 0)
        bar_end      = bar.get("end_char", bar_start + len(bar_text))

        # ── syllables & stress ───────────────────────────────────────────────
        syl_count, syl_list = _count_syllables(bar_text)
        stress_pat = _stress_pattern(syl_list) if syl_list else "0" * syl_count

        # ── pocket alignment ─────────────────────────────────────────────────
        bar_words = [w for w in rhyme_map if w.get("line_index") in line_indices]
        on_pocket = sum(1 for w in bar_words if w.get("on_pocket"))
        pocket_alignment = on_pocket / max(1, len(bar_words)) if bar_words else 0.5

        # ── rhyme density ────────────────────────────────────────────────────
        word_count   = max(1, len(bar_text.split()))
        rhyme_density = min(1.0, len(bar_words) / word_count)

        # ── internal rhyme count ─────────────────────────────────────────────
        cid_list    = [w.get("color_id") for w in bar_words if w.get("color_id")]
        cid_counts  = Counter(cid_list)
        internal_rhyme_count = sum(c for c in cid_counts.values() if c > 1)

        # ── end rhyme families (last ~15% of bar chars) ──────────────────────
        end_start = bar_start + int(0.85 * (bar_end - bar_start))
        end_words = [
            w for w in bar_words
            if (w.get("char_start") or 0) >= end_start
        ]
        end_rhyme_families = list({w.get("color_id") for w in end_words
                                   if w.get("color_id")})

        # ── density score ────────────────────────────────────────────────────
        line_densities = [
            density_by_line.get(li, {}).get("internal", 0.0)
            for li in line_indices
        ]
        # density_per_line scores are 0–100 percentages
        density_score = _safe_mean(line_densities) / 100.0

        # ── motif hits ───────────────────────────────────────────────────────
        motif_hits = []
        for li in line_indices:
            for m in motif_by_line.get(li, []):
                if m not in motif_hits:
                    motif_hits.append(m)

        # ── assonance / consonance (structural estimates) ────────────────────
        # Full phoneme-level scoring would require per-bar phoneme extraction;
        # v1 uses rhyme-map proximity as a proxy.
        assonance_score  = round(min(1.0, rhyme_density * 0.8 + 0.1), 3)
        consonance_score = round(min(1.0, density_score  * 0.6 + 0.1), 3)

        # ── semantic shift (placeholder — needs semantics_engine per bar) ────
        semantic_shift = 0.0

        # ── derived composites ───────────────────────────────────────────────
        motif_activity       = min(1.0, len(motif_hits) / 3.0)
        emotional_directness = round(
            max(0.0, (1.0 - density_score) * 0.6 + motif_activity * 0.4), 3
        )
        energy_estimate = round(density_score * 0.5 + pocket_alignment * 0.5, 3)
        breath_load     = round(min(1.0, syl_count / _TARGET_SYLLABLES), 3)

        bar_features.append({
            "bar_index":            bar["bar_index"],
            "syllable_count":       syl_count,
            "stress_pattern":       stress_pat,
            "pocket_alignment":     round(pocket_alignment, 3),
            "rhyme_density":        round(rhyme_density, 3),
            "internal_rhyme_count": internal_rhyme_count,
            "end_rhyme_families":   end_rhyme_families,
            "assonance_score":      assonance_score,
            "consonance_score":     consonance_score,
            "density_score":        round(density_score, 3),
            "motif_hits":           motif_hits,
            "semantic_shift":       semantic_shift,
            "emotional_directness": emotional_directness,
            "energy_estimate":      energy_estimate,
            "breath_load":          breath_load,
        })

    return bar_features
