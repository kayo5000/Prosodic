'''
Concreteness Engine
Wraps the Brysbaert et al. (2014) concreteness norms — how vivid/sensory a
word is (5.0) vs. abstract (1.0). Used to bias word suggestions toward more
concrete, imagery-rich language over abstract synonyms of the same meaning.

Citation: Brysbaert, M., Warriner, A.B., & Kuperman, V. (2014). Concreteness
ratings for 40 thousand generally known English word lemmas. Behavior
Research Methods, 46, 904-911.

Part of the Prosodic hip-hop lyric analysis suite.
'''
import os
import logging
import sqlite3
from contextlib import contextmanager
from functools import lru_cache

log = logging.getLogger(__name__)

# Unlike PROSODIC_FEATURES_DB_PATH/LEARNING_SIGNALS_DB_PATH, this is
# read-only reference data (Brysbaert et al. norms) that ships bundled in
# the repo and is never written to at runtime — nothing here will
# self-create the file the way the others do. Only point
# CONCRETENESS_DB_PATH at the volume if that path already has a real copy
# of concreteness.db on it; otherwise leave it unset and let it use the
# bundled file.
DB_PATH = os.environ.get('CONCRETENESS_DB_PATH') or os.path.join(os.path.dirname(__file__), 'concreteness.db')
CACHE_SIZE = 5000


@contextmanager
def _connection():
    '''
    One connection per call, always closed — not a thread-local one
    reused (and never closed) for the life of the thread. Previously
    unsafe under real concurrency: under gunicorn --threads N>1, N
    threads would each hold their own long-lived connection to this file
    forever, which is fine for pure reads like this file only ever does,
    but was inconsistent with every other engine's cleanup discipline and
    untested under real concurrent load. Verified safe under real
    concurrent load in tests/test_thread_local_connections_concurrency.py.
    '''
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f'Concreteness database not found at {DB_PATH}')
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def get_concreteness(word: str):
    '''
    Returns a concreteness rating from 1.0 (abstract, e.g. "justice") to
    5.0 (concrete/sensory, e.g. "hammer"), or None if the word isn't rated
    or the database is unavailable. Never raises.
    '''
    return _cached_concreteness(word.strip().lower())


# In-process cache, shared by every request within ONE OS process. If
# this ever scales to `gunicorn --workers N>1`, each worker is a
# separate process with its own memory — this cache would NOT be shared
# across workers, and each pays its own warm-up cost independently
# rather than once for the whole deployment. Not a correctness issue,
# just a real cost multiplier to know about before scaling out; a
# shared cache (e.g. Redis) is a real infrastructure decision for when
# that's actually needed, not something to build speculatively now.
@lru_cache(maxsize=CACHE_SIZE)
def _cached_concreteness(word: str):
    try:
        with _connection() as conn:
            row = conn.execute(
                'SELECT concreteness FROM ratings WHERE LOWER(word) = ?', (word,)
            ).fetchone()
            return row['concreteness'] if row else None
    except (FileNotFoundError, sqlite3.Error):
        log.warning('Concreteness DB unavailable — get_concreteness("%s") degraded to None', word)
        return None


