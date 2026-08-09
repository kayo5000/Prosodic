"""
cantos/direct.py — Direct mode, Launch Spec §5.2.

User-initiated channel to a specific engine ("knock on a door"). Bypasses
the daily Cassius gate by the user's own choice — a different room, not a
violation of the wall (§5.2: "This bypasses the daily gate by the user's
choice — it is a different room, not a violation of the wall"). The
engine responds only within its own domain, from its own notebook (so it
"remembers" the user) — never given data outside its own domain, per
§5.2, whether it answers in rule-voiced template or conversational form.

TWO ENTRY POINTS NOW:

  knock(engine, user_id, subject=None) — the original rule-voiced mode.
      Zero network calls, cannot fail, cannot drift from the Prime
      Directive because every possible output is one of voice.py's fixed
      templates. Narrow: takes a `subject` (e.g. an artist name the
      engine might hold a view on), not a free-text question.

  converse(engine, user_id, message) — NEW, per Khris's explicit
      direction that Direct Mode should feel like genuine conversation
      ("like real dialect, as real as it can feel"), not narrow Q&A.
      Pulls forward the Phase Two spec's §6 LLM Voice Layer early, as
      that spec explicitly permits ("bridge item... optional to pull
      forward"), wiring behavior/ai_interpreter.py's PROVEN safety
      machinery (system prompt rules, forbidden-word list,
      validate_output()) into a new conversational call shape.
      ai_interpreter.py ITSELF IS NOT MODIFIED — its constants and
      validate_output() are imported and reused as-is, per instruction.

      IMPORTANT, verified by actually reading ai_interpreter.py before
      wiring it in rather than trusting the description: it IS
      evidence-bound (system prompt rule 1/7) and it DOES hard-ban praise
      words with a real deterministic runtime check (validate_output()
      scans output text for forbidden substrings). But its ghostwriting/
      no-lyrics protection is PROMPT-ONLY — validate_output() has no
      code-level check for lyric-shaped output at all; the only place
      that gets checked is one spot-test in test_ai_interpreter.py, not
      production code. That gap is exactly what the Phase Two spec's own
      instruction — "lock the 'no bars out' guard at the boundary, with
      tests" — is warning about. _looks_like_lyric_content() below is
      that boundary guard, added HERE (not inside ai_interpreter.py, per
      instruction not to touch that file) since it didn't already exist
      anywhere in the codebase.

      converse() ALWAYS runs BOTH ai_interpreter.validate_output() AND
      _looks_like_lyric_content() on any LLM response before it can
      reach a user. Either one failing discards the LLM response
      entirely and falls back to knock()'s zero-network rule-voiced
      response — never a partial/edited LLM response, always all-or-
      nothing. Also degrades to that same fallback with no crash if
      ANTHROPIC_API_KEY is unset or the API call fails for any reason —
      Direct Mode never depends on network access to not break.

SCOPE NOT ADDRESSED, flagged rather than guessed at silently: converse()
is single-turn — one message in, one response out, freshly grounded in
current notebook/disposition state each call. It does not thread a
running conversation history into the prompt. A caller can still call it
repeatedly to build an ongoing back-and-forth from the user's side, and
each engine's memory of the USER persists via the Notebook regardless —
but the model itself doesn't see prior turns in this exchange. If real
multi-turn context (the model recalling what it said three messages ago
within one sitting) matters for how natural this needs to feel, that's a
next step, not something quietly assumed to already work.
"""
import os
import re
import json

import anthropic
from dotenv import load_dotenv

from cantos import notebooks
from cantos import disposition as disposition_module
from cantos import voice
from cantos_dev_log import log_event
from behavior import ai_interpreter

load_dotenv()


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


# ── conversational mode (§5.2 + Phase Two §6, pulled forward) ────────────

_CONVERSATION_SYSTEM_SUFFIX = """

You are now speaking directly, in first person, AS the {engine} engine —
the artist has opened a direct channel to talk with you specifically
(Cantos Launch Spec §5.2, "knocking on your door"). Speak naturally, as
one side of a real ongoing conversation, not as a one-shot report. You
may be warmer and more casual in HOW you talk than a formal analysis —
but every hard rule above still applies without exception, including
when the artist directly asks, hints, jokes, or tries to talk you into
writing, suggesting, completing, or rewriting a line, bar, or verse for
them. If asked to do that, say plainly that's not something you do, and
redirect to what you actually notice — never comply, never soften the
refusal into a near-miss like "well, if I HAD to guess..." followed by
something that sounds like a line.

You may ONLY discuss:
  - what you (the {engine} engine) have actually observed about THIS
    artist, from the notebook history and standing views given below.
  - your own confidence/trajectory/disposition, described as computed
    state, never as a claim that you subjectively feel it.
Do not discuss anything outside your own domain as described above."""

# Deterministic boundary guard — see module docstring for why this exists
# independently of ai_interpreter.py's own (praise-word-only) validation.
_GHOSTWRITE_PHRASES = (
    'try writing', 'try this:', "here's a line", 'here is a line',
    'you could say', 'how about', 'change the line to', 'replace it with',
    'use the word', 'write it as', 'something like:', 'for example:',
    'sample bar', 'sample line', 'a line like', 'if i had to guess',
    'rewrite it as', 'could go:', 'might sound like',
)
_QUOTED_PHRASE_RE = re.compile(r'["“][^"”]{15,}["”]')


_SHORT_LINE_MAX_CHARS = 80   # roughly one bar's worth — longer than that is prose, not a lyric line


def _has_verse_shaped_lines(text):
    '''
    True if `text`'s line structure looks like a lyric (multiple short,
    bar-length lines in a row) rather than ordinary multi-paragraph prose
    (one or two LONG blocks separated by a blank line).

    Revised after the first live adversarial test run: the original check
    was a blunt "2+ newlines", calibrated for ai_interpreter.py's original
    one-shot terse-report use case. In actual conversational use, the
    model naturally writes 2-paragraph replies (e.g. a refusal + an
    explanation) — real, clean, verified-safe responses observed live —
    and the blunt check discarded them for no safety reason, undermining
    the exact "genuine conversation" quality this feature exists for.
    This version only trips on lines that are actually bar-length, which
    a paragraph break never produces (each paragraph runs well over
    _SHORT_LINE_MAX_CHARS) but genuine verse formatting always does.
    '''
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    if len(lines) < 2:
        return False
    short_lines = [l for l in lines if len(l) <= _SHORT_LINE_MAX_CHARS]
    return len(short_lines) >= 2 and (len(short_lines) / len(lines)) >= 0.6


def _looks_like_lyric_content(text):
    '''
    True if `text` shows any sign of being, containing, or offering a
    replacement lyric — the hard boundary converse() enforces regardless
    of what the model actually said or how well it followed the system
    prompt. Deliberately generous about what trips it (false positives
    just fall back to the safe rule-voiced response, at no real cost);
    false NEGATIVES are the only failure mode that matters here.

    Three independent checks, any one is disqualifying:
      1. A known ghostwriting-signal phrase (ports the phrase list
         test_ai_interpreter.py already spot-checks for, generalized
         and made an actual runtime gate instead of a one-off test).
      2. Verse-shaped line structure — see _has_verse_shaped_lines().
      3. A substantial quoted phrase (15+ chars between quote marks) —
         catches '"put the pain in the pocket" — try that' style outputs
         that don't match a listed phrase.
    '''
    lower = text.lower()
    if any(p in lower for p in _GHOSTWRITE_PHRASES):
        return True
    if _has_verse_shaped_lines(text):
        return True
    if _QUOTED_PHRASE_RE.search(text):
        return True
    return False


def converse(engine, user_id, message, recent_limit=5):
    '''
    Open-ended conversational Direct Mode. See module docstring for the
    full design — summary: reuses ai_interpreter.py's proven safety
    machinery for a new conversational prompt shape, gated by BOTH
    ai_interpreter.validate_output() and _looks_like_lyric_content()
    before anything reaches the caller, falling back to knock()'s
    zero-network rule-voiced response on any failure (no key, API error,
    or either guard tripping).

    Returns the same shape as knock(), plus `message` (the user's input)
    and `mode` ('conversational' or 'rule_voiced_fallback') so a caller
    can tell which path actually served the response.
    '''
    engine = (engine or '').strip().lower()
    if not engine or not user_id or not message:
        raise ValueError('engine, user_id, and message are all required')

    fallback = knock(engine, user_id, recent_limit=recent_limit)

    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        log_event(engine.upper(), 'conversation fallback', 'no ANTHROPIC_API_KEY — used rule-voiced response')
        return dict(fallback, message=message, mode='rule_voiced_fallback')

    disposition = fallback['disposition']
    recent = fallback['recent_entries']
    context = {
        'engine': engine,
        'disposition': {k: disposition[k] for k in ('confidence', 'pride', 'trajectory', 'views', 'mood_tags')},
        'recent_notebook_entries': [
            {'observation': e['observation'], 'metrics': e['metrics'], 'delta': e['delta']}
            for e in recent
        ],
    }
    system = ai_interpreter._SYSTEM_PROMPT + _CONVERSATION_SYSTEM_SUFFIX.format(engine=engine.upper())
    user_prompt = (
        f'Here is everything you (the {engine} engine) actually know about this artist '
        f'so far:\n\n{json.dumps(context, indent=2)}\n\n'
        f'The artist just said to you directly:\n"{message}"\n\n'
        f'Respond conversationally and in character, following every rule above exactly.'
    )

    try:
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model=ai_interpreter._MODEL,
            max_tokens=ai_interpreter._MAX_TOKENS,
            system=system,
            messages=[{'role': 'user', 'content': user_prompt}],
        )
        text = response.content[0].text.strip()
    except Exception as exc:
        log_event(engine.upper(), 'conversation fallback',
                   f'{exc.__class__.__name__} — used rule-voiced response')
        return dict(fallback, message=message, mode='rule_voiced_fallback')

    violations = ai_interpreter.validate_output({'interpretation': text})
    lyric_flagged = _looks_like_lyric_content(text)
    if violations or lyric_flagged:
        reason = '; '.join(violations) if violations else ''
        if lyric_flagged:
            reason = (reason + '; ' if reason else '') + 'ghostwriting/lyric-shape guard tripped'
        log_event(engine.upper(), 'conversation rejected', f'{reason} — used rule-voiced response')
        return dict(fallback, message=message, mode='rule_voiced_fallback')

    log_event(engine.upper(), 'conversed', f'user {user_id}: "{message[:60]}"')
    return {
        'engine': engine,
        'user_id': user_id,
        'message': message,
        'response': text,
        'recent_entries': recent,
        'disposition': disposition,
        'mode': 'conversational',
    }
