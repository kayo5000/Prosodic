"""
Thesaurus Engine
Wraps the local Moby Thesaurus SQLite database for fast synonym lookups.
Used by the suggestion engine and the /thesaurus API endpoint.

Part of the Prosodic hip-hop lyric analysis suite.
"""
import os
import sqlite3
import threading

DB_PATH = os.path.join(os.path.dirname(__file__), "moby_thesaurus.db")

# Thread-local connections so Flask threads don't share a single connection
_local = threading.local()

def _conn():
    if not hasattr(_local, 'conn') or _local.conn is None:
        _local.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        _local.conn.row_factory = sqlite3.Row
    return _local.conn


def lookup(word: str) -> dict:
    """
    Return synonyms for a word from the Moby Thesaurus.

    Returns:
      {
        'word':     str,
        'found':    bool,
        'synonyms': [str, ...]   # up to 500, alphabetical
      }
    """
    word = word.strip().lower()
    c = _conn().cursor()

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


def reverse_lookup(word: str) -> list[str]:
    """
    Find all root words for which `word` appears as a synonym.
    Useful for discovering what concepts cluster around a word.
    Returns up to 50 root words, alphabetical.
    """
    word = word.strip().lower()
    c = _conn().cursor()
    rows = c.execute(
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


def search(query: str, limit: int = 30) -> list[str]:
    """
    Prefix search across root words. Returns matching words alphabetically.
    """
    query = query.strip().lower()
    c = _conn().cursor()
    rows = c.execute(
        "SELECT word FROM words WHERE LOWER(word) LIKE ? ORDER BY word LIMIT ?",
        (query + '%', limit)
    ).fetchall()
    return [r['word'] for r in rows]


def db_available() -> bool:
    return os.path.exists(DB_PATH)
