import { useState, useMemo } from 'react';
import { useApp } from '../../state/AppContext';
import styles from './FreewriteImportView.module.css';

const SECTION_NAMES = ['Verse 1','Hook','Verse 2','Bridge','Outro','Verse 3'];

function detectSections(raw) {
  const blocks = raw.split(/\n{2,}/);
  return blocks
    .map(b => b.trim())
    .filter(Boolean)
    .map((block, i) => ({
      name: SECTION_NAMES[i] || `Section ${i + 1}`,
      lines: block.split('\n').map(l => l.trim()).filter(Boolean),
    }));
}

export default function FreewriteImportView() {
  const { activeSection, dispatch } = useApp();
  const [bpm, setBpm] = useState(activeSection.bpm || 80);

  const sections = useMemo(
    () => detectSections(activeSection.rawFreewrite),
    [activeSection.rawFreewrite]
  );

  const handleConfirm = () => {
    const allLines = sections.flatMap(s => s.lines);
    dispatch({ type: 'IMPORT_FREEWRITE', payload: { lines: allLines, bpm: parseInt(bpm, 10) || 80 } });
  };

  const handleCancel = () => {
    dispatch({ type: 'SET_FREEWRITE_IMPORT', payload: false });
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <div className={styles.title}>Import Freewrite</div>
            <div className={styles.subtitle}>
              Blank lines detected {sections.length} section{sections.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        <div className={styles.body}>
          {/* Left: raw */}
          <div className={styles.pane}>
            <div className={styles.paneLabel}>Raw</div>
            <div className={styles.rawText}>{activeSection.rawFreewrite}</div>
          </div>

          {/* Right: detected structure */}
          <div className={styles.pane}>
            <div className={styles.paneLabel}>Detected Structure</div>
            {sections.map((sec, i) => (
              <div key={i} className={styles.section}>
                <div className={styles.sectionName}>{sec.name}</div>
                {sec.lines.map((line, j) => (
                  <div key={j} className={styles.sectionLine}>{line}</div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.footer}>
          <span className={styles.bpmLabel}>BPM</span>
          <input
            type="number"
            className={styles.bpmInput}
            value={bpm}
            onChange={e => setBpm(e.target.value)}
            min="40" max="240"
          />
          <button className={styles.cancelBtn} onClick={handleCancel}>Cancel</button>
          <button className={styles.confirmBtn} onClick={handleConfirm}>
            Import to Write Mode
          </button>
        </div>
      </div>
    </div>
  );
}
