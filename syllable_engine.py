'''
Syllable Engine
Splits words into syllables using vowel-boundary detection on CMU phonemes.
Produces the flat syllable stream consumed by all downstream engines.

Part of the Prosodic hip-hop lyric analysis suite.
'''
from phoneme_engine import get_phonemes

def get_syllables(word):
    '''
    Returns list of syllables.
    Each syllable is a dict:
      index     — position in word (0-based)
      phonemes  — list of phonemes in this syllable
      stress    — 0, 1, or 2
      is_stressed — True if stress >= 1
    '''
    phonemes = get_phonemes(word)
    if not phonemes:
        return None
    syllables = []
    current = []
    for p in phonemes:
        current.append(p)
        if p[-1].isdigit():  # vowel = syllable boundary
            stress_val = int(p[-1])
            syllables.append({
                'index': len(syllables),
                'phonemes': current[:],
                'stress': stress_val,
                'is_stressed': stress_val >= 1
            })
            current = []
    # Append trailing consonants to last syllable
    if current and syllables:
        syllables[-1]['phonemes'].extend(current)
    return syllables

def get_syllable_count(word):
    sylls = get_syllables(word)
    return len(sylls) if sylls else 0

def syllable_char_ranges(word, sylls):
    '''
    Returns character ranges (start, end) for each syllable in word.

    sylls: list of syllable dicts from get_syllables() (must have 'phonemes' key).
    word:  clean (letters + apostrophe) form of the word.

    Strategy: vowel-group midpoint heuristic for 2+ inter-vowel consonants
    (same as before), but when exactly 1 consonant sits between two vowel
    groups it is treated as a coda of the preceding syllable rather than
    an onset of the following one.  This fixes the common "tai|nab|le"
    class of errors without regressing on geminate cases ("win|ning", "bet|ter").
    '''
    n = len(word)
    num_syllables = len(sylls)
    if num_syllables <= 0:
        return []
    if num_syllables == 1:
        return [(0, n)]

    w_lower = word.lower()
    vowel_set = set('aeiou')

    # Find the start index of each vowel group (run of vowels)
    vowel_starts = []
    in_vowel = False
    for i, ch in enumerate(w_lower):
        if ch in vowel_set:
            if not in_vowel:
                vowel_starts.append(i)
            in_vowel = True
        else:
            in_vowel = False

    # Fall back to equal division if not enough vowel groups
    if len(vowel_starts) < num_syllables:
        chunk = n / num_syllables
        return [(int(i * chunk), min(n, int((i + 1) * chunk)))
                for i in range(num_syllables)]

    anchors = vowel_starts[:num_syllables]

    def _vowel_group_end(pos):
        '''Index of the first non-vowel char after the vowel group starting at pos.'''
        while pos < n and w_lower[pos] in vowel_set:
            pos += 1
        return pos

    ranges = []
    for i in range(num_syllables):
        start = 0 if i == 0 else ranges[-1][1]
        if i == num_syllables - 1:
            end = n
        else:
            vend  = _vowel_group_end(anchors[i])   # first non-vowel after this nucleus
            inter = anchors[i + 1] - vend           # consonant chars before next vowel
            if inter == 1:
                # Single consonant between two vowels: treat as coda of this syllable.
                # Midpoint would land before it and wrongly assign it as the next onset.
                end = vend + 1
            else:
                # 2+ consonants: original midpoint splits them between coda and onset.
                end = (anchors[i] + anchors[i + 1]) // 2 + 1
        ranges.append((start, end))
    return ranges


def syllabify_line(line):
    '''
    Takes a full line of lyrics.
    Returns flat list of syllables with word_index, word, char_start, char_end.
    char_start/char_end are character offsets within the clean word.
    '''
    words = line.split()
    stream = []
    for wi, word in enumerate(words):
        clean = word.strip('.,!?;:"-')
        sylls = get_syllables(clean)
        if sylls:
            ranges = syllable_char_ranges(clean, sylls)
            for i, s in enumerate(sylls):
                s['word'] = clean
                s['word_index'] = wi
                s['stream_index'] = len(stream)
                char_start, char_end = ranges[i] if i < len(ranges) else (0, len(clean))
                s['char_start'] = char_start
                s['char_end'] = char_end
                stream.append(s)
    return stream

# ── Test Block ───────────────────────────────────────────
if __name__ == '__main__':
    test_words = ['reverse', 'stressing', 'motivation', 'blessed', 'fire']
    print('\n=== SYLLABLE BREAKDOWN ===')
    for word in test_words:
        sylls = get_syllables(word)
        count = get_syllable_count(word)
        print(f'{word:<16} {count} syllable(s)')
        if sylls:
            for s in sylls:
                marker = '* STRESSED' if s['is_stressed'] else 'o unstressed'
                print(f'  [{s["index"]}] {str(s["phonemes"]):<30} {marker}')
        print()

    print('\n=== SYLLABLE STREAM (full line) ===')
    line = "And though I'm blessed I seen you stressin'"
    stream = syllabify_line(line)
    print(f'Line: {line}')
    print(f'Total syllables: {len(stream)}')
    print()
    for s in stream:
        marker = '*' if s['is_stressed'] else 'o'
        print(f'  {marker} [{s["stream_index"]}] {s["word"]:<14} syll {s["index"]} stress={s["stress"]}')
