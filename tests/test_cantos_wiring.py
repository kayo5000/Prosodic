"""Tests for cantos/wiring.py — the one worked example of wiring an
existing engine (behavior/state_engine) to Cantos Notebooks.

Exercises the REAL chain: bar_segmenter -> feedback_engine ->
bar_feature_mapper -> state_engine.classify() -> notebooks.append_entry().
Not mocked — this is the actual production code path each piece already
has its own unit tests for; this just proves they compose correctly and
that a real Notebook Entry lands in the DB as a result.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import cantos.db as db
import cantos.notebooks as nb
from cantos.wiring import record_state_snapshot

_VERSE = (
    "I never ran from a fight but I been on the run\n"
    "Chasing something that I thought was gonna come undone\n"
    "In the mirror I can see a different kind of me\n"
    "And everything I ever thought was blurry's coming free"
)
_BPM = 90


@pytest.fixture(autouse=True)
def isolated_db(tmp_path, monkeypatch):
    monkeypatch.setattr(db, 'DB_PATH', str(tmp_path / "cantos_test.db"))
    db.reset_schema_cache()
    yield


def test_record_state_snapshot_writes_a_real_notebook_entry():
    state_result, entry = record_state_snapshot('user1', 'session1', _VERSE, _BPM)

    assert state_result['section_state'] in (
        'Locked', 'Tightening', 'Pushing', 'Slipping', 'Flat', 'Exposed',
    )
    assert 0.0 <= state_result['confidence'] <= 1.0

    assert entry['engine'] == 'state'
    assert entry['user_id'] == 'user1'
    assert f"section_state={state_result['section_state']}" == entry['observation']
    assert entry['metrics']['confidence'] == state_result['confidence']
    assert entry['delta'] is None  # first entry for this (engine, user)


def test_second_call_produces_a_real_delta():
    record_state_snapshot('user1', 's1', _VERSE, _BPM)
    _, entry2 = record_state_snapshot('user1', 's2', _VERSE, _BPM)
    assert entry2['delta'] is not None
    assert 'confidence' in entry2['delta']


def test_entry_actually_persisted_and_readable_back():
    record_state_snapshot('user1', 's1', _VERSE, _BPM)
    entries = nb.get_entries('state', 'user1')
    assert len(entries) == 1
    assert entries[0]['engine'] == 'state'


def test_rejects_blank_verse():
    with pytest.raises(ValueError):
        record_state_snapshot('user1', 's1', '   \n  \n', _BPM)
