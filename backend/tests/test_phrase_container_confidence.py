'''
Tests for phrase_container_engine.py's confidence field — the first
concrete application of the "surface an engine's own uncertainty instead
of discarding it" pattern. detect_boundaries() already computed a
per-boundary signal weight to decide accept/reject; it just threw that
number away right after the threshold check instead of exposing it.
'''
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from domain.phrase_container_engine import build_containers, detect_boundaries, SIGNALS


def test_first_container_always_full_confidence():
    # The verse's own start isn't a detected boundary — nothing uncertain
    # about where a verse begins.
    verse = ["One line", "Two line", "Three line"]
    containers = build_containers(verse)
    assert containers[0]['confidence'] == 1.0
    assert containers[0]['confidence_basis'] == []


def test_every_container_has_confidence_fields():
    verse = [
        "And I swear that it's turnt",
        "It all begins with encore cheers",
        "From those wearin' my merch",
        "Fast forward through years of rehearsal",
    ]
    for c in build_containers(verse):
        assert 'confidence' in c
        assert 'confidence_basis' in c
        assert 0.0 <= c['confidence'] <= 1.0
        assert isinstance(c['confidence_basis'], list)


def test_confidence_reflects_signal_strength_not_just_pass_fail():
    '''
    A boundary that barely clears BOUNDARY_THRESHOLD must read as LOW
    confidence, and one where every signal fires must read as HIGH
    confidence — not collapsed into the same "it passed" bucket. This is
    the actual point of surfacing weight instead of just the accept/
    reject decision.
    '''
    weak_verse = [
        "Walking down the street today feeling something in the air around me now",
        "Stop right here",
    ]
    strong_verse = [
        "Money power respect chasing all of these dreams every night and day",
        "Grinding never stopping pushing through the struggle and the pain",
        "Yo",
    ]
    weak = build_containers(weak_verse)
    strong = build_containers(strong_verse)
    # Second container in each case is the actually-detected boundary.
    assert weak[1]['confidence'] < 0.2, weak[1]
    assert strong[1]['confidence'] > 0.9, strong[1]
    assert weak[1]['confidence'] < strong[1]['confidence']


def test_confidence_basis_names_the_real_signals():
    verse = [
        "Walking down the street today feeling something in the air around me now",
        "Stop right here",
    ]
    containers = build_containers(verse)
    basis = containers[1]['confidence_basis']
    assert basis, 'a detected boundary must name what triggered it'
    assert all(name in SIGNALS for name in basis)


def test_detect_boundaries_returns_structured_entries():
    verse = ["One line here today", "Two line here today", "Yo"]
    boundaries = detect_boundaries(verse)
    for b in boundaries:
        assert set(b.keys()) == {'line', 'weight', 'signals_fired'}
    assert boundaries[0]['weight'] is None  # verse start, not detected


def test_single_line_verse_still_returns_structured_boundary():
    boundaries = detect_boundaries(['Just one line'])
    assert boundaries == [{'line': 0, 'weight': None, 'signals_fired': []}]
