"""
data_generator.py

Synthetic training data generator for the Prosodic RhymeSimilarityModel.

Generates labeled phoneme pair examples from two sources:
  1. CMU Pronouncing Dictionary — 10,000 pairs across four rhyme categories
  2. Datamuse API               — 2,000 additional labeled pairs

Output: training_data.json — ~12,000+ pairs ready for train_rhyme_model.py

Pair categories:
    perfect  (3,000): identical rhyme unit (vowel nucleus + coda)
    slant    (3,000): same vowel nucleus, different or partial coda
    near     (2,000): some rhyme unit phoneme overlap, not perfect/slant
    none     (2,000): no meaningful phoneme overlap in rhyme unit
              └─ includes 200 spelling-similar but phonetically different pairs

Target similarity scores used as soft labels:
    perfect → 0.95
    slant   → 0.65
    near    → 0.35
    none    → 0.05

Run time estimate: 5–10 minutes on local machine (Datamuse API calls are the bottleneck).
Run: python data_generator.py
"""

import json
import random
import sys
import time
import urllib.request
import urllib.parse
from collections import defaultdict
from typing import Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# NLTK cmudict — downloaded automatically on first use
# ---------------------------------------------------------------------------

def _load_cmudict() -> Dict[str, List[List[str]]]:
    """
    Load the CMU Pronouncing Dictionary via NLTK.

    Downloads cmudict automatically if not already present.
    Returns a dict mapping lowercase word → list of phoneme sequences
    (a word may have multiple pronunciations).
    """
    try:
        import nltk
    except ImportError:
        print("ERROR: nltk not installed. Run: pip install nltk")
        sys.exit(1)

    try:
        from nltk.corpus import cmudict
        cmudict.entries()  # trigger load to check if downloaded
    except LookupError:
        print("Downloading NLTK cmudict...")
        nltk.download("cmudict", quiet=True)
        from nltk.corpus import cmudict

    raw = defaultdict(list)
    for word, phones in cmudict.entries():
        raw[word.lower()].append(phones)
    return dict(raw)


# ---------------------------------------------------------------------------
# Phoneme helpers
# ---------------------------------------------------------------------------

def _rhyme_unit(phonemes: List[str]) -> Tuple[str, ...]:
    """
    Extract the rhyme-bearing unit: from the last primary-stressed vowel to end.

    In CMU notation, vowels carry a stress digit (0, 1, 2). We seek the last
    vowel that carries primary (1) or secondary (2) stress, then return from
    that phoneme to the end of the sequence.

    Falls back to the last vowel of any stress level if no stressed vowel found.
    Returns empty tuple if no vowel found at all.
    """
    stressed_indices = [i for i, p in enumerate(phonemes) if p and p[-1] in "12"]
    if stressed_indices:
        return tuple(phonemes[stressed_indices[-1]:])

    any_vowel = [i for i, p in enumerate(phonemes) if p and p[-1].isdigit()]
    if any_vowel:
        return tuple(phonemes[any_vowel[-1]:])

    return tuple()


def _vowel_nucleus(rhyme_unit: Tuple[str, ...]) -> str:
    """Extract just the vowel from a rhyme unit (first element if it's a vowel)."""
    if rhyme_unit and rhyme_unit[0][-1].isdigit():
        # Strip stress digit for nucleus comparison (AH1 → AH, ER0 → ER)
        return rhyme_unit[0][:-1]
    return ""


def _phoneme_overlap(ru_a: Tuple[str, ...], ru_b: Tuple[str, ...]) -> float:
    """
    Jaccard overlap score between two rhyme units.

    Strips stress digits before comparison so AH1 matches AH0.
    """
    if not ru_a or not ru_b:
        return 0.0
    norm_a = {p[:-1] if p[-1].isdigit() else p for p in ru_a}
    norm_b = {p[:-1] if p[-1].isdigit() else p for p in ru_b}
    intersection = norm_a & norm_b
    union = norm_a | norm_b
    return len(intersection) / len(union) if union else 0.0


# ---------------------------------------------------------------------------
# Pair generation from CMU dict
# ---------------------------------------------------------------------------

def _build_rhyme_index(cmu: Dict[str, List[List[str]]]) -> Dict[Tuple, List[str]]:
    """
    Build a reverse index: rhyme_unit → [words with that rhyme unit].

    Uses only the first pronunciation for each word. Single-phoneme words
    and very rare units (fewer than 2 words) are excluded.
    """
    index: Dict[Tuple, List[str]] = defaultdict(list)
    for word, pronunciations in cmu.items():
        phones = pronunciations[0]
        ru = _rhyme_unit(phones)
        if len(ru) >= 1:
            index[ru].append(word)
    # Keep only units with at least 2 words (needed to form pairs)
    return {ru: words for ru, words in index.items() if len(words) >= 2}


def _build_nucleus_index(
    rhyme_index: Dict[Tuple, List[str]]
) -> Dict[str, List[Tuple]]:
    """
    Build a nucleus index: vowel_nucleus → [rhyme_units with that nucleus].

    Used to find slant rhyme candidates: same vowel, different coda.
    """
    nucleus_idx: Dict[str, List[Tuple]] = defaultdict(list)
    for ru in rhyme_index:
        nucleus = _vowel_nucleus(ru)
        if nucleus:
            nucleus_idx[nucleus].append(ru)
    return {n: units for n, units in nucleus_idx.items() if len(units) >= 2}


def generate_perfect_pairs(
    cmu: Dict[str, List[List[str]]],
    rhyme_index: Dict[Tuple, List[str]],
    target: int = 3000,
    rng: random.Random = None,
) -> List[dict]:
    """
    Generate perfect rhyme pairs: words sharing an identical rhyme unit.

    Each pair has similarity_score=0.95 (near-perfect; 1.0 reserved for
    exact homophone matches which are less useful as training signal).

    Args:
        cmu:         CMU dict (word → pronunciations).
        rhyme_index: Prebuilt rhyme_unit → [words] index.
        target:      Number of pairs to generate.
        rng:         Optional seeded Random instance for reproducibility.

    Returns:
        List of pair dicts with keys: word_a, word_b, phonemes_a, phonemes_b,
        label, similarity_score, source.
    """
    if rng is None:
        rng = random.Random(42)

    pairs = []
    seen = set()
    units = [ru for ru, words in rhyme_index.items() if len(words) >= 2]
    rng.shuffle(units)

    for ru in units:
        if len(pairs) >= target:
            break
        words = rhyme_index[ru]
        rng.shuffle(words)
        for i in range(len(words)):
            if len(pairs) >= target:
                break
            for j in range(i + 1, len(words)):
                if len(pairs) >= target:
                    break
                wa, wb = words[i], words[j]
                key = (min(wa, wb), max(wa, wb))
                if key in seen:
                    continue
                seen.add(key)
                ph_a = cmu[wa][0]
                ph_b = cmu[wb][0]
                pairs.append({
                    "word_a": wa,
                    "word_b": wb,
                    "phonemes_a": ph_a,
                    "phonemes_b": ph_b,
                    "label": "perfect",
                    "similarity_score": 0.95,
                    "source": "cmu_synthetic",
                })

    return pairs


def generate_slant_pairs(
    cmu: Dict[str, List[List[str]]],
    rhyme_index: Dict[Tuple, List[str]],
    nucleus_index: Dict[str, List[Tuple]],
    target: int = 3000,
    rng: random.Random = None,
) -> List[dict]:
    """
    Generate slant rhyme pairs: same vowel nucleus, different coda.

    Slant rhymes are the hardest category for rule-based systems and
    the highest-value training signal for the Siamese model. Examples:
    'mind'/'time' (AY nucleus, different coda), 'done'/'rum' (AH nucleus).

    Args:
        cmu:           CMU dict.
        rhyme_index:   rhyme_unit → [words] index.
        nucleus_index: vowel_nucleus → [rhyme_units] index.
        target:        Number of pairs to generate.
        rng:           Optional seeded Random.

    Returns:
        List of pair dicts with label='slant', similarity_score=0.65.
    """
    if rng is None:
        rng = random.Random(43)

    pairs = []
    seen = set()
    nuclei = list(nucleus_index.keys())
    rng.shuffle(nuclei)

    for nucleus in nuclei:
        if len(pairs) >= target:
            break
        units = nucleus_index[nucleus]
        if len(units) < 2:
            continue
        rng.shuffle(units)
        for i in range(len(units)):
            if len(pairs) >= target:
                break
            for j in range(i + 1, len(units)):
                if len(pairs) >= target:
                    break
                ru_a, ru_b = units[i], units[j]
                if ru_a == ru_b:
                    continue
                words_a = rhyme_index.get(ru_a, [])
                words_b = rhyme_index.get(ru_b, [])
                if not words_a or not words_b:
                    continue
                wa = rng.choice(words_a)
                wb = rng.choice(words_b)
                key = (min(wa, wb), max(wa, wb))
                if key in seen:
                    continue
                seen.add(key)
                pairs.append({
                    "word_a": wa,
                    "word_b": wb,
                    "phonemes_a": cmu[wa][0],
                    "phonemes_b": cmu[wb][0],
                    "label": "slant",
                    "similarity_score": 0.65,
                    "source": "cmu_synthetic",
                })

    return pairs


def generate_near_pairs(
    cmu: Dict[str, List[List[str]]],
    rhyme_index: Dict[Tuple, List[str]],
    target: int = 2000,
    perfect_seen: set = None,
    slant_seen: set = None,
    rng: random.Random = None,
) -> List[dict]:
    """
    Generate near rhyme pairs: partial rhyme unit overlap, not perfect or slant.

    Near rhymes have some phoneme overlap in the rhyme unit but do not share
    the full nucleus. Examples: 'love'/'move', 'breath'/'death'.
    Jaccard overlap target: 0.15 – 0.55.

    Args:
        cmu:          CMU dict.
        rhyme_index:  rhyme_unit → [words] index.
        target:       Number of pairs to generate.
        perfect_seen: Set of (word_a, word_b) keys to avoid duplicating.
        slant_seen:   Set of (word_a, word_b) keys to avoid duplicating.
        rng:          Optional seeded Random.

    Returns:
        List of pair dicts with label='near', similarity_score=0.35.
    """
    if rng is None:
        rng = random.Random(44)

    avoid = set()
    if perfect_seen:
        avoid |= perfect_seen
    if slant_seen:
        avoid |= slant_seen

    all_words = list(cmu.keys())
    rng.shuffle(all_words)

    pairs = []
    seen = set()
    attempts = 0
    max_attempts = target * 40

    while len(pairs) < target and attempts < max_attempts:
        attempts += 1
        wa = rng.choice(all_words)
        wb = rng.choice(all_words)
        if wa == wb:
            continue
        key = (min(wa, wb), max(wa, wb))
        if key in seen or key in avoid:
            continue

        ph_a = cmu[wa][0]
        ph_b = cmu[wb][0]
        ru_a = _rhyme_unit(ph_a)
        ru_b = _rhyme_unit(ph_b)

        if not ru_a or not ru_b:
            continue

        overlap = _phoneme_overlap(ru_a, ru_b)
        if 0.15 <= overlap <= 0.55:
            seen.add(key)
            pairs.append({
                "word_a": wa,
                "word_b": wb,
                "phonemes_a": ph_a,
                "phonemes_b": ph_b,
                "label": "near",
                "similarity_score": 0.35,
                "source": "cmu_synthetic",
            })

    return pairs


def generate_no_rhyme_pairs(
    cmu: Dict[str, List[List[str]]],
    target: int = 1800,
    avoid: set = None,
    rng: random.Random = None,
) -> List[dict]:
    """
    Generate true no-rhyme pairs: phoneme sequences with no meaningful overlap.

    Jaccard overlap < 0.10. These are crucial for the model to learn the
    negative space — what does NOT rhyme.

    Args:
        cmu:    CMU dict.
        target: Number of pairs to generate (not counting spelling-similar batch).
        avoid:  Set of (word_a, word_b) keys already used in other categories.
        rng:    Optional seeded Random.

    Returns:
        List of pair dicts with label='none', similarity_score=0.05.
    """
    if rng is None:
        rng = random.Random(45)

    all_words = list(cmu.keys())
    rng.shuffle(all_words)

    pairs = []
    seen = set()
    avoid_set = avoid or set()
    attempts = 0
    max_attempts = target * 30

    while len(pairs) < target and attempts < max_attempts:
        attempts += 1
        wa = rng.choice(all_words)
        wb = rng.choice(all_words)
        if wa == wb:
            continue
        key = (min(wa, wb), max(wa, wb))
        if key in seen or key in avoid_set:
            continue

        ph_a = cmu[wa][0]
        ph_b = cmu[wb][0]
        ru_a = _rhyme_unit(ph_a)
        ru_b = _rhyme_unit(ph_b)

        if not ru_a or not ru_b:
            continue

        overlap = _phoneme_overlap(ru_a, ru_b)
        if overlap < 0.10:
            seen.add(key)
            pairs.append({
                "word_a": wa,
                "word_b": wb,
                "phonemes_a": ph_a,
                "phonemes_b": ph_b,
                "label": "none",
                "similarity_score": 0.05,
                "source": "cmu_synthetic",
            })

    return pairs


def generate_spelling_similar_pairs(
    cmu: Dict[str, List[List[str]]],
    target: int = 200,
    rng: random.Random = None,
) -> List[dict]:
    """
    Generate spelling-similar but phonetically different pairs for the no-rhyme set.

    These are adversarial examples — pairs that look like they should rhyme
    based on spelling but do not rhyme phonetically. Examples:
        'cough' / 'rough'   → AO vs AH (different vowel)
        'through' / 'though' → UW vs OW (different vowel)
        'beard' / 'heard'   → IH R vs ER (AAVE-adjacent but different)
        'love' / 'move'     → AH vs UW
        'word' / 'cord'     → ER vs AO R

    Algorithmic approach: find word pairs with edit distance ≤ 3 on spelling
    but rhyme unit phoneme overlap < 0.20.

    Args:
        cmu:    CMU dict.
        target: Number of pairs to generate.
        rng:    Optional seeded Random.

    Returns:
        List of pair dicts with label='none', similarity_score=0.05,
        source='spelling_similar_adversarial'.
    """
    if rng is None:
        rng = random.Random(46)

    # Curated seed pairs — known spelling-similar phonetic mismatches
    # These are high-confidence adversarial examples
    CURATED = [
        ("cough",   "rough"),    # AO F  vs AH F
        ("through", "though"),   # UW    vs OW
        ("through", "tough"),    # UW    vs AH F
        ("love",    "move"),     # AH V  vs UW V
        ("love",    "prove"),    # AH V  vs UW V
        ("word",    "cord"),     # ER D  vs AO R D
        ("heard",   "beard"),    # ER D  vs IH R D
        ("bear",    "fear"),     # EH R  vs IH R
        ("break",   "freak"),    # EY K  vs IY K
        ("blood",   "mood"),     # AH D  vs UW D
        ("flood",   "mood"),     # AH D  vs UW D
        ("dead",    "bead"),     # EH D  vs IY D
        ("said",    "maid"),     # EH D  vs EY D
        ("head",    "bead"),     # EH D  vs IY D
        ("bread",   "bead"),     # EH D  vs IY D
        ("swear",   "fear"),     # EH R  vs IH R
        ("steak",   "freak"),    # EY K  vs IY K
        ("great",   "treat"),    # EY T  vs IY T
        ("bear",    "beer"),     # EH R  vs IH R
        ("wear",    "hear"),     # EH R  vs IH R
        ("pear",    "peer"),     # EH R  vs IH R
        ("care",    "here"),     # EH R  vs IH R
        ("fare",    "fire"),     # EH R  vs AY R
        ("gone",    "bone"),     # AO N  vs OW N
        ("done",    "bone"),     # AH N  vs OW N
        ("none",    "bone"),     # AH N  vs OW N
        ("son",     "bone"),     # AH N  vs OW N
        ("come",    "home"),     # AH M  vs OW M
        ("some",    "home"),     # AH M  vs OW M
        ("dove",    "move"),     # AH V  vs UW V
        ("glove",   "groove"),   # AH V  vs UW V
        ("above",   "groove"),   # AH V  vs UW V
        ("of",      "off"),      # AH V  vs AO F
        ("have",    "gave"),     # AE V  vs EY V
        ("live",    "hive"),     # IH V  vs AY V
        ("wind",    "kind"),     # IH N D vs AY N D
        ("wind",    "find"),     # IH N D vs AY N D
        ("read",    "bead"),     # EH D  vs IY D  (past tense read)
        ("lead",    "bead"),     # EH D  vs IY D  (metal lead)
        ("tear",    "fear"),     # EH R  vs IH R  (cry)
        ("sow",     "cow"),      # OW    vs AW
        ("row",     "cow"),      # OW    vs AW
        ("bow",     "cow"),      # AW    vs AW — actually same, skip
        ("plow",    "low"),      # AW    vs OW
        ("most",    "cost"),     # OW S T vs AO S T
        ("post",    "cost"),     # OW S T vs AO S T
        ("host",    "lost"),     # OW S T vs AO S T
        ("ghost",   "cost"),     # OW S T vs AO S T
        ("both",    "cloth"),    # OW TH vs AO TH
        ("growth",  "cloth"),    # OW TH vs AO TH
    ]

    pairs = []
    seen = set()

    # Add curated pairs first
    for wa, wb in CURATED:
        if len(pairs) >= target:
            break
        if wa not in cmu or wb not in cmu:
            continue
        key = (min(wa, wb), max(wa, wb))
        if key in seen:
            continue

        ph_a = cmu[wa][0]
        ph_b = cmu[wb][0]
        ru_a = _rhyme_unit(ph_a)
        ru_b = _rhyme_unit(ph_b)
        overlap = _phoneme_overlap(ru_a, ru_b)

        # Only keep if they genuinely don't rhyme
        if overlap < 0.35:
            seen.add(key)
            pairs.append({
                "word_a": wa,
                "word_b": wb,
                "phonemes_a": ph_a,
                "phonemes_b": ph_b,
                "label": "none",
                "similarity_score": 0.05,
                "source": "spelling_similar_adversarial",
            })

    # Fill remaining target with algorithmically-found spelling-similar pairs
    if len(pairs) < target:
        short_words = [w for w in cmu if 3 <= len(w) <= 7]
        rng.shuffle(short_words)

        for i, wa in enumerate(short_words):
            if len(pairs) >= target:
                break
            for wb in short_words[i + 1: i + 50]:  # check nearby words
                if len(pairs) >= target:
                    break
                key = (min(wa, wb), max(wa, wb))
                if key in seen:
                    continue
                if abs(len(wa) - len(wb)) > 2:
                    continue
                if _levenshtein(wa, wb) > 3:
                    continue

                ph_a = cmu[wa][0]
                ph_b = cmu[wb][0]
                ru_a = _rhyme_unit(ph_a)
                ru_b = _rhyme_unit(ph_b)
                overlap = _phoneme_overlap(ru_a, ru_b)

                if overlap < 0.15:
                    seen.add(key)
                    pairs.append({
                        "word_a": wa,
                        "word_b": wb,
                        "phonemes_a": ph_a,
                        "phonemes_b": ph_b,
                        "label": "none",
                        "similarity_score": 0.05,
                        "source": "spelling_similar_adversarial",
                    })

    return pairs[:target]


def _levenshtein(a: str, b: str) -> int:
    """
    Compute Levenshtein edit distance between two strings.

    Used to find spelling-similar word pairs for the adversarial no-rhyme set.
    """
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    dp = list(range(len(b) + 1))
    for i, ca in enumerate(a):
        ndp = [i + 1]
        for j, cb in enumerate(b):
            cost = 0 if ca == cb else 1
            ndp.append(min(ndp[j] + 1, dp[j + 1] + 1, dp[j] + cost))
        dp = ndp
    return dp[-1]


# ---------------------------------------------------------------------------
# Datamuse API fetch
# ---------------------------------------------------------------------------

def fetch_datamuse_pairs(
    target: int = 2000,
    delay_seconds: float = 0.15,
) -> List[dict]:
    """
    Fetch labeled rhyme pairs from the Datamuse API.

    Uses two Datamuse endpoints:
      - rel_rhy: perfect rhymes — labeled 'perfect', score 0.95
      - rel_nry: near rhymes    — labeled 'near',    score 0.35

    Queries a set of seed words drawn from common English vocabulary.
    Respects rate limiting with a configurable delay between requests.

    Args:
        target:        Total pairs to collect (split ~60% perfect, ~40% near).
        delay_seconds: Pause between API calls to avoid rate-limiting.

    Returns:
        List of pair dicts with source='datamuse'.
        Returns partial results on network failure — never raises.
    """
    BASE_URL = "https://api.datamuse.com/words"

    SEED_WORDS = [
        # High-frequency rhyme seeds from hip-hop vocabulary
        "day", "way", "say", "play", "stay", "away", "pray",
        "night", "right", "fight", "light", "sight", "might", "tight",
        "time", "rhyme", "climb", "crime", "prime", "dime", "lime",
        "mind", "find", "kind", "blind", "grind", "behind", "remind",
        "life", "wife", "knife", "strife",
        "love", "above", "dove", "shove",
        "real", "feel", "deal", "heal", "steal", "reveal", "appeal",
        "fire", "desire", "inspire", "higher", "wire", "entire",
        "pain", "rain", "gain", "brain", "chain", "plain", "remain",
        "soul", "role", "whole", "control", "goal", "stroll", "scroll",
        "free", "see", "be", "me", "key", "agree", "degree",
        "flow", "know", "show", "grow", "below", "radio", "although",
        "deep", "sleep", "keep", "leap", "speak", "peak", "seek",
        "cold", "bold", "gold", "hold", "told", "old", "fold",
        "hard", "yard", "card", "guard", "scarred", "barred",
        "words", "birds", "herds", "thirds",
        "work", "hurt", "birth", "worth", "earth", "search", "church",
        "gone", "on", "strong", "long", "wrong", "along", "beyond",
        "king", "ring", "sing", "bring", "thing", "spring", "swing",
        "name", "game", "fame", "same", "blame", "claim", "flame",
        "voice", "choice", "noise", "rejoice",
        "power", "tower", "hour", "flower", "shower",
        "dream", "team", "seem", "stream", "extreme", "supreme",
        "blood", "flood", "mud", "bud", "stud",
        "grace", "face", "place", "race", "space", "embrace", "erase",
        "truth", "youth", "proof", "roof",
        "break", "take", "make", "fake", "shake", "mistake", "awake",
        "lost", "cost", "frost", "tossed", "crossed",
        "run", "gun", "sun", "fun", "done", "none", "begun",
        "high", "sky", "fly", "try", "cry", "why", "deny", "reply",
        "home", "alone", "bone", "stone", "phone", "zone", "throne",
        "back", "track", "black", "crack", "lack", "attack", "impact",
    ]

    perfect_target = int(target * 0.60)
    near_target = target - perfect_target

    pairs = []
    seen = set()

    def _fetch(word: str, rel: str, label: str, score: float) -> List[dict]:
        """Fetch words related to `word` under relation `rel` from Datamuse."""
        results = []
        try:
            params = urllib.parse.urlencode({"rel_" + rel: word, "max": 20})
            url = f"{BASE_URL}?{params}"
            req = urllib.request.Request(url, headers={"User-Agent": "Prosodic/1.0"})
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            for entry in data:
                related = entry.get("word", "").lower()
                if not related or related == word:
                    continue
                key = (min(word, related), max(word, related))
                if key in seen:
                    continue
                seen.add(key)
                results.append({
                    "word_a": word,
                    "word_b": related,
                    "phonemes_a": [],   # populated below if word in cmudict
                    "phonemes_b": [],
                    "label": label,
                    "similarity_score": score,
                    "source": "datamuse",
                })
        except Exception:
            pass  # Network failure — return what we have
        return results

    print("  Fetching perfect rhymes from Datamuse API...")
    rng = random.Random(47)
    seeds = list(SEED_WORDS)
    rng.shuffle(seeds)

    for word in seeds:
        if len([p for p in pairs if p["label"] == "perfect"]) >= perfect_target:
            break
        new_pairs = _fetch(word, "rhy", "perfect", 0.95)
        pairs.extend(new_pairs)
        time.sleep(delay_seconds)

    print(f"  Perfect pairs from Datamuse: {len([p for p in pairs if p['label'] == 'perfect'])}")

    print("  Fetching near rhymes from Datamuse API...")
    rng.shuffle(seeds)
    for word in seeds:
        if len([p for p in pairs if p["label"] == "near"]) >= near_target:
            break
        new_pairs = _fetch(word, "nry", "near", 0.35)
        pairs.extend(new_pairs)
        time.sleep(delay_seconds)

    print(f"  Near pairs from Datamuse: {len([p for p in pairs if p['label'] == 'near'])}")

    return pairs[:target] if len(pairs) > target else pairs


# ---------------------------------------------------------------------------
# Merge and save
# ---------------------------------------------------------------------------

def save_training_data(
    all_pairs: List[dict],
    output_path: str = "training_data.json",
) -> None:
    """
    Merge all pair lists, shuffle, and save to training_data.json.

    The output JSON has the structure:
        {
          "pairs": [ {word_a, word_b, phonemes_a, phonemes_b,
                      label, similarity_score, source}, ... ],
          "summary": { "total", "by_label", "by_source" },
          "generated_at": ISO timestamp
        }

    Args:
        all_pairs:   Combined list of all generated pairs.
        output_path: Filesystem path to write the JSON file.
    """
    import datetime

    rng = random.Random(99)
    rng.shuffle(all_pairs)

    by_label: Dict[str, int] = {}
    by_source: Dict[str, int] = {}
    for p in all_pairs:
        by_label[p["label"]] = by_label.get(p["label"], 0) + 1
        by_source[p["source"]] = by_source.get(p["source"], 0) + 1

    output = {
        "pairs": all_pairs,
        "summary": {
            "total": len(all_pairs),
            "by_label": by_label,
            "by_source": by_source,
        },
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f)

    print(f"\nSaved {len(all_pairs)} pairs to {output_path}")


def _print_summary(all_pairs: List[dict]) -> None:
    """Print a human-readable generation summary to stdout."""
    by_label: Dict[str, int] = {}
    by_source: Dict[str, int] = {}
    for p in all_pairs:
        by_label[p["label"]] = by_label.get(p["label"], 0) + 1
        by_source[p["source"]] = by_source.get(p["source"], 0) + 1

    print("\n" + "=" * 52)
    print("PROSODIC — Training Data Generation Complete")
    print("=" * 52)
    print(f"  Total pairs:      {len(all_pairs):,}")
    print()
    print("  By label:")
    for label in ["perfect", "slant", "near", "none"]:
        count = by_label.get(label, 0)
        bar = "#" * (count // 100)
        print(f"    {label:<10} {count:>6,}  {bar}")
    print()
    print("  By source:")
    for source, count in sorted(by_source.items(), key=lambda x: -x[1]):
        print(f"    {source:<35} {count:>6,}")
    print("=" * 52)

    adversarial = sum(
        1 for p in all_pairs
        if p["source"] == "spelling_similar_adversarial"
    )
    print(f"  Adversarial no-rhyme pairs: {adversarial}")
    print()
    print("  Next step: python train_rhyme_model.py")
    print("  (Estimated run time: 20–40 min on i9 CPU)")
    print()


# ---------------------------------------------------------------------------
# Main entrypoint
# ---------------------------------------------------------------------------

def main() -> None:
    """
    Run the full data generation pipeline.

    Step 1: Load CMU dict
    Step 2: Build rhyme and nucleus indices
    Step 3: Generate 3000 perfect pairs
    Step 4: Generate 3000 slant pairs
    Step 5: Generate 2000 near pairs
    Step 6: Generate 1800 no-rhyme pairs + 200 spelling-similar adversarial
    Step 7: Fetch 2000 pairs from Datamuse API
    Step 8: Merge, shuffle, save to training_data.json
    """
    rng = random.Random(42)

    print("=" * 52)
    print("PROSODIC — Synthetic Data Generator")
    print("=" * 52)

    # Step 1 — Load CMU dict
    print("\n[1/7] Loading CMU Pronouncing Dictionary...")
    cmu = _load_cmudict()
    print(f"      Loaded {len(cmu):,} words")

    # Step 2 — Build indices
    print("[2/7] Building rhyme and nucleus indices...")
    rhyme_index = _build_rhyme_index(cmu)
    nucleus_index = _build_nucleus_index(rhyme_index)
    print(f"      {len(rhyme_index):,} rhyme units, {len(nucleus_index):,} vowel nuclei")

    # Step 3 — Perfect pairs
    print("[3/7] Generating 3,000 perfect rhyme pairs...")
    perfect = generate_perfect_pairs(cmu, rhyme_index, target=3000, rng=random.Random(42))
    print(f"      Generated {len(perfect):,}")

    perfect_keys = {(min(p["word_a"], p["word_b"]), max(p["word_a"], p["word_b"])) for p in perfect}

    # Step 4 — Slant pairs
    print("[4/7] Generating 3,000 slant rhyme pairs...")
    slant = generate_slant_pairs(cmu, rhyme_index, nucleus_index, target=3000, rng=random.Random(43))
    print(f"      Generated {len(slant):,}")

    slant_keys = {(min(p["word_a"], p["word_b"]), max(p["word_a"], p["word_b"])) for p in slant}

    # Step 5 — Near pairs
    print("[5/7] Generating 2,000 near rhyme pairs...")
    near = generate_near_pairs(
        cmu, rhyme_index, target=2000,
        perfect_seen=perfect_keys, slant_seen=slant_keys,
        rng=random.Random(44)
    )
    print(f"      Generated {len(near):,}")

    # Step 6 — No-rhyme pairs (1800 random + 200 spelling-similar)
    print("[6/7] Generating 2,000 no-rhyme pairs (incl. 200 adversarial)...")
    avoid_keys = perfect_keys | slant_keys
    no_rhyme_base = generate_no_rhyme_pairs(cmu, target=1800, avoid=avoid_keys, rng=random.Random(45))
    spelling_similar = generate_spelling_similar_pairs(cmu, target=200, rng=random.Random(46))
    no_rhyme = no_rhyme_base + spelling_similar
    print(f"      Generated {len(no_rhyme):,} ({len(spelling_similar)} adversarial)")

    # Step 7 — Datamuse API
    print("[7/7] Fetching 2,000 pairs from Datamuse API...")
    print("      (This takes ~3–5 minutes due to rate limiting)")
    datamuse = fetch_datamuse_pairs(target=2000, delay_seconds=0.15)
    print(f"      Fetched {len(datamuse):,}")

    # Step 8 — Merge and save
    all_pairs = perfect + slant + near + no_rhyme + datamuse
    _print_summary(all_pairs)
    save_training_data(all_pairs, output_path="training_data.json")


if __name__ == "__main__":
    main()
