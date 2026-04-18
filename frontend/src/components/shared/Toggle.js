import styles from './Toggle.module.css';

export default function Toggle({ options, value, onChange }) {
  return (
    <div className={styles.toggle}>
      {options.map(opt => (
        <button
          key={opt.value}
          className={`${styles.option} ${value === opt.value ? styles.active : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
