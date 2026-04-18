'''
test_family_engine.py
Ground-truth validation for perceptual_family_engine and pattern_reader_engine.

Standalone script — not part of the main test suite, not imported by any engine.
Run: python test_family_engine.py

All five assertions must pass before any further engine changes are made.
'''
import perceptual_family_engine
import pattern_reader_engine
from perceptual_family_engine import score_unregistered_words

# ── Test verse ────────────────────────────────────────────────────────────────

TEST_VERSE = [
    "I persevered through the worst, my thirst to adhere is a curse",
    "My life, I see it in reverse, I first appeared in a hearse",
    "The driver steered to the church",
    "My grandkids carried the coffin to the altar as they burst into tears from their shirts",
    "The tears rise to the sides to their face and into their eyes, it's piercin' with hurt",
    "Fast-forward 60 years, I got verse of the year, my purpose is clear, it's to murk",
    "Whoever dare flirt with death",
    "The best alive and what you now hear is the work",
    "The inspiration was rare and in spurts, but when it's there, I'm immersed",
    "My experience of bein' a parent, dispersed",
    "Watching my son disappear as I stare at his birth",
    "And he returns to the womb, wifey stomach growin' greater in girth",
    "And then declinin' every time we come here, to the nurse",
    "With each day that passes, I could feel my career comin' first",
    "Do I? Took the wedding ring off her finger",
    "And now I'm single, walking up the aisle backwards to an era of dirt",
    "Fallin' clubs tipsy with a bitch, I see clear through her skirt",
    "The cameras be snappin', blogs be yappin', so I'm careful, alert",
    "Walkin' to my section, whisper right in my ear and we flirt",
    "We part ways, I see it from a distance, she stares with a smirk",
    "Cheers to the perks with the squad, we live for the search of new hos",
    "Lusty, quick to fuck me, unaware of their worth",
    "We leave the club, drive to the show and I swear that it's turnt",
    "It all begins with encore cheers from those wearin' my merch",
    "Fast-forward through years of rehearsal, losin', winnin'",
    "Bank account thinnin', income streams nowhere near as diverse",
    "And though I'm blessed, I see me stressin' from hearin' the chirps",
    "Of naysayers who, only days later, I don't care to convert",
    "On cloud nine, now signed to my hero",
    "One of the so-called kings of this rap thing that I swear to usurp",
    "Decade later, momma cut on the cable",
    "My motivation to be greater ends the moment I peer in her purse",
    "I'm growing shorter, pampers cover my hind quarters",
    "I watch my father walk back in my life and it clears up a hurt",
    "I couldn't explain, momma gives me my name",
    "Then hands me over to the doctor and I watch as my spirit reverts",
    "Na, na, na, then I'm no longer here on this Earth",
]

DIVIDER     = '─' * 72
SUBDIV      = '· · ·'


def _header(title):
    print(f'\n{DIVIDER}')
    print(f'  {title}')
    print(DIVIDER)


def _pass(label):
    print(f'  [PASS]  {label}')


def _fail(label, detail=''):
    suffix = f'  →  {detail}' if detail else ''
    print(f'  [FAIL]  {label}{suffix}')


# ── Run analysis ──────────────────────────────────────────────────────────────

tagged  = perceptual_family_engine.tag_verse_words(TEST_VERSE)
pattern = pattern_reader_engine.read_patterns(tagged, TEST_VERSE)

# Unregistered words for R_FAMILY — called independently so Section C can
# display them before the assertion block, matching what read_patterns absorbed.
unregistered_r = score_unregistered_words(tagged, 'R_FAMILY')
unregistered_words = {u['word'] for u in unregistered_r}

# ── SECTION A — Tag output ────────────────────────────────────────────────────

_header('SECTION A  —  Tag output  (R_FAMILY entries)')

r_tagged = [t for t in tagged if t['family'] == 'R_FAMILY']
if not r_tagged:
    print('  (none found)')
else:
    col = f'  {"WORD":<16}  {"SYLL":<10}  {"LINE":>4}  STRESSED'
    print(col)
    print(f'  {"─"*16}  {"─"*10}  {"─"*4}  {"─"*8}')
    for t in r_tagged:
        stressed = 'yes' if t['is_stressed'] else 'no'
        print(f'  {t["word"]:<16}  {t["syllable_text"]:<10}  {t["line_index"]:>4}  {stressed}')

print(f'\n  Total R_FAMILY tagged syllables: {len(r_tagged)}')

# ── SECTION B — Pattern result ────────────────────────────────────────────────

_header('SECTION B  —  Pattern result')

r_detail = pattern['family_map'].get('R_FAMILY', {})

print(f'  dominant_families  : {pattern["dominant_families"]}')
print(f'  parallel_pocketing : {pattern["parallel_pocketing"]}')
print(f'  active_families    : {pattern["active_families"]}')
print()

if r_detail:
    print(f'  R_FAMILY activity_score    : {r_detail["activity_score"]}')
    print(f'  R_FAMILY stress_hits       : {r_detail["stress_hits"]}')
    print(f'  R_FAMILY boundary words    : {r_detail["boundary_words_found"]}')
    print(f'  R_FAMILY line_distribution : {r_detail["line_distribution"]}')
    print(f'  R_FAMILY line count        : {len(r_detail["line_distribution"])}')
    print()
    member_words = [m['word'] for m in r_detail['members']]
    print(f'  R_FAMILY members ({len(member_words)}): {member_words}')
else:
    print('  R_FAMILY not present in family_map.')

print()
print(f'  {SUBDIV}')
print(f'  describe_pattern():')
print(f'    {pattern_reader_engine.describe_pattern(pattern)}')

# ── SECTION C — Unregistered word catch ───────────────────────────────────────

_header('SECTION C  —  Unregistered word catch for R_FAMILY  (score >= 0.70)')

if not unregistered_r:
    print('  (none)')
else:
    col = f'  {"WORD":<16}  {"LINE":>4}  {"SCORE":>6}'
    print(col)
    print(f'  {"─"*16}  {"─"*4}  {"─"*6}')
    for u in unregistered_r:
        print(f'  {u["word"]:<16}  {u["line_index"]:>4}  {u["score"]:>6.3f}')

print(f'\n  Total unregistered catches: {len(unregistered_r)}')

# ── Assertions ────────────────────────────────────────────────────────────────

_header('ASSERTIONS')

# 1 — R_FAMILY is dominant
if 'R_FAMILY' in pattern['dominant_families']:
    _pass('ASSERT 1: "R_FAMILY" in dominant_families')
else:
    _fail('ASSERT 1: "R_FAMILY" in dominant_families',
          f'got {pattern["dominant_families"]}')

# 2 — Activity score meets threshold
if r_detail:
    score = r_detail['activity_score']
    if score >= 0.60:
        _pass(f'ASSERT 2: R_FAMILY activity_score >= 0.60  (got {score:.4f})')
    else:
        _fail('ASSERT 2: R_FAMILY activity_score >= 0.60',
              f'got {score:.4f}')
else:
    _fail('ASSERT 2: R_FAMILY activity_score >= 0.60', 'R_FAMILY absent from family_map')

# 3 — Line spread
if r_detail:
    n_lines = len(r_detail['line_distribution'])
    if n_lines >= 15:
        _pass(f'ASSERT 3: R_FAMILY line_distribution length >= 15  (got {n_lines})')
    else:
        _fail('ASSERT 3: R_FAMILY line_distribution length >= 15',
              f'got {n_lines}  →  {r_detail["line_distribution"]}')
else:
    _fail('ASSERT 3: R_FAMILY line_distribution length >= 15', 'R_FAMILY absent from family_map')

# 4 — No false-positive parallel pocketing
if not pattern['parallel_pocketing']:
    _pass('ASSERT 4: parallel_pocketing is False')
else:
    second = pattern['dominant_families'][1] if len(pattern['dominant_families']) > 1 else '?'
    second_score = pattern['family_map'].get(second, {}).get('activity_score', 0)
    _fail('ASSERT 4: parallel_pocketing is False',
          f'R_FAMILY={r_detail.get("activity_score", "?")}  '
          f'{second}={second_score:.4f}  (false positive)')

# 5 — score_unregistered_words catches genuinely unregistered R_FAMILY words.
# The target words (murk/spurts/girth/turnt/merch) were graduated to the registry
# after the original test was written, so we probe directly with 'universe'
# (scores 0.75 against R_FAMILY anchors and is confirmed absent from WORD_TO_FAMILY).
probe_tagged = perceptual_family_engine.tag_verse_words(['universe'])
probe_result = score_unregistered_words(probe_tagged, 'R_FAMILY')
probe_words  = {u['word'] for u in probe_result}
if 'universe' in probe_words:
    s = next(u['score'] for u in probe_result if u['word'] == 'universe')
    _pass(f'ASSERT 5: score_unregistered_words catches unregistered R_FAMILY word  (universe score={s:.3f})')
else:
    _fail('ASSERT 5: score_unregistered_words should catch "universe" (score >= 0.70 against R_FAMILY)',
          f'probe returned: {probe_words}')

# ── Summary ───────────────────────────────────────────────────────────────────

print(f'\n{DIVIDER}')
