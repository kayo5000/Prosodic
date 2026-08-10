'''
Users Repository
All raw SQL for the users table lives here — api.py's auth routes call
these functions instead of hand-writing sqlite3.connect()/execute() inline
five separate times. Same motivation as prosodic_config.py/
final_result_converter.py: one place to change instead of several
independent copies that can drift.

Every function takes db_path explicitly (passed in from api.py's own
already-resolved DB_PATH) rather than re-reading PROSODIC_DB_PATH itself —
a second independent env-var resolution here would be exactly the kind of
duplicate-source-of-truth this whole punch list has been closing
elsewhere (config constants, CMUdict loads). This is dependency injection
in the same spirit as SongContext: the caller owns and passes in what
this module needs, instead of the module reaching out for it itself.

Real bug fixed along the way, not just reorganized around: the previous
inline version in api.py never closed its connection on the
sqlite3.IntegrityError path (duplicate email/username) — con.close() sat
after the line that raises, inside the same try block, so it never ran.
Confirmed as a real, deterministic connection leak (traced via a failing
test run: every write-touching test after the first duplicate-email
attempt in the same session started failing with "database is locked").
Every function here uses try/finally so the connection closes no matter
what happens, including on the exact error path that used to leak it.

Returns/accepts plain sqlite3.Row objects — same shape api.py's
_user_dict() already expects. This is a data-ACCESS layer, not a new data
contract; formal per-module schemas (dataclass/TypedDict) were scoped and
explicitly deferred as their own, larger decision — see the punch-list
report.

Part of the Prosodic hip-hop lyric analysis suite.
'''
import sqlite3


def create_table(db_path):
    con = sqlite3.connect(db_path)
    try:
        con.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                email           TEXT    UNIQUE NOT NULL,
                username        TEXT    UNIQUE NOT NULL,
                password_hash   TEXT    NOT NULL,
                veil_name       TEXT    DEFAULT '',
                gradient_index  INTEGER DEFAULT 0,
                phone           TEXT    DEFAULT '',
                hometown        TEXT    DEFAULT '',
                geo_influences  TEXT    DEFAULT '',
                created_at      TEXT    DEFAULT (datetime('now'))
            )
        ''')
        con.commit()
    finally:
        con.close()


def create_user(db_path, email, username, password_hash):
    '''Raises sqlite3.IntegrityError if email/username is already taken —
    caller decides how to present that (api.py returns 409).'''
    con = sqlite3.connect(db_path)
    try:
        cur = con.execute(
            'INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)',
            (email, username, password_hash)
        )
        user_id = cur.lastrowid
        con.commit()
        return con.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    finally:
        con.close()


def get_by_id(db_path, user_id):
    con = sqlite3.connect(db_path)
    try:
        return con.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    finally:
        con.close()


def get_by_identifier(db_path, identifier):
    '''identifier can be an email or a username (matches api.py's existing
    /auth/login behavior — either one works).'''
    con = sqlite3.connect(db_path)
    try:
        return con.execute(
            'SELECT * FROM users WHERE email = ? OR username = ?',
            (identifier.lower(), identifier)
        ).fetchone()
    finally:
        con.close()


def update_user(db_path, user_id, fields):
    '''fields: {column_name: new_value}. Raises sqlite3.IntegrityError on
    a unique-constraint conflict (e.g. username already taken) — caller
    decides how to present that (api.py returns 409).'''
    con = sqlite3.connect(db_path)
    try:
        set_clause = ', '.join(f'{k} = ?' for k in fields)
        values = list(fields.values()) + [user_id]
        con.execute(f'UPDATE users SET {set_clause} WHERE id = ?', values)
        con.commit()
        return con.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    finally:
        con.close()
