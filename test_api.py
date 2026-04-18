'''
API Test Suite
Smoke-tests all endpoints against a live Flask test client.
No external network calls — suggestion Layer 2 may fall back to Layer 1 if
the API key is unavailable, but all status codes and response shapes are verified.

Run:  python test_api.py
'''
import json
import sys
import time
import api
from suggestion_engine import _suggestion_cache

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
