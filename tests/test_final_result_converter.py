'''
Tests for final_result_converter.py

Covers: per-engine scale conversion is correct (using each engine's real
registered scale, not made-up numbers), polarity inversion actually flips
values instead of just passing them through, clipping behavior, the
fail-loud unregistered-source guard, and a byte-for-byte regression proof
that wiring the converter into suggestion_engine.py's composite score
didn't change its output.
'''
import pytest

from domain.final_result_converter import normalize, normalize_raw, SCALES


# ── normalize_raw() — the core conversion ───────────────────────────────

def test_normal_polarity_at_bounds():
    assert normalize_raw(0.0, 0.0, 1.0, 'normal') == 0.0
    assert normalize_raw(1.0, 0.0, 1.0, 'normal') == 1.0


def test_normal_polarity_midpoint():
    assert normalize_raw(50.0, 0.0, 100.0, 'normal') == pytest.approx(0.5)


def test_inverted_polarity_actually_flips_not_passes_through():
    '''
    The core proof Khris asked for: a deliberately inverted-polarity
    source (e.g. an edit-distance-style metric where LOWER raw = a
    STRONGER signal) must come out flipped, not just rescaled. If this
    module only rescaled without ever checking polarity, low-raw would
    stay low after conversion — this test fails that way on purpose so a
    future refactor can't silently drop the flip.
    '''
    # A hypothetical "distance to target" metric, raw range 0-10, where
    # 0 (closest) is the strongest signal and 10 (furthest) is the weakest.
    closest  = normalize_raw(0.0,  0.0, 10.0, 'inverted')
    furthest = normalize_raw(10.0, 0.0, 10.0, 'inverted')
    midpoint = normalize_raw(5.0,  0.0, 10.0, 'inverted')

    assert closest == 1.0,  'lowest raw value must become the STRONGEST (1.0) signal'
    assert furthest == 0.0, 'highest raw value must become the WEAKEST (0.0) signal'
    assert midpoint == pytest.approx(0.5)

    # Directly contrast against normal polarity on the identical raw range —
    # inverted and normal must produce opposite results for the same inputs.
    normal_closest  = normalize_raw(0.0,  0.0, 10.0, 'normal')
    normal_furthest = normalize_raw(10.0, 0.0, 10.0, 'normal')
    assert closest  != normal_closest
    assert furthest != normal_furthest
    assert closest  == normal_furthest
    assert furthest == normal_closest


def test_clip_clamps_out_of_range_values():
    # A raw value slightly below raw_min (e.g. a spaCy cosine similarity
    # that dips just under 0.0) clips to 0.0, not a negative fraction.
    assert normalize_raw(-0.02, 0.0, 1.0, 'normal', clip=True) == 0.0
    assert normalize_raw(1.05, 0.0, 1.0, 'normal', clip=True) == 1.0


def test_clip_false_allows_out_of_range():
    assert normalize_raw(-0.02, 0.0, 1.0, 'normal', clip=False) < 0.0
    assert normalize_raw(1.05, 0.0, 1.0, 'normal', clip=False) > 1.0


def test_equal_min_max_raises():
    with pytest.raises(ValueError):
        normalize_raw(5.0, 3.0, 3.0, 'normal')


def test_invalid_polarity_raises():
    with pytest.raises(ValueError):
        normalize_raw(5.0, 0.0, 10.0, 'sideways')


# ── normalize() — the registry-driven convenience wrapper ───────────────

def test_unregistered_source_raises_keyerror_not_a_guess():
    with pytest.raises(KeyError):
        normalize(0.5, 'not_a_real_engine_metric')


@pytest.mark.parametrize('source_key,raw,expected', [
    # phoneme_engine.rhyme_score() is already 0.0-1.0 — pass-through.
    ('phoneme_rhyme_score', 1.0, 1.0),
    ('phoneme_rhyme_score', 0.88, pytest.approx(0.88)),
    ('phoneme_rhyme_score', 0.0, 0.0),
    # perceptual_family_engine's family_score — same 0.0-1.0 shape.
    ('perceptual_family_score', 0.70, pytest.approx(0.70)),
    # pattern_reader_engine.activity_score — already 0.0-1.0.
    ('pattern_activity_score', 0.25, pytest.approx(0.25)),
    # semantics_engine.semantic_similarity — nominally 0.0-1.0.
    ('semantic_similarity', 0.6, pytest.approx(0.6)),
    # density_engine's three metrics are 0-100 percentages.
    ('density_internal', 50.0, pytest.approx(0.5)),
    ('density_multisyllabic', 100.0, 1.0),
    ('density_motif', 0.0, 0.0),
    # suggestion_engine's expanded 0-100 rhyme_score field.
    ('suggestion_rhyme_score', 88.0, pytest.approx(0.88)),
    # suggestion_engine's thesaurus_score ladder, still 0-100.
    ('suggestion_thesaurus_score', 85.0, pytest.approx(0.85)),
    # suggestion_engine's syllable_priority — the actual 0-2 ordinal that
    # was previously blended via a magic *7.5 instead of being normalized.
    ('suggestion_syllable_priority', 0, 0.0),
    ('suggestion_syllable_priority', 1, pytest.approx(0.5)),
    ('suggestion_syllable_priority', 2, 1.0),
    # stress_signals per-signal confidence — already 0.0-1.0.
    ('stress_signal_confidence', 0.9, pytest.approx(0.9)),
])
def test_each_registered_engine_scale(source_key, raw, expected):
    assert normalize(raw, source_key) == expected


def test_every_scales_entry_is_normal_polarity_currently():
    '''
    Documents the audit finding plainly, as a test rather than just a
    comment: as of this audit, no engine feeding /analyze or /suggest has
    inverted polarity. If a future engine registration flips this, that's
    a deliberate, visible change to this test — not a silent assumption.
    '''
    polarities = {key: pol for key, (_, _, pol) in SCALES.items()}
    assert all(p == 'normal' for p in polarities.values()), (
        f'expected every currently-registered source to be normal polarity, '
        f'found: {polarities}'
    )


# ── Regression proof: wiring into suggestion_engine didn't change output ─

def test_suggestion_engine_composite_matches_pre_normalization_formula():
    '''
    suggestion_engine.py's _layer2() composite score used to be computed
    with hand-tuned magic multipliers (rhyme_score*0.55, thesaurus_score*
    0.30, syllable_priority*7.5) instead of going through this converter.
    Proves the two formulas are mathematically identical — the converter
    changed HOW the scale conversion happens, not the actual composite
    values suggestions get ranked/starred by.
    '''
    import random
    random.seed(0)
    for _ in range(200):
        rhyme_score = random.choice([0, 75, 88, 100])          # real values _layer1 produces
        thesaurus_score = random.choice([0, 30, 32, 70, 85, 90, 100])  # real ladder values
        syllable_priority = random.choice([0, 1, 2])            # real ordinal values

        old_formula = (
            rhyme_score * 0.55 +
            thesaurus_score * 0.30 +
            syllable_priority * 7.5
        )
        new_formula = (
            normalize(rhyme_score, 'suggestion_rhyme_score') * 55 +
            normalize(thesaurus_score, 'suggestion_thesaurus_score') * 30 +
            normalize(syllable_priority, 'suggestion_syllable_priority') * 15
        )
        assert new_formula == pytest.approx(old_formula), (
            f'mismatch for rhyme={rhyme_score} thesaurus={thesaurus_score} '
            f'syll={syllable_priority}: old={old_formula} new={new_formula}'
        )


def test_layer2_live_composite_unchanged_end_to_end():
    '''
    Same proof as above, but through the real live suggestion_engine
    pipeline instead of the formula in isolation — confirms the wiring
    itself (not just the math) is correct.
    '''
    from suggestion_engine import get_suggestions
    from domain.song_context import SongContext

    verse = [
        "And I swear that it's turnt",
        "It all begins with encore cheers",
        "From those wearin' my merch",
        "Fast forward through years of rehearsal",
    ]
    results = get_suggestions(verse, ctx=SongContext(bpm=80), trigger_mode='manual')
    assert results, 'expected at least one suggestion for this verse'
    for r in results:
        # composite_score is derived from rhyme_score/thesaurus_score/
        # syllable_priority already present on the same result dict —
        # recompute via the OLD formula and compare against what the live
        # (converter-wired) pipeline actually produced.
        expected = round(
            r['rhyme_score'] * 0.55 +
            r['thesaurus_score'] * 0.30 +
            r['syllable_priority'] * 7.5
        )
        assert r['composite_score'] == expected, (
            f'{r["word"]}: composite_score {r["composite_score"]} != '
            f'expected {expected} from the pre-normalization formula'
        )
