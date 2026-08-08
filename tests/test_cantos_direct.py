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


# ── _looks_like_lyric_content() — the boundary guard, unit-tested directly ─

@pytest.mark.parametrize('text', [
    'Try writing something like "keep pushing through the pain" here.',
    "Here's a line you could use: stay hungry, stay grounded.",
    'You could say: rise above the noise, find your sound.',
    'Something like: shadows fade when the light comes home.',
    'If I had to guess: chasing echoes down an empty street.',
])
def test_looks_like_lyric_content_catches_ghostwrite_phrases(text):
    assert direct._looks_like_lyric_content(text)


def test_looks_like_lyric_content_catches_multiline():
    text = 'Line one about the pocket.\nLine two about the rhyme.\nLine three closes it.'
    assert direct._looks_like_lyric_content(text)


def test_looks_like_lyric_content_catches_long_quoted_phrase():
    text = 'Notice how the phrase "walking through the fire but I never learned to burn" lands.'
    assert direct._looks_like_lyric_content(text)


def test_looks_like_lyric_content_false_on_clean_analysis():
    text = (
        'The rhyme density is climbing across these bars. Notice how the '
        'pocket alignment tightens through the middle section.'
    )
    assert not direct._looks_like_lyric_content(text)


def test_looks_like_lyric_content_short_quote_not_flagged():
    text = 'Notice the recurring "pocket" motif across bars 1-4.'
    assert not direct._looks_like_lyric_content(text)


# ── converse() — mocked network, no real API calls ────────────────────────

class _FakeBlock:
    def __init__(self, text):
        self.text = text


class _FakeResponse:
    def __init__(self, text):
        self.content = [_FakeBlock(text)]


class _FakeMessages:
    def __init__(self, text=None, exc=None):
        self._text = text
        self._exc = exc

    def create(self, **kwargs):
        if self._exc:
            raise self._exc
        return _FakeResponse(self._text)


class _FakeClient:
    def __init__(self, text=None, exc=None):
        self.messages = _FakeMessages(text=text, exc=exc)


def _patch_anthropic(monkeypatch, text=None, exc=None):
    monkeypatch.setattr(direct.anthropic, 'Anthropic', lambda **kwargs: _FakeClient(text=text, exc=exc))
    monkeypatch.setenv('ANTHROPIC_API_KEY', 'fake-key-for-testing')


def test_converse_requires_all_fields():
    with pytest.raises(ValueError):
        direct.converse('', 'user1', 'hello')
    with pytest.raises(ValueError):
        direct.converse('motif', '', 'hello')
    with pytest.raises(ValueError):
        direct.converse('motif', 'user1', '')


def test_converse_falls_back_with_no_api_key(monkeypatch):
    monkeypatch.delenv('ANTHROPIC_API_KEY', raising=False)
    result = direct.converse('motif', 'user1', 'what do you notice?')
    assert result['mode'] == 'rule_voiced_fallback'
    assert result['message'] == 'what do you notice?'


def test_converse_falls_back_on_api_exception(monkeypatch):
    _patch_anthropic(monkeypatch, exc=RuntimeError('network down'))
    result = direct.converse('motif', 'user1', 'what do you notice?')
    assert result['mode'] == 'rule_voiced_fallback'


def test_converse_falls_back_on_forbidden_word(monkeypatch):
    _patch_anthropic(monkeypatch, text='This is a really good and powerful verse structure.')
    result = direct.converse('motif', 'user1', 'how am I doing?')
    assert result['mode'] == 'rule_voiced_fallback'


def test_converse_falls_back_on_lyric_shaped_response(monkeypatch):
    _patch_anthropic(monkeypatch, text='Try writing something like: keep rising past the static.')
    result = direct.converse('motif', 'user1', 'give me a line')
    assert result['mode'] == 'rule_voiced_fallback'


def test_converse_succeeds_on_clean_response(monkeypatch):
    clean = ('Notice the rhyme density climbing across your last two sessions. '
              'The pocket alignment shows the same trend.')
    _patch_anthropic(monkeypatch, text=clean)
    result = direct.converse('motif', 'user1', 'how am I doing?')
    assert result['mode'] == 'conversational'
    assert result['response'] == clean


def test_converse_never_returns_raw_flagged_text_even_when_partially_clean(monkeypatch):
    """The gate is all-or-nothing — a response that's MOSTLY fine but
    trips one check must be fully discarded, not edited/truncated."""
    mixed = ('Notice the rhyme density climbing nicely. Also, you could say: '
              'push through the silence and let it ring.')
    _patch_anthropic(monkeypatch, text=mixed)
    result = direct.converse('motif', 'user1', 'how am I doing?')
    assert result['mode'] == 'rule_voiced_fallback'
    assert 'push through the silence' not in result['response']


def test_converse_logs_rejection_reason(monkeypatch):
    _patch_anthropic(monkeypatch, text='This is a good verse.')
    direct.converse('motif', 'user1', 'how am I doing?')
    lines = cdl.read_recent(5, engine='MOTIF')
    assert any('conversation rejected' in l for l in lines)


def test_converse_grounds_prompt_in_real_notebook_and_disposition(monkeypatch):
    """Confirms the context actually sent to the model is built from real
    stored data, not empty/placeholder — inspects the captured prompt."""
    notebooks.append_entry('motif', 'user1', 's1', 'read L1-8', {'strength': 0.81})
    disposition.update_view('motif', 'user1', 'J. Cole', 'admires density')

    captured = {}

    class _CapturingMessages:
        def create(self, **kwargs):
            captured['system'] = kwargs['system']
            captured['user'] = kwargs['messages'][0]['content']
            return _FakeResponse('Notice the density read on your last session.')

    class _CapturingClient:
        def __init__(self, **kwargs):
            self.messages = _CapturingMessages()

    monkeypatch.setattr(direct.anthropic, 'Anthropic', lambda **kwargs: _CapturingClient())
    monkeypatch.setenv('ANTHROPIC_API_KEY', 'fake-key-for-testing')

    direct.converse('motif', 'user1', 'how am I doing?')
    assert 'read L1-8' in captured['user']
    assert 'J. Cole' in captured['user']
    assert 'MOTIF' in captured['system']  # conversational suffix mentions the engine


def test_converse_never_touches_notes_or_cassius_tables(monkeypatch):
    _patch_anthropic(monkeypatch, text='Notice the density holding steady across sessions.')
    direct.converse('motif', 'user1', 'how am I doing?')
    conn = db.get_connection()
    count = conn.execute('SELECT COUNT(*) FROM notes').fetchone()[0]
    assert count == 0
