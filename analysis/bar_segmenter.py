"""
bar_segmenter.py

Single source of truth for inferring bar boundaries from raw lyrics + BPM.
Every downstream module consumes this output. No other module infers bars.

Algorithm v1: deterministic, rule-based, no ML.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import hashlib
import re
import datetime

from normalization_engine import normalize as _normalize_word

_METHOD  = "deterministic_v1"
_VERSION = "bar_segmenter_1.0.0"

# 4 beats × ~3 syllables/beat  — BPM-agnostic target for v1
_TARGET_SYLLABLES = 12
_CONFIDENCE_WARN  = 0.6

# Signal weights must sum to 1.0
_SIGNAL_WEIGHTS = {
    "line_break":           0.40,
    "syllable_budget":      0.20,
    "stress_resolution":    0.15,
    "end_rhyme":            0.15,
    "punctuation":          0.10,
    "pattern_consistency":  0.10,
}


# ── helpers ───────────────────────────────────────────────────────────────────

def _normalize_line(line):
    """Normalize each word in a line and rejoin."""
    tokens = line.split()
    out = []
    for tok in tokens:
        clean = tok.strip('.,!?;:"\'-—').lower()
        if not clean:
            out.append(tok)
            continue
        try:
            result = _normalize_word(clean)
            norm = result.get("normalized", clean)
            if isinstance(norm, list):
                norm = " ".join(norm) if norm else clean
            out.append(norm)
        except Exception:
            out.append(clean)
    return " ".join(out)


def _count_syllables(text):
    """Count syllables using syllable_engine; fall back to vowel-cluster heuristic."""
    try:
        from syllable_engine import syllabify_line
        syls = syllabify_line(text)
        return len(syls), syls
    except Exception:
        count = max(1, len(re.findall(r'[aeiouAEIOU]+', text)))
        return count, []


def _last_word(text):
    words = text.split()
    return words[-1].strip('.,!?;:"\'-—').lower() if words else ""


def _ends_with_punct(text):
    return text.rstrip()[-1:] in '.,:;!?—-'


def _rhymes_with(word_a, word_b):
    """Return True if the two words rhyme (score ≥ 0.7)."""
    if not word_a or not word_b or word_a == word_b:
        return False
    try:
        from phoneme_engine import rhyme_score
        return rhyme_score(word_a, word_b) >= 0.70
    except Exception:
        return False


def _pattern_consistent(bars_so_far, candidate_syl_count):
    """True if candidate fits the established syllable pattern (±30%)."""
    if len(bars_so_far) < 3:
        return False
    recent = [b["_syl"] for b in bars_so_far[-3:]]
    avg = sum(recent) / len(recent)
    return abs(candidate_syl_count - avg) <= 0.30 * avg


def _stress_resolves(syl_list):
    """True if the last syllable of the bar is unstressed (resolution signal)."""
    if not syl_list:
        return False
    last = syl_list[-1]
    return not last.get("is_stressed", True)


def _confidence(signals, syl_count):
    base = sum(_SIGNAL_WEIGHTS.get(s, 0.0) for s in set(signals))
    ratio = syl_count / _TARGET_SYLLABLES
    if ratio > 2.0 or ratio < 0.2:
        base *= 0.6
    elif ratio > 1.5 or ratio < 0.4:
        base *= 0.8
    return round(min(1.0, base), 3)


# ── public entry point ────────────────────────────────────────────────────────

def segment(lyrics, bpm):
    """Segment raw lyrics into bars.

    Args:
        lyrics: raw pasted lyric string (newline-separated lines)
        bpm:    beats per minute (int or float)

    Returns:
        dict matching the bar_segmenter spec output format.
        Same input + same method + same algorithm_version → identical output.
    """
    bpm   = int(bpm)
    lines = [l for l in lyrics.splitlines() if l.strip()]

    # Normalize each line for hashing
    norm_lines = [_normalize_line(l) for l in lines]
    norm_concat = "\n".join(norm_lines)

    # Deterministic ID derived from input so the same input always yields the
    # same segmentation_id (satisfies the spec's immutability requirement).
    input_hash   = hashlib.sha256(f"{norm_concat}{bpm}".encode("utf-8")).hexdigest()
    seg_id       = input_hash[:32]

    bars     = []
    warnings = []

    global_syl  = 0
    global_char = 0
    last_words  = []   # recent bar-end words for end_rhyme detection

    for line_idx, (raw, norm) in enumerate(zip(lines, norm_lines)):
        syl_count, syl_list = _count_syllables(norm)

        signals = ["line_break"]

        # syllable_budget
        if 0.70 * _TARGET_SYLLABLES <= syl_count <= 1.30 * _TARGET_SYLLABLES:
            signals.append("syllable_budget")

        # punctuation
        if _ends_with_punct(raw):
            signals.append("punctuation")

        # end_rhyme — check against last 2 bar endings
        lw = _last_word(norm)
        if lw:
            for prev in last_words[-2:]:
                if _rhymes_with(lw, prev):
                    signals.append("end_rhyme")
                    break

        # stress_resolution
        if _stress_resolves(syl_list):
            signals.append("stress_resolution")

        # pattern_consistency
        if _pattern_consistent(bars, syl_count):
            signals.append("pattern_consistency")

        conf = _confidence(signals, syl_count)

        # Split into 2 bars if line is >1.8× target
        if syl_count > 1.8 * _TARGET_SYLLABLES and syl_list:
            mid = syl_count // 2
            mid_syl = syl_list[mid] if mid < len(syl_list) else syl_list[-1]
            # char split: use the word's start offset within the line
            word_start = mid_syl.get("char_start", 0)
            # char_start is relative to the word, not the line — approximate
            # by splitting at the nearest whitespace around the midpoint char
            approx_mid_char = len(raw) // 2
            # walk forward to next whitespace
            split_pos = approx_mid_char
            while split_pos < len(raw) and raw[split_pos] != ' ':
                split_pos += 1

            half_a = raw[:split_pos].strip()
            half_b = raw[split_pos:].strip()
            syl_half = syl_count // 2

            for part_idx, (part_text, part_syl) in enumerate(
                    [(half_a, syl_half), (half_b, syl_count - syl_half)]):
                part_conf = round(conf * 0.8, 3)
                part_signals = signals[:] if part_idx == 0 else ["syllable_budget"]
                bar = {
                    "bar_index":              len(bars) + 1,
                    "text":                   part_text,
                    "start_char":             global_char if part_idx == 0
                                              else global_char + split_pos + 1,
                    "end_char":               global_char + split_pos if part_idx == 0
                                              else global_char + len(raw),
                    "start_syllable":         global_syl,
                    "end_syllable":           global_syl + part_syl - 1,
                    "line_indices":           [line_idx],
                    "estimated_beat_coverage": round(4.0 * part_syl / _TARGET_SYLLABLES, 2),
                    "confidence":             part_conf,
                    "boundary_signals":       part_signals,
                    "_syl":                   part_syl,
                }
                bars.append(bar)
                global_syl += part_syl
                if part_conf < _CONFIDENCE_WARN:
                    warnings.append(
                        f"Bar {bar['bar_index']} (split from line {line_idx + 1}) "
                        f"confidence {part_conf:.2f}"
                    )
        else:
            bar = {
                "bar_index":              len(bars) + 1,
                "text":                   raw,
                "start_char":             global_char,
                "end_char":               global_char + len(raw),
                "start_syllable":         global_syl,
                "end_syllable":           global_syl + max(0, syl_count - 1),
                "line_indices":           [line_idx],
                "estimated_beat_coverage": round(4.0 * syl_count / _TARGET_SYLLABLES, 2),
                "confidence":             conf,
                "boundary_signals":       signals,
                "_syl":                   syl_count,
            }
            bars.append(bar)
            global_syl += syl_count

            if conf < _CONFIDENCE_WARN:
                warnings.append(
                    f"Bar {bar['bar_index']} (line {line_idx + 1}) "
                    f"confidence {conf:.2f} — signals: {signals}"
                )

        global_char += len(raw) + 1  # +1 for newline separator
        last_words.append(lw)

    # Remove internal _syl helper key before returning
    for bar in bars:
        bar.pop("_syl", None)

    return {
        "segmentation_id":   seg_id,
        "method":            _METHOD,
        "algorithm_version": _VERSION,
        "input_hash":        input_hash,
        "created_at":        datetime.datetime.utcnow().isoformat() + "Z",
        "bpm":               bpm,
        "bars":              bars,
        "warnings":          warnings,
    }
