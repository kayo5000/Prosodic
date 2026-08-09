import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Pencil, X, Check, Lock, MapPin, Eye, EyeOff, KeyRound } from 'lucide-react';
import GlassFilter from '../components/ui/GlassFilter';
import { useAuth } from '../state/AuthContext';
import { COUNTRIES, US_STATES, US_CITIES, CA_PROVINCES, CA_CITIES, UK_REGIONS, UK_CITIES, AU_STATES, AU_CITIES } from '../data/locationData';

const GRADIENTS = [
  ['#6366F1', '#8B5CF6'],
  ['#EC4899', '#F43F5E'],
  ['#10B981', '#34D399'],
  ['#F59E0B', '#F97316'],
  ['#3B82F6', '#06B6D4'],
  ['#8B5CF6', '#EC4899'],
  ['#EF4444', '#F97316'],
  ['#14B8A6', '#6366F1'],
  ['#F472B6', '#C084FC'],
  ['#22D3EE', '#6366F1'],
];

const GEO_OPTIONS = [
  'Atlanta', 'New York', 'Los Angeles', 'Chicago', 'Houston', 'Detroit',
  'Miami', 'Memphis', 'Philadelphia', 'Oakland', 'London', 'Toronto',
  'Dallas', 'New Orleans', 'Seattle', 'Baltimore',
];


function GradientAvatar({ gradientIndex, initial = 'G', size = 80, editing, onClick }) {
  return (
    <motion.div
      animate={{ scale: editing ? 1.45 : 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      onClick={editing ? onClick : undefined}
      style={{
        width: size, height: size, borderRadius: '50%',
        position: 'relative', flexShrink: 0,
        cursor: editing ? 'pointer' : 'default',
        zIndex: editing ? 50 : 'auto',
      }}
    >
      <AnimatePresence mode="sync">
        <motion.div
          key={gradientIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: 'easeInOut' }}
          style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: `linear-gradient(135deg, ${GRADIENTS[gradientIndex][0]}, ${GRADIENTS[gradientIndex][1]})`,
            boxShadow: editing
              ? `0 0 0 3px ${GRADIENTS[gradientIndex][0]}55, 0 12px 40px ${GRADIENTS[gradientIndex][0]}44`
              : `0 0 0 3px ${GRADIENTS[gradientIndex][0]}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        />
      </AnimatePresence>

      {/* Initial letter */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <span style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: size * 0.375,
          fontWeight: 700,
          color: '#fff',
          userSelect: 'none',
        }}>
          {initial}
        </span>
      </div>

      {/* Tap hint ring when editing */}
      {editing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            position: 'absolute', inset: -4, borderRadius: '50%',
            border: `2px dashed ${GRADIENTS[gradientIndex][0]}88`,
          }}
        />
      )}
    </motion.div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{
        fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600,
        color: '#9B9B9B', letterSpacing: '0.08em', textTransform: 'uppercase',
        display: 'block', marginBottom: 6,
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, disabled }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange && onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: '100%', background: disabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
        border: disabled ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10, padding: '10px 12px',
        fontFamily: 'DM Sans, sans-serif', fontSize: 14,
        color: disabled ? '#555' : '#EDEDEC',
        caretColor: '#6366F1', outline: 'none',
        cursor: disabled ? 'not-allowed' : 'text',
        boxSizing: 'border-box',
      }}
    />
  );
}

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
          width: '100%', background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10, padding: '10px 40px 10px 12px',
          fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#EDEDEC',
          caretColor: '#6366F1', outline: 'none', boxSizing: 'border-box',
        }}
        onFocus={e => e.currentTarget.style.border = '1px solid rgba(99,102,241,0.4)'}
        onBlur={e => e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'}
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#555', display: 'flex', padding: 0,
          transition: 'color 120ms',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#9B9B9B'}
        onMouseLeave={e => e.currentTarget.style.color = '#555'}
      >
        {show ? <EyeOff size={14} strokeWidth={1.8} /> : <Eye size={14} strokeWidth={1.8} />}
      </button>
    </div>
  );
}

function UpdatePassword() {
  const [open, setOpen]           = useState(false);
  const [current, setCurrent]     = useState('');
  const [next, setNext]           = useState('');
  const [confirm, setConfirm]     = useState('');
  const [status, setStatus]       = useState(null); // 'saved' | 'error'

  const mismatch  = next && confirm && next !== confirm;
  const canSave   = current && next && confirm && !mismatch;

  const handleSave = () => {
    if (!canSave) return;
    // Placeholder — wire to real auth later
    setStatus('saved');
    setTimeout(() => {
      setStatus(null);
      setOpen(false);
      setCurrent(''); setNext(''); setConfirm('');
    }, 1600);
  };

  return (
    <div>
      {/* Trigger row */}
      <button
        onClick={() => { setOpen(v => !v); setStatus(null); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
          background: open ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)',
          border: open ? '1px solid rgba(99,102,241,0.25)' : '1px solid rgba(255,255,255,0.07)',
          transition: 'all 150ms',
        }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.border = '1px solid rgba(255,255,255,0.12)'; }}}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)'; }}}
      >
        <KeyRound size={13} color={open ? '#a5b4fc' : '#555'} strokeWidth={1.8} style={{ flexShrink: 0 }} />
        <span style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500,
          color: open ? '#a5b4fc' : '#9B9B9B', flex: 1, textAlign: 'left',
        }}>
          Update Password
        </span>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#3a3a3a' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* Expandable fields */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10 }}>
              <div>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#555', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
                  Current Password
                </p>
                <PasswordInput value={current} onChange={setCurrent} placeholder="Enter current password" />
              </div>
              <div>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#555', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
                  New Password
                </p>
                <PasswordInput value={next} onChange={setNext} placeholder="At least 8 characters" />
              </div>
              <div>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: mismatch ? '#EF4444' : '#555', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
                  {mismatch ? "Passwords don't match" : 'Confirm New Password'}
                </p>
                <PasswordInput value={confirm} onChange={setConfirm} placeholder="Repeat new password" />
              </div>

              <button
                onClick={handleSave}
                disabled={!canSave}
                style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600,
                  color: status === 'saved' ? '#4ADE80' : '#fff',
                  background: status === 'saved'
                    ? 'rgba(74,222,128,0.15)'
                    : canSave
                      ? 'rgba(99,102,241,0.85)'
                      : 'rgba(255,255,255,0.05)',
                  border: status === 'saved' ? '1px solid rgba(74,222,128,0.3)' : 'none',
                  borderRadius: 10, padding: '10px 0', cursor: canSave ? 'pointer' : 'not-allowed',
                  transition: 'all 200ms', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}
              >
                {status === 'saved' ? <><Check size={13} strokeWidth={2.5} /> Password Updated</> : 'Confirm Change'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const selectStyle = (extra = {}) => ({
  width: '100%', boxSizing: 'border-box',
  background: '#141418',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, padding: '11px 12px',
  fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#EDEDEC',
  outline: 'none', cursor: 'pointer', appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23555' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
  paddingRight: 32,
  ...extra,
});

const lockedFieldStyle = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '10px 12px', borderRadius: 10,
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.05)',
  fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#555',
};

function LocationPicker({ country, onCountry, state, onState, city, onCity, neighborhood, onNeighborhood, locked }) {
  const getStates = () => {
    if (country === 'USA')            return US_STATES;
    if (country === 'Canada')         return CA_PROVINCES;
    if (country === 'United Kingdom') return UK_REGIONS;
    if (country === 'Australia')      return AU_STATES;
    return null;
  };
  const getCities = () => {
    if (!state) return null;
    if (country === 'USA')            return US_CITIES[state]    || null;
    if (country === 'Canada')         return CA_CITIES[state]    || null;
    if (country === 'United Kingdom') return UK_CITIES[state]    || null;
    if (country === 'Australia')      return AU_CITIES[state]    || null;
    return null;
  };
  const states = getStates();
  const cities = getCities();
  const hasStructured = !!states;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Country */}
      {locked ? (
        <div style={lockedFieldStyle}>
          <MapPin size={13} color="#555" />
          <span>{[city, state, country].filter(Boolean).join(', ')}</span>
          <Lock size={11} color="#3a3a3a" style={{ marginLeft: 'auto' }} />
        </div>
      ) : (
        <>
          <select value={country} onChange={e => onCountry(e.target.value)} style={selectStyle()}>
            <option value="">Select country…</option>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* State / Province / Region */}
          {country && hasStructured && (
            <select value={state} onChange={e => onState(e.target.value)} style={selectStyle()}>
              <option value="">Select state / region…</option>
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {country && !hasStructured && (
            <input
              value={state} onChange={e => onState(e.target.value)}
              placeholder="State / Province / Region"
              style={{ ...selectStyle(), backgroundImage: 'none', paddingRight: 12 }}
            />
          )}

          {/* City */}
          {country && cities && (
            <select value={city} onChange={e => onCity(e.target.value)} style={selectStyle()}>
              <option value="">Select city…</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {country && !cities && (state || !hasStructured) && (
            <input
              value={city} onChange={e => onCity(e.target.value)}
              placeholder="City"
              style={{ ...selectStyle(), backgroundImage: 'none', paddingRight: 12 }}
            />
          )}
        </>
      )}

      {/* Neighborhood — always editable */}
      <input
        value={neighborhood} onChange={e => onNeighborhood(e.target.value)}
        placeholder="Neighborhood, street, side of town… (optional)"
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10, padding: '11px 12px',
          fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#EDEDEC',
          outline: 'none', caretColor: '#6366F1',
        }}
        onFocus={e => e.currentTarget.style.border = '1px solid rgba(99,102,241,0.5)'}
        onBlur={e => e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'}
      />
    </div>
  );
}

function Influences({ values, onChange }) {
  const [input, setInput] = useState('');

  const add = () => {
    const tag = input.trim();
    if (!tag || values.includes(tag)) { setInput(''); return; }
    onChange([...values, tag]);
    setInput('');
  };

  const remove = (tag) => onChange(values.filter(v => v !== tag));

  const onKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); add(); }
    if (e.key === 'Backspace' && !input && values.length) remove(values[values.length - 1]);
  };

  return (
    <div>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6,
        padding: '8px 10px', borderRadius: 10,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        minHeight: 42,
      }}>
        {values.map(tag => (
          <span key={tag} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 20,
            fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#a5b4fc',
            background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.35)',
          }}>
            {tag}
            <button onClick={() => remove(tag)} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: '#6366F1',
              padding: 0, display: 'flex', lineHeight: 1,
            }}>
              <X size={10} strokeWidth={2.5} />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder={values.length === 0 ? 'Type a keyword, press Enter…' : ''}
          style={{
            flex: 1, minWidth: 120, background: 'none', border: 'none', outline: 'none',
            fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#EDEDEC',
            caretColor: '#6366F1', padding: '2px 4px',
          }}
        />
      </div>
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#3a3a3a', marginTop: 6 }}>
        Artists, cities, eras, sounds — anything that shapes your style. VEIL reads these.
      </p>
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();

  const [gradientIndex, setGradientIndex] = useState(user?.gradient_index ?? 0);
  const [editing, setEditing]             = useState(false);

  const [displayName, setDisplayName]     = useState(user?.username || '');
  const [veilName, setVeilName]           = useState(user?.veil_name || '');
  const [email, setEmail]                 = useState(user?.email || '');
  const [phone, setPhone]                 = useState(user?.phone || '');
  const _parseLoc = (raw) => {
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return { country: raw }; }
  };
  const _storedLoc = _parseLoc(user?.hometown);
  const [locCountry,      setLocCountry]      = useState(_storedLoc.country      || '');
  const [locState,        setLocState]        = useState(_storedLoc.state        || '');
  const [locCity,         setLocCity]         = useState(_storedLoc.city         || '');
  const [locNeighborhood, setLocNeighborhood] = useState(_storedLoc.neighborhood || '');
  const [locLocked,       setLocLocked]       = useState(!!(  _storedLoc.country && _storedLoc.city));
  const [geoInfluences, setGeoInfluences] = useState(
    Array.isArray(user?.geo_influences) ? user.geo_influences : (user?.geo_influences ? user.geo_influences.split(',').filter(Boolean) : [])
  );

  const [draft, setDraft] = useState({ displayName, veilName, email, phone });

  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  const pickColor = () => {
    let next = gradientIndex;
    while (next === gradientIndex) next = Math.floor(Math.random() * GRADIENTS.length);
    setGradientIndex(next);
  };

  const openEdit = () => {
    setDraft({ displayName, veilName, email, phone });
    setEditing(true);
  };

  const _locDisplay = () => [locNeighborhood, locCity, locState, locCountry].filter(Boolean).join(', ');

  const saveEdit = async () => {
    const hometownJson = JSON.stringify({
      country: locCountry, state: locState, city: locCity, neighborhood: locNeighborhood,
    });
    await updateProfile({
      username:       draft.displayName,
      veil_name:      draft.veilName,
      phone:          draft.phone,
      hometown:       hometownJson,
      geo_influences: geoInfluences.join(','),
      gradient_index: gradientIndex,
    });
    setDisplayName(draft.displayName);
    setVeilName(draft.veilName);
    setEmail(draft.email);
    setPhone(draft.phone);
    if (locCountry && locCity) setLocLocked(true);
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  return (
    <div className="flex flex-col items-center min-h-screen px-6 pt-24 pb-16" style={{ position: 'relative' }}>
      {/* Fixed backdrop — locks out the shader */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'rgba(6,6,9,0.92)', backdropFilter: 'blur(72px)', WebkitBackdropFilter: 'blur(72px)', pointerEvents: 'none' }} />
      <GlassFilter />

      {/* Content sits above the fixed background */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* Edit-mode backdrop — blurs everything behind the avatar */}
      <AnimatePresence>
        {editing && (
          <motion.div
            key="edit-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 40,
              background: 'rgba(0,0,0,0.72)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '100%', maxWidth: 580, position: 'relative' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <h1 style={{
            fontFamily: 'Outfit, sans-serif', fontSize: 36, fontWeight: 700,
            color: '#EDEDEC', letterSpacing: '0.06em',
          }}>
            PROFILE
          </h1>
          {!editing ? (
            <button
              onClick={openEdit}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500,
                color: '#EDEDEC',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, padding: '8px 16px', cursor: 'pointer',
                transition: 'background 150ms, border 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.border = '1px solid rgba(255,255,255,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.border = '1px solid rgba(255,255,255,0.12)'; }}
            >
              <Pencil size={13} strokeWidth={1.8} />
              Edit Profile
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={cancelEdit}
                style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500,
                  color: '#9B9B9B', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600,
                  color: '#fff',
                  background: `linear-gradient(135deg, ${GRADIENTS[gradientIndex][0]}, ${GRADIENTS[gradientIndex][1]})`,
                  border: 'none',
                  borderRadius: 10, padding: '8px 18px', cursor: 'pointer',
                  boxShadow: `0 4px 16px ${GRADIENTS[gradientIndex][0]}44`,
                  transition: 'opacity 150ms',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                Save
              </button>
            </div>
          )}
        </div>

        {/* Avatar + name card */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 22, marginBottom: editing ? 10 : 22,
            padding: '20px 22px',
            background: 'rgba(15,15,20,0.55)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 18,
            backdropFilter: 'blur(12px)',
            position: 'relative', zIndex: editing ? 50 : 'auto',
          }}
        >
          {/* Avatar — clickable for color only in edit mode */}
          <GradientAvatar
            gradientIndex={gradientIndex}
            initial={(displayName || user?.email || 'U')[0].toUpperCase()}
            size={80}
            editing={editing}
            onClick={pickColor}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 700,
              color: '#EDEDEC', letterSpacing: '0.04em', marginBottom: 2,
            }}>
              {displayName || 'Your Name'}
            </p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9B9B9B', marginBottom: 8 }}>
              {email}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600,
                color: `${GRADIENTS[gradientIndex][0]}`,
                background: `${GRADIENTS[gradientIndex][0]}18`,
                border: `1px solid ${GRADIENTS[gradientIndex][0]}40`,
                padding: '2px 10px', borderRadius: 6,
              }}>
                Free Plan
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#555' }}>
                <Calendar size={11} />
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11 }}>Joined {joinedDate}</span>
              </div>
            </div>
          </div>

          {/* Color hint label when editing */}
          {editing && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
                fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.4)',
                whiteSpace: 'nowrap',
              }}
            >
              Tap avatar to change color
            </motion.p>
          )}
        </div>

        {/* Edit fields — shown only when editing */}
        <AnimatePresence>
          {editing && (
            <motion.div
              key="edit-fields"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.25 }}
              style={{
                padding: '22px 22px',
                background: 'rgba(15,15,20,0.92)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 18,
                display: 'flex', flexDirection: 'column', gap: 20,
                position: 'relative', zIndex: 50,
              }}
            >
              {/* Name row — side by side */}
              <Field label="Name">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, color: '#555', marginBottom: 5 }}>
                      Username
                    </p>
                    <TextInput
                      value={draft.displayName}
                      onChange={v => setDraft(d => ({ ...d, displayName: v }))}
                      placeholder="Your username"
                    />
                  </div>
                  <div>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, color: '#555', marginBottom: 5 }}>
                      What Veil calls you
                    </p>
                    <TextInput
                      value={draft.veilName}
                      onChange={v => setDraft(d => ({ ...d, veilName: v }))}
                      placeholder="Nickname for AI…"
                    />
                  </div>
                </div>
              </Field>

              <Field label="Email">
                <TextInput
                  value={draft.email}
                  onChange={v => setDraft(d => ({ ...d, email: v }))}
                  placeholder="your@email.com"
                />
              </Field>

              <UpdatePassword />

              <Field label="Phone Number">
                <TextInput
                  value={draft.phone}
                  onChange={v => setDraft(d => ({ ...d, phone: v }))}
                  placeholder="+1 (000) 000-0000"
                />
              </Field>

              {/* Location picker */}
              <Field label={
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  Location
                  {locLocked && <Lock size={10} color="#555" />}
                </span>
              }>
                <LocationPicker
                  country={locCountry} onCountry={v => { setLocCountry(v); setLocState(''); setLocCity(''); }}
                  state={locState}     onState={v  => { setLocState(v);   setLocCity(''); }}
                  city={locCity}       onCity={setLocCity}
                  neighborhood={locNeighborhood} onNeighborhood={setLocNeighborhood}
                  locked={locLocked}
                />

                {/* Influences */}
                <div style={{ marginTop: 14 }}>
                  <p style={{
                    fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600,
                    color: '#9B9B9B', letterSpacing: '0.08em', textTransform: 'uppercase',
                    marginBottom: 8,
                  }}>
                    Influences
                  </p>
                  <Influences values={geoInfluences} onChange={setGeoInfluences} />
                </div>
              </Field>

              {/* Bottom action row */}
              <div style={{ display: 'flex', gap: 10, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <button
                  onClick={cancelEdit}
                  style={{
                    flex: 1, fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 500,
                    color: '#9B9B9B', background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10, padding: '11px 0', cursor: 'pointer',
                    transition: 'background 150ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  style={{
                    flex: 1, fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600,
                    color: '#fff',
                    background: `linear-gradient(135deg, ${GRADIENTS[gradientIndex][0]}, ${GRADIENTS[gradientIndex][1]})`,
                    border: 'none',
                    borderRadius: 10, padding: '11px 0', cursor: 'pointer',
                    boxShadow: `0 4px 16px ${GRADIENTS[gradientIndex][0]}44`,
                    transition: 'opacity 150ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  Save
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Static info — shown when not editing */}
        {!editing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              padding: '22px',
              background: 'rgba(15,15,20,0.55)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 18,
              display: 'flex', flexDirection: 'column', gap: 16,
            }}
          >
            {[
              { label: 'Display Name', value: displayName },
              { label: 'Veil calls you', value: veilName || '—' },
              { label: 'Email', value: email },
              { label: 'Phone', value: phone || '—' },
              { label: 'Location', value: _locDisplay() || '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600,
                  color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase',
                  minWidth: 120, flexShrink: 0,
                }}>
                  {label}
                </span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: value === '—' ? '#3a3a3a' : '#EDEDEC' }}>
                  {value}
                </span>
              </div>
            ))}

            {geoInfluences.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600,
                  color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase',
                  minWidth: 120, flexShrink: 0, paddingTop: 4,
                }}>
                  Influences
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {geoInfluences.map(city => (
                    <span key={city} style={{
                      fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#EDEDEC',
                      background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
                      padding: '3px 10px', borderRadius: 20,
                    }}>
                      {city}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Danger zone */}
        {!editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              marginTop: 20, padding: '18px 22px',
              border: '1px solid rgba(239,68,68,0.15)',
              borderRadius: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, color: '#EDEDEC', marginBottom: 2 }}>
                Delete Account
              </p>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#555' }}>
                Permanently remove your account and all data
              </p>
            </div>
            <button
              style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600,
                color: '#EF4444', background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 8, padding: '7px 14px', cursor: 'pointer',
                transition: 'background 150ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.16)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
            >
              Delete
            </button>
          </motion.div>
        )}
      </motion.div>
      </div>{/* end z-index content wrapper */}
    </div>
  );
}
