"""
cantos/wiring.py — live wiring example connecting an existing engine to
Cantos Notebooks.

SCOPE NOTE, read before assuming more is wired than actually is: this is
ONE worked example (behavior/state_engine -> Notebooks), proving the
pattern end-to-end — real bar_segmenter -> feedback_engine ->
bar_feature_mapper -> state_engine.classify() chain, real result written
as a real Notebook Entry. It is NOT a general dispatcher wiring all 21
analysis engines, and it does NOT wire drift_engine (which needs TWO
historical snapshots and therefore cross-session snapshot storage — a
bigger piece of work than tonight's scope). Both flagged as not-done in
docs/cantos/OVERNIGHT_BUILD_SUMMARY.md.
"""
from analysis.bar_segmenter import segment
from analysis.bar_feature_mapper import map_features
from behavior.state_engine import classify as classify_state
from feedback_engine import assemble_feedback
from song_context import SongContext
from cantos import notebooks


def record_state_snapshot(user_id, session_id, verse_text, bpm):
    '''
    Runs the real Behavioral Layer chain on a verse and writes the result
    as a Notebook Entry for engine='state'.

    Args:
        user_id, session_id: whose notebook this belongs to.
        verse_text: the verse as one newline-separated string (matches
            bar_segmenter.segment()'s expected input).
        bpm: required, same as everywhere else in this codebase.

    Returns (state_result, notebook_entry) — the raw state_engine output
    and the Notebook Entry it produced.
    '''
    verse_lines = [line for line in verse_text.split('\n') if line.strip()]
    if not verse_lines:
        raise ValueError('verse_text must contain at least one non-empty line')

    seg = segment(verse_text, bpm)
    engine_outputs = assemble_feedback(verse_lines, SongContext(bpm=bpm))
    bar_features = map_features(seg, engine_outputs)
    state_result = classify_state({
        'snapshot_id': seg.get('segmentation_id'),
        'bar_features': bar_features,
    })

    entry = notebooks.append_entry(
        engine='state',
        user_id=user_id,
        session_id=session_id,
        observation=f"section_state={state_result['section_state']}",
        metrics={'confidence': state_result['confidence']},
    )
    return state_result, entry
