import { useApp } from '../../state/AppContext';
import { suggest, getMoreSuggestions } from '../../api/prosodicApi';
import Toggle from '../shared/Toggle';
import SuggestionCard from './SuggestionCard';
import SuggestionSkeleton from './SuggestionSkeleton';
import styles from './SuggestionsPanel.module.css';

const MODE_OPTIONS = [
  { value: 'auto',   label: 'Auto' },
  { value: 'manual', label: 'Manual' },
];

export default function SuggestionsPanel() {
  const { state, dispatch, activeSection } = useApp();

  const handleSuggest = async () => {
    if (!activeSection.lines.length) return;
    dispatch({ type: 'SUGGEST_START' });
    const { data, error } = await suggest(activeSection.lines, activeSection.bpm, 'manual');
    if (data) dispatch({ type: 'SUGGEST_SUCCESS', payload: data.suggestions });
    else { dispatch({ type: 'SUGGEST_FAIL' }); if (error) dispatch({ type: 'SET_GLOBAL_ERROR', payload: error }); }
  };

  const handleMore = async () => {
    dispatch({ type: 'SUGGEST_MORE_START' });
    const { data, error } = await getMoreSuggestions();
    if (data) dispatch({ type: 'SUGGEST_MORE_SUCCESS', payload: data.suggestions });
    else { dispatch({ type: 'SUGGEST_MORE_FAIL' }); if (error) dispatch({ type: 'SET_GLOBAL_ERROR', payload: error }); }
  };

  const suggestions = activeSection.suggestions || [];
  const loading = state.suggestLoading;
  const moreLoading = state.suggestMoreLoading;
  const hasMore = suggestions.length > 0 && suggestions.length < 20;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Suggestions</span>
        <div className={styles.actions}>
          <Toggle
            options={MODE_OPTIONS}
            value={activeSection.suggestMode}
            onChange={v => dispatch({ type: 'SET_SUGGEST_MODE', payload: v })}
          />
          {activeSection.suggestMode === 'manual' && (
            <button className={styles.suggestBtn} onClick={handleSuggest} disabled={loading}>
              {loading ? '…' : 'Run'}
            </button>
          )}
        </div>
      </div>

      <div className={styles.cards}>
        {loading ? (
          <SuggestionSkeleton count={8} />
        ) : suggestions.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>◈</div>
            {activeSection.suggestMode === 'auto'
              ? 'Suggestions appear as you write'
              : 'Hit Run to generate rhyme options'}
          </div>
        ) : (
          suggestions.map((s, i) => (
            <SuggestionCard key={`${s.word}-${i}`} suggestion={s} index={i} />
          ))
        )}
        {moreLoading && <SuggestionSkeleton count={3} />}
      </div>

      {!loading && hasMore && (
        <button className={styles.moreBtn} onClick={handleMore} disabled={moreLoading}>
          {moreLoading ? 'Loading…' : 'Show more  →'}
        </button>
      )}
    </div>
  );
}
