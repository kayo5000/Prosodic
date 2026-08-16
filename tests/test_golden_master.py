'''
Golden-master / characterization snapshots for the live /analyze and
/suggest pipelines. See golden_master.py for the pattern and why it exists.

These are intentionally NOT the same verses used throughout the rest of
the test suite and engine __main__ blocks — using a couple of distinct
inputs here means a bug that only shows up on a different verse shape
(shorter lines, no internal rhyme, a different bpm bracket) has a chance
of being caught too, not just whatever the one canonical test verse
happens to exercise.

Caveat, stated rather than hidden: get_suggestions()'s semantic scoring
depends on spaCy being installed (SPACY_AVAILABLE in semantics_engine.py)
— these snapshots were captured with it available. If a future run's
environment doesn't have spaCy, the semantic_score fields will differ for
reasons that are environmental, not a code regression; that's a real
limitation of whole-pipeline golden-master snapshots, not a bug in this
pattern.
'''
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from golden_master import assert_matches_golden
from feedback_engine import assemble_feedback
from suggestion_engine import get_suggestions
from domain.song_context import SongContext

VERSE_A = [
    "And I swear that it's turnt",
    "It all begins with encore cheers",
    "From those wearin' my merch",
    "Fast forward through years of rehearsal",
    "Losin', winnin', bank account thinnin'",
    "Income streams nowhere near as diverse",
    "And though I'm blessed I seen you stressin'",
    "From hearin' the chirps and naysayers",
]

VERSE_B = [
    "Woke up early, sun ain't even out yet",
    "Grinding on the low, ain't nobody gotta doubt it",
    "City lights fading as the morning breaks through",
    "Every single step I take is something new",
]


def test_analyze_verse_a_bpm_80():
    result = assemble_feedback(VERSE_A, SongContext(bpm=80))
    assert_matches_golden('analyze_verse_a_bpm80', result)


def test_analyze_verse_a_bpm_140():
    # Different bpm bracket changes pocket-window math — worth its own
    # snapshot rather than assuming bpm=80 coverage generalizes.
    result = assemble_feedback(VERSE_A, SongContext(bpm=140))
    assert_matches_golden('analyze_verse_a_bpm140', result)


def test_analyze_verse_b_bpm_95():
    result = assemble_feedback(VERSE_B, SongContext(bpm=95))
    assert_matches_golden('analyze_verse_b_bpm95', result)


def test_suggest_verse_a_manual():
    results = get_suggestions(VERSE_A, ctx=SongContext(bpm=80), trigger_mode='manual')
    assert_matches_golden('suggest_verse_a_manual', results)


def test_suggest_verse_b_manual():
    results = get_suggestions(VERSE_B, ctx=SongContext(bpm=95), trigger_mode='manual')
    assert_matches_golden('suggest_verse_b_manual', results)
