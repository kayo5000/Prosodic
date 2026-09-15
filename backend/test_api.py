'''
API Test Suite
Smoke-tests all endpoints against a live Flask test client.
No external network calls — suggestion Layer 2 may fall back to Layer 1 if
the API key is unavailable, but all status codes and response shapes are verified.

Run:  python test_api.py
'''
import sys
import time
import api

VERSE = [
    "And I swear that it's turnt",
    "It all begins with encore cheers",
    "From those wearin' my merch",
    "Fast forward through years of rehearsal",
]

client = api.app.test_client()
api.app.config['TESTING'] = True

passed = 0
failed = 0

def check(label, condition, detail=''):
    global passed, failed
    if condition:
        print(f'  {label} : OK')
        passed += 1
    else:
        print(f'  {label} : FAIL  {detail}')
        failed += 1

def section(title):
    print(title)

# ── Serializer ────────────────────────────────────────────────────────────────
section('Serializer:')
result = api._serializable({'a': (1, 2), 'b': [{'c': (3,)}]})
check('tuples -> lists', result == {'a': [1, 2], 'b': [{'c': [3]}]})

# ── GET /health ───────────────────────────────────────────────────────────────
section('GET /health:')
r = client.get('/health')
check('200 OK', r.status_code == 200)
check('status=ok', r.get_json().get('status') == 'ok')

# ── POST /analyze — validation ────────────────────────────────────────────────
section('POST /analyze validation:')
r = client.post('/analyze', json={'verse_lines': VERSE})
check('missing bpm: 400', r.status_code == 400)

r = client.post('/analyze', json={'bpm': 80})
check('missing verse: 400', r.status_code == 400)

r = client.post('/analyze', json={'verse_lines': [], 'bpm': 80})
check('empty verse: 400', r.status_code == 400)

r = client.post('/analyze', json={'verse_lines': [1, 2], 'bpm': 80})
check('non-string lines: 400', r.status_code == 400)

r = client.post('/analyze', json={'verse_lines': VERSE, 'bpm': 0})
check('bpm=0: 400', r.status_code == 400)

r = client.post('/analyze', json={'verse_lines': VERSE, 'bpm': -1})
check('bpm<0: 400', r.status_code == 400)

# ── POST /analyze — valid ─────────────────────────────────────────────────────
section('POST /analyze valid:')
r = client.post('/analyze', json={'verse_lines': VERSE, 'bpm': 80})
check('200 OK', r.status_code == 200)
data = r.get_json()
check('has flow_signature', 'flow_signature' in data)
check('has total_color_families', 'total_color_families' in data)
check('has density_summary', 'density_summary' in data)
check('density_summary has internal', 'internal' in data.get('density_summary', {}))
check('density_summary has motif', 'motif' in data.get('density_summary', {}))
check('density_summary has multisyllabic', 'multisyllabic' in data.get('density_summary', {}))

# ── POST /analyze — cadence_signals (stress/rhythm taxonomy) ───────────────────
# Guards specifically against the semantic_shift failure mode: a field that's
# present in the response shape but is actually a hardcoded no-op. Proves a
# REAL request through the real HTTP layer produces non-empty, populated,
# input-dependent data — not just that the key exists.
section('POST /analyze cadence_signals:')
cs = data.get('cadence_signals', {})
check('has cadence_signals', 'cadence_signals' in data)
check('cadence_signals has signal_counts', 'signal_counts' in cs)
check('signal_counts has all 8 taxonomy types',
      set(cs.get('signal_counts', {}).keys()) == {
          'promotion', 'demotion', 'syncopation', 'trochaic_inversion',
          'stress_clash', 'stress_lapse', 'secondary_recruitment',
          'level_stress_ambiguity',
      })
check('signals list is non-empty for this verse', len(cs.get('signals', [])) > 0,
      f"got {len(cs.get('signals', []))} signals")
check('every signal has a deliberateness field',
      all('deliberateness' in s for s in cs.get('signals', [])))
check('deliberateness is never a bare "deliberate"',
      all(s.get('deliberateness') != 'deliberate' for s in cs.get('signals', [])))
check('deliberateness values are only the 3 allowed',
      set(s.get('deliberateness') for s in cs.get('signals', [])) <=
      {'uncertain', 'likely_automatic', 'possible_deliberate'})

# Not-a-no-op proof: a different verse must produce different counts.
r2 = client.post('/analyze', json={'verse_lines': ['Losin winnin bank account thinnin'], 'bpm': 140})
cs2 = r2.get_json().get('cadence_signals', {})
check('cadence_signals differs for a different verse (not a static placeholder)',
      cs.get('signal_counts') != cs2.get('signal_counts'),
      f"both returned {cs.get('signal_counts')}")

# ── POST /suggest — validation ────────────────────────────────────────────────
section('POST /suggest validation:')
r = client.post('/suggest', json={'verse_lines': VERSE, 'trigger_mode': 'bad'})
check('bad trigger_mode: 400', r.status_code == 400)

r = client.post('/suggest', json={'bpm': 80})
check('missing verse: 400', r.status_code == 400)

# ── POST /suggest — valid ─────────────────────────────────────────────────────
section('POST /suggest valid:')
t0 = time.time()
r = client.post('/suggest', json={'verse_lines': VERSE, 'trigger_mode': 'manual'})
elapsed = time.time() - t0
check('200 OK', r.status_code == 200)
data = r.get_json()
count = data.get('count', 0)
suggestions = data.get('suggestions', [])
check('count <= 10', count <= 10, f'got {count}')
check('count > 0', count > 0, f'got {count}')
check('suggestions length matches count', len(suggestions) == count)
check('trigger_mode echoed', data.get('trigger_mode') == 'manual')
if suggestions:
    s = suggestions[0]
    for field in ('word', 'rank', 'rhyme_score', 'semantic_score',
                  'syllable_count', 'motif_fit', 'reason', 'star_rating'):
        check(f'  suggestion has {field}', field in s)

# ── GET /suggest/more — after /suggest ───────────────────────────────────────
section('GET /suggest/more:')
r = client.get('/suggest/more')
check('200 OK', r.status_code == 200)
more = r.get_json()
check('has suggestions key', 'suggestions' in more)
check('has count key', 'count' in more)
more_count = more.get('count', 0)
check('count <= 10', more_count <= 10, f'got {more_count}')
# Ranks 11-20 should not overlap with top 10
top_words = {s['word'] for s in suggestions}
more_words = {s['word'] for s in more.get('suggestions', [])}
check('no overlap with top 10', top_words.isdisjoint(more_words),
      f'overlap: {top_words & more_words}')

# ── GET /suggest/more — returns instantly (cached) ───────────────────────────
section('GET /suggest/more cache speed:')
t0 = time.time()
client.get('/suggest/more')
t1 = time.time()
check('returns in < 50ms', (t1 - t0) < 0.05, f'{(t1-t0)*1000:.0f}ms')

# ── OPTIONS preflight ─────────────────────────────────────────────────────────
section('OPTIONS preflight:')
for route in ('/analyze', '/suggest', '/suggest/more'):
    r = client.options(route)
    check(f'{route}: 204', r.status_code == 204)

# ── CORS headers ──────────────────────────────────────────────────────────────
section('CORS headers:')
r = client.get('/health')
check('Allow-Origin: *', r.headers.get('Access-Control-Allow-Origin') == '*')

# ── Summary ───────────────────────────────────────────────────────────────────
print()
total = passed + failed
print(f'{passed}/{total} checks passed.', '' if not failed else f'  {failed} FAILED.')
sys.exit(0 if failed == 0 else 1)
