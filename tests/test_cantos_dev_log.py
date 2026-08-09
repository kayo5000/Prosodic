"""Tests for cantos_dev_log.py — the Cantos Dev Log utility (§2.5).

Every test points LOG_PATH at an isolated tmp_path file so nothing here
ever touches the real repo-root cantos_dev_log.txt.
"""
import sys, os, re, threading, datetime
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import cantos_dev_log as cdl

LINE_RE = re.compile(r'^\[\d{2}:\d{2}:\d{2}\] [A-Z0-9_]+ .+$')


def _isolate(tmp_path, monkeypatch):
    """Point the module at a fresh log file and reset its in-memory
    day-tracking state, so tests don't leak into each other."""
    path = str(tmp_path / "dev_log.txt")
    monkeypatch.setattr(cdl, 'LOG_PATH', path)
    monkeypatch.setattr(cdl, '_last_logged_date', None)
    return path


# ── format ────────────────────────────────────────────────────────────────

def test_line_format_matches_spec(tmp_path, monkeypatch):
    _isolate(tmp_path, monkeypatch)
    line = cdl.log_event('MOTIF', 'read L1-8',
                          'posted board: theme_strengthening, strength 0.81')
    assert re.match(r'^\[\d{2}:\d{2}:\d{2}\] MOTIF read L1-8 → '
                     r'posted board: theme_strengthening, strength 0\.81$', line)


def test_detail_omitted_no_dangling_arrow(tmp_path, monkeypatch):
    _isolate(tmp_path, monkeypatch)
    line = cdl.log_event('BOARD', 'closed thread')
    assert '→' not in line
    assert line.endswith('closed thread')


def test_engine_name_uppercased(tmp_path, monkeypatch):
    _isolate(tmp_path, monkeypatch)
    line = cdl.log_event('motif', 'read L1-8')
    assert line.split('] ', 1)[1].startswith('MOTIF ')


def test_returned_line_matches_file_content(tmp_path, monkeypatch):
    path = _isolate(tmp_path, monkeypatch)
    line = cdl.log_event('MOTIF', 'read L1-8', 'detail here')
    with open(path, encoding='utf-8') as f:
        content = f.read()
    assert line in content


# ── append behavior / persistence ───────────────────────────────────────

def test_multiple_events_append_in_order(tmp_path, monkeypatch):
    path = _isolate(tmp_path, monkeypatch)
    cdl.log_event('MOTIF', 'event one')
    cdl.log_event('BOARD', 'event two')
    cdl.log_event('CASSIUS', 'event three')
    with open(path, encoding='utf-8') as f:
        lines = [l.rstrip('\n') for l in f if l.strip()]
    assert [l.split('] ', 1)[1].split(' ', 1)[0] for l in lines] == \
           ['MOTIF', 'BOARD', 'CASSIUS']


def test_creates_log_file_and_parent_dir_if_missing(tmp_path, monkeypatch):
    path = str(tmp_path / "nested" / "dir" / "dev_log.txt")
    monkeypatch.setattr(cdl, 'LOG_PATH', path)
    monkeypatch.setattr(cdl, '_last_logged_date', None)
    assert not os.path.exists(path)
    cdl.log_event('MOTIF', 'first ever event')
    assert os.path.exists(path)


# ── day-boundary marker ──────────────────────────────────────────────────

def test_day_marker_inserted_on_date_rollover(tmp_path, monkeypatch):
    path = _isolate(tmp_path, monkeypatch)

    fixed_day1 = datetime.datetime(2026, 8, 7, 23, 59, 0)
    monkeypatch.setattr(cdl, '_now', lambda: fixed_day1)
    cdl.log_event('MOTIF', 'last event of day 1')

    fixed_day2 = datetime.datetime(2026, 8, 8, 0, 1, 0)
    monkeypatch.setattr(cdl, '_now', lambda: fixed_day2)
    cdl.log_event('MOTIF', 'first event of day 2')

    with open(path, encoding='utf-8') as f:
        lines = [l.rstrip('\n') for l in f if l.strip()]
    assert any(cdl._is_day_marker(l) for l in lines)
    assert '2026-08-08' in next(l for l in lines if cdl._is_day_marker(l))


def test_no_day_marker_within_same_day(tmp_path, monkeypatch):
    path = _isolate(tmp_path, monkeypatch)
    fixed = datetime.datetime(2026, 8, 7, 10, 0, 0)
    monkeypatch.setattr(cdl, '_now', lambda: fixed)
    cdl.log_event('MOTIF', 'event a')
    cdl.log_event('MOTIF', 'event b')
    with open(path, encoding='utf-8') as f:
        lines = [l.rstrip('\n') for l in f if l.strip()]
    assert not any(cdl._is_day_marker(l) for l in lines)


def test_no_marker_on_first_write_of_a_fresh_process(tmp_path, monkeypatch):
    """A fresh process's very first write (_last_logged_date is None) never
    inserts a marker, even if the file already has older content — this is
    the documented tradeoff of the simpler in-memory-only approach (see
    _maybe_write_day_marker's docstring)."""
    path = _isolate(tmp_path, monkeypatch)
    fixed = datetime.datetime(2026, 8, 7, 10, 0, 0)
    monkeypatch.setattr(cdl, '_now', lambda: fixed)
    cdl.log_event('MOTIF', 'event a')

    # simulate process restart: reset in-memory state, same clock day
    monkeypatch.setattr(cdl, '_last_logged_date', None)
    cdl.log_event('MOTIF', 'event b after restart')

    with open(path, encoding='utf-8') as f:
        lines = [l.rstrip('\n') for l in f if l.strip()]
    assert not any(cdl._is_day_marker(l) for l in lines)


# ── read_recent ───────────────────────────────────────────────────────────

def test_read_recent_returns_empty_list_if_no_file(tmp_path, monkeypatch):
    _isolate(tmp_path, monkeypatch)
    assert cdl.read_recent(10) == []


def test_read_recent_returns_last_n_in_order(tmp_path, monkeypatch):
    _isolate(tmp_path, monkeypatch)
    for i in range(10):
        cdl.log_event('MOTIF', f'event {i}')
    recent = cdl.read_recent(3)
    assert len(recent) == 3
    assert [l.split('event ')[1] for l in recent] == ['7', '8', '9']


def test_read_recent_n_larger_than_file(tmp_path, monkeypatch):
    _isolate(tmp_path, monkeypatch)
    cdl.log_event('MOTIF', 'only event')
    recent = cdl.read_recent(50)
    assert len(recent) == 1


def test_read_recent_filters_by_engine(tmp_path, monkeypatch):
    _isolate(tmp_path, monkeypatch)
    cdl.log_event('MOTIF', 'motif event 1')
    cdl.log_event('BOARD', 'board event 1')
    cdl.log_event('MOTIF', 'motif event 2')
    cdl.log_event('CASSIUS', 'cassius event 1')

    recent = cdl.read_recent(10, engine='motif')  # lowercase on purpose
    assert len(recent) == 2
    assert all('MOTIF' in l for l in recent)


def test_read_recent_handles_large_file_via_tail(tmp_path, monkeypatch):
    """Exercises the chunked-tail-read path, not just a single small read."""
    _isolate(tmp_path, monkeypatch)
    for i in range(500):
        cdl.log_event('MOTIF', f'bulk event {i}', 'x' * 40)
    recent = cdl.read_recent(5)
    assert len(recent) == 5
    assert recent[-1].endswith('bulk event 499 → ' + 'x' * 40)


# ── thread safety ─────────────────────────────────────────────────────────

def test_concurrent_writes_produce_well_formed_lines_no_interleaving(tmp_path, monkeypatch):
    path = _isolate(tmp_path, monkeypatch)
    n_threads, per_thread = 8, 25

    def worker(idx):
        for j in range(per_thread):
            cdl.log_event(f'ENGINE{idx}', f'event {j}')

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(n_threads)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    with open(path, encoding='utf-8') as f:
        lines = [l.rstrip('\n') for l in f if l.strip()]

    assert len(lines) == n_threads * per_thread
    for line in lines:
        assert LINE_RE.match(line), f"malformed/interleaved line: {line!r}"
