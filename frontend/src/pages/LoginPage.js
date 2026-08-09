import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../state/AuthContext';

function PasswordInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, padding: '13px 44px 13px 16px',
          fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: '#EDEDEC',
          caretColor: '#6366F1', outline: 'none',
          transition: 'border 150ms',
        }}
        onFocus={e => e.currentTarget.style.border = '1px solid rgba(99,102,241,0.5)'}
        onBlur={e => e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'}
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        style={{
          position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#555', display: 'flex', padding: 0,
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#9B9B9B'}
        onMouseLeave={e => e.currentTarget.style.color = '#555'}
      >
        {show ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
      </button>
    </div>
  );
}

export default function LoginPage({ onSwitch }) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password,   setPassword]   = useState('');
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email: identifier, password });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#06060A',
    }}>
      {/* Subtle glow */}
      <div style={{
        position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '100%', maxWidth: 420, padding: '0 24px' }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 40 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', marginBottom: 16,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 32px rgba(99,102,241,0.35)',
          }}>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 700, color: '#fff' }}>P</span>
          </div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 28, fontWeight: 700, color: '#EDEDEC', letterSpacing: '0.06em', marginBottom: 6 }}>
            PROSODIC
          </h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#555' }}>
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            type="text"
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            placeholder="Email or username"
            required
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, padding: '13px 16px',
              fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: '#EDEDEC',
              caretColor: '#6366F1', outline: 'none', transition: 'border 150ms',
            }}
            onFocus={e => e.currentTarget.style.border = '1px solid rgba(99,102,241,0.5)'}
            onBlur={e => e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'}
          />

          <PasswordInput value={password} onChange={setPassword} placeholder="Password" />

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#EF4444', textAlign: 'center' }}
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading || !identifier || !password}
            style={{
              marginTop: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '14px 0', borderRadius: 12, border: 'none', cursor: loading ? 'wait' : 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 600, color: '#fff',
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
              opacity: (!identifier || !password) ? 0.5 : 1,
              transition: 'opacity 150ms',
            }}
          >
            {loading ? 'Signing in…' : <><span>Sign In</span><ArrowRight size={16} strokeWidth={2} /></>}
          </button>
        </form>

        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#555',
          textAlign: 'center', marginTop: 28,
        }}>
          Don't have an account?{' '}
          <button
            onClick={onSwitch}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a5b4fc', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500 }}
          >
            Create one
          </button>
        </p>
      </motion.div>
    </div>
  );
}
