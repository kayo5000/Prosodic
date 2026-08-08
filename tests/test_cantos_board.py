"""Tests for cantos/board.py — Board Post persistence (§2.2)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import cantos.db as db
import cantos.board as board
import cantos_dev_log as cdl


@pytest.fixture(autouse=True)
def isolated(tmp_path, monkeypatch):
    monkeypatch.setattr(db, 'DB_PATH', str(tmp_path / "cantos_test.db"))
    db.reset_schema_cache()
    monkeypatch.setattr(cdl, 'LOG_PATH', str(tmp_path / "dev_log.txt"))
    monkeypatch.setattr(cdl, '_last_logged_date', None)
    yield


def test_post_basic():
    p = board.post('MOTIF', 'session1', 'L1-8', 'theme_strengthening', 0.81,
                    summary='the theme is deepening')
    assert p['engine'] == 'motif'
    assert p['section'] == 'L1-8'
    assert p['signal'] == 'theme_strengthening'
    assert p['strength'] == 0.81
    assert p['id']
    assert p['timestamp']


def test_post_logs_in_spec_example_shape():
    board.post('motif', 'session1', 'L1-8', 'theme_strengthening', 0.81)
    lines = cdl.read_recent(5, engine='MOTIF')
    assert len(lines) == 1
    assert 'L1-8' in lines[0]
    assert 'posted board: theme_strengthening, strength 0.81' in lines[0]


@pytest.mark.parametrize('strength', [-0.1, 1.1, 2.0])
def test_post_rejects_out_of_range_strength(strength):
    with pytest.raises(ValueError):
        board.post('motif', 's1', 'L1-8', 'signal', strength)


@pytest.mark.parametrize('kwargs', [
    dict(engine='', session_id='s', section='L1-8', signal='x', strength=0.5),
    dict(engine='motif', session_id='', section='L1-8', signal='x', strength=0.5),
    dict(engine='motif', session_id='s', section='', signal='x', strength=0.5),
    dict(engine='motif', session_id='s', section='L1-8', signal='', strength=0.5),
])
def test_post_requires_all_fields(kwargs):
    with pytest.raises(ValueError):
        board.post(**kwargs)


def test_get_posts_any_engine_reads_all():
    """The whole point of a board vs. a notebook: no per-caller filter."""
    board.post('motif', 's1', 'L1-8', 'sig_a', 0.5)
    board.post('rhyme', 's1', 'L1-8', 'sig_b', 0.6)
    posts = board.get_posts('s1')
    assert {p['engine'] for p in posts} == {'motif', 'rhyme'}


def test_get_posts_scoped_to_session():
    board.post('motif', 's1', 'L1-8', 'sig_a', 0.5)
    board.post('motif', 's2', 'L1-8', 'sig_b', 0.5)
    posts = board.get_posts('s1')
    assert len(posts) == 1
    assert posts[0]['session_id'] == 's1'


def test_get_posts_filter_by_section():
    board.post('motif', 's1', 'L1-8', 'sig_a', 0.5)
    board.post('motif', 's1', 'L9-16', 'sig_b', 0.5)
    posts = board.get_posts('s1', section='L1-8')
    assert len(posts) == 1
    assert posts[0]['section'] == 'L1-8'


def test_get_posts_filter_by_engine_case_insensitive():
    board.post('motif', 's1', 'L1-8', 'sig_a', 0.5)
    board.post('rhyme', 's1', 'L1-8', 'sig_b', 0.5)
    posts = board.get_posts('s1', engine='MOTIF')
    assert len(posts) == 1
    assert posts[0]['engine'] == 'motif'


def test_get_posts_ordered_oldest_first():
    board.post('motif', 's1', 'L1-8', 'first', 0.5)
    board.post('rhyme', 's1', 'L1-8', 'second', 0.5)
    posts = board.get_posts('s1')
    assert [p['signal'] for p in posts] == ['first', 'second']


def test_get_sections_with_posts_requires_two_different_engines():
    board.post('motif', 's1', 'L1-8', 'sig_a', 0.5)
    board.post('motif', 's1', 'L1-8', 'sig_a_again', 0.5)  # same engine twice
    board.post('motif', 's1', 'L9-16', 'sig_c', 0.5)
    board.post('rhyme', 's1', 'L9-16', 'sig_d', 0.5)

    overlap = board.get_sections_with_posts('s1')
    assert 'L1-8' not in overlap    # only motif posted here, twice
    assert 'L9-16' in overlap       # motif AND rhyme both posted here
    assert overlap['L9-16'] == {'motif', 'rhyme'}
