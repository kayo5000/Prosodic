import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, Check } from 'lucide-react';
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
          caretColor: '#6366F1', outline: 'none', transition: 'border 150ms',
        }}
        onFocus={e => e.currentTarget.style.border = '1px solid rgba(99,102,241,0.5)'}
        onBlur={e => e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'}
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        style={{
          position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', color: '#555', display: 'flex', padding: 0,
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#9B9B9B'}
        onMouseLeave={e => e.currentTarget.style.color = '#555'}
      >
        {show ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
      </button>
    </div>
  );
}

const rules = [
  { label: 'At least 6 characters', test: p => p.length >= 6 },
  { label: 'One number',            test: p => /\d/.test(p) },
];

export default function SignupPage({ onSwitch }) {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const mismatch  = confirm && password !== confirm;
  const pwdStrong = rules.every(r => r.test(password));
  const canSubmit = username && email && pwdStrong && password === confirm && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({ email, username, password });
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
      background: '#06060A', overflowY: 'auto',
    }}>
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
        style={{ width: '100%', maxWidth: 420, padding: '40px 24px' }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 36 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', marginBottom: 16,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 32px rgba(99,102,241,0.35)',
          }}>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 700, color: '#fff' }}>P</span>
          </div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 28, fontWeight: 700, color: '#EDEDEC', letterSpacing: '0.06em', marginBottom: 6 }}>
            CREATE ACCOUNT
          </h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#555' }}>
            Start building your craft
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Username"
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

          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email address"
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

          {/* Password rules */}
          {password && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ display: 'flex', gap: 14, paddingLeft: 2 }}
            >
              {rules.map(r => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: r.test(password) ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.06)',
                    border: r.test(password) ? '1px solid rgba(74,222,128,0.5)' : '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 200ms',
                  }}>
                    {r.test(password) && <Check size={8} color="#4ADE80" strokeWidth={3} />}
                  </div>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: r.test(password) ? '#4ADE80' : '#555' }}>
                    {r.label}
                  </span>
                </div>
              ))}
            </motion.div>
          )}

          <PasswordInput value={confirm} onChange={setConfirm} placeholder="Confirm password" />

          {mismatch && (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#EF4444', marginTop: -4 }}>
              Passwords don't match
            </p>
          )}

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
            disabled={!canSubmit}
            style={{
              marginTop: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '14px 0', borderRadius: 12, border: 'none',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 600, color: '#fff',
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
              opacity: canSubmit ? 1 : 0.45,
              transition: 'opacity 150ms',
            }}
          >
            {loading ? 'Creating account…' : <><span>Create Account</span><ArrowRight size={16} strokeWidth={2} /></>}
          </button>
        </form>

        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#555',
          textAlign: 'center', marginTop: 28,
        }}>
          Already have an account?{' '}
          <button
            onClick={onSwitch}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a5b4fc', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500 }}
          >
            Sign in
          </button>
        </p>
      </motion.div>
    </div>
  );
}
