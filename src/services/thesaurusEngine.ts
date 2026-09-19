export interface ThesaurusResult {
  word: string;
  found: boolean;
  synonyms: string[];
}

export interface BridgeResult {
  wordA: string;
  wordB: string;
  directBridges: string[];
}

/**
 * Remote Thesaurus Engine
 * Replaces the 171MB local moby_thesaurus.db with the free Datamuse API.
 */

export async function lookup(word: string): Promise<ThesaurusResult> {
  const normalized = word.trim().toLowerCase();
  try {
    const res = await fetch(`https://api.datamuse.com/words?ml=${encodeURIComponent(normalized)}&max=100`);
    const data = await res.json();
    
    if (!data || data.length === 0) {
      return { word: normalized, found: false, synonyms: [] };
    }

    const synonyms = data.map((d: any) => d.word);
    return { word: normalized, found: true, synonyms };
  } catch (error) {
    console.warn(`Thesaurus API unavailable - lookup("${normalized}") degraded to not-found`);
    return { word: normalized, found: false, synonyms: [] };
  }
}

export async function findBridgeWords(wordA: string, wordB: string, limit: number = 10): Promise<BridgeResult> {
  const normA = wordA.trim().toLowerCase();
  const normB = wordB.trim().toLowerCase();
  
  try {
    const [resA, resB] = await Promise.all([
      lookup(normA),
      lookup(normB)
    ]);
    
    const synA = new Set(resA.synonyms.map(s => s.toLowerCase()));
    const synB = new Set(resB.synonyms.map(s => s.toLowerCase()));
    
    const directBridges = [...synA].filter(x => synB.has(x)).slice(0, limit);
    
    return {
      wordA: normA,
      wordB: normB,
      directBridges
    };
  } catch (error) {
    return { wordA: normA, wordB: normB, directBridges: [] };
  }
}
