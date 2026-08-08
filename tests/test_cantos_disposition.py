"""Tests for cantos/disposition.py — Engine Disposition (§2.6).

Covers the mechanism, the clamping, trajectory recomputation, mood_tags
behavior, and — the critical design constraint — that there is NO way to
change confidence/pride/trajectory/mood_tags except through
record_outcome().
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import cantos.db as db
import cantos.disposition as disp
import cantos_dev_log as cdl


@pytest.fixture(autouse=True)
def isolated(tmp_path, monkeypatch):
    monkeypatch.setattr(db, 'DB_PATH', str(tmp_path / "cantos_test.db"))
    db.reset_schema_cache()
    monkeypatch.setattr(cdl, 'LOG_PATH', str(tmp_path / "dev_log.txt"))
    monkeypatch.setattr(cdl, '_last_logged_date', None)
    yield


def test_get_disposition_default_when_none_exists():
    d = disp.get_disposition('motif', 'user1')
    assert d['confidence'] == 0.5
    assert d['pride'] == 0.5
    assert d['trajectory'] == 'flat'
    assert d['views'] == {}
    assert d['mood_tags'] == []
    assert d['updated_at'] is None


def test_record_outcome_rejects_invalid_outcome():
    with pytest.raises(ValueError):
        disp.record_outcome('motif', 'user1', 'entry-id', 'vibes')


def test_record_outcome_requires_notebook_entry_id():
    with pytest.raises(ValueError):
        disp.record_outcome('motif', 'user1', '', 'confirmed')


def test_confirmed_raises_confidence_and_pride():
    d = disp.record_outcome('motif', 'user1', 'entry-1', 'confirmed')
    assert d['confidence'] == pytest.approx(0.55)
    assert d['pride'] == pytest.approx(0.55)


def test_contradicted_lowers_confidence_more_than_pride():
    d = disp.record_outcome('motif', 'user1', 'entry-1', 'contradicted')
    assert d['confidence'] == pytest.approx(0.45)
    assert d['pride'] == pytest.approx(0.475)


def test_inconclusive_does_not_change_confidence_or_pride():
    d = disp.record_outcome('motif', 'user1', 'entry-1', 'inconclusive')
    assert d['confidence'] == 0.5
    assert d['pride'] == 0.5


def test_inconclusive_still_logs_to_dev_log_and_outcomes_table():
    disp.record_outcome('motif', 'user1', 'entry-1', 'inconclusive', evidence={'note': 'unclear'})
    lines = cdl.read_recent(10, engine='MOTIF')
    assert any('inconclusive' in l for l in lines)

    conn = db.get_connection()
    rows = conn.execute('SELECT * FROM disposition_outcomes WHERE engine = ?', ('motif',)).fetchall()
    assert len(rows) == 1
    assert rows[0]['outcome'] == 'inconclusive'


def test_confidence_clamped_at_one():
    for i in range(20):
        d = disp.record_outcome('motif', 'user1', f'entry-{i}', 'confirmed')
    assert d['confidence'] == 1.0
    assert d['pride'] == 1.0


def test_confidence_clamped_at_zero():
    for i in range(20):
        d = disp.record_outcome('motif', 'user1', f'entry-{i}', 'contradicted')
    assert d['confidence'] == 0.0
    assert d['pride'] == 0.0


def test_trajectory_rising_after_majority_confirmed():
    for i in range(4):
        d = disp.record_outcome('motif', 'user1', f'entry-{i}', 'confirmed')
    d = disp.record_outcome('motif', 'user1', 'entry-4', 'contradicted')
    assert d['trajectory'] == 'rising'  # 4 confirmed / 1 contradicted in last 5


def test_trajectory_falling_after_majority_contradicted():
    for i in range(4):
        d = disp.record_outcome('motif', 'user1', f'entry-{i}', 'contradicted')
    d = disp.record_outcome('motif', 'user1', 'entry-4', 'confirmed')
    assert d['trajectory'] == 'falling'


def test_trajectory_flat_when_evenly_mixed():
    disp.record_outcome('motif', 'user1', 'e0', 'confirmed')
    disp.record_outcome('motif', 'user1', 'e1', 'contradicted')
    d = disp.record_outcome('motif', 'user1', 'e2', 'inconclusive')
    assert d['trajectory'] == 'flat'


def test_trajectory_scoped_per_engine_and_user():
    disp.record_outcome('motif', 'user1', 'e0', 'confirmed')
    disp.record_outcome('motif', 'user1', 'e1', 'confirmed')
    d_other_engine = disp.get_disposition('rhyme', 'user1')
    d_other_user = disp.get_disposition('motif', 'user2')
    assert d_other_engine['trajectory'] == 'flat'
    assert d_other_user['trajectory'] == 'flat'


def test_mood_tags_reflect_most_recent_outcome():
    disp.record_outcome('motif', 'user1', 'e0', 'confirmed')
    d = disp.record_outcome('motif', 'user1', 'e1', 'contradicted')
    assert d['mood_tags'][0] == 'reassessing'


def test_mood_tags_deduplicate_and_cap():
    for i in range(10):
        d = disp.record_outcome('motif', 'user1', f'e{i}', 'confirmed')
    assert d['mood_tags'].count('assured') == 1
    assert len(d['mood_tags']) <= 5


def test_update_view_requires_basis():
    with pytest.raises(ValueError):
        disp.update_view('motif', 'user1', 'J. Cole', 'admires density', basis='')


def test_update_view_stores_stance_and_logs():
    d = disp.update_view('motif', 'user1', 'J. Cole', 'admires density, distrusts pocket',
                          basis='studied 12 verses, high internal rhyme, low pocket alignment')
    assert d['views']['J. Cole'] == 'admires density, distrusts pocket'
    lines = cdl.read_recent(5, engine='MOTIF')
    assert any('J. Cole' in l for l in lines)


def test_update_view_does_not_affect_confidence_or_pride():
    d = disp.update_view('motif', 'user1', 'J. Cole', 'stance', basis='grounds')
    assert d['confidence'] == 0.5
    assert d['pride'] == 0.5


# ── the critical design constraint ───────────────────────────────────────

def test_no_public_free_mood_setter_exists():
    """There must be no way to nudge confidence/pride/trajectory/mood_tags
    without going through record_outcome(). Guards against a future
    convenience function quietly reintroducing 'mood for its own sake'."""
    public_names = [n for n in dir(disp) if not n.startswith('_')]
    forbidden_substrings = ('set_confidence', 'set_pride', 'set_mood',
                             'set_trajectory', 'add_mood_tag', 'bump_confidence')
    for name in public_names:
        for forbidden in forbidden_substrings:
            assert forbidden not in name.lower(), (
                f'{name} looks like a free-form disposition setter — '
                f'disposition may only change via record_outcome()'
            )
