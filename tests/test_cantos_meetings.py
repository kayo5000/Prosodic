"""Tests for cantos/meetings.py — Meetings + Refusals (§2.3, §4)."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import cantos.db as db
import cantos.board as board
import cantos.meetings as meetings
import cantos_dev_log as cdl


@pytest.fixture(autouse=True)
def isolated(tmp_path, monkeypatch):
    monkeypatch.setattr(db, 'DB_PATH', str(tmp_path / "cantos_test.db"))
    db.reset_schema_cache()
    monkeypatch.setattr(cdl, 'LOG_PATH', str(tmp_path / "dev_log.txt"))
    monkeypatch.setattr(cdl, '_last_logged_date', None)
    yield


def test_related_identical_signals():
    assert meetings.related('theme_strengthening', 'theme_strengthening')


def test_related_spec_example_chain():
    assert meetings.related('theme_strengthening', 'emotion_rising')
    assert meetings.related('emotion_rising', 'rhyme_family_return')
    assert meetings.related('theme_strengthening', 'rhyme_family_return')


def test_unrelated_signals():
    assert not meetings.related('theme_strengthening', 'pocket_slip')


def test_meeting_forms_when_related_and_strong_enough():
    board.post('motif', 's1', 'L1-8', 'theme_strengthening', 0.81)
    board.post('semantics', 's1', 'L1-8', 'emotion_rising', 0.5)  # combined 1.31 >= 1.2
    formed = meetings.evaluate_meetings('s1')
    assert len(formed) == 1
    m = formed[0]
    assert m['participants'] == ['motif', 'semantics']
    assert m['section'] == 'L1-8'


def test_no_meeting_below_threshold():
    board.post('motif', 's1', 'L1-8', 'theme_strengthening', 0.5)
    board.post('semantics', 's1', 'L1-8', 'emotion_rising', 0.3)  # combined 0.8 < 1.2
    assert meetings.evaluate_meetings('s1') == []


def test_no_meeting_when_signals_unrelated():
    board.post('motif', 's1', 'L1-8', 'theme_strengthening', 0.9)
    board.post('pocket', 's1', 'L1-8', 'pocket_slip', 0.9)  # unrelated, even though strong
    assert meetings.evaluate_meetings('s1') == []


def test_no_meeting_from_same_engine_posting_twice():
    board.post('motif', 's1', 'L1-8', 'theme_strengthening', 0.9)
    board.post('motif', 's1', 'L1-8', 'emotion_rising', 0.9)  # same engine, related signals
    assert meetings.evaluate_meetings('s1') == []


def test_meeting_scoped_to_section():
    board.post('motif', 's1', 'L1-8', 'theme_strengthening', 0.9)
    board.post('semantics', 's1', 'L9-16', 'emotion_rising', 0.9)  # different section
    assert meetings.evaluate_meetings('s1') == []


def test_invited_engine_joins_above_threshold():
    board.post('motif', 's1', 'L1-8', 'theme_strengthening', 0.81)
    board.post('semantics', 's1', 'L1-8', 'emotion_rising', 0.5)
    formed = meetings.evaluate_meetings('s1', invite_candidates={'L1-8': {'rhyme': 0.6}})
    assert 'rhyme' in formed[0]['participants']
    assert formed[0]['declined'] == []


def test_invited_engine_declines_below_threshold_with_exact_reason_shape():
    board.post('motif', 's1', 'L1-8', 'theme_strengthening', 0.81)
    board.post('semantics', 's1', 'L1-8', 'emotion_rising', 0.5)
    formed = meetings.evaluate_meetings('s1', invite_candidates={'L1-8': {'rhyme': 0.3}})
    m = formed[0]
    assert 'rhyme' not in m['participants']
    assert m['declined'] == [{'engine': 'rhyme', 'reason': 'own read thin (0.30), researching'}]


def test_meeting_persisted_and_readable_back():
    board.post('motif', 's1', 'L1-8', 'theme_strengthening', 0.81)
    board.post('semantics', 's1', 'L1-8', 'emotion_rising', 0.5)
    meetings.evaluate_meetings('s1')
    stored = meetings.get_meetings('s1')
    assert len(stored) == 1
    assert stored[0]['section'] == 'L1-8'
    assert set(stored[0]['participants']) == {'motif', 'semantics'}


def test_get_meetings_filters_by_section():
    board.post('motif', 's1', 'L1-8', 'theme_strengthening', 0.81)
    board.post('semantics', 's1', 'L1-8', 'emotion_rising', 0.5)
    board.post('motif', 's1', 'L9-16', 'pocket_slip', 0.9)
    board.post('pocket', 's1', 'L9-16', 'syncopation_spike', 0.9)
    meetings.evaluate_meetings('s1')
    assert len(meetings.get_meetings('s1', section='L1-8')) == 1
    assert len(meetings.get_meetings('s1', section='L9-16')) == 1
    assert len(meetings.get_meetings('s1')) == 2


def test_dev_log_records_join_and_meeting_closed():
    board.post('motif', 's1', 'L1-8', 'theme_strengthening', 0.81)
    board.post('semantics', 's1', 'L1-8', 'emotion_rising', 0.5)
    meetings.evaluate_meetings('s1', invite_candidates={'L1-8': {'rhyme': 0.6}})

    joined_lines = cdl.read_recent(10, engine='RHYME')
    assert any('JOINED' in l and 'L1-8' in l for l in joined_lines)

    meeting_lines = cdl.read_recent(10, engine='MEETING')
    assert any('closed' in l for l in meeting_lines)


def test_dev_log_records_decline_with_spec_phrasing():
    board.post('motif', 's1', 'L1-8', 'theme_strengthening', 0.81)
    board.post('semantics', 's1', 'L1-8', 'emotion_rising', 0.5)
    meetings.evaluate_meetings('s1', invite_candidates={'L1-8': {'rhyme': 0.3}})

    lines = cdl.read_recent(10, engine='RHYME')
    assert any('own read thin (0.30), researching' in l for l in lines)


def test_combined_strength_includes_joined_invitees():
    board.post('motif', 's1', 'L1-8', 'theme_strengthening', 0.6)
    board.post('semantics', 's1', 'L1-8', 'emotion_rising', 0.6)  # combined 1.2, meets T_meet
    formed = meetings.evaluate_meetings('s1', invite_candidates={'L1-8': {'rhyme': 0.7}})
    assert 'combined strength 1.90' in formed[0]['combined_read']
