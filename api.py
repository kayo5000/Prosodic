'''
API
Flask REST API exposing the Prosodic analysis and suggestion pipeline.

Endpoints:
  POST /analyze         — full verse analysis, BPM required
  POST /suggest         — top 10 rhyme suggestions for the next line
  GET  /suggest/more    — ranks 11-20 from the last /suggest call (no API cost)
  POST /veil/chat       — VEIL AI craft intelligence (claude-sonnet-4-6)
  POST /autofill        — score verse words against existing color families
  POST /suggest-family  — suggest which color family a word belongs to
  POST /corrections     — record manual correction signals for learning
  GET  /corrections     — retrieve top correction signals (for debug/review)
  GET  /health          — liveness check
  POST /auth/register   — create new account
  POST /auth/login      — login, returns JWT
  GET  /auth/me         — get current user (requires Bearer token)
  POST /auth/update     — update profile fields (requires Bearer token)

Part of the Prosodic hip-hop lyric analysis suite.
'''

import os
import logging
import sqlite3
import datetime
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
from flask import Flask, request, jsonify
import anthropic
from dotenv import load_dotenv
load_dotenv()

from feedback_engine import assemble_feedback
from suggestion_engine import get_suggestions, get_more_suggestions
from veil_prompt import VEIL_SYSTEM_PROMPT
from learning_engine import record_signals_batch, get_top_signals
from veil_revival_routes import veil_revival_bp
import usage_history

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s  %(levelname)-8s  %(message)s',
    datefmt='%H:%M:%S',
)
log = logging.getLogger(__name__)

JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    raise RuntimeError(
        'JWT_SECRET environment variable is not set. Refusing to start — '
        'a hardcoded fallback would let anyone forge auth tokens. '
        'Set JWT_SECRET in your .env (dev) or environment (prod).'
    )
JWT_ALGO   = 'HS256'
DB_PATH    = os.environ.get('PROSODIC_DB_PATH') or os.path.join(os.path.expanduser('~'), 'prosodic_data', 'prosodic.db')

app = Flask(__name__)
app.register_blueprint(veil_revival_bp)

_anthropic = anthropic.Anthropic(api_key=os.environ.get('ANTHROPIC_API_KEY'))

# ── Users DB ──────────────────────────────────────────────

def _init_users_table():
    con = sqlite3.connect(DB_PATH)
    con.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            email           TEXT    UNIQUE NOT NULL,
            username        TEXT    UNIQUE NOT NULL,
            password_hash   TEXT    NOT NULL,
            veil_name       TEXT    DEFAULT '',
            gradient_index  INTEGER DEFAULT 0,
            phone           TEXT    DEFAULT '',
            hometown        TEXT    DEFAULT '',
            geo_influences  TEXT    DEFAULT '',
            created_at      TEXT    DEFAULT (datetime('now'))
        )
    ''')
    con.commit()
    con.close()

os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
_init_users_table()
usage_history.init_table()

def _make_token(user_id):
    payload = {
        # PyJWT requires 'sub' to be a string (JWT spec: StringOrURI) — encoding
        # a raw int makes every decode() fail with InvalidSubjectError.
        'sub': str(user_id),
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def _verify_token(token):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        return int(payload['sub']), None
    except jwt.ExpiredSignatureError:
        return None, 'Token expired'
    except jwt.InvalidTokenError:
        return None, 'Invalid token'

def _user_dict(row):
    return {
        'id':              row[0],
        'email':           row[1],
        'username':        row[2],
        'veil_name':       row[4],
        'gradient_index':  row[5],
        'phone':           row[6],
        'hometown':        row[7],
        'geo_influences':  row[8].split(',') if row[8] else [],
        'created_at':      row[9],
    }

def _auth_required():
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return None, (jsonify({'error': 'Authorization required'}), 401)
    token = auth[7:]
    user_id, err = _verify_token(token)
    if err:
        return None, (jsonify({'error': err}), 401)
    con = sqlite3.connect(DB_PATH)
    row = con.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    con.close()
    if not row:
        return None, (jsonify({'error': 'User not found'}), 401)
    return row, None

def _optional_user_id():
    '''
    Like _auth_required, but never blocks the request — returns None if no
    valid token is present. Used by endpoints that work anonymously but add
    extra features (usage history) when the caller happens to be logged in.
    '''
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return None
    user_id, err = _verify_token(auth[7:])
    return None if err else user_id

# ── CORS ──────────────────────────────────────────────────

@app.after_request
def add_cors(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, OPTIONS'
    return response

@app.route('/analyze', methods=['OPTIONS'])
@app.route('/suggest', methods=['OPTIONS'])
@app.route('/suggest/more', methods=['OPTIONS'])
@app.route('/veil/chat', methods=['OPTIONS'])
@app.route('/corrections', methods=['OPTIONS'])
@app.route('/autofill', methods=['OPTIONS'])
@app.route('/suggest-family', methods=['OPTIONS'])
@app.route('/auth/register', methods=['OPTIONS'])
@app.route('/auth/login', methods=['OPTIONS'])
@app.route('/auth/me', methods=['OPTIONS'])
@app.route('/auth/update', methods=['OPTIONS'])
@app.route('/mastery', methods=['OPTIONS'])
@app.route('/thesaurus/bridge', methods=['OPTIONS'])
@app.route('/suggest-motif-words', methods=['OPTIONS'])
@app.route('/thesaurus/synonyms', methods=['OPTIONS'])
@app.route('/thesaurus/related', methods=['OPTIONS'])
@app.route('/my-words', methods=['OPTIONS'])
@app.route('/wordforms', methods=['OPTIONS'])
def options():
    return '', 204

# ── Auth Endpoints ────────────────────────────────────────

@app.route('/auth/register', methods=['POST'])
def auth_register():
    data, err = _parse_json()
    if err:
        return err
    email    = (data.get('email') or '').strip().lower()
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''
    if not email or not username or not password:
        return jsonify({'error': 'email, username, and password are required'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    pw_hash = generate_password_hash(password)
    try:
        con = sqlite3.connect(DB_PATH)
        cur = con.execute(
            'INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)',
            (email, username, pw_hash)
        )
        user_id = cur.lastrowid
        con.commit()
        row = con.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
        con.close()
    except sqlite3.IntegrityError as e:
        return jsonify({'error': 'Email or username already taken'}), 409
    token = _make_token(user_id)
    log.info('POST /auth/register  user=%s  id=%d', username, user_id)
    return jsonify({'token': token, 'user': _user_dict(row)}), 201


@app.route('/auth/login', methods=['POST'])
def auth_login():
    data, err = _parse_json()
    if err:
        return err
    identifier = (data.get('email') or data.get('username') or '').strip()
    password   = data.get('password') or ''
    if not identifier or not password:
        return jsonify({'error': 'email/username and password are required'}), 400
    con = sqlite3.connect(DB_PATH)
    row = con.execute(
        'SELECT * FROM users WHERE email = ? OR username = ?',
        (identifier.lower(), identifier)
    ).fetchone()
    con.close()
    if not row or not check_password_hash(row[3], password):
        return jsonify({'error': 'Invalid email or password'}), 401
    token = _make_token(row[0])
    log.info('POST /auth/login  user=%s', row[2])
    return jsonify({'token': token, 'user': _user_dict(row)})


@app.route('/auth/me', methods=['GET'])
def auth_me():
    row, err = _auth_required()
    if err:
        return err
    return jsonify({'user': _user_dict(row)})


@app.route('/auth/update', methods=['POST'])
def auth_update():
    row, err = _auth_required()
    if err:
        return err
    data, err = _parse_json()
    if err:
        return err

    user_id = row[0]
    fields = {}
    if 'username'        in data: fields['username']        = data['username']
    if 'veil_name'       in data: fields['veil_name']       = data['veil_name']
    if 'phone'           in data: fields['phone']            = data['phone']
    if 'hometown'        in data: fields['hometown']         = data['hometown']
    if 'gradient_index'  in data: fields['gradient_index']  = int(data['gradient_index'])
    if 'geo_influences'  in data:
        gi = data['geo_influences']
        fields['geo_influences'] = ','.join(gi) if isinstance(gi, list) else gi

    # Password change — requires current_password
    new_password = data.get('new_password')
    if new_password:
        current_password = data.get('current_password') or ''
        if not check_password_hash(row[3], current_password):
            return jsonify({'error': 'Current password is incorrect'}), 403
        if len(new_password) < 6:
            return jsonify({'error': 'New password must be at least 6 characters'}), 400
        fields['password_hash'] = generate_password_hash(new_password)

    if not fields:
        return jsonify({'user': _user_dict(row)})

    set_clause = ', '.join(f'{k} = ?' for k in fields)
    values     = list(fields.values()) + [user_id]
    try:
        con = sqlite3.connect(DB_PATH)
        con.execute(f'UPDATE users SET {set_clause} WHERE id = ?', values)
        con.commit()
        updated = con.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
        con.close()
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username already taken'}), 409
    log.info('POST /auth/update  user_id=%d  fields=%s', user_id, list(fields.keys()))
    return jsonify({'user': _user_dict(updated)})

# ── Helpers ───────────────────────────────────────────────

def _serializable(obj):
    '''Recursively converts tuples → lists so the full object is JSON-safe.'''
    if isinstance(obj, tuple):
        return [_serializable(v) for v in obj]
    if isinstance(obj, dict):
        return {k: _serializable(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_serializable(v) for v in obj]
    return obj

def _parse_json():
    data = request.get_json(silent=True)
    if data is None:
        return None, (jsonify({'error': 'Request body must be valid JSON'}), 400)
    return data, None

def _require_verse(data):
    verse = data.get('verse_lines')
    if not verse:
        return None, (jsonify({'error': 'verse_lines is required'}), 400)
    if not isinstance(verse, list) or len(verse) == 0:
        return None, (jsonify({'error': 'verse_lines must be a non-empty array'}), 400)
    if not all(isinstance(line, str) for line in verse):
        return None, (jsonify({'error': 'Every item in verse_lines must be a string'}), 400)
    return verse, None

def _extract_content_words(text, n=5):
    '''Naive content-word extraction — longest non-trivial words in the message.'''
    from phoneme_engine import FUNCTION_WORDS
    seen = {}
    for word in text.split():
        clean = word.strip('.,!?;:"\'()-').lower()
        if clean and clean not in FUNCTION_WORDS and len(clean) > 3:
            seen[clean] = len(clean)
    ranked = sorted(seen, key=seen.get, reverse=True)
    return ranked[:n]


def _parse_bpm(data, required=True):
    bpm = data.get('bpm')
    if bpm is None:
        if required:
            return None, (jsonify({'error': 'bpm is required'}), 400)
        return None, None
    try:
        bpm = float(bpm)
    except (TypeError, ValueError):
        return None, (jsonify({'error': 'bpm must be a number'}), 400)
    if bpm <= 0:
        return None, (jsonify({'error': 'bpm must be greater than 0'}), 400)
    return bpm, None

# ── Endpoints ─────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})


@app.route('/analyze', methods=['POST'])
def analyze():
    data, err = _parse_json()
    if err:
        return err

    verse, err = _require_verse(data)
    if err:
        return err

    bpm, err = _parse_bpm(data, required=True)
    if err:
        return err

    log.info('POST /analyze  lines=%d  bpm=%s', len(verse), bpm)

    try:
        feedback = assemble_feedback(verse, bpm)
        user_id = _optional_user_id()
        if user_id is not None:
            try:
                usage_history.record_usage(user_id, feedback['rhyme_map'])
            except Exception:
                log.exception('Failed to record usage history (non-fatal)')
        return jsonify(_serializable(feedback))
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        log.exception('Error in /analyze')
        return jsonify({'error': 'Analysis failed', 'detail': str(e)}), 500


@app.route('/suggest', methods=['POST'])
def suggest():
    data, err = _parse_json()
    if err:
        return err

    verse, err = _require_verse(data)
    if err:
        return err

    bpm, err = _parse_bpm(data, required=False)
    if err:
        return err

    trigger_mode = data.get('trigger_mode', 'auto')
    if trigger_mode not in ('auto', 'manual'):
        return jsonify({'error': "trigger_mode must be 'auto' or 'manual'"}), 400

    target_word   = data.get('target_word') or None
    context_lines = data.get('context_lines') or None
    motif_bank    = data.get('motif_bank') or None

    log.info('POST /suggest  lines=%d  bpm=%s  mode=%s  target=%s  bank_clusters=%s',
             len(verse), bpm, trigger_mode, target_word,
             list(motif_bank.keys()) if motif_bank else None)

    try:
        suggestions = get_suggestions(
            verse, bpm=bpm, trigger_mode=trigger_mode,
            target_word=target_word, context_lines=context_lines,
            motif_bank=motif_bank,
        )

        # Tag each suggestion with how many other users have reached for this
        # same rhyme unit (cliche signal), whether this user has used the
        # word before (repetition warning), and how concrete/vivid the word
        # is (1.0 abstract - 5.0 sensory). Never blocks suggestions if it fails.
        user_id = _optional_user_id()
        try:
            from concreteness_engine import get_concreteness
            for s in suggestions:
                ru = s.get('rhyme_unit')
                s['community_uses'] = usage_history.get_rhyme_unit_frequency(
                    tuple(ru) if ru else None, exclude_user_id=user_id
                )
                s['used_before'] = (
                    usage_history.user_has_used(user_id, s['word']) if user_id is not None else 0
                )
                s['concreteness'] = get_concreteness(s['word'])
        except Exception:
            log.exception('Failed to tag community_uses/used_before/concreteness (non-fatal)')

        return jsonify(_serializable({
            'suggestions': suggestions,
            'count': len(suggestions),
            'trigger_mode': trigger_mode,
        }))
    except Exception as e:
        log.exception('Error in /suggest')
        return jsonify({'error': 'Suggestion failed', 'detail': str(e)}), 500


@app.route('/suggest/more', methods=['GET'])
def suggest_more():
    log.info('GET /suggest/more')
    suggestions = get_more_suggestions()
    return jsonify(_serializable({
        'suggestions': suggestions,
        'count': len(suggestions),
    }))


# ── VEIL ──────────────────────────────────────────────────

@app.route('/veil/chat', methods=['POST'])
def veil_chat():
    data, err = _parse_json()
    if err:
        return err

    messages = data.get('messages')
    if not messages or not isinstance(messages, list) or len(messages) == 0:
        return jsonify({'error': 'messages is required and must be a non-empty array'}), 400

    # Validate message shape
    for m in messages:
        if m.get('role') not in ('user', 'assistant'):
            return jsonify({'error': 'Each message must have role "user" or "assistant"'}), 400
        if not isinstance(m.get('content'), str):
            return jsonify({'error': 'Each message must have a string content field'}), 400

    # Optional Prosodic analysis context injected as a system addendum
    analysis_context = data.get('analysis_context')
    system = VEIL_SYSTEM_PROMPT
    if analysis_context:
        system += f"\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nCURRENT SONG ANALYSIS DATA\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n{analysis_context}"

    # Ground word-choice discussion in real thesaurus data instead of letting
    # the model invent synonyms — only for the message actually being replied to.
    last_user_msg = next((m['content'] for m in reversed(messages) if m['role'] == 'user'), '')
    content_words = _extract_content_words(last_user_msg)
    if content_words:
        from thesaurus_engine import lookup as thesaurus_lookup
        grounding_lines = []
        for w in content_words:
            result = thesaurus_lookup(w)
            if result['found'] and result['synonyms']:
                grounding_lines.append(f"{w}: {', '.join(result['synonyms'][:8])}")
        if grounding_lines:
            system += (
                "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "REFERENCE SYNONYM DATA (real thesaurus lookups for words in the user's "
                "message — use these when suggesting alternate word choices, don't invent synonyms)\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                + "\n".join(grounding_lines)
            )

    log.info('POST /veil/chat  turns=%d', len(messages))

    try:
        response = _anthropic.messages.create(
            model='claude-sonnet-4-6',
            max_tokens=2048,
            system=system,
            messages=[{'role': m['role'], 'content': m['content']} for m in messages],
        )
        reply = response.content[0].text
        return jsonify({'reply': reply})
    except anthropic.APIError as e:
        log.exception('Anthropic API error in /veil/chat')
        return jsonify({'error': 'VEIL unavailable', 'detail': str(e)}), 502
    except Exception as e:
        log.exception('Error in /veil/chat')
        return jsonify({'error': 'VEIL failed', 'detail': str(e)}), 500



@app.route('/autofill', methods=['POST'])
def autofill_route():
    '''
    POST /autofill
    Scores every content word in the verse against existing color families.
    Returns color assignments for all words that score >= threshold,
    ordered by score. Caller decides which words to apply (e.g. uncolored only).

    Body: {
      verse_lines:  [str, ...],
      families:     [{color_id, sample_words: [str, ...]}],
      threshold:    float (default 0.75)
    }
    Response: { assignments: [{word, line_index, word_index, color_id, score}] }
    '''
    from phoneme_engine import get_phonemes, get_rhyme_unit_from_phonemes, syllable_rhyme_score

    body       = request.get_json(silent=True) or {}
    verse_lines = body.get('verse_lines', [])
    families    = body.get('families', [])
    threshold   = float(body.get('threshold', 0.60))

    if not verse_lines or not families:
        return jsonify({'assignments': []})

    # Pre-compute rhyme_units for each family's sample words once
    # Also track family size — EH+R slant (score == 0.65) only allowed for families
    # with 3+ established sample words (mirrors Pass 4 gate in rhyme_detection_engine).
    SLANT_MIN_FAMILY_SIZE = 3
    family_data = []
    for fam in families:
        rus = []
        for sw in fam.get('sample_words', [])[:8]:
            p = get_phonemes(sw)
            if p:
                ru = get_rhyme_unit_from_phonemes(p)
                if ru:
                    rus.append(ru)
        if rus:
            family_data.append({
                'color_id': fam['color_id'],
                'rhyme_units': rus,
                'size': len(fam.get('sample_words', [])),
            })

    assignments = []
    for li, line in enumerate(verse_lines):
        words = line.split()
        for wi, token in enumerate(words):
            clean = token.strip('.,!?;:"\'-').lower()
            if not clean:
                continue
            p = get_phonemes(clean)
            if not p:
                continue
            target_ru = get_rhyme_unit_from_phonemes(p)
            if not target_ru:
                continue
            best_cid, best_score = None, 0.0
            for fam in family_data:
                for ru in fam['rhyme_units']:
                    s = syllable_rhyme_score(target_ru, ru)
                    # EH+R slant tier (0.65) — only allow for established families
                    if 0.64 <= s <= 0.66 and fam['size'] < SLANT_MIN_FAMILY_SIZE:
                        continue
                    if s > best_score:
                        best_score, best_cid = s, fam['color_id']
            if best_cid and best_score >= threshold:
                assignments.append({
                    'word':       clean,
                    'line_index': li,
                    'word_index': wi,
                    'color_id':   best_cid,
                    'score':      round(best_score, 3),
                })

    assignments.sort(key=lambda a: a['score'], reverse=True)
    return jsonify({'assignments': assignments})


@app.route('/suggest-family', methods=['POST'])
def suggest_family():
    '''
    POST /suggest-family
    Body: { word: str, families: [{color_id, sample_words: [str, ...]}] }
    Scores the word's rhyme unit against each family's sample words.
    Returns top matches with scores >= 0.65 (includes slant bridges).
    '''
    from phoneme_engine import get_phonemes, get_rhyme_unit_from_phonemes, syllable_rhyme_score, classify_r_family
    from rhyme_detection_engine import _r_family_compatible
    body = request.get_json(silent=True) or {}
    word = body.get('word', '').strip()
    families = body.get('families', [])

    if not word:
        return jsonify({'suggestions': []})

    target_phonemes = get_phonemes(word)
    if not target_phonemes:
        return jsonify({'suggestions': []})

    target_ru = get_rhyme_unit_from_phonemes(target_phonemes)
    if not target_ru:
        return jsonify({'suggestions': []})

    target_r_class = classify_r_family(target_ru)

    suggestions = []
    for fam in families:
        color_id = fam.get('color_id')
        sample_words = fam.get('sample_words', [])
        if not sample_words:
            continue
        best = 0.0
        for sw in sample_words[:8]:
            sw_phonemes = get_phonemes(sw)
            if not sw_phonemes:
                continue
            sw_ru = get_rhyme_unit_from_phonemes(sw_phonemes)
            if not sw_ru:
                continue
            if not _r_family_compatible(target_r_class, classify_r_family(sw_ru)):
                continue
            score = syllable_rhyme_score(target_ru, sw_ru)
            if score > best:
                best = score
        if best >= 0.55:
            suggestions.append({'color_id': color_id, 'score': round(best, 3)})

    suggestions.sort(key=lambda s: s['score'], reverse=True)
    return jsonify({'word': word, 'suggestions': suggestions[:3]})


@app.route('/thesaurus/bridge', methods=['POST'])
def thesaurus_bridge():
    '''
    POST /thesaurus/bridge
    Body: { word_a: str, word_b: str }
    Finds words that connect two topics/images via the synonym graph —
    useful for building an extended metaphor between two unrelated ideas.
    '''
    from thesaurus_engine import find_bridge_words

    body = request.get_json(silent=True) or {}
    word_a = (body.get('word_a') or '').strip()
    word_b = (body.get('word_b') or '').strip()
    if not word_a or not word_b:
        return jsonify({'error': 'word_a and word_b are required'}), 400

    result = find_bridge_words(word_a, word_b)
    return jsonify(result)


@app.route('/thesaurus/synonyms', methods=['POST'])
def thesaurus_synonyms():
    '''
    POST /thesaurus/synonyms
    Body: { word: str, target_syllables: int? }
    Returns synonyms tagged with syllable count. If target_syllables is given,
    results are sorted by closeness to it so the returned words actually fit
    the bar's rhythm, not just a generic alphabetical dictionary dump.
    '''
    from thesaurus_engine import lookup as thesaurus_lookup
    from syllable_engine import get_syllable_count
    from concreteness_engine import get_concreteness

    body = request.get_json(silent=True) or {}
    word = (body.get('word') or '').strip()
    target = body.get('target_syllables')
    if not word:
        return jsonify({'error': 'word is required'}), 400

    result = thesaurus_lookup(word)
    if not result['found']:
        return jsonify({'word': word, 'found': False, 'synonyms': []})

    tagged = [
        {
            'word': syn,
            'syllable_count': get_syllable_count(syn) or 1,
            'concreteness': get_concreteness(syn),
        }
        for syn in result['synonyms']
    ]
    if target is not None:
        try:
            target = int(target)
            tagged.sort(key=lambda s: abs(s['syllable_count'] - target))
        except (TypeError, ValueError):
            pass
    else:
        tagged.sort(key=lambda s: s['syllable_count'])

    return jsonify({'word': word, 'found': True, 'synonyms': tagged})


@app.route('/thesaurus/related', methods=['POST'])
def thesaurus_related():
    '''
    POST /thesaurus/related
    Body: { word: str, verse_lines: [str, ...]? }
    Returns synonyms for the word, each tagged with whether it also rhymes
    with one of the verse's active rhyme families — one view instead of
    switching between the thesaurus and the rhyme suggester separately.
    '''
    from thesaurus_engine import lookup as thesaurus_lookup
    from phoneme_engine import get_rhyme_unit, syllable_rhyme_score
    from concreteness_engine import get_concreteness

    body = request.get_json(silent=True) or {}
    word = (body.get('word') or '').strip()
    verse_lines = body.get('verse_lines') or []
    if not word:
        return jsonify({'error': 'word is required'}), 400

    result = thesaurus_lookup(word)
    if not result['found']:
        return jsonify({'word': word, 'found': False, 'synonyms': []})

    family_units = []
    if verse_lines:
        from motif_engine import build_motif_map
        motif_result = build_motif_map(verse_lines, None)
        for group in motif_result['motif_groups']:
            for member in group['members']:
                ru = get_rhyme_unit(member['word'])
                if ru:
                    family_units.append(ru)
                    break

    tagged = []
    for syn in result['synonyms']:
        syn_ru = get_rhyme_unit(syn)
        also_rhymes = bool(syn_ru) and any(
            syllable_rhyme_score(syn_ru, fu) >= 0.75 for fu in family_units
        )
        tagged.append({'word': syn, 'also_rhymes': also_rhymes, 'concreteness': get_concreteness(syn)})

    tagged.sort(key=lambda s: s['also_rhymes'], reverse=True)
    return jsonify({'word': word, 'found': True, 'synonyms': tagged})


@app.route('/suggest-motif-words', methods=['POST'])
def suggest_motif_words():
    '''
    POST /suggest-motif-words
    Body: { cluster_words: [str, ...], exclude: [str, ...]? }
    Suggests more words to add to a motif_bank cluster, ranked by how many
    existing cluster words the candidate is a synonym of (thematic centrality).
    '''
    from thesaurus_engine import suggest_cluster_words

    body = request.get_json(silent=True) or {}
    cluster_words = body.get('cluster_words', [])
    exclude = body.get('exclude', [])
    if not cluster_words or not isinstance(cluster_words, list):
        return jsonify({'error': 'cluster_words array required'}), 400

    suggestions = suggest_cluster_words(cluster_words, exclude=exclude)
    return jsonify({'suggestions': suggestions})


@app.route('/corrections', methods=['POST'])
def record_corrections():
    '''
    POST /corrections
    Body: { signals: [{word, correction_type, color_id?}, ...] }
    Records manual correction signals for learning accumulation.
    '''
    body = request.get_json(silent=True) or {}
    signals = body.get('signals', [])
    if not signals or not isinstance(signals, list):
        return jsonify({'error': 'signals array required'}), 400
    try:
        record_signals_batch(signals)
        log.info('POST /corrections  recorded %d signals', len(signals))
        return jsonify({'recorded': len(signals)})
    except Exception as e:
        log.exception('Error recording corrections')
        return jsonify({'error': str(e)}), 500


@app.route('/corrections', methods=['GET'])
def get_corrections():
    '''GET /corrections — returns top correction signals for review.'''
    limit = min(int(request.args.get('limit', 50)), 200)
    signals = get_top_signals(limit)
    return jsonify({'signals': signals, 'count': len(signals)})


@app.route('/wordforms', methods=['POST'])
def wordforms():
    '''
    POST /wordforms
    Body: { word: str }
    Returns words sharing this word's root — for polyptoton (repeating a
    word's root in different grammatical forms across a verse).
    '''
    from wordform_engine import find_same_root_words

    body = request.get_json(silent=True) or {}
    word = (body.get('word') or '').strip()
    if not word:
        return jsonify({'error': 'word is required'}), 400

    related = find_same_root_words(word)
    return jsonify({'word': word, 'related': related})


# ── Usage History ─────────────────────────────────────────

@app.route('/my-words', methods=['GET'])
def my_words():
    '''
    GET /my-words  (requires Bearer token)
    Your personal word-choice fingerprint — the words you gravitate to
    across everything you've analyzed. Query param `exclude` (comma-separated)
    lets a caller exclude words already in the verse being written, so this
    doubles as a suggestion source ("words you tend to reach for").
    '''
    row, err = _auth_required()
    if err:
        return err
    user_id = row[0]

    exclude_param = request.args.get('exclude', '')
    exclude = [w.strip() for w in exclude_param.split(',') if w.strip()]

    top_words = usage_history.get_user_top_words(user_id, exclude=exclude, limit=25)
    return jsonify({'top_words': top_words})


# ── Mastery ───────────────────────────────────────────────

@app.route('/mastery', methods=['GET'])
def mastery():
    from mastery_engine import compute_mastery
    try:
        report = compute_mastery()
        return jsonify(report)
    except Exception as e:
        log.exception('Error in /mastery')
        return jsonify({'error': 'Mastery report failed', 'detail': str(e)}), 500

# ── Entry point ───────────────────────────────────────────

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port, threaded=True)
