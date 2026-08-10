'''
Real concurrent-load tests for the 7 modules that used to hold a
thread-local SQLite connection open forever: cantos/db.py,
concreteness_engine.py, feature_store.py, learning_engine.py,
telemetry.py, thesaurus_engine.py, usage_history.py.

Not "it runs once cleanly" — actual multiple threads hammering the same
DB-backed functions at the same time, confirming zero "database is
locked" errors and zero lost writes. feature_store.py, telemetry.py, and
usage_history.py share one physical file (prosodic_features.db) — the
highest-risk case, closest to real production traffic where many
concurrent /analyze requests would all touch that same file at once —
so that scenario gets its own dedicated multi-module test, not just each
file tested in isolation.
'''
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import tempfile
import threading
import queue

N_THREADS = 25
N_OPS_PER_THREAD = 8


def _run_concurrently(fn, n_threads=N_THREADS):
    '''Fires fn() from n_threads real threads, released simultaneously via
    a barrier (not just started in a loop — a loop lets early threads
    finish before late ones even start, understating real concurrency).
    Returns (results, errors) — errors is a list of (thread_index, exc).'''
    barrier = threading.Barrier(n_threads)
    results = queue.Queue()
    errors = queue.Queue()

    def worker(i):
        barrier.wait()
        try:
            results.put(fn(i))
        except Exception as exc:
            errors.put((i, exc))

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(n_threads)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=30)

    return list(results.queue), list(errors.queue)


def _assert_no_lock_errors(errors, label):
    lock_errors = [e for _, e in errors if 'database is locked' in str(e).lower()]
    assert not lock_errors, (
        f'{label}: {len(lock_errors)}/{len(errors)} errors were "database is '
        f'locked" under real concurrent load — the fix did not actually work. '
        f'First: {lock_errors[0]}'
    )
    assert not errors, f'{label}: unexpected errors under concurrent load: {errors[:3]}'


# ── thesaurus_engine.py (read-heavy, real bundled DB — no temp override) ──

def test_thesaurus_concurrent_reads_no_lock_errors():
    import thesaurus_engine as te
    words = ['happy', 'sad', 'reverse', 'money', 'blessed', 'stressed', 'fire', 'diverse']

    def op(i):
        word = words[i % len(words)]
        return te.lookup(word)['found']

    results, errors = _run_concurrently(op)
    _assert_no_lock_errors(errors, 'thesaurus_engine')
    assert all(results), 'expected every real word to be found'


# ── concreteness_engine.py (read-heavy, real bundled DB) ──────────────────

def test_concreteness_concurrent_reads_no_lock_errors():
    import concreteness_engine as ce
    words = ['cat', 'dog', 'justice', 'hammer', 'freedom', 'stone']

    def op(i):
        return ce.get_concreteness(words[i % len(words)])

    results, errors = _run_concurrently(op)
    _assert_no_lock_errors(errors, 'concreteness_engine')


# ── learning_engine.py (writes, own dedicated temp DB) ─────────────────────

def test_learning_engine_concurrent_writes_no_lock_errors_no_lost_writes():
    _tmp = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
    _tmp.close()
    os.environ['LEARNING_SIGNALS_DB_PATH'] = _tmp.name
    import importlib
    import learning_engine as le
    importlib.reload(le)

    def op(i):
        le.record_signal(f'word{i % 5}', 'add', color_id=1)
        return True

    _, errors = _run_concurrently(op)
    _assert_no_lock_errors(errors, 'learning_engine')

    # Every thread hit one of 5 distinct words — confirm the UPSERT
    # counted every single write, none lost to a silently-swallowed
    # lock conflict.
    top = le.get_top_signals(10)
    total_count = sum(row['count'] for row in top)
    assert total_count == N_THREADS, (
        f'expected {N_THREADS} total recorded signals across all words, '
        f'got {total_count} — some concurrent writes were lost'
    )


# ── cantos/db.py (writes, own dedicated temp DB) ────────────────────────────

def test_cantos_db_concurrent_notebook_writes_no_lock_errors_no_lost_writes():
    # cantos/db.py resolves DB_PATH once at import time — by the point
    # this test runs (alphabetically after test_cantos_*.py, which
    # already imported the module), setting the CANTOS_DB_PATH env var
    # here is a no-op; the module is already loaded with a different
    # DB_PATH. Patch the module attribute directly instead, same
    # pattern already established in test_cantos_wiring.py.
    from cantos import db as cdb
    _tmp_dir = tempfile.mkdtemp()
    cdb.DB_PATH = os.path.join(_tmp_dir, 'cantos_concurrency_test.db')
    cdb.reset_schema_cache()
    from cantos import notebooks

    def op(i):
        notebooks.append_entry(
            engine='state', user_id=f'user{i % 5}', session_id='s1',
            observation=f'test observation {i}', metrics={'confidence': 0.5},
        )
        return True

    _, errors = _run_concurrently(op)
    _assert_no_lock_errors(errors, 'cantos/db.py')

    conn = cdb.get_connection()
    row = conn.execute('SELECT COUNT(*) as n FROM notebook_entries').fetchone()
    assert row['n'] == N_THREADS, (
        f'expected {N_THREADS} notebook entries, got {row["n"]} — '
        f'some concurrent writes were lost'
    )
    cdb.close_connection()


# ── feature_store.py + telemetry.py + usage_history.py sharing ONE file ────
# The highest-risk real scenario: multiple modules, multiple threads, one
# physical SQLite file, real writes AND reads interleaved — closest
# analogue to real concurrent /analyze traffic.

def test_shared_features_db_concurrent_mixed_load_no_lock_errors():
    _tmp = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
    _tmp.close()
    os.environ['PROSODIC_FEATURES_DB_PATH'] = _tmp.name

    import importlib
    import feature_store as fs
    import telemetry as tel
    import usage_history as uh
    importlib.reload(fs)
    importlib.reload(tel)
    importlib.reload(uh)
    uh.init_table()

    from prosodic_data_objects import PhonemeSequence

    def op(i):
        # A mix of writes (two different modules, same file) and reads —
        # real traffic isn't all-writes or all-reads.
        fs.write_phoneme_sequence(PhonemeSequence(
            word=f'word{i}', phonemes=['W', 'ER1', 'D'],
            syllable_count=1, stress_pattern=[1],
        ))
        tel.log_suggestion_accepted(
            word=f'word{i}', rank=1, rhyme_score=0.9, star_rating=4,
        )
        uh.record_usage(1, [{'word': f'word{i}', 'line_index': 0, 'word_index': 0, 'color_id': 1}])
        fs.get_all_phoneme_sequences()  # a read, interleaved with writes
        return True

    _, errors = _run_concurrently(op)
    _assert_no_lock_errors(errors, 'feature_store+telemetry+usage_history (shared file)')

    # No lost writes across any of the three modules/tables.
    assert len(fs.get_all_phoneme_sequences()) == N_THREADS
    assert tel.get_signal_summary().get('suggestion_accepted') == N_THREADS
    assert uh.user_has_used(1, 'word0') == 1


# ── Higher-volume repeat pass — catches anything that only shows up with ──
# ── more operations per thread, not just more threads ─────────────────────

def test_repeated_operations_per_thread_still_no_lock_errors():
    _tmp = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
    _tmp.close()
    os.environ['LEARNING_SIGNALS_DB_PATH'] = _tmp.name
    import importlib
    import learning_engine as le
    importlib.reload(le)

    def op(i):
        for j in range(N_OPS_PER_THREAD):
            le.record_signal(f'w{j}', 'add', color_id=i % 3)
        return True

    _, errors = _run_concurrently(op, n_threads=15)
    _assert_no_lock_errors(errors, 'learning_engine (repeated ops per thread)')
