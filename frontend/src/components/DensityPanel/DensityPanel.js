import { useApp } from '../../state/AppContext';
import styles from './DensityPanel.module.css';

const BARS = [
  { key: 'internal',     label: 'Internal Rhyme',   color: 'var(--bar-internal)' },
  { key: 'multisyllabic', label: 'Multisyllabic',   color: 'var(--bar-multi)' },
  { key: 'motif',        label: 'Motif Recurrence', color: 'var(--bar-motif)' },
];

function DensityBar({ label, value, color }) {
  const pct = Math.min(100, Math.max(0, Math.round(value || 0)));
  return (
    <div className={styles.bar}>
      <div className={styles.barHeader}>
        <span className={styles.label}>{label}</span>
        <span className={styles.pct} style={{ color }}>{pct}%</span>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function DensityPanel() {
  const { activeSection } = useApp();
  const density = activeSection.analysis?.density_summary || {};

  return (
    <div className={styles.panel}>
      {BARS.map(bar => (
        <DensityBar
          key={bar.key}
          label={bar.label}
          value={density[bar.key]}
          color={bar.color}
        />
      ))}
    </div>
  );
}
