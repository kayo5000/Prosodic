'''
Tests for api.py's /auth/* routes — register, login, me, update.

No test coverage existed for this area before this file (confirmed: zero
hits for "auth" anywhere in test_api.py or tests/). Written as a real
safety net BEFORE extracting the raw SQL into users_repository.py — same
"prove behavior before AND after" discipline as everywhere else in this
punch list, just applied to an area that had no net at all yet.

Uses a temp DB file, set via PROSODIC_DB_PATH BEFORE importing api — the
users table is created at import time (api.py's own module-level
_init_users_table() call), so the env var has to be in place first, not
patched onto the module after the fact.
'''
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import tempfile

_tmp = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
_tmp.close()
os.environ['PROSODIC_DB_PATH'] = _tmp.name

import api

client = api.app.test_client()
api.app.config['TESTING'] = True


def _register(email='rap@example.com', username='rapper1', password='password123'):
    return client.post('/auth/register', json={
        'email': email, 'username': username, 'password': password,
    })


# ── /auth/register ───────────────────────────────────────────────────────

def test_register_creates_user_and_returns_token():
    r = _register(email='new1@example.com', username='newuser1')
    assert r.status_code == 201
    data = r.get_json()
    assert 'token' in data
    assert data['user']['email'] == 'new1@example.com'
    assert data['user']['username'] == 'newuser1'
    assert 'password' not in data['user']
    assert 'password_hash' not in data['user']


def test_register_missing_fields_400():
    r = client.post('/auth/register', json={'email': 'x@example.com'})
    assert r.status_code == 400


def test_register_short_password_400():
    r = _register(email='shortpw@example.com', username='shortpw', password='123')
    assert r.status_code == 400


def test_register_duplicate_email_409():
    _register(email='dupe@example.com', username='dupeuser1')
    r = _register(email='dupe@example.com', username='dupeuser2')
    assert r.status_code == 409


def test_register_duplicate_username_409():
    _register(email='uniq1@example.com', username='dupeuname')
    r = _register(email='uniq2@example.com', username='dupeuname')
    assert r.status_code == 409


# ── /auth/login ───────────────────────────────────────────────────────────

def test_login_with_correct_password():
    _register(email='login1@example.com', username='loginuser1', password='correcthorse')
    r = client.post('/auth/login', json={'email': 'login1@example.com', 'password': 'correcthorse'})
    assert r.status_code == 200
    assert 'token' in r.get_json()


def test_login_by_username_also_works():
    _register(email='login2@example.com', username='loginuser2', password='correcthorse')
    r = client.post('/auth/login', json={'username': 'loginuser2', 'password': 'correcthorse'})
    assert r.status_code == 200


def test_login_wrong_password_401():
    _register(email='login3@example.com', username='loginuser3', password='correcthorse')
    r = client.post('/auth/login', json={'email': 'login3@example.com', 'password': 'wrongpassword'})
    assert r.status_code == 401


def test_login_nonexistent_user_401():
    r = client.post('/auth/login', json={'email': 'ghost@example.com', 'password': 'whatever123'})
    assert r.status_code == 401


# ── /auth/me ──────────────────────────────────────────────────────────────

def test_me_with_valid_token():
    reg = _register(email='me1@example.com', username='meuser1')
    token = reg.get_json()['token']
    r = client.get('/auth/me', headers={'Authorization': f'Bearer {token}'})
    assert r.status_code == 200
    assert r.get_json()['user']['email'] == 'me1@example.com'


def test_me_without_token_401():
    r = client.get('/auth/me')
    assert r.status_code == 401


def test_me_with_garbage_token_401():
    r = client.get('/auth/me', headers={'Authorization': 'Bearer not-a-real-token'})
    assert r.status_code == 401


# ── /auth/update ──────────────────────────────────────────────────────────

def test_update_username():
    reg = _register(email='upd1@example.com', username='updateuser1')
    token = reg.get_json()['token']
    r = client.post('/auth/update', json={'username': 'renamed1'},
                     headers={'Authorization': f'Bearer {token}'})
    assert r.status_code == 200
    assert r.get_json()['user']['username'] == 'renamed1'


def test_update_geo_influences_list_stored_and_returned():
    reg = _register(email='upd2@example.com', username='updateuser2')
    token = reg.get_json()['token']
    r = client.post('/auth/update', json={'geo_influences': ['Atlanta', 'Houston']},
                     headers={'Authorization': f'Bearer {token}'})
    assert r.status_code == 200
    assert r.get_json()['user']['geo_influences'] == ['Atlanta', 'Houston']


def test_update_password_requires_current_password():
    reg = _register(email='upd3@example.com', username='updateuser3', password='original123')
    token = reg.get_json()['token']
    r = client.post('/auth/update', json={'new_password': 'newpass123', 'current_password': 'wrongold'},
                     headers={'Authorization': f'Bearer {token}'})
    assert r.status_code == 403


def test_update_password_success_then_old_password_fails():
    reg = _register(email='upd4@example.com', username='updateuser4', password='original123')
    token = reg.get_json()['token']
    r = client.post('/auth/update', json={'new_password': 'newpass456', 'current_password': 'original123'},
                     headers={'Authorization': f'Bearer {token}'})
    assert r.status_code == 200
    old_login = client.post('/auth/login', json={'email': 'upd4@example.com', 'password': 'original123'})
    assert old_login.status_code == 401
    new_login = client.post('/auth/login', json={'email': 'upd4@example.com', 'password': 'newpass456'})
    assert new_login.status_code == 200


def test_update_to_taken_username_409():
    _register(email='taken1@example.com', username='takenname')
    reg2 = _register(email='taken2@example.com', username='otherusername')
    token = reg2.get_json()['token']
    r = client.post('/auth/update', json={'username': 'takenname'},
                     headers={'Authorization': f'Bearer {token}'})
    assert r.status_code == 409


def test_update_without_token_401():
    r = client.post('/auth/update', json={'username': 'whatever'})
    assert r.status_code == 401
