"""Tests for cantos/cassius.py — the daily-mode gate (§5.1)."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import cantos.db as db
import cantos.notes as notes
import cantos.cassius as cassius
import cantos.disposition as disposition
import cantos_dev_log as cdl


def test_delta_threshold_anchored_to_one_outcome_step():
    """DELTA_TRIVIAL_THRESHOLD is deliberately set equal to disposition's
    own _OUTCOME_STEP (see cassius.py's module docstring for the
    reasoning) — if one drifts from the other in a future edit, that
    anchor is broken silently. This test makes the drift loud instead."""
    assert cassius.DELTA_TRIVIAL_THRESHOLD == disposition._OUTCOME_STEP


@pytest.fixture(autouse=True)
def isolated(tmp_path, monkeypatch):
    monkeypatch.setattr(db, 'DB_PATH', str(tmp_path / "cantos_test.db"))
    db.reset_schema_cache()
    monkeypatch.setattr(cdl, 'LOG_PATH', str(tmp_path / "dev_log.txt"))
    monkeypatch.setattr(cdl, '_last_logged_date', None)
    yield


def test_has_meaningful_delta_true():
    note = {'basis': {'delta': {'strength': 0.3}}}
    assert cassius.has_meaningful_delta(note)


def test_has_meaningful_delta_false_when_tiny():
    note = {'basis': {'delta': {'strength': 0.01}}}
    assert not cassius.has_meaningful_delta(note)


def test_has_meaningful_delta_false_when_no_basis():
    assert not cassius.has_meaningful_delta({'basis': None})
    assert not cassius.has_meaningful_delta({})


def test_eligible_via_priority_alone():
    note = {'priority': 0.8, 'basis': None}
    assert cassius.is_eligible(note)


def test_eligible_via_delta_alone_even_with_low_priority():
    note = {'priority': 0.2, 'basis': {'delta': {'strength': 0.5}}}
    assert cassius.is_eligible(note)


def test_not_eligible_low_priority_no_delta():
    note = {'priority': 0.2, 'basis': None}
    assert not cassius.is_eligible(note)


def test_daily_gate_surfaces_top_one_by_default():
    notes.drop_note('motif', 's1', 'L1-8', 'low priority', 0.75)
    notes.drop_note('semantics', 's1', 'L9-16', 'highest priority', 0.95)
    notes.drop_note('rhyme', 's1', 'L1-4', 'mid priority', 0.85)

    result = cassius.run_daily_gate('s1')
    assert len(result['surfaced']) == 1
    assert result['surfaced'][0]['message'] == 'highest priority'
    assert len(result['withheld']) == 2


def test_ineligible_notes_never_surfaced_even_if_room():
    notes.drop_note('motif', 's1', 'L1-8', 'too weak', 0.3)  # below T_surface, no delta
    result = cassius.run_daily_gate('s1', surface_max=5)
    assert result['surfaced'] == []
    assert len(result['withheld']) == 1


def test_withheld_notes_are_never_deleted():
    notes.drop_note('motif', 's1', 'L1-8', 'weak', 0.3)
    cassius.run_daily_gate('s1')
    still_there = notes.get_notes('s1')
    assert len(still_there) == 1


def test_surface_max_configurable():
    for i in range(3):
        notes.drop_note('motif', 's1', f'L{i}', f'note {i}', 0.9)
    result = cassius.run_daily_gate('s1', surface_max=2)
    assert len(result['surfaced']) == 2
    assert len(result['withheld']) == 1


def test_delta_eligible_note_surfaces_even_at_low_priority():
    notes.drop_note('motif', 's1', 'L1-8', 'quiet but real change', 0.3,
                     basis={'delta': {'strength': 0.4}})
    result = cassius.run_daily_gate('s1')
    assert len(result['surfaced']) == 1
    assert result['surfaced'][0]['message'] == 'quiet but real change'


def test_already_surfaced_notes_not_reprocessed_on_second_call():
    notes.drop_note('motif', 's1', 'L1-8', 'first', 0.9)
    r1 = cassius.run_daily_gate('s1')
    assert len(r1['surfaced']) == 1

    notes.drop_note('semantics', 's1', 'L9-16', 'second', 0.95)
    r2 = cassius.run_daily_gate('s1')
    assert len(r2['surfaced']) == 1
    assert r2['surfaced'][0]['message'] == 'second'


def test_dev_log_matches_spec_shape():
    notes.drop_note('motif', 's1', 'L1-8', 'a', 0.9)
    notes.drop_note('semantics', 's1', 'L9-16', 'b', 0.95)
    notes.drop_note('rhyme', 's1', 'L1-4', 'c', 0.3)  # ineligible

    cassius.run_daily_gate('s1')
    lines = cdl.read_recent(10, engine='CASSIUS')
    assert any('held 3 notes' in l and 'surfaced 1 to user' in l for l in lines)
    assert any('surfaced note' in l for l in lines)
    assert any('withheld note' in l for l in lines)
