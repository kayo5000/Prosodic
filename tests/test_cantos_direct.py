"""Tests for cantos/direct.py — Direct mode (§5.2)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import cantos.db as db
import cantos.notebooks as notebooks
import cantos.disposition as disposition
import cantos.direct as direct
import cantos_dev_log as cdl


@pytest.fixture(autouse=True)
def isolated(tmp_path, monkeypatch):
    monkeypatch.setattr(db, 'DB_PATH', str(tmp_path / "cantos_test.db"))
    db.reset_schema_cache()
    monkeypatch.setattr(cdl, 'LOG_PATH', str(tmp_path / "dev_log.txt"))
    monkeypatch.setattr(cdl, '_last_logged_date', None)
    yield


def test_knock_requires_engine_and_user():
    with pytest.raises(ValueError):
        direct.knock('', 'user1')
    with pytest.raises(ValueError):
        direct.knock('motif', '')


def test_knock_with_no_history_yet():
    result = direct.knock('motif', 'brand_new_user')
    assert 'Nothing in the notebook' in result['response']
    assert result['recent_entries'] == []


def test_knock_uses_most_recent_notebook_entry():
    notebooks.append_entry('motif', 'user1', 's1', 'read L1-8', {'strength': 0.5})
    notebooks.append_entry('motif', 'user1', 's2', 'read L9-16', {'strength': 0.7})
    result = direct.knock('motif', 'user1')
    assert 'read L9-16' in result['response']


def test_knock_grounds_response_in_disposition():
    notebooks.append_entry('motif', 'user1', 's1', 'entry one', {'strength': 0.5})
    for i in range(4):
        disposition.record_outcome('motif', 'user1', f'e{i}', 'confirmed')
    result = direct.knock('motif', 'user1')
    assert 'rising' in result['response']
    assert result['disposition']['trajectory'] == 'rising'


def test_knock_about_a_known_subject_uses_the_view():
    disposition.update_view('motif', 'user1', 'J. Cole',
                             'admires density, distrusts pocket', basis='studied 12 verses')
    result = direct.knock('motif', 'user1', subject='J. Cole')
    assert result['response'] == 'On J. Cole: admires density, distrusts pocket'


def test_knock_about_unknown_subject_falls_back_to_general_standing():
    notebooks.append_entry('motif', 'user1', 's1', 'entry one', {'strength': 0.5})
    result = direct.knock('motif', 'user1', subject='Some Artist Never Studied')
    assert 'entry one' in result['response']


def test_knock_engine_name_normalized():
    notebooks.append_entry('motif', 'user1', 's1', 'entry', {'strength': 0.5})
    result = direct.knock('MOTIF', 'user1')
    assert result['engine'] == 'motif'


def test_knock_returns_recent_entries_up_to_limit():
    for i in range(10):
        notebooks.append_entry('motif', 'user1', f's{i}', f'entry {i}', {'strength': i / 10})
    result = direct.knock('motif', 'user1', recent_limit=3)
    assert len(result['recent_entries']) == 3


def test_knock_scoped_per_user_does_not_leak_other_users_notebook():
    notebooks.append_entry('motif', 'user1', 's1', "user1's private entry", {'strength': 0.5})
    result = direct.knock('motif', 'user2')
    assert 'private' not in result['response']
    assert result['recent_entries'] == []


def test_knock_logged():
    direct.knock('motif', 'user1', subject='J. Cole')
    lines = cdl.read_recent(5, engine='MOTIF')
    assert any('knock received' in l and 'J. Cole' in l for l in lines)


def test_knock_never_touches_notes_or_cassius_tables():
    """Direct mode must bypass the daily gate entirely — no side effect
    on the notes table."""
    notebooks.append_entry('motif', 'user1', 's1', 'entry', {'strength': 0.5})
    direct.knock('motif', 'user1')
    conn = db.get_connection()
    count = conn.execute('SELECT COUNT(*) FROM notes').fetchone()[0]
    assert count == 0
