'''
Suggestion Engine
Two-layer rhyme suggestion:
  Layer 1 — local phonetic/semantic filtering
  Layer 2 — Moby Thesaurus composite scoring (rhyme + synonym overlap + syllable fit)

Part of the Prosodic hip-hop lyric analysis suite.
'''
import logging
from collections import defaultdict

log = logging.getLogger(__name__)

import nltk
nltk.download('cmudict', quiet=True)
from nltk.corpus import cmudict

from phoneme_engine import get_rhyme_unit, rhyme_score, get_phonemes, FUNCTION_WORDS
from syllable_engine import get_syllable_count, syllabify_line
from rhyme_detection_engine import analyze_verse
from motif_engine import build_motif_map
from semantics_engine import semantic_similarity, SPACY_AVAILABLE
from thesaurus_engine import lookup as thesaurus_lookup

CMU = cmudict.dict()

# ── Startup index — built once, replaces O(125k) scan with O(1) lookup ────────

RHYME_INDEX   = defaultdict(list)  # rhyme_unit  → [word, ...]
NUCLEUS_INDEX = defaultdict(list)  # nucleus     → [(word, rhyme_unit), ...]

def _rhyme_unit_from_raw(phonemes):
    last_stress = None
    for i, p in enumerate(phonemes):
        if p[-1].isdigit() and int(p[-1]) >= 1:
            last_stress = i
    if last_stress is None:
        for i, p in enumerate(phonemes):
            if p[-1].isdigit():
                last_stress = i
    if last_stress is None:
        return None
    return tuple(phonemes[last_stress:])

for _word, _pronunciations in CMU.items():
    _ru = _rhyme_unit_from_raw(_pronunciations[0])
    if _ru:
        RHYME_INDEX[_ru].append(_word)
        NUCLEUS_INDEX[_ru[0]].append((_word, _ru))

def _scan_phonetic_candidates(target_rhyme):
    '''O(1) index lookup — replaces full CMU walk.'''
    results = []
    # Exact rhyme unit match (1.0)
    for word in RHYME_INDEX.get(target_rhyme, []):
        results.append((word, 1.0, target_rhyme))
    # Same nucleus, different coda (0.88)
    target_nucleus = target_rhyme[0]
    for word, ru in NUCLEUS_INDEX.get(target_nucleus, []):
        if ru != target_rhyme:
            results.append((word, 0.88, ru))
    # Same vowel base, different stress marker (0.75)
    target_vowel = target_nucleus[:-1] if target_nucleus[-1].isdigit() else target_nucleus
    for nucleus, entries in NUCLEUS_INDEX.items():
        nuc_vowel = nucleus[:-1] if nucleus[-1].isdigit() else nucleus
        if nuc_vowel == target_vowel and nucleus != target_nucleus:
            for word, ru in entries:
                results.append((word, 0.75, ru))
    return results


def _fast_score(rhyme_a, rhyme_b):
    if not rhyme_a or not rhyme_b:
        return 0.0
    if rhyme_a == rhyme_b:
        return 1.0
    nuc_a, nuc_b = rhyme_a[0], rhyme_b[0]
    if nuc_a == nuc_b:
        return 0.88
    vow_a = nuc_a[:-1] if nuc_a[-1].isdigit() else nuc_a
    vow_b = nuc_b[:-1] if nuc_b[-1].isdigit() else nuc_b
    if vow_a == vow_b:
        return 0.75
    return 0.0

# ── Layer 1 helpers ───────────────────────────────────────────────────────────

def _dominant_family(verse_lines):
    '''Returns (representative_word, rhyme_unit) of the largest rhyme group.'''
    result = analyze_verse(verse_lines)
    if not result['rhyme_groups']:
        return None, None
    # Rank by distinct lines spanned, then total members as tiebreaker
    best = max(result['rhyme_groups'], key=lambda g: (len(set(s['line_index'] for s in g)), len(g)))
    word = best[0]['word']
    return word, get_rhyme_unit(word)

def _top_content_words(verse_lines, n=5):
    '''Returns the n most content-heavy words from the verse (longest non-function words).'''
    seen = {}
    for line in verse_lines:
        for word in line.split():
            clean = word.strip('.,!?;:"-').lower()
            if clean and clean not in FUNCTION_WORDS and len(clean) > 2:
                seen[clean] = len(clean)
    ranked = sorted(seen, key=seen.get, reverse=True)
    return ranked[:n]

def _mode_syllable_count(verse_lines, n=3):
    counts = []
    for line in verse_lines[-n:]:
        total = sum(get_syllable_count(w.strip('.,!?;:"-').lower()) or 1 for w in line.split())
        counts.append(total)
    return max(set(counts), key=counts.count) if counts else None

def _family_rhyme_units(motif_result):
    '''One representative rhyme unit per motif group.'''
    units = []
    for group in motif_result['motif_groups']:
        for member in group['members']:
            ru = get_rhyme_unit(member['word'])
            if ru:
                units.append(ru)
                break
    return units

def _syllable_priority(syll_count, target):
    if target is None:
        return 0
    diff = abs(syll_count - target)
    if diff == 0:
        return 2
    if diff == 1:
        return 1
    return 0

# ── Layer 1 — Local filter ────────────────────────────────────────────────────

def _layer1(verse_lines, bpm=None):
    '''
    Runs the full local filter pipeline.
    Returns (candidates, dominant_word, content_words).
    '''
    dominant_word, target_rhyme = _dominant_family(verse_lines)
    if not target_rhyme:
        return [], None, []

    # Step 2 — Index lookup (O(1) vs old O(125k) CMU walk)
    raw_candidates = [
        (word, score, ru)
        for word, score, ru in _scan_phonetic_candidates(target_rhyme)
        if word != dominant_word
    ]

    content_words = _top_content_words(verse_lines)
    target_sylls = _mode_syllable_count(verse_lines)
    motif_result = build_motif_map(verse_lines, bpm)
    family_units = _family_rhyme_units(motif_result)

    MAX_CANDIDATES = 20  # top candidates sent to Claude — keeps response under token limit

    candidates = []
    for word, r_score, rhyme_unit in raw_candidates:
        # Step 4 — Syllable priority (needed by fallback gate below)
        syll_count = get_syllable_count(word) or 1
        syll_priority = _syllable_priority(syll_count, target_sylls)

        # Step 3 — Semantic filter
        if SPACY_AVAILABLE and content_words:
            sem_score = max(semantic_similarity(word, cw) for cw in content_words)
        else:
            # spaCy unavailable — use syllable proximity as secondary gate.
            # Exact rhymes always pass. Near-rhymes (0.88) only pass if
            # syllable count is within 1 of the verse target.
            if r_score == 1.0:
                sem_score = 0.5
            elif r_score >= 0.88 and syll_priority >= 1:
                sem_score = 0.5
            else:
                sem_score = 0.0

        # Step 6 — Quality threshold
        strong_phonetic = r_score >= 0.88
        passes = (r_score >= 0.75 and sem_score >= 0.15) or strong_phonetic
        if not passes:
            continue

        # Step 5 — Motif label
        extends = any(_fast_score(rhyme_unit, fu) >= 0.75 for fu in family_units)
        motif_fit = 'extends existing family' if extends else 'starts new family'

        candidates.append({
            'word': word,
            'rhyme_score': round(r_score * 100),
            'semantic_score': round(sem_score * 100),
            'syllable_count': syll_count,
            'syllable_priority': syll_priority,
            'motif_fit': motif_fit,
            'rhyme_unit': list(rhyme_unit),
        })

    # Cap before Claude — sort by rhyme quality then syllable fit
    candidates.sort(key=lambda c: (c['rhyme_score'], c['syllable_priority']), reverse=True)
    return candidates[:MAX_CANDIDATES], dominant_word, content_words

# ── Layer 2 — Thesaurus composite scoring ────────────────────────────────────

def _layer2(verse_lines, candidates, dominant_word, content_words, trigger_mode, motif_bank=None):
    '''
    Ranks candidates using Moby Thesaurus synonym overlap + phonetic score + syllable fit.
    Also accepts an optional motif_bank: {cluster_name: [word, ...]} of user-defined
    word associations (domain words, imagery, recurring concepts) that the thesaurus
    wouldn't know about (e.g. ocean → [jellyfish, tide, reef, coral, current]).

    Composite score (0-100):
      rhyme_score      × 0.55   — phonetic match quality
      thesaurus_score  × 0.30   — synonym overlap with verse content words
      syllable_priority × 7.5  — syllable count match to verse target

    No external API calls. Fully local.
    '''
    # Build a flat set of all words in the motif bank, plus a word→cluster map
    bank_word_set = set()
    bank_cluster_for = {}   # word → cluster_name
    if motif_bank:
        for cluster_name, words in motif_bank.items():
            for w in words:
                w_low = w.strip().lower()
                bank_word_set.add(w_low)
                bank_cluster_for[w_low] = cluster_name

    # Build synonym sets for each content word (looked up once)
    content_syn_sets = {}
    for cw in content_words:
        result = thesaurus_lookup(cw)
        content_syn_sets[cw] = set(s.lower() for s in result['synonyms']) if result['found'] else set()

    # Merged set of all synonyms across all content words
    all_content_syns = set()
    for syns in content_syn_sets.values():
        all_content_syns.update(syns)

    # Also expand all_content_syns with motif bank: if a content word is in the bank,
    # all other words in that same cluster are treated as if they were synonyms of that content word.
    if motif_bank:
        for cw in content_words:
            cw_low = cw.lower()
            cluster = bank_cluster_for.get(cw_low)
            if cluster:
                for w in motif_bank[cluster]:
                    all_content_syns.add(w.strip().lower())

    content_word_set = set(cw.lower() for cw in content_words)

    results = []
    for c in candidates:
        word = c['word'].lower()

        # ── Motif bank check (highest priority) ─────────────────────────────
        # A word explicitly in the user's bank is treated as a direct thematic match.
        bank_cluster = bank_cluster_for.get(word)
        bank_hit = bank_cluster is not None

        # ── Thesaurus scoring ────────────────────────────────────────────────
        # Level 1: word is a direct synonym of a content word
        direct_cw = next((cw for cw, syns in content_syn_sets.items() if word in syns), None)

        # Level 2 & 3: look up the candidate word's own synonyms
        word_result = thesaurus_lookup(word)
        word_syns = set(s.lower() for s in word_result['synonyms']) if word_result['found'] else set()

        # Cross-connect: does the candidate word's synonyms include any bank word?
        # This catches "ocean" finding "jellyfish" even when the thesaurus misses it.
        bank_cross = bool(word_syns & bank_word_set)

        reverse_match = bool(word_syns & content_word_set)   # candidate's syns include a content word
        cross_match_n = len(word_syns & all_content_syns)    # depth of shared synonym space

        if bank_hit:
            thesaurus_score = 100   # user said so explicitly
        elif direct_cw:
            thesaurus_score = 100
        elif bank_cross:
            thesaurus_score = 90    # linked through the bank via synonym chain
        elif reverse_match:
            thesaurus_score = 85
        elif cross_match_n:
            thesaurus_score = min(70, 30 + cross_match_n * 2)
        else:
            thesaurus_score = 0

        # ── Composite ────────────────────────────────────────────────────────
        composite = (
            c['rhyme_score']       * 0.55 +
            thesaurus_score        * 0.30 +
            c['syllable_priority'] * 7.5
        )

        # ── Star rating ───────────────────────────────────────────────────────
        if composite >= 75:   star_rating = 5
        elif composite >= 60: star_rating = 4
        elif composite >= 45: star_rating = 3
        elif composite >= 30: star_rating = 2
        else:                 star_rating = 1

        # ── Human-readable reason ─────────────────────────────────────────────
        reasons = []
        if c['rhyme_score'] == 100:
            reasons.append('perfect rhyme')
        elif c['rhyme_score'] >= 88:
            reasons.append('near rhyme')
        else:
            reasons.append('slant rhyme')
        if bank_hit:
            reasons.append(f'motif bank: {bank_cluster}')
        elif bank_cross:
            reasons.append('linked via motif bank')
        elif direct_cw:
            reasons.append(f'synonym of "{direct_cw}"')
        elif reverse_match:
            cw_hit = next(iter(word_syns & content_word_set))
            reasons.append(f'"{cw_hit}" in its synonyms')
        if c['motif_fit'] == 'extends existing family':
            reasons.append('extends rhyme family')

        results.append({
            **c,
            'thesaurus_score': thesaurus_score,
            'composite_score': round(composite),
            'star_rating':     star_rating,
            'reason':          ', '.join(reasons) if reasons else 'phonetic match',
            'trigger_mode':    trigger_mode,
        })

    results.sort(key=lambda r: r['composite_score'], reverse=True)
    for i, r in enumerate(results, 1):
        r['rank'] = i

    return results

# ── Suggestion cache — stores last full ranked result for get_more_suggestions ─

_suggestion_cache = []

# ── Main callable ─────────────────────────────────────────────────────────────

def get_suggestions(verse_lines, bpm=None, trigger_mode='auto', target_word=None, context_lines=None, motif_bank=None):
    '''
    Takes a partial verse and returns the top 10 ranked rhyme suggestions.
    All 20 ranked results are cached so get_more_suggestions() returns instantly.

    Parameters:
      verse_lines   — list of lyric lines written so far
      bpm           — optional, passed to motif engine for pocket awareness
      trigger_mode  — 'auto' or 'manual', passed through to output for UI display
      target_word   — the specific word to find rhymes for (overrides dominant family detection)
      context_lines — full song context across all sections (used when motif mode is on)
      motif_bank    — {cluster_name: [word, ...]} user-defined thematic word associations

    Returns list of up to 10 suggestion dicts ranked by composite score.
    '''
    global _suggestion_cache

    # Use context_lines for thematic scoring when provided (motif mode)
    scoring_lines = context_lines if context_lines else verse_lines

    candidates, dominant_word, content_words = _layer1(scoring_lines, bpm)

    # If a specific target word was given, override phonetic candidates around that word
    if target_word:
        from phoneme_engine import get_rhyme_unit
        target_rhyme = get_rhyme_unit(target_word)
        if target_rhyme:
            raw = _scan_phonetic_candidates(target_rhyme)
            target_sylls = _mode_syllable_count(verse_lines)
            motif_result = build_motif_map(verse_lines, bpm)
            family_units = _family_rhyme_units(motif_result)
            override_candidates = []
            for word, r_score, rhyme_unit in raw:
                if word == target_word:
                    continue
                syll_count = get_syllable_count(word) or 1
                syll_priority = _syllable_priority(syll_count, target_sylls)
                extends = any(_fast_score(rhyme_unit, fu) >= 0.75 for fu in family_units)
                override_candidates.append({
                    'word': word,
                    'rhyme_score': round(r_score * 100),
                    'semantic_score': 0,
                    'syllable_count': syll_count,
                    'syllable_priority': syll_priority,
                    'motif_fit': 'extends existing family' if extends else 'starts new family',
                    'rhyme_unit': list(rhyme_unit),
                })
            override_candidates.sort(key=lambda c: (c['rhyme_score'], c['syllable_priority']), reverse=True)
            candidates = override_candidates[:20]

    if not candidates:
        _suggestion_cache = []
        return []

    all_results = _layer2(scoring_lines, candidates, dominant_word, content_words, trigger_mode, motif_bank=motif_bank)
    _suggestion_cache = all_results
    return all_results[:10]


def get_more_suggestions():
    '''
    Returns ranks 11-20 from the last get_suggestions() call.
    No API call is made — results come from the in-memory cache.
    Returns an empty list if get_suggestions() has not been called yet.
    '''
    return _suggestion_cache[10:20]

# ── TEST ─────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    verse = [
        "And I swear that it's turnt",
        "It all begins with encore cheers",
        "From those wearin' my merch",
        "Fast forward through years of rehearsal",
        "Losin', winnin', bank account thinnin'",
        "Income streams nowhere near as diverse",
        "And though I'm blessed I seen you stressin'",
        "From hearin' the chirps and naysayers",
    ]

    def _print_suggestions(label, suggestions):
        print(f'\n=== {label} ===')
        if not suggestions:
            print('  (none)')
            return
        for s in suggestions:
            stars = '*' * s['star_rating'] + '-' * (5 - s['star_rating'])
            rhyme = str(s['rhyme_score']).rstrip('%')
            theme = str(s['semantic_score']).rstrip('%')
            print(f"{stars} {s['word']:<14} "
                  f"rhyme:{rhyme}% "
                  f"theme:{theme}% "
                  f"{s['syllable_count']}syl "
                  f"[{s['motif_fit']}]")
            print(f"       {s['reason']}")
            print()

    top10 = get_suggestions(verse, bpm=80, trigger_mode='manual')
    _print_suggestions('TOP 10 SUGGESTIONS', top10)

    more = get_more_suggestions()
    _print_suggestions('SHOW MORE (ranks 11-20)', more)
