"""
device_detection_engine.py

Scans lyric_lines.text from prosodic_features.db and detects
the presence and frequency of 12 core literary/rhetorical devices
used in hip-hop lyricism.

Each detector returns a raw count across all lines scanned.
Rates are computed as events per 100 lines.

Device status thresholds (per 100 lines):
  overused   > overuse_threshold  (device-specific)
  signature  >= sig_threshold     (commonly used — a fingerprint)
  emerging   >= em_threshold      (appears but not yet consistent)
  untapped   < em_threshold       (rarely or never detected)
"""

import re
import sqlite3
import os
from collections import Counter

DB_PATH = os.path.join(os.path.dirname(__file__), "prosodic_features.db")

STOP_WORDS = {
    'a','an','the','and','but','or','for','nor','so','yet','in','on',
    'at','to','by','of','up','do','go','be','is','it','its','was','are',
    'were','has','had','have','not','no','my','me','we','us','he','she',
    'they','them','his','her','our','you','your','i','with','that','this',
    'from','what','when','then','than','just','been','will','can','could',
    'would','should','did','got','get','im','dont','cant','wont','aint',
}

# ── Individual detectors ───────────────────────────────────────────────────────

def _detect_alliteration(lines):
    """2+ consecutive words sharing the same opening consonant sound in one line."""
    count = 0
    for line in lines:
        words = re.findall(r'\b[a-z]+\b', line.lower())
        for i in range(len(words) - 1):
            a, b = words[i], words[i + 1]
            if (len(a) > 1 and len(b) > 1
                    and a[0] == b[0]
                    and a[0] not in 'aeiou'
                    and a not in STOP_WORDS
                    and b not in STOP_WORDS):
                count += 1
                break  # one alliteration event per line
    return count


def _detect_assonance(lines):
    """3+ words in a single line sharing the same stressed vowel sound."""
    count = 0
    for line in lines:
        words = re.findall(r'\b[a-z]+\b', line.lower())
        if len(words) < 3:
            continue
        vowel_groups = {}
        for w in words:
            if w in STOP_WORDS:
                continue
            # Extract dominant vowel cluster
            match = re.search(r'[aeiou]{1,2}', w)
            if match:
                v = match.group()
                vowel_groups[v] = vowel_groups.get(v, 0) + 1
        if any(c >= 3 for c in vowel_groups.values()):
            count += 1
    return count


def _detect_anaphora(lines):
    """Same word opens 2+ consecutive lines (min 3 chars, not a stop word)."""
    count = 0
    for i in range(len(lines) - 1):
        words_a = lines[i].strip().lower().split()
        words_b = lines[i + 1].strip().lower().split()
        if (words_a and words_b
                and len(words_a[0]) >= 3
                and words_a[0].rstrip('.,!?') == words_b[0].rstrip('.,!?')
                and words_a[0].rstrip('.,!?') not in STOP_WORDS):
            count += 1
    return count


def _detect_epistrophe(lines):
    """Same word closes 2+ consecutive lines."""
    count = 0
    for i in range(len(lines) - 1):
        words_a = lines[i].strip().lower().split()
        words_b = lines[i + 1].strip().lower().split()
        if words_a and words_b:
            end_a = words_a[-1].rstrip('.,!?;:')
            end_b = words_b[-1].rstrip('.,!?;:')
            if len(end_a) >= 3 and end_a == end_b and end_a not in STOP_WORDS:
                count += 1
    return count


def _detect_anadiplosis(lines):
    """Last word of one line = first word of the next."""
    count = 0
    for i in range(len(lines) - 1):
        words_a = lines[i].strip().lower().split()
        words_b = lines[i + 1].strip().lower().split()
        if words_a and words_b:
            last = words_a[-1].rstrip('.,!?;:')
            first = words_b[0].rstrip('.,!?;:')
            if len(last) >= 3 and last == first and last not in STOP_WORDS:
                count += 1
    return count


def _detect_simile(lines):
    """'like a/an [noun]' or 'as [adj] as' pattern."""
    count = 0
    pattern = re.compile(
        r'\blike\s+a[n]?\s+\w|\bas\s+\w+\s+as\b|\blike\s+the\s+\w',
        re.IGNORECASE
    )
    for line in lines:
        if pattern.search(line):
            count += 1
    return count


def _detect_rhetorical_question(lines):
    """Lines that end with a question mark."""
    return sum(1 for line in lines if line.strip().endswith('?'))


def _detect_repetition(lines):
    """A content word used 4+ times across a song's lines (intentional emphasis)."""
    if not lines:
        return 0
    all_words = re.findall(r'\b[a-z]+\b', ' '.join(lines).lower())
    counter = Counter(w for w in all_words if w not in STOP_WORDS and len(w) > 3)
    return sum(1 for c in counter.values() if c >= 4)


def _detect_enumeration(lines):
    """Lines containing 2+ commas (stacking 3+ items in a list)."""
    return sum(1 for line in lines if line.count(',') >= 2)


def _detect_polysyndeton(lines):
    """3+ coordinating conjunctions (and/but/or) in a single line."""
    pattern = re.compile(
        r'\b(and|but|or)\b.{1,30}\b(and|but|or)\b.{1,30}\b(and|but|or)\b',
        re.IGNORECASE
    )
    return sum(1 for line in lines if pattern.search(line))


def _detect_asyndeton(lines):
    """2+ commas in a line with no 'and'/'or' joining — items listed without connectives."""
    count = 0
    for line in lines:
        if line.count(',') >= 2 and not re.search(r'\b(and|or)\b', line, re.IGNORECASE):
            count += 1
    return count


def _detect_parallelism(lines):
    """Consecutive lines beginning with the same two words (syntactic skeleton match)."""
    count = 0
    for i in range(len(lines) - 1):
        words_a = re.findall(r'\b[a-z]+\b', lines[i].lower())
        words_b = re.findall(r'\b[a-z]+\b', lines[i + 1].lower())
        if len(words_a) >= 3 and len(words_b) >= 3 and words_a[:2] == words_b[:2]:
            count += 1
    return count


# ── Device catalog ─────────────────────────────────────────────────────────────

DEVICES = [
    {
        "id": "alliteration",
        "name": "Alliteration",
        "category": "Sound",
        "definition": "Consecutive words that open with the same consonant sound — the ear locks onto the chain.",
        "tip": "Two alliterative words is subtle; three in a row is a signature. Use it to make a bar stick — listeners remember it without knowing why.",
        "overuse_per_100": 50,
        "sig_per_100": 18,
        "em_per_100": 5,
        "fn": _detect_alliteration,
    },
    {
        "id": "assonance",
        "name": "Assonance",
        "category": "Sound",
        "definition": "Repeated vowel sounds within a line — an internal sonic texture beyond end rhyme.",
        "tip": "Assonance creates richness that end rhyme can't. Three words in a bar sharing the same vowel builds a hum the listener feels before they consciously hear it.",
        "overuse_per_100": 45,
        "sig_per_100": 15,
        "em_per_100": 4,
        "fn": _detect_assonance,
    },
    {
        "id": "anaphora",
        "name": "Anaphora",
        "category": "Structural",
        "definition": "The same word or phrase opens back-to-back lines — a hammer hitting the same nail.",
        "tip": "Anaphora builds urgency and inevitability. The repetition at the start signals: this matters. Used over 3+ lines it becomes a chant structure the crowd owns.",
        "overuse_per_100": 30,
        "sig_per_100": 8,
        "em_per_100": 2,
        "fn": _detect_anaphora,
    },
    {
        "id": "epistrophe",
        "name": "Epistrophe",
        "category": "Structural",
        "definition": "The same word or phrase closes consecutive lines — the ending lands the same way twice.",
        "tip": "Epistrophe seals an idea. Where anaphora opens hard, epistrophe closes heavy — it's the period at the end of the paragraph, repeated for emphasis.",
        "overuse_per_100": 20,
        "sig_per_100": 5,
        "em_per_100": 1.5,
        "fn": _detect_epistrophe,
    },
    {
        "id": "anadiplosis",
        "name": "Anadiplosis",
        "category": "Structural",
        "definition": "The last word of one line becomes the first word of the next — a chain link between bars.",
        "tip": "Anadiplosis creates the feeling that one thought grows directly from the last — the verse becomes a single unbroken argument instead of a collection of bars.",
        "overuse_per_100": 15,
        "sig_per_100": 4,
        "em_per_100": 1,
        "fn": _detect_anadiplosis,
    },
    {
        "id": "simile",
        "name": "Simile",
        "category": "Comparison",
        "definition": 'A direct comparison using "like" or "as" — bridges abstract emotion to vivid, physical imagery.',
        "tip": "The more unexpected the comparison, the more memorable the line. Reach for something specific to your world — not 'cold as ice' but 'cold as the smell of bleach at 3am.'",
        "overuse_per_100": 35,
        "sig_per_100": 10,
        "em_per_100": 3,
        "fn": _detect_simile,
    },
    {
        "id": "rhetorical_question",
        "name": "Rhetorical Question",
        "category": "Rhetorical",
        "definition": "A question the listener isn't meant to answer — it makes them feel the weight of the implied answer.",
        "tip": "A single rhetorical question mid-verse stops the listener cold and forces them to inhabit the problem. It resets the rhythm and creates a pocket of silence in the flow.",
        "overuse_per_100": 20,
        "sig_per_100": 6,
        "em_per_100": 1.5,
        "fn": _detect_rhetorical_question,
    },
    {
        "id": "repetition",
        "name": "Repetition",
        "category": "Emphasis",
        "definition": "A key word used 4+ times across a verse — driving a single idea home through frequency.",
        "tip": "Repetition isn't lack of vocabulary — it's weaponized emphasis. Pick the word that carries the most weight and let it echo. The listener starts hearing it even before you say it.",
        "overuse_per_100": 8,
        "sig_per_100": 3,
        "em_per_100": 1,
        "fn": _detect_repetition,
    },
    {
        "id": "enumeration",
        "name": "Enumeration",
        "category": "Structural",
        "definition": "Stacking 3+ items in a comma-separated list — accumulative weight through inventory.",
        "tip": "A well-built list accelerates. The listener anticipates the next item. End the list on the word that breaks the pattern — the last item should land differently than the ones before it.",
        "overuse_per_100": 25,
        "sig_per_100": 8,
        "em_per_100": 2,
        "fn": _detect_enumeration,
    },
    {
        "id": "polysyndeton",
        "name": "Polysyndeton",
        "category": "Structural",
        "definition": 'Chaining clauses with repeated "and" / "but" / "or" — deliberate accumulation that slows and weighs.',
        "tip": "Polysyndeton creates the feeling that there's always more — that the list can't be contained. It's exhausted urgency. Each 'and' adds weight instead of speed.",
        "overuse_per_100": 15,
        "sig_per_100": 4,
        "em_per_100": 1,
        "fn": _detect_polysyndeton,
    },
    {
        "id": "asyndeton",
        "name": "Asyndeton",
        "category": "Structural",
        "definition": "Listing items without conjunctions — stripping 'and'/'or' to create speed and punch.",
        "tip": "Asyndeton compresses time. 'I came, I saw, I conquered' is faster and harder than 'I came and I saw and I conquered.' Use it when the bars need to hit rapid-fire.",
        "overuse_per_100": 20,
        "sig_per_100": 6,
        "em_per_100": 1.5,
        "fn": _detect_asyndeton,
    },
    {
        "id": "parallelism",
        "name": "Parallelism",
        "category": "Structural",
        "definition": "Consecutive lines built on the same syntactic skeleton — structural symmetry that feels inevitable.",
        "tip": "Parallelism creates the feeling that your ideas are equal in weight — that the verse is architecturally sound. Two parallel lines feel deliberate; three feel iconic.",
        "overuse_per_100": 20,
        "sig_per_100": 6,
        "em_per_100": 1.5,
        "fn": _detect_parallelism,
    },
]


# ── Example collector ─────────────────────────────────────────────────────────

_PAIR_DEVICES = {'anaphora', 'epistrophe', 'anadiplosis', 'parallelism'}

def _collect_examples(device_id, lines, fn, max_examples=2):
    """Return up to max_examples lines that trigger the device detector."""
    examples = []
    if device_id in _PAIR_DEVICES:
        for i in range(len(lines) - 1):
            pair = [lines[i], lines[i + 1]]
            if fn(pair) > 0 and lines[i].strip() and len(lines[i].strip()) > 10:
                examples.append(f"{lines[i].strip()} / {lines[i+1].strip()}")
                if len(examples) >= max_examples:
                    break
    else:
        for line in lines:
            s = line.strip()
            if s and len(s) > 10 and fn([line]) > 0:
                examples.append(s)
                if len(examples) >= max_examples:
                    break
    return examples


# ── Status classifier ──────────────────────────────────────────────────────────

def _classify(rate, device):
    if rate >= device["overuse_per_100"]:
        return "overused"
    if rate >= device["sig_per_100"]:
        return "signature"
    if rate >= device["em_per_100"]:
        return "emerging"
    return "untapped"


# ── Public entry point ─────────────────────────────────────────────────────────

def compute_device_usage():
    """
    Query all lyric lines and detect device usage across all songs.
    Returns a dict with categorized device lists.
    """
    try:
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        rows = conn.execute("SELECT text FROM lyric_lines WHERE text != ''").fetchall()
        conn.close()
    except Exception:
        return _empty_result()

    lines = [r["text"] for r in rows if r["text"] and r["text"].strip()]
    total = len(lines)

    if total < 10:
        return _empty_result()

    results = []
    for device in DEVICES:
        count = device["fn"](lines)
        rate = round((count / total) * 100, 1)
        status = _classify(rate, device)
        examples = _collect_examples(device["id"], lines, device["fn"]) if count > 0 else []
        results.append({
            "id":         device["id"],
            "name":       device["name"],
            "category":   device["category"],
            "definition": device["definition"],
            "tip":        device["tip"],
            "count":      count,
            "rate_per_100_lines": rate,
            "status":     status,
            "examples":   examples,
        })

    signature  = [d for d in results if d["status"] == "signature"]
    overused   = [d for d in results if d["status"] == "overused"]
    emerging   = [d for d in results if d["status"] == "emerging"]
    untapped   = [d for d in results if d["status"] == "untapped"]

    # Sort signature/overused by rate desc, untapped show top 4 suggestions
    signature.sort(key=lambda d: d["rate_per_100_lines"], reverse=True)
    overused.sort(key=lambda d: d["rate_per_100_lines"], reverse=True)
    emerging.sort(key=lambda d: d["rate_per_100_lines"], reverse=True)

    return {
        "total_lines_scanned": total,
        "signature": signature,
        "overused": overused,
        "emerging": emerging,
        "untapped": untapped[:4],   # top 4 suggestions
    }


def _empty_result():
    return {
        "total_lines_scanned": 0,
        "signature": [],
        "overused": [],
        "emerging": [],
        "untapped": [],
    }
