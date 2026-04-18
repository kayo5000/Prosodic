"""
setup_thesaurus.py
Converts the Moby Thesaurus MySQL dump to a local SQLite database.
Run once: python setup_thesaurus.py
"""
import re
import sqlite3
import os

SQL_PATH = r"C:\Users\bsfka\Downloads\moby_thesaurus\db_moby_thesaurus.sql"
DB_PATH  = os.path.join(os.path.dirname(__file__), "moby_thesaurus.db")

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

print(f"Reading {SQL_PATH} ...")
print(f"Writing {DB_PATH} ...")

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

c.execute("DROP TABLE IF EXISTS words")
c.execute("DROP TABLE IF EXISTS synonyms")
c.execute("""
    CREATE TABLE words (
        word_id INTEGER PRIMARY KEY,
        word    TEXT NOT NULL
    )
""")
c.execute("CREATE INDEX IF NOT EXISTS idx_words_word ON words(word)")
c.execute("""
    CREATE TABLE synonyms (
        synonym_id INTEGER PRIMARY KEY,
        word_id    INTEGER NOT NULL,
        synonym    TEXT NOT NULL,
        FOREIGN KEY(word_id) REFERENCES words(word_id)
    )
""")
c.execute("CREATE INDEX IF NOT EXISTS idx_syn_word_id ON synonyms(word_id)")
c.execute("CREATE INDEX IF NOT EXISTS idx_syn_synonym  ON synonyms(synonym)")

words_batch = []
syns_batch  = []
BATCH = 50_000

in_words    = False
in_synonyms = False

with open(SQL_PATH, 'r', encoding='latin-1') as f:
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

word_count = c.execute("SELECT COUNT(*) FROM words").fetchone()[0]
syn_count  = c.execute("SELECT COUNT(*) FROM synonyms").fetchone()[0]
print(f"\nDone. {word_count:,} root words, {syn_count:,} synonyms.")
print(f"Database: {DB_PATH}")
conn.close()
