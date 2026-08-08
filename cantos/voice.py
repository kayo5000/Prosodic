"""
cantos/voice.py — rule-voiced templates, Launch Spec §6.

Each engine speaks in its own register via developer-authored template
strings keyed to signal + delta direction. No LLM call anywhere in this
module — free, fast, cannot hallucinate, and structurally CANNOT generate
lyric content, because every possible output is one of a small fixed set
of strings defined below, filled in only with numbers/labels/section
names. There is no code path in this file that accepts or emits
arbitrary free text.

ENGINE_VOICE is a STARTER set covering 8 of this codebase's real engines
(motif, rhyme, semantics, density, pocket, phrase_container, device,
mastery) plus `state` (from the Behavioral Layer, since cantos/wiring.py
already produces real entries for it). Every OTHER engine name falls
back to a generic, still-in-voice-shape template rather than crashing —
see _GENERIC_VOICE. Extending this to the rest of the 21 engines is
listed as not-done in docs/cantos/OVERNIGHT_BUILD_SUMMARY.md; the
registers below are my own reasonable first pass at "keep voice tethered
to function," grounded in each engine's actual docstring/purpose in this
repo, not anything from character sheets (none were provided).

Register fields per engine:
    opener_rising / opener_falling / opener_flat / opener_first:
        a short phrase reflecting a computed trend, never a feeling claim.
    label(signal): optional per-engine override for how a signal name
        reads in prose; falls back to signal.replace('_', ' ').

Every surfaced AND withheld message should be logged with its inputs per
spec §6 ("training set for the future LLM voice") — that logging already
happens at the call sites in board.py/notes.py/cassius.py (via
cantos_dev_log), not duplicated here; this module's only job is
composing the text.
"""
import statistics

DELTA_FLAT_THRESHOLD = 0.02


ENGINE_VOICE = {
    'motif': {
        'opener_rising':  'The thread is pulling tighter.',
        'opener_falling': 'The thread loosened since last pass.',
        'opener_flat':    'Holding steady on theme.',
        'opener_first':   'First read on this thread.',
    },
    'rhyme': {
        'opener_rising':  'The family is locking in harder.',
        'opener_falling': 'The family is thinning out.',
        'opener_flat':    'The family is holding its shape.',
        'opener_first':   'First read on this family.',
    },
    'semantics': {
        'opener_rising':  'The near-rhymes are earning more trust.',
        'opener_falling': 'The near-rhymes are drifting from the sense.',
        'opener_flat':    'The semantic weight is steady.',
        'opener_first':   'First semantic read here.',
    },
    'density': {
        'opener_rising':  'Density is climbing.',
        'opener_falling': 'Density is easing off.',
        'opener_flat':    'Density is holding level.',
        'opener_first':   'First density read on this bar.',
    },
    'pocket': {
        'opener_rising':  'Landing closer to the pocket.',
        'opener_falling': 'Drifting off the pocket.',
        'opener_flat':    'Sitting steady in the pocket.',
        'opener_first':   'First pocket read on this line.',
    },
    'phrase_container': {
        'opener_rising':  'The container is tightening into shape.',
        'opener_falling': 'The container boundary is softening.',
        'opener_flat':    'The container is holding its bar count.',
        'opener_first':   'First container read on this stretch.',
    },
    'device': {
        'opener_rising':  'This device is showing up more often.',
        'opener_falling': 'This device is thinning out.',
        'opener_flat':    'Usage rate on this device is steady.',
        'opener_first':   'First rate read on this device.',
    },
    'mastery': {
        'opener_rising':  'This dimension is trending up across sessions.',
        'opener_falling': 'This dimension has eased back across sessions.',
        'opener_flat':    'This dimension is holding across sessions.',
        'opener_first':   'First mastery read on this dimension.',
    },
    'state': {
        'opener_rising':  'The section is locking in tighter than last pass.',
        'opener_falling': 'The section has loosened since last pass.',
        'opener_flat':    'The section is holding its state.',
        'opener_first':   'First state read on this section.',
    },
}

_GENERIC_VOICE = {
    'opener_rising':  'Trending up since last read.',
    'opener_falling': 'Trending down since last read.',
    'opener_flat':    'Holding steady since last read.',
    'opener_first':   'First read on this.',
}


def _delta_direction(delta):
    '''
    delta: dict of numeric deltas (e.g. a NotebookEntry's own delta, or a
    Board Post's implied change), or None for a first-ever read.
    Returns 'rising' | 'falling' | 'flat' | None.
    '''
    if not delta:
        return None
    numeric = [v for v in delta.values() if isinstance(v, (int, float)) and not isinstance(v, bool)]
    if not numeric:
        return 'flat'
    avg = statistics.mean(numeric)
    if avg > DELTA_FLAT_THRESHOLD:
        return 'rising'
    if avg < -DELTA_FLAT_THRESHOLD:
        return 'falling'
    return 'flat'


def _opener(engine, direction):
    register = ENGINE_VOICE.get((engine or '').strip().lower(), _GENERIC_VOICE)
    key = f'opener_{direction}' if direction else 'opener_first'
    return register.get(key, _GENERIC_VOICE[key])


def _signal_label(signal):
    return (signal or '').replace('_', ' ')


def render_board_summary(engine, signal, strength, delta=None, section=None):
    '''
    Short, one-line — what board.post()'s optional `summary` field or a
    dev-log detail would show. Matches the register but stays terse.
    '''
    direction = _delta_direction(delta)
    opener = _opener(engine, direction)
    section_clause = f' on {section}' if section else ''
    return f'{opener} {_signal_label(signal)}{section_clause}, strength {strength:.2f}.'


def render_note_message(engine, signal, strength, delta=None, section=None):
    '''
    Fuller version for a Note to Cassius's `message` field — same
    register, a bit more room, still one fixed template shape filled
    with numbers/labels only.
    '''
    direction = _delta_direction(delta)
    opener = _opener(engine, direction)
    section_clause = f' in {section}' if section else ''
    pct = f'{strength:.0%}'
    return f'{opener} {_signal_label(signal)}{section_clause} reads at {pct}.'


def render_disposition_line(engine, disposition):
    '''
    A short line reflecting an engine's current disposition — confidence/
    trajectory only, never phrased as a feeling claim. Useful for direct
    mode (cantos/direct.py) to open a response in-register.
    '''
    trajectory = disposition.get('trajectory', 'flat')
    confidence = disposition.get('confidence', 0.5)
    opener = _opener(engine, trajectory if trajectory in ('rising', 'falling') else 'flat')
    return f'{opener} (confidence {confidence:.0%}, trajectory {trajectory}).'
