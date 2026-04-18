import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({ baseURL: BASE, timeout: 120000 });

const wrap = async (fn) => {
  try {
    const res = await fn();
    return { data: res.data, error: null };
  } catch (err) {
    const msg = err.response?.data?.error || err.message || 'Unknown error';
    return { data: null, error: msg };
  }
};

export const analyze        = (verse_lines, bpm)          => wrap(() => api.post('/analyze', { verse_lines, bpm }));
export const suggest        = (verse_lines, bpm, trigger, target_word, context_lines, motif_bank) =>
  wrap(() => api.post('/suggest', {
    verse_lines, bpm, trigger_mode: trigger,
    ...(target_word   ? { target_word }   : {}),
    ...(context_lines ? { context_lines } : {}),
    ...(motif_bank    ? { motif_bank }    : {}),
  }));
export const getMoreSuggestions = ()                      => wrap(() => api.get('/suggest/more'));

// Suggest which color families a word phonetically matches.
// families: [{color_id, sample_words}]
export const suggestFamily = (word, families) =>
  wrap(() => api.post('/suggest-family', { word, families }));

// Score every content word in the verse against existing families.
// families: [{color_id, sample_words}]
export const autofill = (verse_lines, families, threshold = 0.75) =>
  wrap(() => api.post('/autofill', { verse_lines, families, threshold }));

// Fire-and-forget — never blocks the UI, never throws
export const recordCorrections = (signals) => {
  api.post('/corrections', { signals }).catch(() => {});
};
