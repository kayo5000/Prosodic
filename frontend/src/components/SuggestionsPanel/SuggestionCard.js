import styles from './SuggestionCard.module.css';

function Stars({ n }) {
  return (
    <div className={styles.stars}>
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`${styles.star} ${i <= n ? styles.full : styles.empty}`}>
          {i <= n ? '★' : '☆'}
        </span>
      ))}
    </div>
  );
}

export default function SuggestionCard({ suggestion, index }) {
  const { word, star_rating, rhyme_score, semantic_score, syllable_count, motif_fit, reason } = suggestion;
  const rhyme = String(rhyme_score).replace('%', '');
  const theme = String(semantic_score).replace('%', '');
  const extends_fam = String(motif_fit).includes('extends');

  return (
    <div className={styles.card} style={{ animationDelay: `${index * 30}ms` }}>
      <div className={styles.top}>
        <span className={styles.word}>{word}</span>
        <Stars n={star_rating || 0} />
      </div>
      <div className={styles.meta}>
        <span className={`${styles.chip} ${styles.rhyme}`}>rhyme {rhyme}%</span>
        <span className={`${styles.chip} ${styles.theme}`}>theme {theme}%</span>
        <span className={`${styles.chip} ${styles.syl}`}>{syllable_count}syl</span>
        <span className={`${styles.badge} ${extends_fam ? styles.extends : styles.newFamily}`}>
          {extends_fam ? 'extends' : 'new family'}
        </span>
      </div>
      {reason && <div className={styles.reason}>{reason}</div>}
    </div>
  );
}
