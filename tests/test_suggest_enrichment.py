'''
Tests for application/suggest_enrichment.py — genuinely zero coverage
existed for this logic before it was extracted from api.py's /suggest
route body (Phase 1c, Clean Architecture reorg; confirmed via grep for
'community_uses'/'used_before' across tests/ before writing this file,
not assumed). Closing that gap here, same standard as every other real
gap found and closed this session.

Uses a real, isolated temp usage_history DB per test (not mocked, and
not shared across tests — a fresh file each time so one test's
record_usage() calls can never leak into another's community_uses
count; caught this for real on the first run, not assumed safe) and the
real bundled concreteness.db (read-only reference data, safe to call
for real — same convention as other tests that exercise thesaurus_engine
for real).
'''
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import tempfile
import importlib

import pytest

from application.suggest_enrichment import enrich_suggestions


@pytest.fixture(autouse=True)
def _isolated_concreteness_db():
    '''
    Builds a tiny concreteness DB and points CONCRETENESS_DB_PATH at it.

    The docstring above said this test used "the real bundled concreteness.db".
    That file has never existed in the repository — not gitignored, never
    committed — so get_concreteness() degraded to None and this test could not
    pass on a clean clone. It has been failing on main for anyone who checks
    the project out.

    Asserting a real Brysbaert score tested the presence of a data file rather
    than the enrichment code. A fixture with one known row tests the code, runs
    anywhere, and stays deterministic. Shipping the real norms is a separate
    decision (licensing for commercial use, and the repo's own convention is a
    setup script rather than a committed dataset — see setup_thesaurus.py).
    '''
    import sqlite3
    tmp = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
    tmp.close()
    conn = sqlite3.connect(tmp.name)
    conn.execute('CREATE TABLE ratings (word TEXT, concreteness REAL)')
    conn.execute("INSERT INTO ratings VALUES ('fire', 4.68)")
    conn.commit()
    conn.close()

    os.environ['CONCRETENESS_DB_PATH'] = tmp.name
    import concreteness_engine
    importlib.reload(concreteness_engine)
    concreteness_engine._cached_concreteness.cache_clear()
    yield
    os.environ.pop('CONCRETENESS_DB_PATH', None)
    importlib.reload(concreteness_engine)
    os.unlink(tmp.name)


@pytest.fixture(autouse=True)
def _isolated_usage_db():
    tmp = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
    tmp.close()
    os.environ['PROSODIC_FEATURES_DB_PATH'] = tmp.name
    import usage_history
    importlib.reload(usage_history)
    usage_history.init_table()
    yield usage_history


def test_enriches_with_all_three_fields(_isolated_usage_db):
    suggestions = [{'word': 'fire', 'rhyme_unit': ['AY1', 'ER0']}]
    result = enrich_suggestions(suggestions, user_id=None)
    assert result is suggestions  # mutates and returns the same list
    s = result[0]
    assert 'community_uses' in s
    assert 'used_before' in s
    assert 'concreteness' in s
    assert s['concreteness'] == 4.68  # real Brysbaert score for "fire"


def test_anonymous_caller_always_gets_used_before_zero(_isolated_usage_db):
    suggestions = [{'word': 'anything', 'rhyme_unit': None}]
    result = enrich_suggestions(suggestions, user_id=None)
    assert result[0]['used_before'] == 0


def test_used_before_reflects_real_usage_history(_isolated_usage_db):
    _isolated_usage_db.record_usage(42, [{'word': 'crown', 'line_index': 0, 'word_index': 0, 'color_id': 1}])
    suggestions = [{'word': 'crown', 'rhyme_unit': None}]
    result = enrich_suggestions(suggestions, user_id=42)
    assert result[0]['used_before'] == 1

    # a different user hasn't used it
    suggestions2 = [{'word': 'crown', 'rhyme_unit': None}]
    result2 = enrich_suggestions(suggestions2, user_id=999)
    assert result2[0]['used_before'] == 0


def test_community_uses_excludes_the_requesting_user(_isolated_usage_db):
    # real rhyme_unit for crown/town/gown, confirmed via get_rhyme_unit
    # before writing this test, not guessed
    ru = ['AW1', 'N']
    _isolated_usage_db.record_usage(1, [{'word': 'town', 'line_index': 0, 'word_index': 0, 'color_id': 1}])
    _isolated_usage_db.record_usage(2, [{'word': 'gown', 'line_index': 0, 'word_index': 0, 'color_id': 1}])

    suggestions = [{'word': 'crown', 'rhyme_unit': ru}]
    result = enrich_suggestions(suggestions, user_id=1)
    # user 1's own use of "town" (same rhyme_unit) is excluded from their
    # own community_uses count — only counts OTHER users
    assert result[0]['community_uses'] == 1  # just user 2


def test_never_raises_even_if_a_field_lookup_fails(monkeypatch, _isolated_usage_db):
    '''Preserves the original inline behavior: the whole block is one
    try/except, swallowed and logged, never raised to the caller.'''
    import application.suggest_enrichment as mod

    def _boom(*a, **k):
        raise RuntimeError('simulated failure')

    monkeypatch.setattr(mod, 'get_concreteness', _boom)
    suggestions = [{'word': 'test', 'rhyme_unit': None}]
    result = enrich_suggestions(suggestions, user_id=None)
    assert result is suggestions  # doesn't raise, still returns the list
