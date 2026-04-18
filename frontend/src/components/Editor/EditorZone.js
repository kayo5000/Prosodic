import { useApp } from '../../state/AppContext';
import WriteEditor from './WriteEditor';
import FreewriteEditor from './FreewriteEditor';
import FreewriteImportView from './FreewriteImportView';
import styles from './EditorZone.module.css';

export default function EditorZone() {
  const { activeSection, state } = useApp();

  return (
    <div className={styles.zone}>
      {activeSection.mode === 'write' ? <WriteEditor /> : <FreewriteEditor />}
      {state.showFreewriteImport && <FreewriteImportView />}
    </div>
  );
}
