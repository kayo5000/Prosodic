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

Part of the Prosodic hip-hop lyric analysis suite.
'''

import os
import logging
from flask import Flask, request, jsonify
import anthropic
from dotenv import load_dotenv
load_dotenv()

from feedback_engine import assemble_feedback
from suggestion_engine import get_suggestions, get_more_suggestions
from veil_prompt import VEIL_SYSTEM_PROMPT
from learning_engine import record_signals_batch, get_top_signals
from veil_revival_routes import veil_revival_bp

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s  %(levelname)-8s  %(message)s',
    datefmt='%H:%M:%S',
)
log = logging.getLogger(__name__)

app = Flask(__name__)
app.register_blueprint(veil_revival_bp)

_anthropic = anthropic.Anthropic(api_key=os.environ.get('ANTHROPIC_API_KEY'))

# ── CORS ──────────────────────────────────────────────────

@app.after_request
def add_cors(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return response

@app.route('/analyze', methods=['OPTIONS'])
@app.route('/suggest', methods=['OPTIONS'])
@app.route('/suggest/more', methods=['OPTIONS'])
@app.route('/veil/chat', methods=['OPTIONS'])
@app.route('/corrections', methods=['OPTIONS'])
@app.route('/autofill', methods=['OPTIONS'])
@app.route('/suggest-family', methods=['OPTIONS'])
def options():
    return '', 204

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


# ── Entry point ───────────────────────────────────────────

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port, threaded=True)
