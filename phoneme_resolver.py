"""
phoneme_resolver.py

Five-layer phoneme resolution chain for hip-hop lyric analysis.

Resolution order (first successful layer wins):
    1. CMU standard      — exact dictionary lookup (case-insensitive)
    2. CMU normalized    — punctuation-stripped, apostrophe-contracted forms
    3. AAVE lookup       — AAVE phonological variants via aave_phonology module
    4. G2P model         — grapheme-to-phoneme neural model (g2p_en, optional)
    5. Character fallback — vowel-group heuristic, always succeeds

Each layer records its source tag in the returned PhonemeSequence so
downstream modules know how much to trust the result.

Design rules:
- No existing Prosodic engine files are imported or modified.
- All public functions are silent on bad input (never raise).
- G2P import is deferred to avoid hard dependency at import time.
- Thread-safe: uses the same module-level cmudict cache as aave_phonology.

References:
    Jurafsky, D. & Martin, J. H. (2023). Speech and Language Processing (3rd ed.).
    Sejnowski, T. & Rosenberg, C. (1987). Parallel networks that learn to pronounce
        English text. Complex Systems, 1(1), 145–168.
"""

from __future__ import annotations

import re
from typing import List, Optional, Dict, Any, Tuple

from prosodic_data_objects import PhonemeSequence
from aave_phonology import get_aave_variants, _load_cmudict_lazy


# ---------------------------------------------------------------------------
# Arpabet helpers
# ---------------------------------------------------------------------------

#: Arpabet vowel phonemes — those that carry stress digits (0/1/2).
_VOWELS: frozenset = frozenset([
    "AA", "AE", "AH", "AO", "AW", "AY",
    "EH", "ER", "EY",
    "IH", "IY",
    "OW", "OY",
    "UH", "UW",
])

#: Regex to strip stress digits from a phoneme symbol.
_STRESS_RE = re.compile(r"[012]$")


def _strip_stress(phoneme: str) -> str:
    """Return the base phoneme symbol with any trailing stress digit removed."""
    return _STRESS_RE.sub("", phoneme)


def _extract_stress_pattern(phonemes: List[str]) -> Tuple[List[int], int]:
    """
    Derive stress pattern and syllable count from a phoneme list.

    A syllable is counted for each vowel phoneme.  The stress value is the
    digit appended to the vowel (0 = unstressed, 1 = primary, 2 = secondary).
    Vowels with no digit are treated as unstressed (0).

    Args:
        phonemes: List of Arpabet phoneme strings, e.g. ['HH','ER1','T'].

    Returns:
        Tuple of (stress_pattern, syllable_count) where stress_pattern is a
        list of ints of length syllable_count.
    """
    stress_pattern: List[int] = []
    for ph in phonemes:
        base = _strip_stress(ph)
        if base in _VOWELS:
            if ph[-1].isdigit():
                stress_pattern.append(int(ph[-1]))
            else:
                stress_pattern.append(0)
    syllable_count = len(stress_pattern)
    if syllable_count == 0:
        # consonant-only token (e.g. "hmm") — treat as one unstressed syllable
        syllable_count = 1
        stress_pattern = [0]
    return stress_pattern, syllable_count


# ---------------------------------------------------------------------------
# Layer 1: CMU standard lookup
# ---------------------------------------------------------------------------

def _layer1_cmu_standard(
    word: str,
    cmu_dict: Dict[str, List[List[str]]],
) -> Optional[PhonemeSequence]:
    """
    Layer 1 — direct CMU Pronouncing Dictionary lookup.

    Returns the first listed pronunciation for *word* (case-insensitive).
    No transformations applied.

    Args:
        word: Orthographic word string.
        cmu_dict: Loaded CMU dictionary mapping lowercase words to phoneme lists.

    Returns:
        PhonemeSequence with source='cmu', or None if not found.
    """
    key = word.lower()
    entries = cmu_dict.get(key)
    if not entries:
        return None

    phonemes = entries[0]
    stress_pattern, syllable_count = _extract_stress_pattern(phonemes)
    return PhonemeSequence(
        word=word,
        phonemes=phonemes,
        syllable_count=syllable_count,
        stress_pattern=stress_pattern,
        source="cmu",
        low_confidence=False,
        is_aave_variant=False,
    )


# ---------------------------------------------------------------------------
# Layer 2: CMU normalized lookup
# ---------------------------------------------------------------------------

_CONTRACTION_MAP: Dict[str, str] = {
    "n't": "not",
    "'re": "are",
    "'ve": "have",
    "'ll": "will",
    "'d":  "would",
    "'m":  "am",
    "'s":  "",        # possessive / is — drop suffix, look up stem
}


def _normalize_word(word: str) -> str:
    """
    Apply light normalization for CMU lookup:
    - Strip leading/trailing punctuation
    - Lowercase
    - Resolve common contractions to the base form

    Returns the normalized string.
    """
    # lowercase and strip outer punctuation except apostrophes
    w = word.lower().strip(".,!?;:\"()[]{}—–-")

    # handle contractions: try longest suffix first
    for suffix, replacement in sorted(_CONTRACTION_MAP.items(), key=lambda x: -len(x[0])):
        if w.endswith(suffix):
            stem = w[: -len(suffix)]
            return (stem + " " + replacement).strip() if replacement else stem

    return w


def _layer2_cmu_normalized(
    word: str,
    cmu_dict: Dict[str, List[List[str]]],
) -> Optional[PhonemeSequence]:
    """
    Layer 2 — CMU lookup after light normalization.

    Tries punctuation-stripped and contraction-expanded forms.  Multi-word
    expansions (e.g. "n't" -> "not") look up the expanded token separately.

    Args:
        word: Orthographic word string.
        cmu_dict: Loaded CMU dictionary.

    Returns:
        PhonemeSequence with source='cmu_normalized', or None if not found.
    """
    normalized = _normalize_word(word)
    if not normalized or normalized == word.lower():
        return None  # no new information — layer 1 already tried this

    # multi-word expansion: look up first token only
    key = normalized.split()[0]
    entries = cmu_dict.get(key)
    if not entries:
        return None

    phonemes = entries[0]
    stress_pattern, syllable_count = _extract_stress_pattern(phonemes)
    return PhonemeSequence(
        word=word,
        phonemes=phonemes,
        syllable_count=syllable_count,
        stress_pattern=stress_pattern,
        source="cmu_normalized",
        low_confidence=False,
        is_aave_variant=False,
    )


# ---------------------------------------------------------------------------
# Layer 3: AAVE variant lookup
# ---------------------------------------------------------------------------

def _layer3_aave(
    word: str,
    cmu_dict: Dict[str, List[List[str]]],
) -> Optional[PhonemeSequence]:
    """
    Layer 3 — AAVE phonological variant lookup.

    Retrieves the standard CMU phonemes for the word and generates all
    valid AAVE variants.  Returns the first variant that differs from the
    standard form.

    This layer fires when Layer 1 found a CMU entry but the caller has
    explicitly requested AAVE resolution, *or* when Layers 1 and 2 failed
    and the word may be a phonologically modified form common in AAVE lyrics.

    Args:
        word: Orthographic word string.
        cmu_dict: Loaded CMU dictionary.

    Returns:
        PhonemeSequence with source='aave' and is_aave_variant=True,
        or None if no AAVE variants are derivable.
    """
    key = word.lower()
    entries = cmu_dict.get(key)
    if not entries:
        return None

    standard_phonemes = entries[0]
    try:
        variants = get_aave_variants(standard_phonemes)
    except Exception:
        return None

    if not variants:
        return None

    # pick first variant that differs from standard
    for variant in variants:
        if variant != standard_phonemes:
            stress_pattern, syllable_count = _extract_stress_pattern(variant)
            return PhonemeSequence(
                word=word,
                phonemes=variant,
                syllable_count=syllable_count,
                stress_pattern=stress_pattern,
                source="aave",
                low_confidence=False,
                is_aave_variant=True,
            )

    return None


# ---------------------------------------------------------------------------
# Layer 4: G2P model (optional, deferred import)
# ---------------------------------------------------------------------------

_g2p_instance: Any = None
_g2p_available: Optional[bool] = None


def _get_g2p() -> Any:
    """
    Lazily load the g2p_en grapheme-to-phoneme model.

    Returns the G2p instance, or None if g2p_en is not installed.
    Caches the result so the model is loaded at most once per process.
    """
    global _g2p_instance, _g2p_available

    if _g2p_available is False:
        return None
    if _g2p_instance is not None:
        return _g2p_instance

    try:
        from g2p_en import G2p  # type: ignore
        _g2p_instance = G2p()
        _g2p_available = True
    except Exception:
        _g2p_available = False
        _g2p_instance = None

    return _g2p_instance


def _layer4_g2p(word: str) -> Optional[PhonemeSequence]:
    """
    Layer 4 — grapheme-to-phoneme neural model (g2p_en).

    Falls back gracefully when g2p_en is not installed.  The returned
    PhonemeSequence carries low_confidence=True to signal downstream
    modules that this is a model prediction, not a dictionary entry.

    Args:
        word: Orthographic word string.

    Returns:
        PhonemeSequence with source='g2p' and low_confidence=True,
        or None if g2p_en is unavailable or the prediction is empty.
    """
    g2p = _get_g2p()
    if g2p is None:
        return None

    try:
        raw_phonemes: List[str] = g2p(word.lower())
    except Exception:
        return None

    # g2p_en may return space tokens and punctuation — filter to Arpabet only
    phonemes = [p for p in raw_phonemes if re.match(r"^[A-Z]+[012]?$", p)]
    if not phonemes:
        return None

    stress_pattern, syllable_count = _extract_stress_pattern(phonemes)
    return PhonemeSequence(
        word=word,
        phonemes=phonemes,
        syllable_count=syllable_count,
        stress_pattern=stress_pattern,
        source="g2p",
        low_confidence=True,
        is_aave_variant=False,
    )


# ---------------------------------------------------------------------------
# Layer 5: Character fallback
# ---------------------------------------------------------------------------

#: Arpabet vowel symbols used by the character fallback.
_FALLBACK_VOWEL_MAP: Dict[str, str] = {
    "a": "AE1", "e": "EH1", "i": "IH1",
    "o": "AO1", "u": "UH1", "y": "IH0",
}

#: Consonant approximations for the character fallback.
_FALLBACK_CONSONANT_MAP: Dict[str, str] = {
    "b": "B",  "c": "K",  "d": "D",  "f": "F",
    "g": "G",  "h": "HH", "j": "JH", "k": "K",
    "l": "L",  "m": "M",  "n": "N",  "p": "P",
    "q": "K",  "r": "R",  "s": "S",  "t": "T",
    "v": "V",  "w": "W",  "x": "K",  "z": "Z",
}


def _layer5_char_fallback(word: str) -> PhonemeSequence:
    """
    Layer 5 — character-level heuristic fallback.  Always succeeds.

    Converts each letter to an Arpabet symbol using simple one-to-one maps.
    Vowel groups are collapsed to a single vowel phoneme.  This layer is
    intentionally low-fidelity — it exists to guarantee a non-None return
    for any input, enabling downstream modules to continue processing
    unknown words (slang, proper nouns, non-English borrowings) without
    crashing.

    The returned PhonemeSequence carries low_confidence=True.

    Args:
        word: Orthographic word string (any case, may contain punctuation).

    Returns:
        PhonemeSequence with source='char_fallback' and low_confidence=True.
        Syllable count is at least 1.
    """
    clean = re.sub(r"[^a-zA-Z]", "", word.lower())
    if not clean:
        # empty token — return minimal valid sequence
        return PhonemeSequence(
            word=word,
            phonemes=["AH0"],
            syllable_count=1,
            stress_pattern=[0],
            source="char_fallback",
            low_confidence=True,
            is_aave_variant=False,
        )

    phonemes: List[str] = []
    i = 0
    while i < len(clean):
        ch = clean[i]
        if ch in _FALLBACK_VOWEL_MAP:
            # collapse consecutive vowels into one nucleus
            nucleus = _FALLBACK_VOWEL_MAP[ch]
            while i + 1 < len(clean) and clean[i + 1] in _FALLBACK_VOWEL_MAP:
                i += 1
            phonemes.append(nucleus)
        elif ch in _FALLBACK_CONSONANT_MAP:
            phonemes.append(_FALLBACK_CONSONANT_MAP[ch])
        i += 1

    if not phonemes:
        phonemes = ["AH0"]

    stress_pattern, syllable_count = _extract_stress_pattern(phonemes)
    return PhonemeSequence(
        word=word,
        phonemes=phonemes,
        syllable_count=syllable_count,
        stress_pattern=stress_pattern,
        source="char_fallback",
        low_confidence=True,
        is_aave_variant=False,
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def resolve(
    word: str,
    prefer_aave: bool = False,
    cmu_dict: Optional[Dict[str, List[List[str]]]] = None,
) -> PhonemeSequence:
    """
    Resolve a single word to a PhonemeSequence via the 5-layer chain.

    Layers are tried in order; the first successful layer wins:
        1. CMU standard
        2. CMU normalized (punctuation-stripped, contraction-expanded)
        3. AAVE variant (only when prefer_aave=True or Layers 1-2 failed
           and a CMU base form exists)
        4. G2P model (requires g2p_en to be installed)
        5. Character fallback (always succeeds)

    When prefer_aave=True, Layer 3 is tried immediately after Layer 1
    so that AAVE variants are preferred over CMU normalized forms.

    Args:
        word: Orthographic word string.  May contain punctuation.
        prefer_aave: When True, the AAVE layer is elevated to Layer 2
            position (right after CMU standard).  Useful for sections
            explicitly marked as AAVE register.
        cmu_dict: Optional pre-loaded CMU dictionary.  If None, the
            module-level lazy-loaded cache is used.

    Returns:
        PhonemeSequence for *word*.  Never raises — Layer 5 guarantees a result.

    Examples:
        >>> resolve("past")
        PhonemeSequence(word='past', phonemes=['P','AE1','S','T'], ...)
        >>> resolve("past", prefer_aave=True)
        PhonemeSequence(word='past', phonemes=['P','AE1','S'], source='aave', ...)
        >>> resolve("Xzqvw")
        PhonemeSequence(word='Xzqvw', ..., source='char_fallback', low_confidence=True)
    """
    if not word or not word.strip():
        return _layer5_char_fallback(word or "")

    try:
        if cmu_dict is None:
            cmu_dict = _load_cmudict_lazy()

        # Layer 1 — CMU standard
        result = _layer1_cmu_standard(word, cmu_dict)
        if result is not None and not prefer_aave:
            return result

        # prefer_aave path: check AAVE variant right after CMU standard
        if result is not None and prefer_aave:
            aave_result = _layer3_aave(word, cmu_dict)
            if aave_result is not None:
                return aave_result
            return result  # standard CMU is fine, no AAVE variant exists

        # Layer 2 — CMU normalized
        result2 = _layer2_cmu_normalized(word, cmu_dict)
        if result2 is not None:
            return result2

        # Layer 3 — AAVE lookup (standard form unknown, try variant derivation)
        result3 = _layer3_aave(word, cmu_dict)
        if result3 is not None:
            return result3

        # Layer 4 — G2P model
        result4 = _layer4_g2p(word)
        if result4 is not None:
            return result4

    except Exception:
        pass

    # Layer 5 — character fallback (always succeeds)
    return _layer5_char_fallback(word)


def resolve_line(
    line: str,
    prefer_aave: bool = False,
    cmu_dict: Optional[Dict[str, List[List[str]]]] = None,
) -> List[PhonemeSequence]:
    """
    Resolve every word in a lyric line to a PhonemeSequence.

    Splits *line* on whitespace and resolves each token through the
    5-layer chain.  Empty tokens (multiple spaces, leading/trailing
    whitespace) are silently skipped.

    Args:
        line: Raw lyric line string.
        prefer_aave: Passed through to resolve() for each token.
        cmu_dict: Optional pre-loaded CMU dictionary.  Loaded once and
            reused for all tokens in the line.

    Returns:
        List of PhonemeSequence objects, one per whitespace-delimited token.
        Empty list when *line* is empty or whitespace-only.

    Examples:
        >>> resolve_line("I run the streets")
        [PhonemeSequence(...), PhonemeSequence(...), ...]
    """
    if not line or not line.strip():
        return []

    if cmu_dict is None:
        try:
            cmu_dict = _load_cmudict_lazy()
        except Exception:
            cmu_dict = {}

    results: List[PhonemeSequence] = []
    for token in line.split():
        token = token.strip()
        if not token:
            continue
        seq = resolve(token, prefer_aave=prefer_aave, cmu_dict=cmu_dict)
        results.append(seq)

    return results


def resolve_with_all_variants(
    word: str,
    cmu_dict: Optional[Dict[str, List[List[str]]]] = None,
) -> List[PhonemeSequence]:
    """
    Return all available pronunciations for a word: standard CMU entries
    plus all derivable AAVE variants.

    Useful when building training data or when the downstream model
    should consider multiple valid pronunciations (e.g. rhyme matching
    across dialects).

    Args:
        word: Orthographic word string.
        cmu_dict: Optional pre-loaded CMU dictionary.

    Returns:
        List of PhonemeSequence objects.  Always contains at least one entry
        (the char_fallback result if nothing else resolves).  Duplicates are
        removed by phoneme-list equality.
    """
    if cmu_dict is None:
        try:
            cmu_dict = _load_cmudict_lazy()
        except Exception:
            cmu_dict = {}

    seen: List[Tuple[str, ...]] = []
    results: List[PhonemeSequence] = []

    def _add(seq: Optional[PhonemeSequence]) -> None:
        if seq is None:
            return
        key = tuple(seq.phonemes)
        if key not in seen:
            seen.append(key)
            results.append(seq)

    key = word.lower()
    entries = cmu_dict.get(key, [])

    # all CMU variants (some words have multiple listed pronunciations)
    for i, phonemes in enumerate(entries):
        stress_pattern, syllable_count = _extract_stress_pattern(phonemes)
        _add(PhonemeSequence(
            word=word,
            phonemes=phonemes,
            syllable_count=syllable_count,
            stress_pattern=stress_pattern,
            source="cmu",
            low_confidence=False,
            is_aave_variant=False,
        ))

    # AAVE variants of the first CMU entry
    if entries:
        try:
            aave_variants = get_aave_variants(entries[0])
            for variant in aave_variants:
                stress_pattern, syllable_count = _extract_stress_pattern(variant)
                _add(PhonemeSequence(
                    word=word,
                    phonemes=variant,
                    syllable_count=syllable_count,
                    stress_pattern=stress_pattern,
                    source="aave",
                    low_confidence=False,
                    is_aave_variant=True,
                ))
        except Exception:
            pass

    # guarantee at least one result
    if not results:
        results.append(resolve(word, cmu_dict=cmu_dict))

    return results
