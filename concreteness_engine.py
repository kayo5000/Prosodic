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
import threading
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

_local = threading.local()

def _conn():
    if not hasattr(_local, 'conn') or _local.conn is None:
        if not os.path.exists(DB_PATH):
            raise FileNotFoundError(f'Concreteness database not found at {DB_PATH}')
        _local.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        _local.conn.row_factory = sqlite3.Row
    return _local.conn


def get_concreteness(word: str):
    '''
    Returns a concreteness rating from 1.0 (abstract, e.g. "justice") to
    5.0 (concrete/sensory, e.g. "hammer"), or None if the word isn't rated
    or the database is unavailable. Never raises.
    '''
    return _cached_concreteness(word.strip().lower())


@lru_cache(maxsize=CACHE_SIZE)
def _cached_concreteness(word: str):
    try:
        c = _conn().cursor()
    except (FileNotFoundError, sqlite3.Error):
        log.warning('Concreteness DB unavailable — get_concreteness("%s") degraded to None', word)
        return None
    row = c.execute(
        'SELECT concreteness FROM ratings WHERE LOWER(word) = ?', (word,)
    ).fetchone()
    return row['concreteness'] if row else None


