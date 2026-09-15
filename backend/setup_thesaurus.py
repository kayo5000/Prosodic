"""
setup_thesaurus.py
Converts the Moby Thesaurus MySQL dump to a local SQLite database.

Source SQL file location — pass one of:
  --sql-path /path/to/db_moby_thesaurus.sql
  MOBY_THESAURUS_SQL_PATH=/path/to/db_moby_thesaurus.sql  (env var)

Run: python setup_thesaurus.py --sql-path /path/to/db_moby_thesaurus.sql

Schema (tables + indexes) is defined once in thesaurus_schema.py and shared
with thesaurus_engine.py at runtime — see that module's docstring for why.
"""
import argparse
import os
import re
import sqlite3

import thesaurus_schema

DB_PATH = os.path.join(os.path.dirname(__file__), "moby_thesaurus.db")


def _resolve_sql_path():
    parser = argparse.ArgumentParser(
        description="Build moby_thesaurus.db from the Moby Thesaurus MySQL dump."
    )
    parser.add_argument(
        "--sql-path",
        help="Path to db_moby_thesaurus.sql (overrides MOBY_THESAURUS_SQL_PATH env var)",
    )
    args = parser.parse_args()

    path = args.sql_path or os.environ.get("MOBY_THESAURUS_SQL_PATH")
    if not path:
        raise SystemExit(
            "No source SQL file specified.\n"
            "Pass --sql-path /path/to/db_moby_thesaurus.sql, or set the "
            "MOBY_THESAURUS_SQL_PATH environment variable.\n"
            "(The file is the Moby Thesaurus MySQL dump — not included in "
            "this repo; moby_thesaurus.db is the only build artifact that "
            "actually needs to ship.)"
        )
    if not os.path.exists(path):
        raise SystemExit(f"SQL file not found: {path}")
    return path


def parse_values(line):
    """Extract list of value tuples from a MySQL INSERT line."""
    m = re.search(r'values\s+(.+);?\s*$', line, re.IGNORECASE | re.DOTALL)
    if not m:
        return []
    raw = m.group(1).rstrip(';').strip()
    results = []
    for tup in re.finditer(r'\(([^)]*)\)', raw):
        parts = []
        for token in re.findall(r"'(?:[^'\\]|\\.)*'|\d+", tup.group(1)):
            if token.startswith("'"):
                parts.append(token[1:-1].replace("\\'", "'").replace("\\\\", "\\"))
            else:
                parts.append(int(token))
        results.append(tuple(parts))
    return results


def main():
    sql_path = _resolve_sql_path()

    print(f"Reading {sql_path} ...")
    print(f"Writing {DB_PATH} ...")

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute("DROP TABLE IF EXISTS words")
    c.execute("DROP TABLE IF EXISTS synonyms")
    thesaurus_schema.create_tables(conn)
    # Indexes are deliberately NOT created yet — see create_indexes() docstring.

    words_batch = []
    syns_batch  = []
    BATCH = 50_000

    in_words    = False
    in_synonyms = False

    with open(sql_path, 'r', encoding='latin-1') as f:
        for lineno, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue

            # Detect which table the current inserts belong to
            if 'insert' in line.lower() and 'into' in line.lower():
                if '`words`' in line:
                    in_words    = True
                    in_synonyms = False
                elif '`synonyms`' in line:
                    in_synonyms = True
                    in_words    = False
                else:
                    in_words    = False
                    in_synonyms = False

            if in_words and line.lower().startswith('insert'):
                for row in parse_values(line):
                    if len(row) == 2:
                        words_batch.append(row)
                if len(words_batch) >= BATCH:
                    c.executemany("INSERT OR IGNORE INTO words VALUES (?,?)", words_batch)
                    words_batch = []

            elif in_synonyms and line.lower().startswith('insert'):
                for row in parse_values(line):
                    if len(row) == 3:
                        syns_batch.append(row)
                if len(syns_batch) >= BATCH:
                    c.executemany("INSERT OR IGNORE INTO synonyms VALUES (?,?,?)", syns_batch)
                    syns_batch = []

            if lineno % 10_000 == 0:
                print(f"  line {lineno:,}  words={len(words_batch):,}  syns={len(syns_batch):,}")

    # Flush remaining
    if words_batch:
        c.executemany("INSERT OR IGNORE INTO words VALUES (?,?)", words_batch)
    if syns_batch:
        c.executemany("INSERT OR IGNORE INTO synonyms VALUES (?,?,?)", syns_batch)

    conn.commit()

    print("Building indexes ...")
    thesaurus_schema.create_indexes(conn)

    word_count = c.execute("SELECT COUNT(*) FROM words").fetchone()[0]
    syn_count  = c.execute("SELECT COUNT(*) FROM synonyms").fetchone()[0]
    print(f"\nDone. {word_count:,} root words, {syn_count:,} synonyms.")
    print(f"Database: {DB_PATH}")
    conn.close()


if __name__ == '__main__':
    main()
