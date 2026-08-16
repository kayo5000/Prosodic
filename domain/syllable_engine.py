'''
Syllable Engine
Splits words into syllables using vowel-boundary detection on CMU phonemes.
Produces the flat syllable stream consumed by all downstream engines.

Part of the Prosodic hip-hop lyric analysis suite.
'''
import re
from domain.phoneme_engine import get_phonemes

_VOWEL_GROUP = re.compile(r'[aeiou]+')


def _estimate_syllable_count_from_letters(word):
    '''
    Last-resort syllable-count estimate from spelling alone — the third
    fallback tier below CMU dict lookup and G2P (see get_syllables): a
    word neither can handle (out-of-vocabulary AND g2p_en unavailable or
    failed) previously made get_syllables() return None, which
    syllabify_line() then treated as "skip this word entirely" — not just
    undercounting its syllables, but silently erasing it from the whole
    syllable stream (wrong word_index/stream_index for everything after
    it, invisible to every downstream engine). A rough count is a much
    smaller error than a word that quietly stops existing.

    Vowel-group heuristic — same vowel set (aeiou, no 'y') already used by
    syllable_char_ranges() below, for consistency with this file's
    existing convention rather than introducing a second one. Not a
    phonetic result: it cannot produce real ARPABET phonemes, so rhyme
    detection is correctly still blind to these syllables (empty
    'phonemes' list — get_rhyme_unit_from_phonemes() already treats that
    as "no rhyme data" rather than guessing). This function only protects
    syllable count / density / pocket placement from an OOV word going
    silently missing, not rhyme quality.
    '''
    w = word.lower().strip()
    if not w:
        return 0  # nothing here at all (e.g. a token that was pure punctuation)
    if not w.isalpha():
        return 1  # has content but no letters to group (e.g. a number) — one best guess
    if w.endswith('e') and not w.endswith('le') and len(w) > 1:
        w = w[:-1]
    groups = _VOWEL_GROUP.findall(w)
    return max(1, len(groups))


def get_syllables(word):
    '''
    Returns list of syllables.
    Each syllable is a dict:
      index       — position in word (0-based)
      phonemes    — list of phonemes in this syllable (empty if estimated)
      stress      — 0, 1, or 2 (always 0 if estimated — no real basis to
                    guess stress from spelling alone)
      is_stressed — True if stress >= 1
      estimated   — True only when CMU and G2P both had nothing and this
                    is a letters-based fallback count instead of a real
                    phonetic breakdown (see
                    _estimate_syllable_count_from_letters). Absent
                    (falsy via .get()) on normal syllables — downstream
                    code that cares about degraded confidence can check
                    for it; code that doesn't can ignore it exactly as
                    before.
    '''
    phonemes = get_phonemes(word)
    if not phonemes:
        count = _estimate_syllable_count_from_letters(word)
        return [
            {
                'index': i,
                'phonemes': [],
                'stress': 0,
                'is_stressed': False,
                'estimated': True,
            }
            for i in range(count)
        ]
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
