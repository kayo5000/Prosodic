import { useApp } from '../../state/AppContext';
import styles from './SectionTabs.module.css';

const SECTION_NAMES = ['Verse 1','Hook','Verse 2','Bridge','Outro','Verse 3','Pre-Hook','Ad-libs'];

export default function SectionTabs() {
  const { state, dispatch } = useApp();

  const addSection = () => {
    const idx = state.sections.length;
    dispatch({
      type: 'ADD_SECTION',
      payload: {
        name: SECTION_NAMES[idx] || `Section ${idx + 1}`,
        bpm: state.sections[state.sections.length - 1]?.bpm || 80,
      },
    });
  };

  return (
    <div className={styles.tabs}>
      {state.sections.map(section => (
        <div
          key={section.id}
          className={`${styles.tab} ${section.id === state.activeSectionId ? styles.active : ''}`}
          onClick={() => dispatch({ type: 'SET_ACTIVE_SECTION', payload: section.id })}
        >
          {section.name || 'Untitled'}
          <span className={styles.bpmTag}>{section.bpm}</span>
        </div>
      ))}
      <button className={styles.addBtn} onClick={addSection} title="New section">+</button>
    </div>
  );
}
