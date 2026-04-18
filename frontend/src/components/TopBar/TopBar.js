import { useState } from 'react';
import { useApp } from '../../state/AppContext';
import useTapTempo from '../../hooks/useTapTempo';
import Toggle from '../shared/Toggle';
import styles from './TopBar.module.css';

const FLOW_CLASS = {
  'On-Grid':       styles.flowOnGrid,
  'Syncopated':    styles.flowSyncopated,
  'Floating':      styles.flowFloating,
  'Pocket Jumper': styles.flowPocketJumper,
};

const MODE_OPTIONS = [
  { value: 'write',     label: 'Write' },
  { value: 'freewrite', label: 'Freewrite' },
];

export default function TopBar() {
  const { state, dispatch, activeSection } = useApp();
  const [beatOn, setBeatOn] = useState(false);
  const [beatDraftBpm, setBeatDraftBpm] = useState('');

  const { tap } = useTapTempo((bpm) => {
    dispatch({ type: 'SET_BPM', payload: bpm });
  });

  const handleBpmChange = (e) => {
    const v = parseInt(e.target.value, 10);
    if (!isNaN(v) && v > 0 && v <= 240) dispatch({ type: 'SET_BPM', payload: v });
  };

  const handleBeatToggle = () => {
    if (!beatOn) { setBeatDraftBpm(String(activeSection.bpm)); setBeatOn(true); }
    else setBeatOn(false);
  };

  const confirmBeat = () => {
    const bpm = parseInt(beatDraftBpm, 10);
    const names = ['Verse 1','Hook','Verse 2','Bridge','Outro','Verse 3','Pre-Hook','Ad-libs'];
    dispatch({ type: 'ADD_SECTION', payload: { name: names[state.sections.length] || `Section ${state.sections.length + 1}`, bpm: bpm > 0 ? bpm : activeSection.bpm } });
    setBeatOn(false);
  };

  const handleModeChange = (mode) => {
    if (mode === 'write' && activeSection.mode === 'freewrite' && activeSection.rawFreewrite.trim()) {
      dispatch({ type: 'SET_FREEWRITE_IMPORT', payload: true });
    } else {
      dispatch({ type: 'SET_EDITOR_MODE', payload: mode });
    }
  };

  const flow = activeSection?.analysis?.flow_signature;
  const flowClass = FLOW_CLASS[flow] || styles.flowEmpty;

  return (
    <div className={styles.topbar}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <div className={styles.logoBar} style={{ height: '9px' }} />
          <div className={styles.logoBar} style={{ height: '18px' }} />
          <div className={styles.logoBar} style={{ height: '13px' }} />
        </div>
        <span className={styles.logoText}>Prosodic</span>
      </div>

      <div className={styles.sep} />

      {/* BPM */}
      <div className={styles.bpmGroup}>
        <span className={styles.bpmLabel}>BPM</span>
        <input
          type="number" min="40" max="240"
          value={activeSection?.bpm || 80}
          onChange={handleBpmChange}
          className={styles.bpmInput}
        />
        <button className={styles.tapBtn} onClick={tap} onMouseDown={e => e.preventDefault()}>
          Tap
        </button>
      </div>

      <div className={styles.sep} />

      {/* Section name */}
      <input
        type="text"
        className={styles.sectionInput}
        value={activeSection?.name || ''}
        onChange={e => dispatch({ type: 'SET_SECTION_NAME', payload: e.target.value })}
        placeholder="Section name…"
      />

      <div className={styles.sep} />

      {/* Mode */}
      <Toggle options={MODE_OPTIONS} value={activeSection?.mode || 'write'} onChange={handleModeChange} />

      <div className={styles.spacer} />

      {/* Flow badge */}
      <div className={`${styles.flowBadge} ${flowClass}`}>
        {flow || '— — —'}
      </div>

      <div className={styles.sep} />

      {/* Beat switch */}
      <div className={styles.beatSwitch} onClick={handleBeatToggle}>
        <div className={`${styles.beatTrack} ${beatOn ? styles.on : ''}`}>
          <div className={styles.beatThumb} />
        </div>
        <span className={styles.beatLabel}>Beat Switch</span>
      </div>

      {beatOn && (
        <div className={styles.beatPrompt}>
          <span className={styles.beatPromptLabel}>New BPM</span>
          <input
            type="number" className={styles.beatPromptInput}
            value={beatDraftBpm}
            onChange={e => setBeatDraftBpm(e.target.value)}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && confirmBeat()}
          />
          <button className={styles.beatPromptConfirm} onClick={confirmBeat}>New Section</button>
        </div>
      )}

      <div className={styles.sep} />

      {/* Settings */}
      <button className={styles.settingsBtn} onClick={() => dispatch({ type: 'SET_SETTINGS_OPEN', payload: true })} title="Settings">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <path d="M6.5 1h3l.4 1.4c.4.1.8.3 1.2.6l1.4-.6 2.1 2.1-.6 1.4c.3.4.5.8.6 1.2L16 7.5v3l-1.4.4c-.1.4-.3.8-.6 1.2l.6 1.4-2.1 2.1-1.4-.6c-.4.3-.8.5-1.2.6L9.5 16h-3l-.4-1.4a5 5 0 0 1-1.2-.6l-1.4.6L1.4 12.5l.6-1.4A5 5 0 0 1 1.4 9.9L0 9.5v-3l1.4-.4c.1-.4.3-.8.6-1.2L1.4 3.5 3.5 1.4l1.4.6c.4-.3.8-.5 1.2-.6L6.5 1z" stroke="currentColor" strokeWidth="1.1" fill="none"/>
          <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.1" fill="none"/>
        </svg>
      </button>
    </div>
  );
}
