"""
cantos_dev_log.py

Cantos Dev Log — Cantos Launch Spec §2.5.
NOTE: built from the §2.5 excerpt pasted in chat, not the full
PROSODIC_CANTOS_LAUNCH_SPEC.md — that file was not found anywhere in this
repo (checked by filename and by full-text search for "Cantos"/"Dev Log").
Revisit this file once the full spec doc is available in case §2.5 has
requirements beyond what was pasted.

A plain-text, human-readable log, one line per event:

    [HH:MM:SS] ENGINE action → detail

e.g.
    [10:42:03] MOTIF read L1-8 → posted board: theme_strengthening, strength 0.81

Purpose (per spec): "if you can read the log, you can trust the system."
The log is meant to be opened and read directly by a person, not parsed by
another program — every design choice here favors that over anything else.

This is a standalone utility. Nothing else in the codebase calls it yet —
Notebooks/Board/Meetings/Cassius don't exist. Any future engine calls
log_event() to append a line; read_recent() reads recent lines back.

Usage (once a future engine wants to log something):

    from cantos_dev_log import log_event

    log_event('MOTIF', 'read L1-8',
               'posted board: theme_strengthening, strength 0.81')
    # -> [10:42:03] MOTIF read L1-8 → posted board: theme_strengthening, strength 0.81

    log_event('BOARD', 'closed thread')
    # -> [10:42:04] BOARD closed thread   (detail omitted -> no dangling "→")

Reading it back:

    from cantos_dev_log import read_recent

    read_recent(20)                 # last 20 lines, any engine
    read_recent(20, engine='MOTIF') # last 20 lines logged by MOTIF specifically

Known scope limits (documented rather than silently glossed over):
  - Thread-safe within one process (a lock guards the append), but NOT
    guaranteed safe across multiple OS processes writing concurrently
    (e.g. multiple gunicorn worker processes) — that would need OS-level
    file locking, not implemented here since nothing calls this yet and
    the deploy is currently a single sync worker (see Procfile).
  - No rotation or size cap. Left unbounded deliberately — silently
    truncating history contradicts "if you can read the log, you can
    trust the system." Revisit once real call volume is known.

Part of the Prosodic hip-hop lyric analysis suite / Cantos.
"""
import os
import threading
import datetime

# Log file path — same override convention as PROSODIC_DB_PATH in api.py /
# DB_PATH in thesaurus_engine.py etc. Module-level (not cached in a
# function) so tests can monkeypatch it cleanly.
LOG_PATH = os.environ.get('CANTOS_DEV_LOG_PATH') or os.path.join(
    os.path.dirname(__file__), 'cantos_dev_log.txt'
)

_lock = threading.Lock()
_last_logged_date = None  # tracks day-boundary separators, see _maybe_write_day_marker


def _now():
    '''Wrapped for testability — monkeypatch this, not datetime, in tests.'''
    return datetime.datetime.now()


def _today():
    return _now().date()


def _format_line(engine, action, detail=''):
    ts = _now().strftime('%H:%M:%S')
    engine = (engine or '').strip().upper()
    action = (action or '').strip()
    line = f'[{ts}] {engine} {action}'
    if detail:
        line += f' → {detail}'
    return line


def _maybe_write_day_marker(fh):
    '''
    [HH:MM:SS] alone doesn't carry a date, so a log spanning multiple days
    is ambiguous about which day an event happened on. Rather than change
    the per-event line format (the spec is explicit about it), insert a
    separator line whenever the date rolls over SINCE THIS PROCESS'S LAST
    WRITE. Not part of the spec excerpt — a judgment call to resolve the
    ambiguity without touching the required line format. Revisit if the
    full spec says otherwise.

    Deliberately in-memory only (no file-mtime cross-check): mtime reflects
    real wall-clock time and can't be exercised under a mocked clock in
    tests, and — worse — a first attempt at using it produced wrong
    results (comparing real mtime against a test-mocked "today" is
    comparing two different clocks). Known tradeoff of the simpler
    approach: if a process restarts on a genuinely new day, the first
    event of the new process won't retroactively mark the boundary against
    whatever the file already had from the previous day. Acceptable for a
    dev log; revisit if that gap matters in practice.
    '''
    global _last_logged_date
    today = _today()
    if _last_logged_date is not None and _last_logged_date != today:
        fh.write(f'── {today.isoformat()} ──\n')
    _last_logged_date = today


def log_event(engine, action, detail=''):
    '''
    Append one event line to the dev log.

    Args:
        engine: source engine/module name, e.g. 'MOTIF', 'BOARD'. Upper-cased
                automatically — pass 'motif' or 'MOTIF', same result.
        action: short present-tense description, e.g. 'read L1-8'.
        detail: optional — what happened as a result. Omit it (default '')
                for an action with nothing to report; the line is written
                without a dangling '→' rather than with an empty one.

    Returns:
        The exact line written (without trailing newline), so a caller can
        log it, assert on it in tests, etc.
    '''
    line = _format_line(engine, action, detail)
    with _lock:
        os.makedirs(os.path.dirname(LOG_PATH) or '.', exist_ok=True)
        with open(LOG_PATH, 'a', encoding='utf-8') as fh:
            _maybe_write_day_marker(fh)
            fh.write(line + '\n')
    return line


def read_recent(n=50, engine=None):
    '''
    Read back the last n lines of the dev log, oldest-to-newest (i.e. the
    order they'd appear if you opened the file and scrolled to the bottom).

    Args:
        n:      how many lines to return. Day-marker separator lines count
                toward this total (they're part of "the log" too).
        engine: optional — if given, only lines logged by this engine are
                returned (case-insensitive), still capped at the last n
                MATCHING lines, not n lines pre-filter.

    Returns:
        List of strings (no trailing newlines). Empty list if the log
        doesn't exist yet or has no matching lines.
    '''
    if not os.path.exists(LOG_PATH):
        return []

    with _lock:
        lines = _tail_lines(LOG_PATH, n, engine)
    return lines


def _tail_lines(path, n, engine=None):
    '''
    Read lines from the end of the file without loading the whole thing
    into memory — reads in growing chunks from the end until it has
    enough lines (post engine-filter, if any) or hits the start of file.
    '''
    if engine:
        engine = engine.strip().upper()

    chunk_size = 8192
    matched = []
    with open(path, 'rb') as fh:
        fh.seek(0, os.SEEK_END)
        file_size = fh.tell()
        pos = file_size
        buffer = b''

        while pos > 0 and len(matched) < n:
            read_size = min(chunk_size, pos)
            pos -= read_size
            fh.seek(pos)
            buffer = fh.read(read_size) + buffer

            raw_lines = buffer.decode('utf-8', errors='replace').split('\n')
            # first element may be a partial line unless we've hit pos==0
            complete = raw_lines if pos == 0 else raw_lines[1:]
            buffer = b'' if pos == 0 else raw_lines[0].encode('utf-8')

            # strip \r left over from files written in text mode on
            # platforms where '\n' gets translated to '\r\n' on write
            candidates = [l.rstrip('\r') for l in complete if l.strip('\r')]
            if engine:
                candidates = [
                    l for l in candidates
                    if _line_engine(l) == engine or _is_day_marker(l)
                ]
            matched = candidates + matched

    return matched[-n:]


def _line_engine(line):
    '''Extract the ENGINE token from a formatted line, e.g. "[10:42:03] MOTIF ..." -> "MOTIF".'''
    parts = line.split('] ', 1)
    if len(parts) != 2:
        return None
    rest = parts[1].split(' ', 1)
    return rest[0] if rest else None


def _is_day_marker(line):
    return line.startswith('── ') and line.endswith(' ──')


# ── TEST ─────────────────────────────────────────────────
if __name__ == '__main__':
    import sys
    # Windows' default console codepage (cp1252) can't display the → in
    # the log format — this only affects printing to a terminal, the log
    # FILE is always written as UTF-8 regardless. Reconfigure stdout so
    # this demo doesn't crash on a stock Windows console.
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    log_event('MOTIF', 'read L1-8', 'posted board: theme_strengthening, strength 0.81')
    log_event('BOARD', 'closed thread')
    log_event('CASSIUS', 'evaluated draft', 'score 0.74, flagged 2 weak bars')
    print(f'Wrote to {LOG_PATH}\n')
    print('Last 10 lines:')
    for line in read_recent(10):
        print(f'  {line}')
