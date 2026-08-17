"""
cantos/wiring.py — connects real engines to Cantos Notebooks + Board.

SCOPE, updated — read before assuming more or less is wired than
actually is:

record_state_snapshot() is the original worked example (behavior/
state_engine -> Notebooks only): real bar_segmenter -> feedback_engine
-> bar_feature_mapper -> state_engine.classify() chain, real result
written as a real Notebook Entry. Unchanged in this pass — already
tested, already live behind /cantos/state-snapshot, not touched.

record_full_analysis_snapshot() (new) wires 6 more real analysis
engines — motif, rhyme, density, pocket, phrase_container, semantics —
each producing BOTH a Notebook Entry (always) and a Board Post (when
its finding clears SALIENCE_THRESHOLD), per Launch Spec §3 step 3's
"two things." This is what actually makes cantos/meetings.py's
adjacency/trigger logic live for the first time — until this, nothing
in the whole app ever called board.post(), so a Meeting could never
form no matter how related two engines' hypothetical signals were.
See tests/test_cantos_wiring.py::test_related_engines_can_now_form_a_real_meeting
for the end-to-end proof.

Still NOT wired, each for a real reason, not an oversight:
  - device — no dedicated engine exists for this in the codebase today
    (the spec's "engine may name a device" refers to literary devices;
    there's no domain/device_engine.py to read from — see
    docs/PROJECT_STATUS.md). Voice template sits ready in
    cantos/voice.py for whenever a real source engine exists.
  - mastery — blocked on the song_id/song-identity product decision,
    docs/DECISIONS_NEEDED.md item 2. Guessing an answer here to wire it
    would be the same "patch around it" outcome that decision was
    logged specifically to avoid.
  - drift_engine — needs TWO historical snapshots (cross-session
    storage), a genuinely bigger piece of work than reading one
    session's already-computed engine output — flagged as bigger scope
    in the original note here, still true, not attempted this pass.

Known, disclosed inefficiency: record_state_snapshot() and
record_full_analysis_snapshot() each independently call
assemble_feedback() — a caller wanting both today pays for it twice.
Not merged in this pass to avoid touching record_state_snapshot()'s
already-tested, already-live behavior as a side effect of adding new
functionality; a real target for a later pass if calling both together
ever becomes a real, frequent path.
"""
from collections import Counter

from analysis.bar_segmenter import segment
from analysis.bar_feature_mapper import map_features
from behavior.state_engine import classify as classify_state
from domain.feedback_engine import assemble_feedback
from domain.semantics_engine import semantic_similarity
from domain.song_context import SongContext
from cantos import notebooks, board


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


# ── Analysis-engine wiring — Launch Spec §3 ─────────────────────────────
#
# Each _wire_* function below reads ONE engine's real output from
# engine_outputs (assemble_feedback()'s return value — computed exactly
# once by record_full_analysis_snapshot, never re-run per engine) and
# turns it into a Notebook Entry + conditional Board Post via the shared
# _wire_engine() helper.
#
# Signal names reuse cantos/meetings.py's existing SIGNAL_ADJACENCY
# vocabulary where a real match already existed (motif_return,
# rhyme_family_return, density_spike, pocket_slip, emotion_rising) —
# that vocabulary was designed before any engine actually posted to the
# board, so this is the first time it's exercised for real.
# phrase_container needed one genuinely new signal
# (container_boundary_shift, no existing entry fit) — added to
# SIGNAL_ADJACENCY in meetings.py with a one-line reasoning comment, the
# same "my own reasonable extension" invitation that file's own
# docstring already left open.

SALIENCE_THRESHOLD = 0.5  # spec §3: a Board Post only if "a finding is
# salient" — matches T_JOIN_DEFAULT (meetings.py) since that's the same
# "worth another engine's attention" bar the spec anchors its own
# default to, not a separately-chosen number.


def _section_label(line_count):
    '''Bar-range label matching the spec's own example format ("L1-8").'''
    return f'L1-{line_count}' if line_count and line_count > 0 else 'L1'


def _wire_engine(engine, user_id, session_id, section, signal, strength, metrics, observation):
    '''
    Shared per-engine step — spec §3's "two things": always a Notebook
    Entry, a Board Post only when strength clears SALIENCE_THRESHOLD.
    Returns (notebook_entry, board_post_or_None).
    '''
    strength = round(max(0.0, min(1.0, strength)), 3)
    entry = notebooks.append_entry(
        engine=engine, user_id=user_id, session_id=session_id,
        observation=observation, metrics=metrics,
    )
    post = None
    if strength >= SALIENCE_THRESHOLD:
        post = board.post(
            engine=engine, session_id=session_id, section=section,
            signal=signal, strength=strength,
        )
    return entry, post


def _wire_motif(engine_outputs, user_id, session_id, section):
    groups = engine_outputs.get('motif_groups') or []
    total_families = engine_outputs.get('total_color_families', 0)
    line_count = engine_outputs.get('line_count', 1)
    # domain/motif_engine.py's whole purpose is thematic-thread
    # recurrence — families per line (capped at 1.0) is a direct proxy
    # for how strong that recurrence read is this session.
    strength = min(1.0, total_families / max(1, line_count))
    metrics = {'total_color_families': total_families, 'group_count': len(groups)}
    observation = f'total_color_families={total_families} across {line_count} lines'
    return _wire_engine('motif', user_id, session_id, section, 'motif_return', strength, metrics, observation)


def _wire_rhyme(engine_outputs, user_id, session_id, section):
    rhyme_map = engine_outputs.get('rhyme_map') or []
    total = len(rhyme_map)
    colored = sum(1 for e in rhyme_map if e.get('color_id'))
    strength = (colored / total) if total else 0.0
    metrics = {'colored_syllables': colored, 'total_syllables': total}
    observation = f'{colored}/{total} syllables carry a rhyme-family color'
    return _wire_engine('rhyme', user_id, session_id, section, 'rhyme_family_return', strength, metrics, observation)


def _wire_density(engine_outputs, user_id, session_id, section):
    summary = engine_outputs.get('density_summary') or {}
    internal = summary.get('internal', 0.0)
    multi = summary.get('multisyllabic', 0.0)
    # internal/multisyllabic are 0-100 percentages (domain/density_engine.py) —
    # averaged and scaled to 0-1 for strength, motif density left out of
    # the strength calc (it would double-count the 'motif' engine's own
    # signal above) but still carried in metrics for the record.
    strength = min(1.0, ((internal + multi) / 2.0) / 100.0)
    metrics = {'internal': internal, 'multisyllabic': multi, 'motif': summary.get('motif', 0.0)}
    observation = f'internal={internal}, multisyllabic={multi}'
    return _wire_engine('density', user_id, session_id, section, 'density_spike', strength, metrics, observation)


def _wire_pocket(engine_outputs, user_id, session_id, section):
    rhyme_map = engine_outputs.get('rhyme_map') or []
    stressed = [e for e in rhyme_map if e.get('is_stressed')]
    on_pocket = sum(1 for e in stressed if e.get('on_pocket'))
    pocket_ratio = (on_pocket / len(stressed)) if stressed else 0.5
    # Signal is 'pocket_slip' — strength reflects how MUCH slip there is
    # (1 - alignment), not how well-pocketed the verse is, so a
    # tightly-pocketed verse correctly reads as low-salience (nothing to
    # flag) rather than high-salience-because-things-are-good.
    strength = round(1.0 - pocket_ratio, 3)
    metrics = {'pocket_ratio': round(pocket_ratio, 3), 'flow_signature': engine_outputs.get('flow_signature')}
    observation = f'pocket_ratio={round(pocket_ratio, 3)}, flow={engine_outputs.get("flow_signature")}'
    return _wire_engine('pocket', user_id, session_id, section, 'pocket_slip', strength, metrics, observation)


def _wire_phrase_container(engine_outputs, user_id, session_id, section):
    containers = engine_outputs.get('phrase_containers') or []
    if not containers:
        avg_conf = 0.0
        dominant_type = None
    else:
        avg_conf = sum(c.get('confidence', 0.0) for c in containers) / len(containers)
        dominant_type = Counter(c.get('type') for c in containers).most_common(1)[0][0]
    metrics = {'container_count': len(containers), 'avg_confidence': round(avg_conf, 3), 'dominant_type': dominant_type}
    observation = f'{len(containers)} containers, dominant type={dominant_type}'
    return _wire_engine(
        'phrase_container', user_id, session_id, section,
        'container_boundary_shift', avg_conf, metrics, observation,
    )


def _wire_semantics(verse_lines, engine_outputs, user_id, session_id, section):
    '''
    Unlike the others above, this computes something NEW rather than
    just reading an already-computed field — feedback_engine.assemble_feedback()
    doesn't call semantics_engine.py at all today (confirmed: not in
    that module's own import list), so there is no existing session-
    level semantic signal anywhere to read.

    Real, bounded computation instead: average pairwise
    semantic_similarity() across each rhyme family's member words —
    directly matches this engine's own documented purpose ("raises
    confidence on intentional near-rhymes" — see domain/semantics_engine.py).
    Families with fewer than 2 distinct words are skipped (nothing to
    pair). Degrades to strength=0.0, not a crash, when spaCy isn't
    installed — semantic_similarity() already returns 0.0 in that case
    (domain/semantics_engine.py's own graceful-degradation contract,
    unchanged and relied on here, not reimplemented).
    '''
    groups = engine_outputs.get('motif_groups') or []
    family_scores = []
    for g in groups:
        words = list({m.get('word') for m in g.get('members', []) if m.get('word')})
        if len(words) < 2:
            continue
        pair_scores = [
            semantic_similarity(words[i], words[j])
            for i in range(len(words))
            for j in range(i + 1, len(words))
        ]
        if pair_scores:
            family_scores.append(sum(pair_scores) / len(pair_scores))

    strength = round(sum(family_scores) / len(family_scores), 3) if family_scores else 0.0
    metrics = {'families_scored': len(family_scores)}
    observation = f'semantic coherence read across {len(family_scores)} rhyme families'
    return _wire_engine('semantics', user_id, session_id, section, 'emotion_rising', strength, metrics, observation)


def record_full_analysis_snapshot(user_id, session_id, verse_text, bpm):
    '''
    Runs the full /analyze pipeline ONCE and wires every currently-
    connected analysis engine (motif, rhyme, density, pocket,
    phrase_container, semantics) into Notebooks + Board — Launch Spec
    §3 step 3. Separate from record_state_snapshot() above (a different
    engine chain — Behavioral Layer state classification, which needs
    bar_segmenter's bar boundaries this function doesn't) — see this
    module's docstring for why they aren't merged into one call.

    Args:
        user_id, session_id: whose notebook/board entries these are.
        verse_text: newline-separated string, same convention as
            record_state_snapshot() for calling-code consistency.
        bpm: required, same as everywhere else in this codebase.

    Returns {engine_name: (notebook_entry, board_post_or_None)}.
    '''
    verse_lines = [line for line in verse_text.split('\n') if line.strip()]
    if not verse_lines:
        raise ValueError('verse_text must contain at least one non-empty line')

    engine_outputs = assemble_feedback(verse_lines, SongContext(bpm=bpm))
    section = _section_label(engine_outputs.get('line_count', len(verse_lines)))

    return {
        'motif':            _wire_motif(engine_outputs, user_id, session_id, section),
        'rhyme':            _wire_rhyme(engine_outputs, user_id, session_id, section),
        'density':          _wire_density(engine_outputs, user_id, session_id, section),
        'pocket':           _wire_pocket(engine_outputs, user_id, session_id, section),
        'phrase_container': _wire_phrase_container(engine_outputs, user_id, session_id, section),
        'semantics':        _wire_semantics(verse_lines, engine_outputs, user_id, session_id, section),
    }
