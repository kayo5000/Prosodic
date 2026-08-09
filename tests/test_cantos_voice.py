"""Tests for cantos/voice.py — rule-voiced templates (§6)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import cantos.voice as voice


def test_delta_direction_none_when_no_delta():
    assert voice._delta_direction(None) is None
    assert voice._delta_direction({}) is None


def test_delta_direction_rising():
    assert voice._delta_direction({'strength': 0.3}) == 'rising'


def test_delta_direction_falling():
    assert voice._delta_direction({'strength': -0.3}) == 'falling'


def test_delta_direction_flat_within_threshold():
    assert voice._delta_direction({'strength': 0.01}) == 'flat'


def test_delta_direction_averages_multiple_keys():
    assert voice._delta_direction({'a': 0.5, 'b': -0.5}) == 'flat'


def test_registered_engine_uses_its_own_register():
    line = voice.render_board_summary('motif', 'theme_strengthening', 0.81)
    assert line.startswith('First read on this thread.')


def test_unregistered_engine_falls_back_to_generic_without_crashing():
    line = voice.render_board_summary('some_future_engine', 'novel_signal', 0.5)
    assert line.startswith('First read on this.')
    assert 'novel signal' in line


def test_case_insensitive_engine_lookup():
    a = voice.render_board_summary('MOTIF', 'theme_strengthening', 0.81)
    b = voice.render_board_summary('motif', 'theme_strengthening', 0.81)
    assert a == b


def test_rising_falling_flat_openers_differ():
    rising = voice.render_board_summary('pocket', 'pocket_slip', 0.5, delta={'strength': 0.3})
    falling = voice.render_board_summary('pocket', 'pocket_slip', 0.5, delta={'strength': -0.3})
    flat = voice.render_board_summary('pocket', 'pocket_slip', 0.5, delta={'strength': 0.0})
    assert rising != falling != flat
    assert 'closer to the pocket' in rising
    assert 'Drifting off' in falling
    assert 'steady in the pocket' in flat


def test_render_board_summary_includes_section_when_given():
    line = voice.render_board_summary('motif', 'theme_strengthening', 0.81, section='L1-8')
    assert 'on L1-8' in line
    assert 'strength 0.81' in line


def test_render_note_message_uses_percentage():
    line = voice.render_note_message('motif', 'theme_strengthening', 0.81, section='L1-8')
    assert '81%' in line
    assert 'in L1-8' in line


def test_render_disposition_line():
    d = {'confidence': 0.65, 'pride': 0.6, 'trajectory': 'rising', 'views': {}, 'mood_tags': []}
    line = voice.render_disposition_line('motif', d)
    assert '65%' in line
    assert 'rising' in line


def test_arbitrary_signal_text_is_embedded_as_data_not_transformed():
    """Structural proof this module never 'generates' content of its own —
    whatever string comes in as signal/section is echoed as a label
    inside the fixed template skeleton, never rewritten or expanded."""
    weird_signal = 'not_a_real_signal_xyz_123'
    line = voice.render_board_summary('motif', weird_signal, 0.5)
    assert 'not a real signal xyz 123' in line  # only transformation: underscore->space


def test_no_llm_or_network_import_in_module():
    """Guards against someone later wiring an LLM call into this file —
    the whole point of §6 at launch is that it CANNOT hallucinate."""
    import inspect
    source = inspect.getsource(voice)
    for forbidden in ('anthropic', 'openai', 'requests.', 'urllib', 'httpx'):
        assert forbidden not in source
