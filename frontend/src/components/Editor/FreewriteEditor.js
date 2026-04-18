import { useApp } from '../../state/AppContext';
import styles from './FreewriteEditor.module.css';

export default function FreewriteEditor() {
  const { activeSection, dispatch } = useApp();

  const handleChange = (e) => {
    dispatch({ type: 'SET_RAW_FREEWRITE', payload: e.target.value });
  };

  const handleImport = () => {
    dispatch({ type: 'SET_FREEWRITE_IMPORT', payload: true });
  };

  return (
    <div className={styles.container}>
      <textarea
        className={styles.textarea}
        value={activeSection.rawFreewrite}
        onChange={handleChange}
        placeholder="Write freely — don't think about structure yet. Use blank lines to separate sections. Import when ready."
        spellCheck={false}
      />
      <div className={styles.footer}>
        <button
          className={styles.importBtn}
          onClick={handleImport}
          disabled={!activeSection.rawFreewrite.trim()}
        >
          Import to Write Mode →
        </button>
      </div>
    </div>
  );
}
