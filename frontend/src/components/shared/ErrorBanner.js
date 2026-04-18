import { useApp } from '../../state/AppContext';
import styles from './ErrorBanner.module.css';

export default function ErrorBanner() {
  const { state, dispatch } = useApp();

  if (state.backendOnline === false) {
    return (
      <div className={styles.wrap}>
        <div className={`${styles.banner} ${styles.offline}`}>
          <div className={styles.dot} />
          <span className={styles.msg}>Backend offline — run <code>python api.py</code> at localhost:5000</span>
        </div>
      </div>
    );
  }

  if (!state.globalError) return null;

  return (
    <div className={styles.wrap}>
      <div className={styles.banner}>
        <div className={styles.dot} />
        <span className={styles.msg}>{state.globalError}</span>
        <button className={styles.close} onClick={() => dispatch({ type: 'CLEAR_ERROR' })}>×</button>
      </div>
    </div>
  );
}
