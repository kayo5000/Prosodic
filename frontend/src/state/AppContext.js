import React, { createContext, useContext, useReducer, useCallback } from 'react';

const AppContext = createContext(null);

const newSection = (overrides = {}) => ({
  id: crypto.randomUUID(),
  name: '',
  bpm: 80,
  mode: 'write',          // 'write' | 'freewrite'
  lines: [],
  rawFreewrite: '',
  analysis: null,
  suggestions: [],
  layer1Suggestions: [],
  suggestMode: 'auto',    // 'auto' | 'manual'
  targetWord: null,        // word currently targeted for suggestions
  motifBank: {},           // { clusterName: [word, ...] } — user-defined thematic word groups
  sectionColor: null,      // palette slot 1-44, or null = default white
  ...overrides,
});

const initialState = {
  sections: [newSection({ name: 'Verse 1' })],
  activeSectionId: null,  // set to first section id in init
  settingsOpen: false,
  backendOnline: null,    // null=unknown, true, false
  globalError: null,
  analyzeLoading: false,
  suggestLoading: false,
  suggestMoreLoading: false,
  showFreewriteImport: false,
};
initialState.activeSectionId = initialState.sections[0].id;

function reducer(state, action) {
  const updateActive = (updater) => ({
    ...state,
    sections: state.sections.map(s =>
      s.id === state.activeSectionId ? { ...s, ...updater(s) } : s
    ),
  });

  switch (action.type) {

    // ── Backend ──────────────────────────────────────────────
    case 'SET_BACKEND_ONLINE':
      return { ...state, backendOnline: action.payload };
    case 'SET_GLOBAL_ERROR':
      return { ...state, globalError: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, globalError: null };

    // ── Sections ─────────────────────────────────────────────
    case 'SET_ACTIVE_SECTION':
      return { ...state, activeSectionId: action.payload };
    case 'ADD_SECTION': {
      const s = newSection(action.payload);
      return {
        ...state,
        sections: [...state.sections, s],
        activeSectionId: s.id,
      };
    }
    case 'SET_SECTION_NAME':
      return updateActive(() => ({ name: action.payload }));
    case 'RENAME_SECTION': {
      const { id, name } = action.payload;
      return {
        ...state,
        sections: state.sections.map(s => s.id === id ? { ...s, name } : s),
      };
    }
    case 'SET_SECTION_COLOR': {
      const { id, color } = action.payload;
      return {
        ...state,
        sections: state.sections.map(s => s.id === id ? { ...s, sectionColor: color } : s),
      };
    }
    case 'DELETE_SECTION': {
      if (state.sections.length <= 1) return state;
      const delId = action.payload;
      const idx = state.sections.findIndex(s => s.id === delId);
      const remaining = state.sections.filter(s => s.id !== delId);
      const newActive = state.activeSectionId === delId
        ? (remaining[Math.max(0, idx - 1)]?.id || remaining[0]?.id)
        : state.activeSectionId;
      return { ...state, sections: remaining, activeSectionId: newActive };
    }
    case 'REORDER_SECTIONS': {
      const { fromId, toId } = action.payload;
      const from = state.sections.findIndex(s => s.id === fromId);
      const to = state.sections.findIndex(s => s.id === toId);
      if (from < 0 || to < 0 || from === to) return state;
      const sections = [...state.sections];
      const [moved] = sections.splice(from, 1);
      sections.splice(to, 0, moved);
      return { ...state, sections };
    }
    case 'SET_BPM':
      return updateActive(() => ({ bpm: action.payload }));
    case 'SET_EDITOR_MODE':
      return updateActive(() => ({ mode: action.payload }));
    case 'SET_SECTION_LINES':
      return updateActive(() => ({ lines: action.payload }));
    case 'SET_RAW_FREEWRITE':
      return updateActive(() => ({ rawFreewrite: action.payload }));
    case 'SET_SUGGEST_MODE':
      return updateActive(() => ({ suggestMode: action.payload }));
    case 'SET_TARGET_WORD':
      return updateActive(() => ({ targetWord: action.payload, suggestions: [] }));
    case 'SET_MOTIF_BANK':
      return updateActive(() => ({ motifBank: action.payload }));

    // ── Analysis ─────────────────────────────────────────────
    case 'ANALYZE_START':
      return { ...state, analyzeLoading: true };
    case 'ANALYZE_SUCCESS':
      return {
        ...updateActive(() => ({ analysis: action.payload })),
        analyzeLoading: false,
      };
    case 'ANALYZE_FAIL':
      return { ...state, analyzeLoading: false };

    // ── Suggestions ──────────────────────────────────────────
    case 'SUGGEST_START':
      return { ...state, suggestLoading: true };
    case 'SUGGEST_SUCCESS':
      return {
        ...updateActive(() => ({ suggestions: action.payload })),
        suggestLoading: false,
      };
    case 'SUGGEST_FAIL':
      return { ...state, suggestLoading: false };
    case 'SUGGEST_MORE_START':
      return { ...state, suggestMoreLoading: true };
    case 'SUGGEST_MORE_SUCCESS':
      return {
        ...updateActive(s => ({ suggestions: [...s.suggestions, ...action.payload] })),
        suggestMoreLoading: false,
      };
    case 'SUGGEST_MORE_FAIL':
      return { ...state, suggestMoreLoading: false };

    // ── UI ───────────────────────────────────────────────────
    case 'SET_SETTINGS_OPEN':
      return { ...state, settingsOpen: action.payload };
    case 'SET_FREEWRITE_IMPORT':
      return { ...state, showFreewriteImport: action.payload };

    // ── Freewrite import ─────────────────────────────────────
    case 'IMPORT_FREEWRITE':
      return {
        ...updateActive(() => ({
          mode: 'write',
          lines: action.payload.lines,
          bpm: action.payload.bpm,
          rawFreewrite: '',
        })),
        showFreewriteImport: false,
      };

    default:
      return state;
  }
}

export function AppProvider({ children, getColor, resetPalette }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const activeSection = state.sections.find(s => s.id === state.activeSectionId)
    || state.sections[0];

  const dispatchAction = useCallback(dispatch, [dispatch]);

  return (
    <AppContext.Provider value={{ state, dispatch: dispatchAction, activeSection, getColor, resetPalette }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
