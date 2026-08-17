"""Tests for cantos/wiring.py — the one worked example of wiring an
existing engine (behavior/state_engine) to Cantos Notebooks.

Exercises the REAL chain: bar_segmenter -> feedback_engine ->
bar_feature_mapper -> state_engine.classify() -> notebooks.append_entry().
Not mocked — this is the actual production code path each piece already
has its own unit tests for; this just proves they compose correctly and
that a real Notebook Entry lands in the DB as a result.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import cantos.db as db
import cantos.notebooks as nb
import cantos.meetings as meetings
from cantos.wiring import record_state_snapshot, record_full_analysis_snapshot

_VERSE = (
    "I never ran from a fight but I been on the run\n"
    "Chasing something that I thought was gonna come undone\n"
    "In the mirror I can see a different kind of me\n"
    "And everything I ever thought was blurry's coming free"
)
_BPM = 90

# Deliberately dense end-rhyme + internal rhyme, chosen empirically (by
# running assemble_feedback() directly and checking real output, not
# guessed) to push both the motif and rhyme signals above
# SALIENCE_THRESHOLD (0.5) in the same run — real strengths: rhyme
# ~0.93, motif ~0.75, combined ~1.68 > meetings.T_MEET_DEFAULT (1.2).
# Needed for test_related_engines_can_now_form_a_real_meeting below.
_DENSE_VERSE = (
    "Fire higher, wire tighter, liar crying by the fire\n"
    "Buyer flyer, trying dying, spider climbing ever higher\n"
    "Crown down town, brown gown, frowning clown around the town\n"
    "Sound bound, hound found, drowning crowned without a sound"
)


@pytest.fixture(autouse=True)
def isolated_db(tmp_path, monkeypatch):
    monkeypatch.setattr(db, 'DB_PATH', str(tmp_path / "cantos_test.db"))
    db.reset_schema_cache()
    yield


def test_record_state_snapshot_writes_a_real_notebook_entry():
    state_result, entry = record_state_snapshot('user1', 'session1', _VERSE, _BPM)

    assert state_result['section_state'] in (
        'Locked', 'Tightening', 'Pushing', 'Slipping', 'Flat', 'Exposed',
    )
    assert 0.0 <= state_result['confidence'] <= 1.0

    assert entry['engine'] == 'state'
    assert entry['user_id'] == 'user1'
    assert f"section_state={state_result['section_state']}" == entry['observation']
    assert entry['metrics']['confidence'] == state_result['confidence']
    assert entry['delta'] is None  # first entry for this (engine, user)


def test_second_call_produces_a_real_delta():
    record_state_snapshot('user1', 's1', _VERSE, _BPM)
    _, entry2 = record_state_snapshot('user1', 's2', _VERSE, _BPM)
    assert entry2['delta'] is not None
    assert 'confidence' in entry2['delta']


def test_entry_actually_persisted_and_readable_back():
    record_state_snapshot('user1', 's1', _VERSE, _BPM)
    entries = nb.get_entries('state', 'user1')
    assert len(entries) == 1
    assert entries[0]['engine'] == 'state'


def test_rejects_blank_verse():
    with pytest.raises(ValueError):
        record_state_snapshot('user1', 's1', '   \n  \n', _BPM)


# ── record_full_analysis_snapshot — the 6 newly-wired analysis engines ──
# Same discipline as above: real pipeline, not mocked.

_ALL_ENGINES = ('motif', 'rhyme', 'density', 'pocket', 'phrase_container', 'semantics')


def test_wires_all_six_engines_with_real_notebook_entries():
    results = record_full_analysis_snapshot('user1', 's1', _VERSE, _BPM)

    assert set(results.keys()) == set(_ALL_ENGINES)
    for engine in _ALL_ENGINES:
        entry, _post = results[engine]
        assert entry['engine'] == engine
        assert entry['user_id'] == 'user1'
        assert entry['session_id'] == 's1'
        assert entry['observation']  # non-empty — every engine has something to say
        assert entry['delta'] is None  # first entry for this (engine, user)

        # Persisted for real, not just returned — same "actually landed
        # in the DB" proof the state-snapshot tests above already apply.
        stored = nb.get_entries(engine, 'user1')
        assert len(stored) == 1


def test_second_call_produces_real_deltas_for_every_engine():
    record_full_analysis_snapshot('user1', 's1', _VERSE, _BPM)
    results2 = record_full_analysis_snapshot('user1', 's2', _VERSE, _BPM)
    for engine in _ALL_ENGINES:
        entry, _post = results2[engine]
        assert entry['delta'] is not None, f'{engine} should have a real delta on its 2nd entry'


def test_board_posts_only_for_salient_findings_not_every_engine():
    # _VERSE (the plainer one) doesn't hit every engine's salience bar —
    # real, not curated to force universal posting. Confirms the
    # "conditional Board Post" half of spec §3 step 3 actually gates
    # something, rather than every engine always posting regardless.
    results = record_full_analysis_snapshot('user1', 's1', _VERSE, _BPM)
    posted = [e for e in _ALL_ENGINES if results[e][1] is not None]
    not_posted = [e for e in _ALL_ENGINES if results[e][1] is None]
    assert posted, 'expected at least one engine to clear salience on this verse'
    assert not_posted, 'expected at least one engine to NOT clear salience on this verse — otherwise the gate is doing nothing'

    for engine in posted:
        post = results[engine][1]
        assert post['engine'] == engine
        assert post['session_id'] == 's1'
        assert 0.5 <= post['strength'] <= 1.0


def test_rejects_blank_verse_for_full_analysis_snapshot():
    with pytest.raises(ValueError):
        record_full_analysis_snapshot('user1', 's1', '   \n  \n', _BPM)


def test_phrase_container_signal_is_the_one_new_adjacency_addition():
    # Confirms container_boundary_shift (the one genuinely new signal
    # this pass introduced) is actually wired into meetings.py's
    # adjacency map, not just posted and then unreachable by any meeting.
    assert meetings.related('container_boundary_shift', 'flow_disruption')


def test_related_engines_can_now_form_a_real_meeting():
    '''
    The actual point of wiring more engines: cantos/meetings.py's
    trigger logic has existed since earlier this session but had nothing
    to trigger on, because nothing ever called board.post(). This proves
    that machinery is live now, end to end — real engine output, real
    Board Posts, a real Meeting forming from meetings.evaluate_meetings(),
    not a hand-constructed board.post() call standing in for the engines.
    '''
    results = record_full_analysis_snapshot('user1', 's1', _DENSE_VERSE, _BPM)

    motif_post = results['motif'][1]
    rhyme_post = results['rhyme'][1]
    assert motif_post is not None, 'expected motif to clear salience on the dense verse'
    assert rhyme_post is not None, 'expected rhyme to clear salience on the dense verse'
    assert motif_post['section'] == rhyme_post['section']
    assert meetings.related(motif_post['signal'], rhyme_post['signal'])
    assert motif_post['strength'] + rhyme_post['strength'] >= meetings.T_MEET_DEFAULT

    formed = meetings.evaluate_meetings('s1')
    assert len(formed) >= 1, 'expected a real meeting to form from these two related, salient posts'
    section_meetings = [m for m in formed if m['section'] == motif_post['section']]
    assert section_meetings
    participants = section_meetings[0]['participants']
    assert 'motif' in participants
    assert 'rhyme' in participants
