'''
Tests for feature_flags.py and the /cantos/state-snapshot route it gates.

Two things worth proving, not just asserting: (1) with the flag off
(the default), the Cantos package is never even imported — not just
"the route returns 404 while cantos_wiring sits loaded in memory", but
genuinely absent from the process; and (2) with the flag on, the route
does real work through the real Cantos/Behavioral-Layer chain, not a
stub.

Each test spawns api.py fresh in a subprocess so the module-level
FEATURE_CANTOS_ENABLED read (which only happens once, at import time)
picks up a clean env var each time — importing api twice in the same
pytest process wouldn't re-evaluate that.
'''
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import subprocess
import tempfile
import textwrap


def _run_in_subprocess(cantos_enabled):
    db_tmp = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
    db_tmp.close()
    cantos_dir = tempfile.mkdtemp()

    script = textwrap.dedent(f'''
        import os, json
        os.environ['PROSODIC_DB_PATH'] = {db_tmp.name!r}
        os.environ['CANTOS_DB_PATH'] = {os.path.join(cantos_dir, "c.db")!r}
        os.environ['FEATURE_CANTOS_ENABLED'] = {"'true'" if cantos_enabled else "'false'"}

        import api
        client = api.app.test_client()

        print('CANTOS_IMPORTED_AT_MODULE_LEVEL:', 'cantos_wiring' in dir(api))

        reg = client.post('/auth/register', json={{
            'email': 'flagtest@example.com', 'username': 'flagtestuser', 'password': 'password123',
        }})
        token = reg.get_json()['token']
        r = client.post('/cantos/state-snapshot',
                         json={{'verse_text': 'line one here today\\nline two right now yo', 'bpm': 90}},
                         headers={{'Authorization': f'Bearer {{token}}'}})
        print('STATUS:', r.status_code)
        print('BODY:', json.dumps(r.get_json()))
    ''')
    result = subprocess.run(
        [sys.executable, '-c', script],
        cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        capture_output=True, text=True, timeout=60,
    )
    assert result.returncode == 0, f'subprocess failed:\n{result.stdout}\n{result.stderr}'
    return result.stdout


def test_flag_off_by_default_cantos_never_imported():
    output = _run_in_subprocess(cantos_enabled=False)
    assert 'CANTOS_IMPORTED_AT_MODULE_LEVEL: False' in output
    assert 'STATUS: 404' in output
    assert 'not enabled on this deployment' in output


def test_flag_on_does_real_work_through_real_cantos_chain():
    output = _run_in_subprocess(cantos_enabled=True)
    assert 'CANTOS_IMPORTED_AT_MODULE_LEVEL: True' in output
    assert 'STATUS: 200' in output
    assert '"ready": true' in output
    assert 'section_state' in output  # real state_engine.classify() output, not a stub
    assert '"engine": "state"' in output  # a real Notebook Entry was actually written
