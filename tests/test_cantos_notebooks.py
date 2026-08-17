"""Tests for cantos/notebooks.py — Notebook Entry persistence (§2.1)."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import cantos.db as db
import cantos.notebooks as nb


@pytest.fixture(autouse=True)
def isolated_db(tmp_path, monkeypatch):
    monkeypatch.setattr(db, 'DB_PATH', str(tmp_path / "cantos_test.db"))
    db.reset_schema_cache()
    yield


def test_append_entry_first_call_has_null_delta():
    entry = nb.append_entry('motif', 'user1', 'session1', 'read L1-8',
                             {'strength': 0.81})
    assert entry['delta'] is None
    assert entry['engine'] == 'motif'
    assert entry['metrics'] == {'strength': 0.81}
    assert entry['id']
    assert entry['timestamp']


def test_engine_name_normalized_lowercase():
    entry = nb.append_entry('MOTIF', 'user1', 'session1', 'read L1-8')
    assert entry['engine'] == 'motif'


def test_second_entry_computes_numeric_delta():
    nb.append_entry('motif', 'user1', 's1', 'first read', {'strength': 0.60})
    entry2 = nb.append_entry('motif', 'user1', 's2', 'second read', {'strength': 0.81})
    assert entry2['delta'] == {'strength': 0.21}


def test_delta_skips_non_numeric_and_one_sided_keys():
    nb.append_entry('motif', 'user1', 's1', 'first', {'strength': 0.5, 'label': 'flat'})
    entry2 = nb.append_entry('motif', 'user1', 's2', 'second',
                              {'strength': 0.7, 'label': 'rising', 'new_key': 1.0})
    assert entry2['delta'] == {'strength': 0.2}


def test_delta_is_none_when_no_comparable_numeric_keys():
    nb.append_entry('motif', 'user1', 's1', 'first', {'label': 'flat'})
    entry2 = nb.append_entry('motif', 'user1', 's2', 'second', {'label': 'rising'})
    assert entry2['delta'] is None


def test_delta_scoped_per_engine_and_user():
    """A different engine, or a different user, must not see each other's
    prior entries when computing delta."""
    nb.append_entry('motif', 'user1', 's1', 'first', {'strength': 0.9})
    other_engine = nb.append_entry('rhyme', 'user1', 's1', 'first', {'strength': 0.1})
    other_user = nb.append_entry('motif', 'user2', 's1', 'first', {'strength': 0.1})
    assert other_engine['delta'] is None
    assert other_user['delta'] is None


def test_get_last_entry_returns_most_recent():
    nb.append_entry('motif', 'user1', 's1', 'first', {'strength': 0.5})
    nb.append_entry('motif', 'user1', 's2', 'second', {'strength': 0.6})
    last = nb.get_last_entry('motif', 'user1')
    assert last['observation'] == 'second'


def test_get_last_entry_none_when_no_entries():
    assert nb.get_last_entry('motif', 'brand_new_user') is None


def test_get_entries_newest_on_top():
    for i in range(5):
        nb.append_entry('motif', 'user1', f's{i}', f'entry {i}', {'strength': i / 10})
    entries = nb.get_entries('motif', 'user1', limit=20)
    assert [e['observation'] for e in entries] == \
           ['entry 4', 'entry 3', 'entry 2', 'entry 1', 'entry 0']


def test_get_entries_respects_limit():
    for i in range(10):
        nb.append_entry('motif', 'user1', f's{i}', f'entry {i}', {'strength': i})
    entries = nb.get_entries('motif', 'user1', limit=3)
    assert len(entries) == 3
    assert entries[0]['observation'] == 'entry 9'


@pytest.mark.parametrize('kwargs', [
    dict(engine='', user_id='u', session_id='s', observation='x'),
    dict(engine='motif', user_id='', session_id='s', observation='x'),
    dict(engine='motif', user_id='u', session_id='', observation='x'),
    dict(engine='motif', user_id='u', session_id='s', observation=''),
])
def test_append_entry_requires_all_fields(kwargs):
    with pytest.raises(ValueError):
        nb.append_entry(**kwargs)


def test_entries_persist_across_get_connection_calls():
    """Same isolated DB file, two separate calls -> data actually landed
    on disk, not just held in a Python object."""
    nb.append_entry('motif', 'user1', 's1', 'persisted?', {'strength': 0.5})
    db.reset_schema_cache()  # forces a fresh connection object
    entries = nb.get_entries('motif', 'user1')
    assert len(entries) == 1
    assert entries[0]['observation'] == 'persisted?'
