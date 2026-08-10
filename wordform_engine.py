'''
Wordform Engine
Finds words that share a root/stem with a given word — for polyptoton
(repeating a word in different grammatical forms, e.g. gravitate -> gravitation
-> gravitational) and other root-based wordplay.

Part of the Prosodic hip-hop lyric analysis suite.
'''
from collections import defaultdict
from nltk.stem import PorterStemmer
from phoneme_engine import CMU as _CMU

_stemmer = PorterStemmer()

# Built once at import — stem -> [word, ...]
_STEM_INDEX = defaultdict(list)
for _word in _CMU:
    if _word.isalpha():
        _STEM_INDEX[_stemmer.stem(_word)].append(_word)


def find_same_root_words(word: str, limit: int = 10) -> list[str]:
    '''
    Returns other words sharing this word's stem — e.g. 'gravitate' ->
    ['gravitated', 'gravitates', 'gravitating', 'gravitation', 'gravitational'].
    Shortest matches first (usually the most usable in a bar).
    '''
    word = word.strip().lower()
    stem = _stemmer.stem(word)
    candidates = [w for w in _STEM_INDEX.get(stem, []) if w != word]
    candidates.sort(key=len)
    return candidates[:limit]
