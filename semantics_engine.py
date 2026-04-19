'''
Semantics Engine
Layers spaCy word-vector similarity on top of phonetic rhyme scores.
Raises confidence on intentional near-rhymes without overriding phonetics.

Part of the Prosodic hip-hop lyric analysis suite.
'''
from phoneme_engine import rhyme_score

nlp = None
try:
    import spacy
    nlp = spacy.load('en_core_web_md')
    SPACY_AVAILABLE = True
except (ImportError, OSError):
    SPACY_AVAILABLE = False

def semantic_similarity(word_a, word_b):
    if not SPACY_AVAILABLE:
        return 0.0
    token_a = nlp(word_a.lower())
    token_b = nlp(word_b.lower())
    if not token_a.has_vector or not token_b.has_vector:
        return 0.0
    return token_a.similarity(token_b)

def enhanced_rhyme_score(word_a, word_b):
    '''
    Phonetic score is the foundation.
    Semantic similarity raises the ceiling on near rhymes.
    Semantic match alone does not make a rhyme.
    '''
    phonetic = rhyme_score(word_a, word_b)
    if phonetic == 0.0:
        return 0.0
    semantic = semantic_similarity(word_a, word_b)
    bonus = semantic * 0.1
    return min(1.0, phonetic + bonus)

def score_rhyme_pair(word_a, word_b):
    phonetic = rhyme_score(word_a, word_b)
    semantic = semantic_similarity(word_a, word_b)
    enhanced = enhanced_rhyme_score(word_a, word_b)
    return {
        'word_a': word_a,
        'word_b': word_b,
        'phonetic_score': phonetic,
        'semantic_score': semantic,
        'enhanced_score': enhanced
    }

# ── TEST ─────────────────────────────────────────────────
if __name__ == '__main__':
    pairs = [
        ('money', 'nothing'),
        ('worst', 'curse'),
        ('fire', 'higher'),
        ('blessed', 'stressed'),
        ('streets', 'beats'),
    ]
    print('\n=== ENHANCED RHYME SCORES ===')
    print(f'{"PAIR":<25} {"PHONETIC":>10} {"SEMANTIC":>10} {"ENHANCED":>10}')
    print('-' * 60)
    for a, b in pairs:
        r = score_rhyme_pair(a, b)
        pair = f'{a} + {b}'
        print(f'{pair:<25} {r["phonetic_score"]*100:>9.0f}% {r["semantic_score"]*100:>9.0f}% {r["enhanced_score"]*100:>9.0f}%')
