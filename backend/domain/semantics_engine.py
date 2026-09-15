'''
Semantics Engine
Layers spaCy word-vector similarity on top of phonetic rhyme scores.
Raises confidence on intentional near-rhymes without overriding phonetics.

Part of the Prosodic hip-hop lyric analysis suite.
'''
import logging

log = logging.getLogger(__name__)

nlp = None
try:
    import spacy
    nlp = spacy.load('en_core_web_md')
    SPACY_AVAILABLE = True
    log.info('semantics_engine: spacy en_core_web_md loaded — semantic rhyme scoring active')
except (ImportError, OSError) as e:
    SPACY_AVAILABLE = False
    log.warning(
        'semantics_engine: spacy/en_core_web_md unavailable (%s) — semantic rhyme '
        'scoring is DEGRADED. All semantic_similarity() calls will return 0.0.',
        e,
    )

def semantic_similarity(word_a, word_b):
    if not SPACY_AVAILABLE:
        return 0.0
    # SPACY_AVAILABLE and nlp are always set together above (both True/
    # non-None or both False/None) — the early return just above
    # guarantees nlp is not None from here down.
    assert nlp is not None
    # make_doc() only tokenizes (vectors come straight from vocab) — it skips
    # the tagger/parser/NER pipeline that nlp() would otherwise run on every
    # call. With suggestion_engine checking this against every phonetic
    # candidate (can be thousands for common vowels), nlp() made /suggest
    # effectively hang; make_doc() is the same vectors, orders of magnitude faster.
    token_a = nlp.make_doc(word_a.lower())
    token_b = nlp.make_doc(word_b.lower())
    if not token_a.has_vector or not token_b.has_vector:
        return 0.0
    return token_a.similarity(token_b)

# ── TEST ─────────────────────────────────────────────────
if __name__ == '__main__':
    pairs = [
        ('money', 'nothing'),
        ('worst', 'curse'),
        ('fire', 'higher'),
        ('blessed', 'stressed'),
        ('streets', 'beats'),
    ]
    print('\n=== SEMANTIC SIMILARITY ===')
    print(f'{"PAIR":<25} {"SEMANTIC":>10}')
    print('-' * 40)
    for a, b in pairs:
        sim = semantic_similarity(a, b)
        pair = f'{a} + {b}'
        print(f'{pair:<25} {sim*100:>9.0f}%')
