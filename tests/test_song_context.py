"""Tests for song_context.py — Build Spec 01, Step 1.

Just the object itself at this step — nothing reads from it yet.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import dataclasses
import pytest
from song_context import SongContext


def test_default_bpm_is_none():
    ctx = SongContext()
    assert ctx.bpm is None


def test_bpm_can_be_set():
    ctx = SongContext(bpm=90.0)
    assert ctx.bpm == 90.0


def test_frozen_immutable():
    ctx = SongContext(bpm=90.0)
    with pytest.raises(dataclasses.FrozenInstanceError):
        ctx.bpm = 100.0


def test_equality_by_value():
    assert SongContext(bpm=90.0) == SongContext(bpm=90.0)
    assert SongContext(bpm=90.0) != SongContext(bpm=100.0)


def test_only_holds_bpm_today():
    """Discipline guard: fails loudly if a field gets added that isn't
    'always true for the whole song' — a reviewer should have to
    deliberately update this test to add a new field, not let it slip in."""
    fields = {f.name for f in dataclasses.fields(SongContext)}
    assert fields == {'bpm'}
