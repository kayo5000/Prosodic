"""
thesaurus_schema.py
Single source of truth for the Moby Thesaurus SQLite schema (tables + indexes).

Both setup_thesaurus.py (build time) and thesaurus_engine.py (runtime) import
this module instead of each defining their own copy of the DDL. That's the
whole point of this file: the previous split — CREATE TABLE/INDEX statements
hardcoded separately in setup_thesaurus.py, with the live moby_thesaurus.db
hand-patched at some point after — let the two drift apart silently. The live
DB ended up with an index (idx_words_word_lower) the setup script didn't know
to create, and missing an index (idx_syn_synonym) the setup script thought it
had already created. Neither side had any way to notice the disagreement.

With this module as the only place the schema is defined:
  - setup_thesaurus.py calls create_tables()/create_indexes() instead of
    inlining SQL, so a from-scratch rebuild always matches what the runtime
    code expects.
  - thesaurus_engine.py calls missing_indexes() once at first connection and
    logs a loud warning if the DB it's actually talking to doesn't match —
    so drift gets caught in the logs immediately instead of discovered
    months later by an audit.

Part of the Prosodic hip-hop lyric analysis suite.
"""

TABLES = [
    """
    CREATE TABLE IF NOT EXISTS words (
        word_id INTEGER PRIMARY KEY,
        word    TEXT NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS synonyms (
        synonym_id INTEGER PRIMARY KEY,
        word_id    INTEGER NOT NULL,
        synonym    TEXT NOT NULL,
        FOREIGN KEY(word_id) REFERENCES words(word_id)
    )
    """,
]

# (index_name, DDL) — every lookup thesaurus_engine.py does is case-insensitive
# (LOWER(word) / LOWER(synonym)), so each column gets both a plain index (for
# any future exact-match or ORDER BY use) and a LOWER(...) expression index
# (the one that actually makes the case-insensitive lookups seekable instead
# of full scans — confirmed via EXPLAIN QUERY PLAN during the thesaurus audit).
INDEXES = [
    ("idx_words_word",        "CREATE INDEX IF NOT EXISTS idx_words_word ON words(word)"),
    ("idx_words_word_lower",  "CREATE INDEX IF NOT EXISTS idx_words_word_lower ON words(LOWER(word))"),
    ("idx_syn_word_id",       "CREATE INDEX IF NOT EXISTS idx_syn_word_id ON synonyms(word_id)"),
    ("idx_syn_synonym",       "CREATE INDEX IF NOT EXISTS idx_syn_synonym ON synonyms(synonym)"),
    ("idx_syn_synonym_lower", "CREATE INDEX IF NOT EXISTS idx_syn_synonym_lower ON synonyms(LOWER(synonym))"),
]


def create_tables(conn):
    """Create both tables if they don't already exist. Idempotent."""
    c = conn.cursor()
    for ddl in TABLES:
        c.execute(ddl)
    conn.commit()


def create_indexes(conn):
    """
    Create every expected index if it doesn't already exist. Idempotent —
    safe to run against a fresh DB or an existing one that's missing some
    subset of these (this is exactly how the live DB gets healed without a
    full rebuild: sqlite3.connect(path) then create_indexes(conn)).

    Deliberately NOT called until after bulk data load in setup_thesaurus.py —
    maintaining 5 index B-trees during a 2.5M-row insert is much slower than
    bulk-loading first and indexing once at the end.
    """
    c = conn.cursor()
    for _, ddl in INDEXES:
        c.execute(ddl)
    conn.commit()


def create_schema(conn):
    """Create tables + indexes in one call. Fine for a small/fresh DB or
    for healing a live DB; setup_thesaurus.py calls the two pieces
    separately so it can load data in between."""
    create_tables(conn)
    create_indexes(conn)


def missing_indexes(conn):
    """Return the names of any expected index not present in this DB."""
    present = {row[0] for row in conn.execute(
        "SELECT name FROM sqlite_master WHERE type = 'index'"
    )}
    return [name for name, _ in INDEXES if name not in present]
