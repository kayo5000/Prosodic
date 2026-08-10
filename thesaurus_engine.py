"""
Thesaurus Engine
Wraps the local Moby Thesaurus SQLite database for fast synonym lookups.
Used by the suggestion engine and the /thesaurus API endpoint.

Part of the Prosodic hip-hop lyric analysis suite.
"""
import os
import logging
import sqlite3
from contextlib import contextmanager
from functools import lru_cache

import thesaurus_schema

log = logging.getLogger(__name__)

# Bounded cache — the thesaurus data never changes at runtime, so a repeat
# lookup of the same word is always safe to serve from memory. Capped at
# 5,000 words so it can never grow unbounded, unlike loading the whole
# thesaurus into memory. Also means an already-cached word keeps working
# even if the DB file has a transient hiccup.
CACHE_SIZE = 5000

DB_PATH = os.path.join(os.path.dirname(__file__), "moby_thesaurus.db")

# Set once, process-wide, the first time ANY call opens a connection — the
# schema either matches thesaurus_schema.py or it doesn't, no need to check
# more than once per process even though connections themselves are no
# longer cached (see _connection() below). See thesaurus_schema.py for why
# this exists: it's what would have caught idx_syn_synonym silently going
# missing instead of that only surfacing via a manual audit.
_schema_checked = False


@contextmanager
def _connection():
    '''
    One connection per call, always closed — not a thread-local one
    reused (and never closed) for the life of the thread. Previously
    unsafe to reason about under real concurrency (gunicorn --threads
    N>1 would give each thread its own long-lived connection to this
    file, held forever). Verified safe under real concurrent load in
    tests/test_thread_local_connections_concurrency.py.
    '''
    global _schema_checked
    if not os.path.exists(DB_PATH):
        # sqlite3.connect() silently creates an empty file if the path is
        # missing, which turns into a confusing "no such table" error later.
        # Fail the same clear way every time instead.
        raise FileNotFoundError(f'Thesaurus database not found at {DB_PATH}')
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        if not _schema_checked:
            _schema_checked = True
            missing = thesaurus_schema.missing_indexes(conn)
            if missing:
                # The DB committed to git is deliberately UNindexed (~82MB —
                # a pre-built index bloats it to ~172MB, over GitHub's 100MB
                # per-file limit). So this isn't drift, it's expected on
                # every fresh checkout/deploy — heal it here instead of just
                # warning. Idempotent and one-time per process (guarded by
                # _schema_checked), so later calls skip straight past this
                # block once the indexes exist on disk.
                log.info(
                    'moby_thesaurus.db is missing expected index(es): %s — '
                    'building them now (one-time cost for this process).',
                    ', '.join(missing),
                )
                thesaurus_schema.create_indexes(conn)
        yield conn
    finally:
        conn.close()


def lookup(word: str) -> dict:
    """
    Return synonyms for a word from the Moby Thesaurus.
    Returns found=False (never raises) if the thesaurus DB is unavailable,
    so callers can degrade gracefully instead of crashing.
    Cached — see CACHE_SIZE.

    Returns:
      {
        'word':     str,
        'found':    bool,
        'synonyms': [str, ...]   # up to 500, alphabetical
      }
    """
    return _cached_lookup(word.strip().lower())


# In-process cache, shared by every request within ONE OS process. If
# this ever scales to `gunicorn --workers N>1`, each worker is a
# separate process with its own memory — this cache would NOT be shared
# across workers, and each pays its own warm-up cost independently
# rather than once for the whole deployment. Not a correctness issue,
# just a real cost multiplier to know about before scaling out; a
# shared cache (e.g. Redis) is a real infrastructure decision for when
# that's actually needed, not something to build speculatively now.
@lru_cache(maxsize=CACHE_SIZE)
def _cached_lookup(word: str) -> dict:
    try:
        with _connection() as conn:
            c = conn.cursor()
            row = c.execute(
                "SELECT word_id FROM words WHERE LOWER(word) = ?", (word,)
            ).fetchone()

            if not row:
                return {'word': word, 'found': False, 'synonyms': []}

            word_id = row['word_id']
            rows = c.execute(
                "SELECT synonym FROM synonyms WHERE word_id = ? ORDER BY synonym LIMIT 500",
                (word_id,)
            ).fetchall()

            return {
                'word':     word,
                'found':    True,
                'synonyms': [r['synonym'] for r in rows],
            }
    except (FileNotFoundError, sqlite3.Error):
        log.warning('Thesaurus DB unavailable — lookup("%s") degraded to not-found', word)
        return {'word': word, 'found': False, 'synonyms': []}


def reverse_lookup(word: str) -> list[str]:
    """
    Find all root words for which `word` appears as a synonym.
    Useful for discovering what concepts cluster around a word.
    Returns up to 50 root words, alphabetical.
    """
    word = word.strip().lower()
    try:
        with _connection() as conn:
            rows = conn.execute(
                """
                SELECT w.word FROM synonyms s
                JOIN words w ON w.word_id = s.word_id
                WHERE LOWER(s.synonym) = ?
                ORDER BY w.word
                LIMIT 50
                """,
                (word,)
            ).fetchall()
            return [r['word'] for r in rows]
    except (FileNotFoundError, sqlite3.Error):
        log.warning('Thesaurus DB unavailable — reverse_lookup("%s") degraded to empty', word)
        return []


def search(query: str, limit: int = 30) -> list[str]:
    """
    Prefix search across root words. Returns matching words alphabetically.
    """
    query = query.strip().lower()
    try:
        with _connection() as conn:
            rows = conn.execute(
                "SELECT word FROM words WHERE LOWER(word) LIKE ? ORDER BY word LIMIT ?",
                (query + '%', limit)
            ).fetchall()
            return [r['word'] for r in rows]
    except (FileNotFoundError, sqlite3.Error):
        log.warning('Thesaurus DB unavailable — search("%s") degraded to empty', query)
        return []


def find_bridge_words(word_a: str, word_b: str, limit: int = 10) -> dict:
    """
    Finds words that connect two topics via the synonym graph — useful for
    extended metaphors that need a word linking two unrelated images.

    'direct_bridges'   — words that are synonyms of both word_a and word_b.
    'extended_bridges' — words one more hop out (a synonym of a synonym)
                         that still land in the other word's synonym set.
    """
    syn_a = set(s.lower() for s in lookup(word_a)['synonyms'])
    syn_b = set(s.lower() for s in lookup(word_b)['synonyms'])

    direct = sorted(syn_a & syn_b)

    extended = set()
    if len(direct) < limit:
        # Cap fan-out so this stays fast — each lookup() is its own DB query.
        for s in list(syn_a)[:30]:
            extended.update(set(w.lower() for w in lookup(s)['synonyms']) & syn_b)
        for s in list(syn_b)[:30]:
            extended.update(set(w.lower() for w in lookup(s)['synonyms']) & syn_a)
    extended -= set(direct)

    return {
        'word_a': word_a.strip().lower(),
        'word_b': word_b.strip().lower(),
        'direct_bridges': direct[:limit],
        'extended_bridges': sorted(extended)[:limit],
    }


def suggest_cluster_words(cluster_words: list[str], exclude: list[str] = None, limit: int = 10) -> list[dict]:
    '''
    Given the words already in a motif/theme cluster (e.g. ocean -> [tide, current, reef]),
    suggest more words to add. A candidate scores higher the more existing cluster
    words it turns up as a synonym for — i.e. it's thematically central, not a one-off.
    '''
    exclude_set = set(w.strip().lower() for w in (exclude or []))
    exclude_set |= set(w.strip().lower() for w in cluster_words)

    scores = {}       # word -> number of cluster words that suggested it
    matched_from = {}  # word -> list of cluster words that suggested it

    for cw in cluster_words:
        for syn in lookup(cw)['synonyms']:
            syn_low = syn.lower()
            if syn_low in exclude_set:
                continue
            scores[syn_low] = scores.get(syn_low, 0) + 1
            matched_from.setdefault(syn_low, []).append(cw)

    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    return [
        {'word': word, 'score': score, 'matched_from': matched_from[word]}
        for word, score in ranked[:limit]
    ]
