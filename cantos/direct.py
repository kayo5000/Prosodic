"""
cantos/direct.py — Direct mode, Launch Spec §5.2.

User-initiated channel to a specific engine ("knock on a door"). Bypasses
the daily Cassius gate by the user's own choice — a different room, not a
violation of the wall (§5.2: "This bypasses the daily gate by the user's
choice — it is a different room, not a violation of the wall"). The
engine responds only within its own domain, from its own notebook (so it
"remembers" the user), in its own voice.

SCOPE NOTE, read before assuming this does more than it does: §5.2 says
"text at launch" for the channel — I've read that as describing the
MEDIUM (text now, voice/mic is Phase Two per §7), not as implying free-
text natural-language understanding. Launch's voice layer is rule-voiced
only (§6, no LLM) — there is no NLU here to genuinely interpret an
arbitrary typed question. So knock() below takes a narrow `subject`
(e.g. an artist/work name the engine might hold a view on, per
disposition.views) rather than a free-text question, and always responds
from real stored data via cantos/voice.py's templates. This is the
buildable-tonight, Prime-Directive-safe interpretation; if Khris's fuller
vision for direct mode is closer to open Q&A, that needs either an LLM
layer (Phase Two, §6 of the Phase Two spec, hard-gated against emitting
lyric content) or a larger rule-based intent parser — flagged as
not-done in docs/cantos/OVERNIGHT_BUILD_SUMMARY.md.
"""
from cantos import notebooks
from cantos import disposition as disposition_module
from cantos import voice
from cantos_dev_log import log_event


def knock(engine, user_id, subject=None, recent_limit=5):
    '''
    Open a direct channel to one engine.

    Args:
        engine, user_id: whose notebook/disposition to draw from.
        subject: optional — if the engine holds a view on this exact
            subject (disposition.views, see disposition.update_view),
            the response centers on that. Otherwise falls back to the
            engine's most recent notebook entry + its current
            disposition, both real stored data.
        recent_limit: how many recent notebook entries to return
            alongside the response (for a UI to show history, not just
            the one-line reply).

    Returns:
        {
          engine, user_id, subject,
          response: str  — rule-voiced, grounded only in stored data,
          recent_entries: [...],
          disposition: {...},
        }

    Never generates new analysis and never touches Notes/Cassius — this
    is a read of what the engine already knows, spoken in its voice.
    '''
    engine = (engine or '').strip().lower()
    if not engine or not user_id:
        raise ValueError('engine and user_id are required')

    disposition = disposition_module.get_disposition(engine, user_id)
    recent = notebooks.get_entries(engine, user_id, limit=recent_limit)

    if subject and subject in disposition['views']:
        response = f'On {subject}: {disposition["views"][subject]}'
    elif recent:
        latest = recent[0]
        response = f'{voice.render_disposition_line(engine, disposition)} Most recently: {latest["observation"]}.'
    else:
        response = 'Nothing in the notebook for this user yet — no read to report.'

    log_event(
        engine.upper(), 'knock received',
        f'user {user_id}' + (f' asked about {subject}' if subject else ''),
    )

    return {
        'engine': engine,
        'user_id': user_id,
        'subject': subject,
        'response': response,
        'recent_entries': recent,
        'disposition': disposition,
    }
