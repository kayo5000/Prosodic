"""
aave_phonology.py

African American Vernacular English phonological rule engine for Prosodic.

This module is the first computational tool to formally apply AAVE phonological
rules to lyric analysis. It detects rhyme connections that standard tools miss
entirely — connections that are real, intentional, and central to how hip-hop
and R&B writers hear their own work.

The three core processes implemented here are:

  1. Consonant Cluster Reduction
     Word-final consonant clusters are reduced by deleting the final consonant.
     "past" /P AE1 S T/ → /P AE1 S/, "hand" /HH AE1 N D/ → /HH AE1 N/
     This makes "past" rhyme with "class" and "hand" rhyme with "man".
     Reference: Labov (1972), Chapter 2.

  2. Monophthongization
     The diphthong /AY/ (as in "I", "time", "ride") becomes the monophthong
     /AA/. This is highly systematic in Southern and urban AAVE before voiced
     consonants and word-finally.
     "time" /T AY1 M/ → /T AA1 M/, "I" /AY1/ → /AA1/
     This makes "mine" rhyme with "man" and "time" rhyme with "calm".
     Reference: Labov (1972), pp. 14–15; Thomas (2007).

  3. R-Vocalization (Postvocalic R-Deletion)
     The rhotic /R/ after a vowel is vocalized or deleted entirely, merging
     with the preceding vowel. This is one of the most well-documented AAVE
     features and creates systematic rhyme bridges.
     "more" /M AO1 R/ → /M AO1/, "here" /HH IY1 R/ → /HH IY1/
     "more" now rhymes with "saw", "here" with "see", "four" with "go".
     Reference: Labov (1972), pp. 14–15; Wolfram (1969).

Linguistic grounding:
  Labov, W. (1972). Language in the Inner City: Studies in the Black English
    Vernacular. Philadelphia: University of Pennsylvania Press.
  Labov, W., Cohen, P., Robins, C., & Lewis, J. (1968). A Study of the Non-
    Standard English of Negro and Puerto Rican Speakers in New York City.
    Final Report, U.S. Office of Education Cooperative Research Project No. 3288.
  Thomas, E. R. (2007). Phonological and phonetic characteristics of African
    American Vernacular English. Language and Linguistics Compass, 1(5), 450–475.
  Wolfram, W. (1969). A Sociolinguistic Description of Detroit Negro Speech.
    Washington, DC: Center for Applied Linguistics.

Important note on framing:
  These are not errors or deficiencies. They are systematic, rule-governed
  phonological processes in a fully-developed linguistic variety. Treating
  AAVE variants as valid phonological forms is the position of modern
  sociolinguistics. Prosodic applies them as such.
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# CMU phoneme categories
# ---------------------------------------------------------------------------

# Vowels in CMU Arpabet (base form without stress digit)
_VOWELS = frozenset({
    "AA", "AE", "AH", "AO", "AW", "AY",
    "EH", "ER", "EY", "IH", "IY",
    "OW", "OY", "UH", "UW",
})

# Consonants in CMU Arpabet
_CONSONANTS = frozenset({
    "B", "CH", "D", "DH", "F", "G", "HH",
    "JH", "K", "L", "M", "N", "NG",
    "P", "R", "S", "SH", "T", "TH",
    "V", "W", "Y", "Z", "ZH",
})

# Voiced obstruents — monophthongization is most systematic before these
_VOICED_OBSTRUENTS = frozenset({"B", "D", "G", "DH", "V", "Z", "ZH", "JH"})

# Voiceless obstruents — monophthongization less consistent before these,
# but included in hip-hop context where all pre-consonantal positions apply
_VOICELESS_OBSTRUENTS = frozenset({"P", "T", "K", "F", "TH", "S", "SH", "CH"})


def _base(phoneme: str) -> str:
    """Strip stress digit from a phoneme symbol. 'AH1' → 'AH', 'T' → 'T'."""
    return phoneme[:-1] if phoneme and phoneme[-1].isdigit() else phoneme


def _stress(phoneme: str) -> str:
    """Extract stress digit from a phoneme, or '0' if none."""
    return phoneme[-1] if phoneme and phoneme[-1].isdigit() else "0"


def _is_vowel(phoneme: str) -> bool:
    """Return True if phoneme is a vowel (base form lookup)."""
    return _base(phoneme) in _VOWELS


def _is_consonant(phoneme: str) -> bool:
    """Return True if phoneme is a consonant (base form lookup)."""
    return _base(phoneme) in _CONSONANTS


# ---------------------------------------------------------------------------
# Rule 1: Consonant Cluster Reduction
# ---------------------------------------------------------------------------

# Final clusters eligible for reduction.
# Each tuple is (preceding_consonant, final_consonant_to_delete).
# The final consonant is removed; the preceding consonant remains.
# Only homorganic or common English-final clusters are included —
# this is not exhaustive, but covers the patterns most relevant to lyric rhyme.
_REDUCIBLE_FINAL_CLUSTERS = frozenset({
    # Alveolar stops after alveolars / nasals
    ("S", "T"),   # "past" → "pass", "mist" → "miss", "fist" → "fis"
    ("N", "D"),   # "hand" → "han", "mind" → "mine", "band" → "ban"
    ("L", "D"),   # "cold" → "col", "bold" → "bol", "fold" → "fol"
    ("N", "T"),   # "want" → "wan", "count" → "coun", "front" → "fron"
    ("S", "K"),   # "desk" → "des", "mask" → "mas", "risk" → "ris"
    ("S", "P"),   # "crisp" → "cris", "grasp" → "gras"
    ("F", "T"),   # "left" → "lef", "soft" → "sof", "gift" → "gif"
    ("K", "T"),   # "act" → "ac", "fact" → "fac", "exact" → "exac"
    ("M", "D"),   # "claimed" → "claim"  (past tense cluster)
    ("N", "D"),   # "find" → "fin", "ground" → "groun"
    ("L", "T"),   # "belt" → "bel", "melt" → "mel"
    ("R", "D"),   # "bird" — but R here is part of ER vowel, handled separately
    ("Z", "D"),   # "raised" → "raise", "used" → "use"
    ("V", "D"),   # "loved" → "love", "moved" → "move"
    ("N", "G"),   # less common, but "wing" cluster variation
    ("G", "D"),   # "begged" → "beg"
    ("B", "D"),   # "rubbed" → "rub"
    ("D", "Z"),   # "reads" → "read"
    ("T", "S"),   # "beats" → "beat", "streets" → "street"
    ("P", "T"),   # "ept" cluster: "wept" → "wep", "kept" → "kep"
})


def consonant_cluster_reduction(phonemes: List[str]) -> Optional[List[str]]:
    """
    Apply AAVE consonant cluster reduction to a phoneme sequence.

    Deletes the word-final consonant when the sequence ends in a
    reducible two-consonant cluster (see _REDUCIBLE_FINAL_CLUSTERS).
    Only the final consonant of the cluster is deleted; the preceding
    consonant remains intact.

    This process is variable in naturalistic speech — not every token
    of every cluster is reduced. This function returns the REDUCED form
    unconditionally; the caller decides whether to use it.

    Args:
        phonemes: CMU phoneme list for one word (e.g., ['P','AE1','S','T']).

    Returns:
        Reduced phoneme list if a reduction was applied, or None if no
        eligible cluster was found at the end of the sequence.

    Examples:
        ['P','AE1','S','T'] → ['P','AE1','S']   ("past" → cluster -ST)
        ['HH','AE1','N','D'] → ['HH','AE1','N'] ("hand" → cluster -ND)
        ['K','OW1','L','D']  → ['K','OW1','L']  ("cold" → cluster -LD)
        ['HH','ER1','T']     → None              ("hurt" — single final C)

    Reference:
        Labov (1972), Chapter 2: Contraction, deletion, and variable rules.
    """
    if len(phonemes) < 3:
        return None

    last = _base(phonemes[-1])
    second_last = _base(phonemes[-2])

    # Both must be consonants (not vowels)
    if not _is_consonant(last) or not _is_consonant(second_last):
        return None

    if (second_last, last) in _REDUCIBLE_FINAL_CLUSTERS:
        return list(phonemes[:-1])

    return None


# ---------------------------------------------------------------------------
# Rule 2: Monophthongization
# ---------------------------------------------------------------------------

def monophthongization(phonemes: List[str]) -> Optional[List[str]]:
    """
    Apply AAVE monophthongization: /AY/ → /AA/ glide weakening.

    The diphthong /AY/ (as in "I", "time", "mine", "ride") is the most
    systematically monophthongized vowel in AAVE. The glide /Y/ weakens or
    deletes, leaving a lengthened /AA/. This applies most robustly:
      - Before voiced obstruents ("ride", "mind", "find")
      - Before voiceless obstruents in informal/hip-hop contexts ("time", "nice")
      - In word-final (pre-pausal) position ("I", "my", "by")

    The stress digit is preserved on the output vowel (AY1 → AA1, AY0 → AA0).

    Args:
        phonemes: CMU phoneme list for one word.

    Returns:
        Monophthongized phoneme list if AY is present, or None if no
        monophthongization site was found.

    Examples:
        ['T','AY1','M']       → ['T','AA1','M']   ("time")
        ['M','AY1','N','D']   → ['M','AA1','N','D'] ("mind")
        ['AY1']               → ['AA1']            ("I")
        ['HH','ER1','T']      → None               ("hurt" — no AY)

    Reference:
        Thomas, E. R. (2007). Phonological and phonetic characteristics of AAVE.
        Language and Linguistics Compass, 1(5), 450–475.
        Labov (1972), pp. 14–15.
    """
    result = []
    changed = False

    for ph in phonemes:
        if _base(ph) == "AY":
            # Replace AY with AA, preserving stress digit
            result.append("AA" + _stress(ph))
            changed = True
        else:
            result.append(ph)

    return result if changed else None


# ---------------------------------------------------------------------------
# Rule 3: R-Vocalization (Postvocalic R-Deletion)
# ---------------------------------------------------------------------------

def r_vocalization(phonemes: List[str]) -> Optional[List[str]]:
    """
    Apply AAVE postvocalic r-deletion (r-vocalization).

    In AAVE, /R/ following a vowel is vocalized or deleted. The vowel
    is typically lengthened or slightly modified, but in phoneme-space
    the R simply disappears. This creates systematic rhyme bridges:

      "more"  /M AO1 R/   → /M AO1/    rhymes with "saw"  /S AO1/
      "here"  /HH IY1 R/  → /HH IY1/   rhymes with "see"  /S IY1/
      "four"  /F AO1 R/   → /F AO1/    rhymes with "law"  /L AO1/
      "bear"  /B EH1 R/   → /B EH1/    rhymes with "yeah" /Y EH1/
      "car"   /K AA1 R/   → /K AA1/    rhymes with "spa"  /S P AA1/
      "door"  /D AO1 R/   → /D AO1/    rhymes with "raw"  /R AO1/

    The ER vowel (r-colored vowel) is handled separately: /ER/ becomes /AH/
    when followed by nothing (word-final), creating the well-documented
    AAVE merger of ER and AH vowels in words like "bird" and "bud".
    This is the rule behind the "hurt/cut", "word/blood" rhyme family.

    Args:
        phonemes: CMU phoneme list for one word.

    Returns:
        R-vocalized phoneme list if any eligible R was removed, or None
        if no postvocalic R was found.

    Examples:
        ['M','AO1','R']      → ['M','AO1']       ("more")
        ['HH','IY1','R']     → ['HH','IY1']      ("here")
        ['B','ER1','D']      → ['B','AH1','D']   ("bird" — ER → AH)
        ['HH','ER1','T']     → ['HH','AH1','T']  ("hurt" — ER → AH)
        ['K','AE1','T']      → None              ("cat" — no R)

    Reference:
        Labov et al. (1968). A Study of the Non-Standard English of
        Negro and Puerto Rican Speakers in New York City.
        Wolfram, W. (1969). A Sociolinguistic Description of Detroit Negro Speech.
    """
    result = []
    changed = False
    i = 0

    while i < len(phonemes):
        ph = phonemes[i]

        # ER vowel (r-colored): word-finally or followed by consonant → AH
        # This models the "bird"/"bud", "hurt"/"cut" merger
        if _base(ph) == "ER":
            stress_digit = _stress(ph)
            # Check what follows
            next_base = _base(phonemes[i + 1]) if i + 1 < len(phonemes) else None
            if next_base is None or next_base in _CONSONANTS:
                # ER in coda position → AH (postvocalic R absorbed into vowel → plain schwa)
                result.append("AH" + stress_digit)
                changed = True
                i += 1
                continue

        # Standalone R following a vowel: delete the R
        if _base(ph) == "R":
            if result and _is_vowel(result[-1]):
                # This R is postvocalic — delete it
                changed = True
                i += 1
                continue

        result.append(ph)
        i += 1

    return result if changed else None


# ---------------------------------------------------------------------------
# Variant generation
# ---------------------------------------------------------------------------

def get_aave_variants(phonemes: List[str]) -> List[List[str]]:
    """
    Generate all valid AAVE phonological variants of a phoneme sequence.

    Applies consonant cluster reduction, monophthongization, and
    r-vocalization independently and in combination. Returns every
    distinct variant produced, not including the original input.

    Args:
        phonemes: Standard CMU phoneme list for one word.

    Returns:
        List of variant phoneme lists. May be empty if no rules apply.
        Each variant is a distinct list — duplicates are removed.

    Examples:
        "past" → [['P','AE1','S']]           (cluster reduction only)
        "mind" → [['M','AA1','N','D'],        (monophthong)
                  ['M','AY1','N'],             (cluster reduction)
                  ['M','AA1','N']]             (both)
        "more" → [['M','AO1']]               (r-deletion)
        "bird" → [['B','AH1','D']]           (ER → AH)
    """
    variants = []
    seen = set()

    def _add(v: Optional[List[str]]) -> None:
        """Add variant if not None and not already seen."""
        if v is not None:
            key = tuple(v)
            if key not in seen and key != tuple(phonemes):
                seen.add(key)
                variants.append(v)

    # Single-rule applications
    ccr = consonant_cluster_reduction(phonemes)
    mono = monophthongization(phonemes)
    rvoc = r_vocalization(phonemes)

    _add(ccr)
    _add(mono)
    _add(rvoc)

    # Two-rule combinations
    if ccr is not None:
        _add(monophthongization(ccr))
        _add(r_vocalization(ccr))

    if mono is not None:
        _add(consonant_cluster_reduction(mono))
        _add(r_vocalization(mono))

    if rvoc is not None:
        _add(consonant_cluster_reduction(rvoc))
        _add(monophthongization(rvoc))

    # Three-rule combination
    if ccr is not None and mono is not None:
        combo = r_vocalization(mono)
        if combo:
            _add(consonant_cluster_reduction(combo))

    return variants


def get_all_pronunciations(
    word: str,
    cmu_dict: Optional[Dict[str, List[List[str]]]] = None,
) -> List[Dict]:
    """
    Return all pronunciations of a word — both standard and AAVE variants.

    Looks up the word in the CMU dict (if provided), then generates AAVE
    variants of each pronunciation. Returns a list of dicts with source labels
    so the caller knows which pronunciations are standard vs AAVE-derived.

    Args:
        word:     The word to look up (case-insensitive).
        cmu_dict: Optional CMU dict mapping word → list of phoneme lists.
                  If None, attempts to load from NLTK cmudict automatically.
                  If NLTK is unavailable, returns empty list.

    Returns:
        List of dicts, each with:
            phonemes: List[str] — the phoneme sequence
            source:   str — 'cmu_standard', 'aave_ccr', 'aave_mono',
                            'aave_rvoc', or 'aave_combined'
            word:     str — the original word (lowercased)

    Example:
        get_all_pronunciations("more") →
            [{'phonemes': ['M','AO1','R'], 'source': 'cmu_standard', 'word': 'more'},
             {'phonemes': ['M','AO1'],    'source': 'aave_rvoc',     'word': 'more'}]
    """
    word_lower = word.lower()

    # Load cmudict if not provided
    if cmu_dict is None:
        cmu_dict = _load_cmudict_lazy()

    pronunciations = []

    standard_forms = cmu_dict.get(word_lower, [])
    if not standard_forms:
        return []

    for ph_list in standard_forms:
        pronunciations.append({
            "phonemes": list(ph_list),
            "source": "cmu_standard",
            "word": word_lower,
        })

        # Generate AAVE variants of this pronunciation
        variants = get_aave_variants(ph_list)
        for variant in variants:
            source = _label_variant_source(ph_list, variant)
            pronunciations.append({
                "phonemes": variant,
                "source": source,
                "word": word_lower,
            })

    # Deduplicate by phoneme sequence
    seen: set = set()
    unique = []
    for p in pronunciations:
        key = tuple(p["phonemes"])
        if key not in seen:
            seen.add(key)
            unique.append(p)

    return unique


def _label_variant_source(original: List[str], variant: List[str]) -> str:
    """
    Infer a source label for an AAVE variant by comparing it to the original.

    Checks which rules were applied by comparing key structural features.
    Returns the most specific label that applies; defaults to 'aave_combined'
    for multi-rule variants.
    """
    orig_set = set(original)
    var_set = set(variant)

    has_r_change = (
        any(_base(p) == "R" for p in original) and
        not any(_base(p) == "R" for p in variant)
    ) or (
        any(_base(p) == "ER" for p in original) and
        any(_base(p) == "AH" for p in variant)
    )

    has_mono = (
        any(_base(p) == "AY" for p in original) and
        any(_base(p) == "AA" for p in variant)
    )

    has_ccr = (
        len(variant) < len(original) and
        not has_r_change
    )

    rules_applied = sum([has_r_change, has_mono, has_ccr])

    if rules_applied > 1:
        return "aave_combined"
    if has_r_change:
        return "aave_rvoc"
    if has_mono:
        return "aave_mono"
    if has_ccr:
        return "aave_ccr"
    return "aave_combined"


# ---------------------------------------------------------------------------
# Rhyme unit helper (mirrors data_generator logic, no import dependency)
# ---------------------------------------------------------------------------

def _rhyme_unit(phonemes: List[str]) -> Tuple[str, ...]:
    """
    Extract the rhyme-bearing unit of a phoneme sequence.

    Returns phonemes from the last primary-stressed vowel to end of sequence.
    Stress digits are stripped for comparison (AH1 → AH).
    """
    stressed = [i for i, p in enumerate(phonemes) if p and p[-1] in "12"]
    if stressed:
        return tuple(_base(p) for p in phonemes[stressed[-1]:])
    any_vowel = [i for i, p in enumerate(phonemes) if p and p[-1].isdigit()]
    if any_vowel:
        return tuple(_base(p) for p in phonemes[any_vowel[-1]:])
    return tuple(_base(p) for p in phonemes)


# ---------------------------------------------------------------------------
# AAVE Rhyme Bridge
# ---------------------------------------------------------------------------

def aave_rhyme_bridge(
    phonemes_a: List[str],
    phonemes_b: List[str],
    threshold: float = 0.5,
) -> bool:
    """
    Return True if two words rhyme under ANY valid AAVE phonological variant.

    Compares all pairs of pronunciations (standard + AAVE variants) for both
    words. Returns True as soon as any pair has a rhyme unit overlap score
    above the threshold. This is the permissive check — it asks "can these
    words rhyme in a performed AAVE context?" rather than "do they rhyme
    in the standard dictionary?"

    The threshold controls sensitivity. At 0.5, sequences sharing more than
    half their rhyme unit phonemes (Jaccard) are counted as rhyming. At 1.0,
    only identical rhyme units count.

    Args:
        phonemes_a:  CMU phoneme list for word A (standard pronunciation).
        phonemes_b:  CMU phoneme list for word B (standard pronunciation).
        threshold:   Jaccard overlap threshold for rhyme unit matching [0.0–1.0].
                     Default 0.5 — matches the slant/perfect boundary.

    Returns:
        True if any variant pair meets the rhyme threshold.

    Examples:
        aave_rhyme_bridge(['M','AO1','R'], ['S','AO1'])    → True
          ("more" r-vocalized → /M AO1/ matches "saw" /S AO1/)
        aave_rhyme_bridge(['HH','ER1','T'], ['K','AH1','T']) → True
          ("hurt" ER→AH → /HH AH1 T/ matches "cut" /K AH1 T/)
        aave_rhyme_bridge(['P','AE1','S','T'], ['K','L','AE1','S']) → True
          ("past" CCR → /P AE1 S/ rhyme unit AE S matches "class" AE S)

    Reference:
        Labov (1972); Wolfram (1969).
    """
    # Build the full set of pronunciation variants for each word
    forms_a = [phonemes_a] + get_aave_variants(phonemes_a)
    forms_b = [phonemes_b] + get_aave_variants(phonemes_b)

    for fa in forms_a:
        ru_a = _rhyme_unit(fa)
        for fb in forms_b:
            ru_b = _rhyme_unit(fb)

            if not ru_a or not ru_b:
                continue

            # Jaccard overlap on rhyme units
            set_a = set(ru_a)
            set_b = set(ru_b)
            union = set_a | set_b
            if not union:
                continue
            overlap = len(set_a & set_b) / len(union)

            if overlap >= threshold:
                return True

    return False


# ---------------------------------------------------------------------------
# Lazy cmudict loader (avoids hard dependency at import time)
# ---------------------------------------------------------------------------

_cmudict_cache: Optional[Dict[str, List[List[str]]]] = None


def _load_cmudict_lazy() -> Dict[str, List[List[str]]]:
    """
    Load NLTK cmudict on first call and cache it module-level.

    Returns empty dict if NLTK is unavailable — callers degrade gracefully.
    This avoids forcing an NLTK download at import time.
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
