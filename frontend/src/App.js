import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './state/AuthContext';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import './styles/theme.css';
import './styles/globals.css';

function AuthGate() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState('login');
  const navigate = useNavigate();
  const wasAuthed = useRef(false);

  useEffect(() => {
    if (user && !wasAuthed.current) {
      wasAuthed.current = true;
      navigate('/', { replace: true });
    }
    if (!user) wasAuthed.current = false;
  }, [user, navigate]);

  if (loading) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#06060A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '2px solid rgba(99,102,241,0.3)',
          borderTop: '2px solid #6366F1',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return mode === 'login'
      ? <LoginPage  onSwitch={() => setMode('signup')} />
      : <SignupPage onSwitch={() => setMode('login')} />;
  }

  return <Dashboard />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </BrowserRouter>
  );
}
