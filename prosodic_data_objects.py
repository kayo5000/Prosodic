"""
prosodic_data_objects.py

Core data objects for the Prosodic deep learning infrastructure.
These dataclasses represent the fundamental linguistic units analyzed
throughout the system: phoneme sequences, lyric lines, rhyme events,
cadence events, motif events, song sections, and full song analyses.

These objects are used by the feature store, telemetry logger, ML models,
and all linguistic analysis modules. They do not depend on any existing
Prosodic engine code — this module is a standalone foundation layer.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from enum import Enum


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class RhymeType(str, Enum):
    """Classification of rhyme quality between two phoneme sequences."""
    PERFECT = "perfect"
    SLANT = "slant"
    NEAR = "near"
    FAMILY = "family"
    NONE = "none"


class CadenceClass(str, Enum):
    """Classification of a line's rhythmic cadence pattern."""
    LOCKED = "locked"       # Stress perfectly follows the beat grid
    FLEXIBLE = "flexible"   # Some inversions but still coherent
    CHAOTIC = "chaotic"     # High inversion rate, intentional or unintentional


class StressPatternType(str, Enum):
    """Descriptor for a writer's stress control across a section."""
    LOCKED = "locked"
    FLEXIBLE = "flexible"
    EXPERIMENTAL = "experimental"


class ArcType(str, Enum):
    """Shape of rhyme density change across a section or song."""
    BUILDING = "building"
    RELEASING = "releasing"
    FLAT = "flat"
    PEAK_AND_RELEASE = "peak_and_release"
    COMPLEX = "complex"


class CompressionSeverity(str, Enum):
    """How much syllable compression is required to fit the bar grid."""
    NONE = "none"
    MILD = "mild"
    MODERATE = "moderate"
    HEAVY = "heavy"


# ---------------------------------------------------------------------------
# Core Data Objects
# ---------------------------------------------------------------------------

@dataclass
class PhonemeSequence:
    """
    Represents the phoneme sequence for a single word or token.

    Attributes:
        word: The original orthographic word.
        phonemes: List of CMU Arpabet phoneme symbols (e.g., ['HH', 'ER', 'T']).
        syllable_count: Number of syllables in the word.
        stress_pattern: List of stress values per syllable (0=unstressed, 1=primary, 2=secondary).
        source: Where the phoneme data came from ('cmu', 'cmu_normalized', 'aave', 'g2p', 'char_fallback').
        low_confidence: True if the phoneme resolution fell back to G2P or character-level inference.
        is_aave_variant: True if this sequence represents an AAVE phonological variant
                         rather than the standard CMU pronunciation. Used to ensure rhyme
                         connections that standard tools miss are captured.
    """
    word: str
    phonemes: List[str]
    syllable_count: int
    stress_pattern: List[int]
    source: str = "cmu"
    low_confidence: bool = False
    is_aave_variant: bool = False

    def __post_init__(self):
        """Validate that stress_pattern length matches syllable_count."""
        if len(self.stress_pattern) != self.syllable_count:
            raise ValueError(
                f"stress_pattern length {len(self.stress_pattern)} "
                f"does not match syllable_count {self.syllable_count} for word '{self.word}'"
            )


@dataclass
class LyricLine:
    """
    Represents a single line of lyrics with full linguistic annotation.

    Attributes:
        text: The raw text of the line.
        bar_index: Which bar this line occupies (0-indexed within a section).
        bpm: Beats per minute of the track this line is written for.
        tokens: List of PhonemeSequence objects, one per word in the line.
        total_syllables: Total syllable count across all tokens.
        performed_stress_inversions: List of (word_index, syllable_index) tuples
            identifying where the performed stress diverges from the lexical (dictionary)
            stress. These inversions are craft choices — the rapper deliberately
            re-stresses a syllable to fit or push against the beat grid.
        line_id: Optional unique identifier for database storage.
        section_label: Label of the section this line belongs to (e.g., 'verse_1', 'hook').
    """
    text: str
    bar_index: int
    bpm: float
    tokens: List[PhonemeSequence] = field(default_factory=list)
    total_syllables: int = 0
    performed_stress_inversions: List[tuple] = field(default_factory=list)
    line_id: Optional[str] = None
    section_label: Optional[str] = None

    def __post_init__(self):
        """Compute total_syllables from tokens if not explicitly set."""
        if self.total_syllables == 0 and self.tokens:
            self.total_syllables = sum(t.syllable_count for t in self.tokens)


@dataclass
class RhymeEvent:
    """
    Represents a detected rhyme relationship between two words or phoneme endings.

    Attributes:
        word_a: First word in the rhyme pair.
        word_b: Second word in the rhyme pair.
        phonemes_a: Phoneme sequence of the rhyming portion of word_a.
        phonemes_b: Phoneme sequence of the rhyming portion of word_b.
        rhyme_type: Classification of the rhyme quality (perfect, slant, near, family, none).
        similarity_score: Float in [0.0, 1.0] representing how similar the two phoneme
            endings are. 1.0 = perfect rhyme. Derived from the Siamese neural network
            or rule-based fallback.
        line_index_a: Index of the line containing word_a.
        line_index_b: Index of the line containing word_b.
        aave_bridge: True if the rhyme connection is only detectable under AAVE phonological
            rules (e.g., r-vocalization making 'more'/'saw' rhyme).
        engine_confidence: Confidence score [0.0, 1.0] from the detection engine.
    """
    word_a: str
    word_b: str
    phonemes_a: List[str]
    phonemes_b: List[str]
    rhyme_type: RhymeType = RhymeType.NONE
    similarity_score: float = 0.0
    line_index_a: int = 0
    line_index_b: int = 0
    aave_bridge: bool = False
    engine_confidence: float = 1.0

    def __post_init__(self):
        """Validate similarity_score is in range."""
        if not (0.0 <= self.similarity_score <= 1.0):
            raise ValueError(f"similarity_score must be in [0.0, 1.0], got {self.similarity_score}")


@dataclass
class CadenceEvent:
    """
    Represents the cadence pattern of a single lyric line against its bar grid.

    Attributes:
        line_index: Index of the lyric line this event describes.
        bpm: Beats per minute used to compute the grid.
        syllables_per_beat: Average syllable density per beat for this line.
        stress_pattern: Observed stress sequence as a list of 0/1 values per syllable.
        cadence_class: Classification of the cadence type — locked (clean grid alignment),
            flexible (some deviation), or chaotic (high deviation).
        inversion_count: Number of stress inversions detected relative to the beat grid.
        inversion_rate: Ratio of inverted syllables to total syllables [0.0, 1.0].
        compression_flag: True if syllable density requires compression to fit the bar.
            This is the bridge to SyllableCompressionDetector output.
        cadence_variance: Variance in syllables-per-beat across beats in this line.
            High variance = chaotic or syncopated delivery.
    """
    line_index: int
    bpm: float
    syllables_per_beat: float
    stress_pattern: List[int] = field(default_factory=list)
    cadence_class: CadenceClass = CadenceClass.FLEXIBLE
    inversion_count: int = 0
    inversion_rate: float = 0.0
    compression_flag: bool = False
    cadence_variance: float = 0.0


@dataclass
class MotifEvent:
    """
    Represents a detected semantic motif — a recurring idea expressed through
    different words or word forms across a song or section.

    Attributes:
        anchor_word: The seed word that anchors this motif cluster.
        related_words: Words detected as belonging to the same semantic field,
            appearing elsewhere in the song.
        semantic_field: The named semantic field this motif belongs to
            (e.g., 'elevation', 'confinement', 'vulnerability', 'power').
            This label feeds directly into the Phonoaffective Signature Framework's
            SF (Semantic Field Gravity) component.
        line_indices: Line indices where motif tokens appear.
        cluster_strength: How tightly the related_words cluster in semantic space [0.0, 1.0].
        first_appearance: Line index of the anchor word's first occurrence.
    """
    anchor_word: str
    related_words: List[str]
    semantic_field: str
    line_indices: List[int] = field(default_factory=list)
    cluster_strength: float = 0.0
    first_appearance: int = 0


@dataclass
class SongSection:
    """
    Represents a labeled section of a song (e.g., verse, hook, bridge, pre-chorus).

    Attributes:
        label: Section name as the writer defines it (e.g., 'verse_1', 'hook', 'bridge').
        lines: Ordered list of LyricLine objects in this section.
        rhyme_events: All rhyme connections detected within this section.
        cadence_events: Cadence events for each line in this section.
        motif_events: Semantic motifs detected within this section.
        bar_count: Number of bars in this section.
        bpm: BPM associated with this section.
        density_gradient: A list of per-bar rhyme density scores, capturing how
            rhyme density rises or falls across the section. This powers the arc
            analysis (building, releasing, flat, peak-and-release, complex).
        arc_type: Classified shape of the density gradient for this section.
        average_syllables_per_bar: Mean syllable load per bar across this section.
    """
    label: str
    lines: List[LyricLine] = field(default_factory=list)
    rhyme_events: List[RhymeEvent] = field(default_factory=list)
    cadence_events: List[CadenceEvent] = field(default_factory=list)
    motif_events: List[MotifEvent] = field(default_factory=list)
    bar_count: int = 0
    bpm: float = 90.0
    density_gradient: List[float] = field(default_factory=list)
    arc_type: ArcType = ArcType.FLAT
    average_syllables_per_bar: float = 0.0

    def __post_init__(self):
        """Compute bar_count from lines if not set."""
        if self.bar_count == 0 and self.lines:
            bar_indices = {line.bar_index for line in self.lines}
            self.bar_count = len(bar_indices)


@dataclass
class SongAnalysis:
    """
    Full analysis object for a complete song or composition.

    This is the top-level container returned after running all engines
    against a piece of writing. It aggregates all section-level data
    into a unified view of the song's linguistic structure.

    Attributes:
        song_id: Unique identifier for this song in the database.
        title: Song title as set by the writer.
        sections: Ordered list of SongSection objects.
        global_rhyme_events: Rhyme connections that span across sections
            (e.g., a word in verse 1 rhyming with a word in the hook).
        global_motif_events: Motifs that develop across multiple sections.
        total_bars: Total bar count across all sections.
        bpm: Global BPM (may differ per section in future versions).
        emotional_signature: Dict mapping Phonoaffective Signature component
            names (PT, PP, SF, CM, IS, TP, SA, SD) to computed float values.
            Populated by the Phonoaffective Signature Framework after full analysis.
        aspiration_gap_score: Float [0.0, 1.0] representing the gap between
            sonic aspiration and measured emotional encoding. 0.0 = perfectly aligned.
        metadata: Arbitrary key-value metadata (writer tags, timestamps, etc.).
    """
    song_id: str
    title: str
    sections: List[SongSection] = field(default_factory=list)
    global_rhyme_events: List[RhymeEvent] = field(default_factory=list)
    global_motif_events: List[MotifEvent] = field(default_factory=list)
    total_bars: int = 0
    bpm: float = 90.0
    emotional_signature: Dict[str, float] = field(default_factory=dict)
    aspiration_gap_score: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        """Compute total_bars from sections if not explicitly set."""
        if self.total_bars == 0 and self.sections:
            self.total_bars = sum(s.bar_count for s in self.sections)

    def get_all_lines(self) -> List[LyricLine]:
        """Return a flat list of all LyricLine objects across all sections."""
        lines = []
        for section in self.sections:
            lines.extend(section.lines)
        return lines

    def get_all_rhyme_events(self) -> List[RhymeEvent]:
        """Return all rhyme events — both within sections and cross-section."""
        events = list(self.global_rhyme_events)
        for section in self.sections:
            events.extend(section.rhyme_events)
        return events

    def get_all_motif_events(self) -> List[MotifEvent]:
        """Return all motif events — both within sections and cross-section."""
        events = list(self.global_motif_events)
        for section in self.sections:
            events.extend(section.motif_events)
        return events
