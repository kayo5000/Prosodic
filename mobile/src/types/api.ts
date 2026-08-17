// Shared API types — kept in sync with docs/openapi.yaml (the backend's
// formal contract, sourced from the actual live routes post-Clean-
// Architecture-reorg). Only the fields this app actually reads are
// typed in full; large nested engine output the UI doesn't touch yet
// (density_per_line, cadence_signals, etc.) stays loosely typed rather
// than guessed at in detail here — see openapi.yaml for the backend's
// own disclosure of which fields are exhaustively typed vs. not.

export interface User {
  id: number;
  email: string;
  username: string;
  veil_name: string | null;
  gradient_index: number | null;
  phone: string | null;
  hometown: string | null;
  geo_influences: string[];
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RhymeMapEntry {
  word: string;
  line_index: number;
  syllable_index: number;
  stream_index: number;
  word_index: number;
  char_start: number;
  char_end: number;
  color_id: number;
  is_stressed: boolean;
  on_pocket: boolean;
}

// AnalyzeResponse's fields the UI doesn't consume yet (density_per_line,
// phrase_containers, flow_signature, cadence_signals, perceptual_pattern)
// are typed as `unknown` rather than `any` — forces an explicit type
// assertion/narrowing at the point of use instead of silently allowing
// anything, the moment a screen actually starts reading them.
export interface AnalyzeResponse {
  rhyme_map: RhymeMapEntry[];
  motif_groups: unknown[];
  total_color_families: number;
  density_per_line: unknown[];
  density_summary: {
    internal: number;
    multisyllabic: number;
    motif: number;
  };
  phrase_containers: unknown[];
  flow_signature: unknown;
  cadence_signals: unknown;
  bpm: number;
  line_count: number;
  perceptual_pattern: unknown;
}

export interface Suggestion {
  word: string;
  rhyme_score: number;
  semantic_score: number;
  syllable_count: number;
  syllable_priority: number;
  motif_fit: 'extends existing family' | 'starts new family';
  rhyme_unit: string[];
  thesaurus_score: number;
  composite_score: number;
  star_rating: number;
  reason: string;
  trigger_mode: 'auto' | 'manual';
  rank: number;
  community_uses: number;
  used_before: number;
  concreteness: number | null;
}

export interface SuggestResponse {
  suggestions: Suggestion[];
  count: number;
  trigger_mode: 'auto' | 'manual';
}

export interface VeilMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface VeilChatResponse {
  reply: string;
}

export interface MasteryResponse {
  ready: false;
  reason: string;
  missing: string[];
  data_snapshot: null;
}

// The shape every prosodicApi.ts function actually returns to its
// caller — request()'s own wrapper, not a backend response shape.
export interface ApiResult<T> {
  data: T | null;
  error: string | null;
  status: number | null;
}
