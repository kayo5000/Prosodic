"""
tests/test_cantos_integration.py — one full session loop, end to end.

Not testing any module in isolation (each already has its own unit
tests) — this proves board -> meetings -> notes -> cassius -> direct all
actually compose, matching the §3 session loop shape:
  1. engines post to the board
  2. a meeting forms from overlapping signals
  3. the meeting (and a separate weak engine) drop notes
  4. Cassius surfaces the strong one, withholds the weak one
  5. a direct-mode knock on the surfaced engine reflects the same history
  6. the Cantos Dev Log has a coherent, readable record of the whole thing
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import cantos.db as db
import cantos.board as board
import cantos.meetings as meetings
import cantos.notes as notes
import cantos.cassius as cassius
import cantos.direct as direct
import cantos_dev_log as cdl


@pytest.fixture(autouse=True)
def isolated(tmp_path, monkeypatch):
    monkeypatch.setattr(db, 'DB_PATH', str(tmp_path / "cantos_test.db"))
    db.reset_schema_cache()
    monkeypatch.setattr(cdl, 'LOG_PATH', str(tmp_path / "dev_log.txt"))
    monkeypatch.setattr(cdl, '_last_logged_date', None)
    yield


def test_full_session_loop():
    session_id = 'session1'

    # 1. two engines post related signals on the same section
    board.post('motif', session_id, 'L1-8', 'theme_strengthening', 0.81,
               summary='the theme is deepening')
    board.post('semantics', session_id, 'L1-8', 'emotion_rising', 0.55)

    # an unrelated, weak, isolated post elsewhere — should never form a
    # meeting and should end up withheld if it becomes a note
    board.post('device', session_id, 'L20-24', 'rhetorical_question', 0.25)

    # 2. a meeting forms from the first two
    formed = meetings.evaluate_meetings(session_id)
    assert len(formed) == 1
    meeting = formed[0]
    assert set(meeting['participants']) == {'motif', 'semantics'}

    # 3. the meeting drops a strong note; the weak solo post drops a weak one
    strong_note = notes.drop_note(
        source=f"meeting:{meeting['id']}",
        session_id=session_id, section='L1-8',
        message=meeting['combined_read'],
        priority=0.85,
        basis={'meeting_id': meeting['id']},
    )
    weak_note = notes.drop_note(
        source='device', session_id=session_id, section='L20-24',
        message='a rhetorical question showed up',
        priority=0.3,
    )

    # 4. Cassius surfaces the strong one, withholds the weak one
    result = cassius.run_daily_gate(session_id)
    assert len(result['surfaced']) == 1
    assert result['surfaced'][0]['id'] == strong_note['id']
    withheld_ids = {n['id'] for n in result['withheld']}
    assert weak_note['id'] in withheld_ids

    # weak note is still there, just not surfaced — never deleted
    assert len(notes.get_notes(session_id)) == 2

    # 5. direct mode on one of the meeting's participants reflects reality
    knock_result = direct.knock('motif', 'some_user')
    assert knock_result['engine'] == 'motif'
    # no notebook entries were ever written for 'motif' in THIS test (that's
    # a separate subsystem, notebooks.py, not exercised by the board/meeting/
    # notes/cassius loop above) — knock() must degrade gracefully, not crash
    assert 'Nothing in the notebook' in knock_result['response']

    # 6. the dev log reads as a coherent record of the whole loop
    all_lines = cdl.read_recent(50)
    joined = '\n'.join(all_lines)
    assert 'posted board' in joined
    assert 'closed' in joined                 # MEETING closed
    assert 'dropped note' in joined
    assert 'surfaced note' in joined
    assert 'withheld note' in joined
    assert 'held 2 notes' in joined and 'surfaced 1 to user' in joined
    assert 'knock received' in joined


def test_meeting_below_threshold_never_reaches_cassius():
    """Negative-path integration check: a section that never clears
    T_meet produces no meeting, and nothing gets auto-surfaced from it."""
    session_id = 'session2'
    board.post('motif', session_id, 'L1-4', 'theme_strengthening', 0.3)
    board.post('semantics', session_id, 'L1-4', 'emotion_rising', 0.3)  # combined 0.6 < 1.2

    formed = meetings.evaluate_meetings(session_id)
    assert formed == []

    result = cassius.run_daily_gate(session_id)
    assert result['surfaced'] == []
    assert result['withheld'] == []
