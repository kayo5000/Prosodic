'''
Golden-master / characterization test helper.

The pattern: capture a real engine's current output for a fixed input as a
"golden" snapshot on disk. Every future test run re-executes the same input
live and diffs the result against the snapshot. A future refactor is only
allowed to change that output on purpose — by regenerating the snapshot in
its own commit, with a stated reason — never by accident.

This is NOT a substitute for the app's other tests (unit tests, the
suggestion_engine composite regression tests, etc.). It's a coarse,
whole-pipeline safety net specifically for refactors that touch a LOT of
code at once (a signature migration, a shared-utility swap) where it's
easy to miss that something downstream quietly changed. See
tests/test_golden_master.py for the live snapshots, and this session's
retroactive check for why this exists: comparing the pre- and post-
SongContext-refactor commits directly against CURRENT main initially
looked like the refactor had changed real output — it hadn't; a later,
separate, correct fix (the phoneme_engine/normalization_engine merge) had.
Isolating the SongContext commits alone (before that later fix landed)
proved byte-for-byte identical output. That isolation only worked because
git history happened to have the right commits to check out by hand — a
real golden-master snapshot makes that proof available WITHOUT needing to
go spelunking through git history and stand up throwaway worktrees every
time. Use this pattern before/after any future refactor that touches
shared engine code, not just when something feels risky.

Usage in a test:
    from golden_master import assert_matches_golden
    result = assemble_feedback(verse, ctx)
    assert_matches_golden('analyze_verse1_bpm80', result)

To intentionally update a snapshot after a real, verified behavior change
(never do this to make a test pass without understanding why it moved):
    UPDATE_GOLDEN=1 pytest tests/test_golden_master.py -q
Review the resulting git diff on the snapshot file like any other code
change — it IS the record of what changed and should be explained in the
commit message, the same way ac67774 (the phoneme/normalization fix)
should have carried one.

Part of the Prosodic hip-hop lyric analysis suite.
'''
import json
import os
from pathlib import Path

GOLDEN_DIR = Path(__file__).parent / 'golden'
UPDATE = os.environ.get('UPDATE_GOLDEN') == '1'


def _snapshot_path(name):
    return GOLDEN_DIR / f'{name}.json'


def _to_jsonable(data):
    '''Round-trips through JSON so comparisons are apples-to-apples with
    what's actually stored on disk (tuples become lists, etc.) — comparing
    the live Python object directly against the reloaded-from-disk object
    would flag differences that are just JSON's own representation limits,
    not real behavior changes.'''
    return json.loads(json.dumps(data, sort_keys=True, default=str))


def assert_matches_golden(name, data):
    '''
    Compares `data` (any JSON-serializable structure — a dict, a list of
    dicts, whatever the engine under test returns) against the saved
    snapshot named `name`.

    - Snapshot doesn't exist yet, or UPDATE_GOLDEN=1: writes/overwrites it
      and passes. This is the ONLY way a snapshot changes — never silently
      inside a normal test run.
    - Snapshot exists and UPDATE_GOLDEN is not set: loads it and asserts
      exact equality against the live result, with a diff-bearing message
      naming exactly which top-level keys moved.
    '''
    GOLDEN_DIR.mkdir(exist_ok=True)
    path = _snapshot_path(name)
    live = _to_jsonable(data)

    if UPDATE or not path.exists():
        path.write_text(json.dumps(live, indent=2, sort_keys=True), encoding='utf-8')
        return

    saved = json.loads(path.read_text(encoding='utf-8'))
    if live == saved:
        return

    # Build a compact top-level diff summary rather than dumping the whole
    # (often large) structure into the assertion failure.
    diffs = []
    if isinstance(live, dict) and isinstance(saved, dict):
        all_keys = sorted(set(live) | set(saved))
        for key in all_keys:
            if live.get(key) != saved.get(key):
                diffs.append(key)
    message = (
        f'Golden master "{name}" no longer matches saved snapshot at {path}.\n'
        f'Changed top-level key(s): {diffs or "(structure differs — not both dicts)"}\n'
        f'If this change is real and intended, regenerate with:\n'
        f'  UPDATE_GOLDEN=1 pytest tests/test_golden_master.py -q\n'
        f'then review the resulting diff on {path.name} and explain it in the '
        f'commit — same discipline as any other behavior change.'
    )
    assert live == saved, message
