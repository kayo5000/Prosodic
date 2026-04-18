import styles from './SuggestionSkeleton.module.css';

function Card() {
  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <div className={`${styles.s} ${styles.word}`} />
        <div className={`${styles.s} ${styles.stars}`} />
      </div>
      <div className={styles.meta}>
        <div className={`${styles.s} ${styles.chip}`} style={{ width: 62 }} />
        <div className={`${styles.s} ${styles.chip}`} style={{ width: 54 }} />
        <div className={`${styles.s} ${styles.chip}`} style={{ width: 34 }} />
      </div>
      <div className={styles.line}>
        <div className={`${styles.lineFill}`} style={{ width: '85%' }} />
      </div>
    </div>
  );
}

export default function SuggestionSkeleton({ count = 5 }) {
  return <>{Array.from({ length: count }).map((_, i) => <Card key={i} />)}</>;
}
