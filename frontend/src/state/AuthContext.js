import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const SESSION_DURATION = 60 * 60 * 1000; // 1 hour
const WARN_BEFORE     = 30 * 1000;        // show warning 30s before expiry

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null);
  const [token,       setToken]       = useState(() => localStorage.getItem('prosodic_token'));
  const [loading,     setLoading]     = useState(true);
  const [countdown,   setCountdown]   = useState(null); // null = hidden, number = seconds left
  const logoutTimer   = useRef(null);
  const warnTimer     = useRef(null);
  const countdownRef  = useRef(null);

  const _clearTimers = () => {
    clearTimeout(logoutTimer.current);
    clearTimeout(warnTimer.current);
    clearInterval(countdownRef.current);
  };

  const _startSessionTimers = useCallback((tok) => {
    _clearTimers();

    // Parse token expiry
    let expiresIn = SESSION_DURATION;
    try {
      const payload = JSON.parse(atob(tok.split('.')[1]));
      expiresIn = Math.max(0, payload.exp * 1000 - Date.now());
    } catch (_) {}

    const warnAt = Math.max(0, expiresIn - WARN_BEFORE);

    warnTimer.current = setTimeout(() => {
      setCountdown(30);
      countdownRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearInterval(countdownRef.current); return 0; }
          return c - 1;
        });
      }, 1000);
    }, warnAt);

    logoutTimer.current = setTimeout(() => {
      _clearTimers();
      setCountdown(null);
      localStorage.removeItem('prosodic_token');
      setToken(null);
      setUser(null);
    }, expiresIn);
  }, []);

  // Verify stored token on mount
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setUser(data.user); _startSessionTimers(token); })
      .catch(() => { localStorage.removeItem('prosodic_token'); setToken(null); })
      .finally(() => setLoading(false));
  }, []);

  const _save = (tok, u) => {
    localStorage.setItem('prosodic_token', tok);
    setToken(tok);
    setUser(u);
    _startSessionTimers(tok);
  };

  const register = useCallback(async ({ email, username, password }) => {
    const r = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Registration failed');
    _save(data.token, data.user);
    return data.user;
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const r = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Login failed');
    _save(data.token, data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    _clearTimers();
    setCountdown(null);
    localStorage.removeItem('prosodic_token');
    setToken(null);
    setUser(null);
  }, []);

  const stayLoggedIn = useCallback(async () => {
    if (!token) return;
    // Re-login by refreshing the token via /auth/me then re-issuing
    // We re-use the existing token and just restart the timers
    _clearTimers();
    setCountdown(null);
    _startSessionTimers(token);
  }, [token, _startSessionTimers]);

  const updateProfile = useCallback(async (fields) => {
    const r = await fetch(`${API}/auth/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(fields),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Update failed');
    setUser(data.user);
    return data.user;
  }, [token]);

  // Cleanup on unmount
  useEffect(() => () => _clearTimers(), []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile, stayLoggedIn }}>
      {children}
      <SessionWarningModal countdown={countdown} onStay={stayLoggedIn} onLogout={logout} />
    </AuthContext.Provider>
  );
}

function SessionWarningModal({ countdown, onStay, onLogout }) {
  return (
    <AnimatePresence>
      {countdown !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background: '#0F0F17',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              padding: '36px 32px',
              width: '100%', maxWidth: 380,
              textAlign: 'center',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            }}
          >
            {/* Countdown ring */}
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
              background: countdown <= 10
                ? 'rgba(239,68,68,0.12)'
                : 'rgba(99,102,241,0.12)',
              border: `2px solid ${countdown <= 10 ? '#EF4444' : '#6366F1'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 1s',
            }}>
              <span style={{
                fontFamily: 'Outfit, sans-serif', fontSize: 26, fontWeight: 700,
                color: countdown <= 10 ? '#EF4444' : '#6366F1',
                transition: 'color 1s',
              }}>
                {countdown}
              </span>
            </div>

            <h2 style={{
              fontFamily: 'Outfit, sans-serif', fontSize: 20, fontWeight: 700,
              color: '#EDEDEC', marginBottom: 8,
            }}>
              Still there?
            </h2>
            <p style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#666',
              marginBottom: 28, lineHeight: 1.5,
            }}>
              Your session expires in {countdown} second{countdown !== 1 ? 's' : ''}.
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={onLogout}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 12,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#888', fontFamily: 'DM Sans, sans-serif',
                  fontSize: 14, fontWeight: 500, cursor: 'pointer',
                  transition: 'all 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#EF4444'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#888'; }}
              >
                Log Out
              </button>
              <button
                onClick={onStay}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 12,
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  border: 'none',
                  color: '#fff', fontFamily: 'DM Sans, sans-serif',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
                  transition: 'opacity 150ms',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                Stay Logged In
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const useAuth = () => useContext(AuthContext);
