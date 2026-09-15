"""
setup_concreteness.py
Converts the Brysbaert et al. (2014) concreteness norms (tab-delimited text
file) into a local SQLite database, same pattern as setup_thesaurus.py.
Run once: python setup_concreteness.py

Source: Brysbaert, M., Warriner, A.B., & Kuperman, V. (2014). Concreteness
ratings for 40 thousand generally known English word lemmas. Behavior
Research Methods, 46, 904-911. https://doi.org/10.3758/s13428-013-0403-5
Data mirror: https://github.com/ArtsEngine/concreteness
"""
import csv
import os
import sqlite3

RAW_PATH = os.environ.get(
    'CONCRETENESS_RAW_PATH',
    r'C:\Users\bsfka\AppData\Local\Temp\claude\c--Users-bsfka-OneDrive-Documents-Prosodic\f65deb82-6a24-4e5a-adc6-8e4e55ac0eb2\scratchpad\concreteness_raw.txt'
)
DB_PATH = os.path.join(os.path.dirname(__file__), 'concreteness.db')

print(f'Reading {RAW_PATH} ...')
print(f'Writing {DB_PATH} ...')

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()
c.execute('DROP TABLE IF EXISTS ratings')
c.execute('''
    CREATE TABLE ratings (
        word         TEXT NOT NULL,
        concreteness REAL NOT NULL,
        is_bigram    INTEGER NOT NULL
    )
''')

rows = []
with open(RAW_PATH, 'r', encoding='utf-8', errors='replace') as f:
    reader = csv.DictReader(f, delimiter='\t')
    for row in reader:
        word = row['Word'].strip()
        if not word:
            continue
        try:
            conc = float(row['Conc.M'])
        except (KeyError, ValueError):
            continue
        is_bigram = 1 if row.get('Bigram') == '1' else 0
        rows.append((word, conc, is_bigram))

c.executemany('INSERT INTO ratings (word, concreteness, is_bigram) VALUES (?, ?, ?)', rows)

# Built from the start with the lesson learned in thesaurus_engine.py — index
# the expression actually used in queries (LOWER(word)), not the raw column.
c.execute('CREATE INDEX idx_ratings_word_lower ON ratings(LOWER(word))')
conn.commit()

count = c.execute('SELECT COUNT(*) FROM ratings').fetchone()[0]
print(f'Done. {count:,} rated words/expressions.')
print(f'Database: {DB_PATH}')
conn.close()
