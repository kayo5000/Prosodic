"""Tests for cantos/notes.py — Note to Cassius persistence (§2.4)."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import cantos.db as db
import cantos.notes as notes
import cantos_dev_log as cdl


@pytest.fixture(autouse=True)
def isolated(tmp_path, monkeypatch):
    monkeypatch.setattr(db, 'DB_PATH', str(tmp_path / "cantos_test.db"))
    db.reset_schema_cache()
    monkeypatch.setattr(cdl, 'LOG_PATH', str(tmp_path / "dev_log.txt"))
    monkeypatch.setattr(cdl, '_last_logged_date', None)
    yield


def test_drop_note_basic():
    n = notes.drop_note('motif', 's1', 'L1-8', 'the theme is deepening', 0.77,
                         basis={'delta': {'strength': 0.21}})
    assert n['source'] == 'motif'
    assert n['priority'] == 0.77
    assert n['surfaced'] is False
    assert n['surfaced_at'] is None
    assert n['id']


def test_drop_note_from_a_meeting():
    notes.drop_note('meeting:abc123', 's1', 'L1-8', 'motif+semantics agree', 0.77)
    lines = cdl.read_recent(5, engine='MEETING')
    assert len(lines) == 1


@pytest.mark.parametrize('priority', [-0.1, 1.1])
def test_drop_note_rejects_out_of_range_priority(priority):
    with pytest.raises(ValueError):
        notes.drop_note('motif', 's1', 'L1-8', 'msg', priority)


def test_drop_note_requires_fields():
    with pytest.raises(ValueError):
        notes.drop_note('', 's1', 'L1-8', 'msg', 0.5)
    with pytest.raises(ValueError):
        notes.drop_note('motif', 's1', 'L1-8', '', 0.5)


def test_get_notes_scoped_to_session():
    notes.drop_note('motif', 's1', 'L1-8', 'msg a', 0.5)
    notes.drop_note('motif', 's2', 'L1-8', 'msg b', 0.5)
    assert len(notes.get_notes('s1')) == 1


def test_get_notes_filter_by_surfaced():
    n1 = notes.drop_note('motif', 's1', 'L1-8', 'msg a', 0.5)
    notes.drop_note('motif', 's1', 'L1-8', 'msg b', 0.5)
    notes.mark_surfaced(n1['id'])

    surfaced = notes.get_notes('s1', surfaced=True)
    unsurfaced = notes.get_notes('s1', surfaced=False)
    assert len(surfaced) == 1 and surfaced[0]['message'] == 'msg a'
    assert len(unsurfaced) == 1 and unsurfaced[0]['message'] == 'msg b'


def test_mark_surfaced_sets_flag_and_timestamp():
    n = notes.drop_note('motif', 's1', 'L1-8', 'msg', 0.5)
    notes.mark_surfaced(n['id'])
    reloaded = notes.get_notes('s1', surfaced=True)
    assert len(reloaded) == 1
    assert reloaded[0]['surfaced_at'] is not None


def test_dropped_note_logged():
    notes.drop_note('motif', 's1', 'L1-8', 'msg', 0.77)
    lines = cdl.read_recent(5, engine='MOTIF')
    assert any('0.77' in l and 'L1-8' in l for l in lines)
