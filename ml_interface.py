"""
ml_interface.py

Abstract base class and five stub model implementations for the Prosodic
deep learning infrastructure.

Architecture:
    All ML models in Prosodic inherit from BaseProsodicModel. Each model is
    responsible for exactly one task. Models expose a uniform interface —
    load(), predict(), task_name, input_schema — so the registry can treat
    all five identically regardless of their internal architecture.

    Until trained .pt files exist in the /models folder, each model runs as
    a rule-based stub. Stubs are explicitly labeled with the STUB comment
    format and silently produce reasonable placeholder outputs. When a
    trained model file is detected by the registry, it is loaded and replaces
    the stub automatically — the calling code sees no difference.

Stub label format (Rule 6):
    # STUB — [what this returns now] — replace with [trained model] when [condition]

Models:
    RhymeSimilarityModel  — phonetic similarity score for two phoneme sequences
    CadencePatternModel   — cadence class prediction from syllable stress sequence
    MotifDetectionModel   — semantic field labeling for word clusters
    StructureModel        — section behavior and song organization prediction
    StyleModel            — genre fingerprinting (rap vs R&B phrasing tendencies)
"""

from __future__ import annotations

import os
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Abstract base class
# ---------------------------------------------------------------------------

class BaseProsodicModel(ABC):
    """
    Abstract base class for all Prosodic ML models.

    Every model in the system must implement this interface. The registry
    uses this contract to load, query, and hot-swap models without
    touching any calling code.

    Subclasses must implement:
        task_name    — string identifier used as the registry key and .pt filename stem
        input_schema — dict describing required input keys and their types
        load()       — load model weights from a .pt file path
        predict()    — run inference and return a result dict

    The is_trained property indicates whether a real trained model is active
    or the stub fallback is running.
    """

    _is_trained: bool = False

    @property
    @abstractmethod
    def task_name(self) -> str:
        """
        Unique string identifier for this model's task.

        Used as:
          - The registry lookup key
          - The expected .pt filename stem (e.g., 'rhyme_similarity' → 'rhyme_model.pt')
        """

    @property
    @abstractmethod
    def input_schema(self) -> Dict[str, type]:
        """
        Description of the keys and expected types for predict() input dicts.

        Example: {'phonemes_a': list, 'phonemes_b': list}

        Used for validation and documentation. Does not enforce at runtime
        to avoid performance overhead in production paths.
        """

    @abstractmethod
    def load(self, model_path: str) -> None:
        """
        Load trained model weights from a .pt file.

        Should set self._is_trained = True on success.
        Should log silently and leave stub active on failure.

        Args:
            model_path: Absolute path to the .pt weights file.
        """

    @abstractmethod
    def predict(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run inference on input_data and return a result dict.

        When _is_trained is False, the stub implementation runs.
        When _is_trained is True, the trained model runs.
        Both must return a dict with identical keys — callers must not need
        to check which path ran.

        Args:
            input_data: Dict matching input_schema.

        Returns:
            Dict with task-specific result keys. Always returns a dict —
            never raises to the caller.
        """

    @property
    def is_trained(self) -> bool:
        """True if a trained model is loaded; False if stub is running."""
        return self._is_trained

    def validate_input(self, input_data: Dict[str, Any]) -> bool:
        """
        Check that all required keys from input_schema are present in input_data.

        Returns True if valid, False if any key is missing. Does not check types.
        Silent — never raises.
        """
        try:
            return all(k in input_data for k in self.input_schema)
        except Exception:
            return False


# ---------------------------------------------------------------------------
# RhymeSimilarityModel
# ---------------------------------------------------------------------------

class RhymeSimilarityModel(BaseProsodicModel):
    """
    Predicts phonetic similarity between two phoneme sequences.

    Trained on: synthetic CMU pairs + Datamuse API labels (Step 05 + 07)
    Architecture: Siamese BiGRU network (Step 06)
    Output: similarity_score float [0.0, 1.0] and rhyme_type classification

    The stub uses edit-distance overlap on the vowel nucleus + coda portion
    of each phoneme sequence as a phonetically-motivated approximation.
    """

    @property
    def task_name(self) -> str:
        """Registry key and model filename stem: 'rhyme_similarity'."""
        return "rhyme_similarity"

    @property
    def input_schema(self) -> Dict[str, type]:
        """
        Required inputs:
            phonemes_a: list of CMU phoneme strings for word A
            phonemes_b: list of CMU phoneme strings for word B
        """
        return {"phonemes_a": list, "phonemes_b": list}

    def load(self, model_path: str) -> None:
        """
        Load trained Siamese BiGRU weights from model_path.

        Sets self._is_trained = True on success. Falls back to stub silently.
        Requires torch — import is deferred to avoid hard dependency at module load.
        """
        try:
            import torch  # noqa: F401
            # Actual load logic goes here when ml/models/rhyme_siamese/model.py exists
            # self._model = torch.load(model_path, map_location='cpu')
            # self._model.eval()
            # self._is_trained = True
            pass
        except Exception:
            self._is_trained = False

    def predict(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Return phonetic similarity score and rhyme type classification.

        Returns:
            similarity_score: float [0.0, 1.0]
            rhyme_type: str — 'perfect'|'slant'|'near'|'none'
            is_trained: bool — whether stub or model ran
        """
        if self._is_trained:
            # Trained model path — replace stub body with model inference
            pass  # pragma: no cover

        # STUB — returns edit-distance vowel overlap heuristic — replace with
        # RhymeSiameseNet forward pass when models/rhyme_model.pt exists
        try:
            phonemes_a: List[str] = input_data.get("phonemes_a", [])
            phonemes_b: List[str] = input_data.get("phonemes_b", [])

            score = _stub_rhyme_score(phonemes_a, phonemes_b)

            if score >= 0.90:
                rhyme_type = "perfect"
            elif score >= 0.65:
                rhyme_type = "slant"
            elif score >= 0.40:
                rhyme_type = "near"
            else:
                rhyme_type = "none"

            return {
                "similarity_score": score,
                "rhyme_type": rhyme_type,
                "is_trained": False,
            }
        except Exception:
            return {"similarity_score": 0.0, "rhyme_type": "none", "is_trained": False}


# ---------------------------------------------------------------------------
# CadencePatternModel
# ---------------------------------------------------------------------------

class CadencePatternModel(BaseProsodicModel):
    """
    Classifies a syllable stress sequence into a cadence pattern type.

    Trained on: synthetic stress sequences + user session telemetry (Phase 2)
    Architecture: sequence classifier (LSTM or transformer, TBD at training time)
    Output: cadence_class ('locked'|'flexible'|'chaotic'), inversion_rate

    The stub uses inversion rate thresholds derived from cadence research
    on hip-hop flow patterns.
    """

    @property
    def task_name(self) -> str:
        """Registry key: 'cadence_pattern'."""
        return "cadence_pattern"

    @property
    def input_schema(self) -> Dict[str, type]:
        """
        Required inputs:
            stress_pattern: list of int (0=unstressed, 1=primary, 2=secondary)
            bpm: float
            bar_position: int (0-based position in bar)
        """
        return {"stress_pattern": list, "bpm": float, "bar_position": int}

    def load(self, model_path: str) -> None:
        """
        Load trained cadence classifier from model_path.

        Sets self._is_trained = True on success. Silent on failure.
        """
        try:
            import torch  # noqa: F401
            # self._model = torch.load(model_path, map_location='cpu')
            # self._model.eval()
            # self._is_trained = True
            pass
        except Exception:
            self._is_trained = False

    def predict(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Classify stress pattern into cadence type.

        Returns:
            cadence_class: str — 'locked'|'flexible'|'chaotic'
            inversion_rate: float [0.0, 1.0]
            is_trained: bool
        """
        if self._is_trained:
            pass  # pragma: no cover

        # STUB — returns threshold-based inversion rate classification —
        # replace with trained sequence classifier when models/cadence_model.pt exists
        try:
            stress_pattern: List[int] = input_data.get("stress_pattern", [])

            if len(stress_pattern) < 2:
                return {"cadence_class": "flexible", "inversion_rate": 0.0, "is_trained": False}

            inversions = sum(
                1 for i in range(1, len(stress_pattern))
                if stress_pattern[i] != stress_pattern[i - 1]
            )
            inversion_rate = inversions / len(stress_pattern)

            if inversion_rate <= 0.25:
                cadence_class = "locked"
            elif inversion_rate <= 0.60:
                cadence_class = "flexible"
            else:
                cadence_class = "chaotic"

            return {
                "cadence_class": cadence_class,
                "inversion_rate": round(inversion_rate, 4),
                "is_trained": False,
            }
        except Exception:
            return {"cadence_class": "flexible", "inversion_rate": 0.0, "is_trained": False}


# ---------------------------------------------------------------------------
# MotifDetectionModel
# ---------------------------------------------------------------------------

class MotifDetectionModel(BaseProsodicModel):
    """
    Labels word clusters with semantic field classifications.

    Trained on: Word2Vec foundation + writer corrections from telemetry (Phase 2)
    Architecture: word embedding classifier + clustering head
    Output: semantic_field label, cluster_strength score

    The stub returns a generic 'unclassified' semantic field with zero
    cluster strength — callers should treat unclassified fields as
    uninformative until the trained model is available.
    """

    @property
    def task_name(self) -> str:
        """Registry key: 'motif_detection'."""
        return "motif_detection"

    @property
    def input_schema(self) -> Dict[str, type]:
        """
        Required inputs:
            words: list of str — the word cluster to classify
            context_words: list of str — surrounding verse words for context
        """
        return {"words": list, "context_words": list}

    def load(self, model_path: str) -> None:
        """
        Load trained motif classifier from model_path.

        Sets self._is_trained = True on success. Silent on failure.
        """
        try:
            import torch  # noqa: F401
            # self._model = torch.load(model_path, map_location='cpu')
            # self._model.eval()
            # self._is_trained = True
            pass
        except Exception:
            self._is_trained = False

    def predict(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Return semantic field label and cluster strength for a word group.

        Returns:
            semantic_field: str — e.g. 'elevation', 'confinement', 'unclassified'
            cluster_strength: float [0.0, 1.0]
            is_trained: bool
        """
        if self._is_trained:
            pass  # pragma: no cover

        # STUB — returns 'unclassified' with zero cluster strength —
        # replace with trained Word2Vec classifier when models/motif_model.pt exists
        return {
            "semantic_field": "unclassified",
            "cluster_strength": 0.0,
            "is_trained": False,
        }


# ---------------------------------------------------------------------------
# StructureModel
# ---------------------------------------------------------------------------

class StructureModel(BaseProsodicModel):
    """
    Predicts section behavior and song organization patterns.

    Trained on: user session data after launch (Phase 3)
    Architecture: sequence model over section-level feature vectors
    Output: predicted section type, structural role, typical bar count

    The stub returns the section label as-is with a 'verse' default,
    reflecting that the writer's own labels are the ground truth until
    enough session data exists to learn structural patterns.
    """

    @property
    def task_name(self) -> str:
        """Registry key: 'structure'."""
        return "structure"

    @property
    def input_schema(self) -> Dict[str, type]:
        """
        Required inputs:
            section_label: str
            bar_count: int
            avg_syllables_per_bar: float
            density_gradient: list of float
            position_in_song: float  — normalized [0.0, 1.0]
        """
        return {
            "section_label": str,
            "bar_count": int,
            "avg_syllables_per_bar": float,
            "density_gradient": list,
            "position_in_song": float,
        }

    def load(self, model_path: str) -> None:
        """
        Load trained structure model from model_path.

        Sets self._is_trained = True on success. Silent on failure.
        """
        try:
            import torch  # noqa: F401
            # self._model = torch.load(model_path, map_location='cpu')
            # self._model.eval()
            # self._is_trained = True
            pass
        except Exception:
            self._is_trained = False

    def predict(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Return predicted section type and structural role.

        Returns:
            predicted_type: str — 'verse'|'hook'|'bridge'|'pre_chorus'|'outro'|'unknown'
            structural_role: str — description of function in composition
            confidence: float [0.0, 1.0]
            is_trained: bool
        """
        if self._is_trained:
            pass  # pragma: no cover

        # STUB — returns writer's own section label as predicted type —
        # replace with trained section classifier when models/structure_model.pt exists
        label = input_data.get("section_label", "unknown").lower()
        known_types = {"verse", "hook", "bridge", "pre_chorus", "chorus", "outro", "intro"}
        predicted = label if any(t in label for t in known_types) else "verse"

        return {
            "predicted_type": predicted,
            "structural_role": "undetermined",
            "confidence": 0.0,
            "is_trained": False,
        }


# ---------------------------------------------------------------------------
# StyleModel
# ---------------------------------------------------------------------------

class StyleModel(BaseProsodicModel):
    """
    Fingerprints genre phrasing tendencies — rap vs R&B and sub-genre patterns.

    Trained on: user session data after launch (Phase 3)
    Architecture: text feature classifier over phoneme and cadence features
    Output: genre_label, style_confidence, phrasing_tendency

    The stub returns 'undetermined' genre with zero confidence.
    Genre fingerprinting requires sufficient post-launch session data
    before a meaningful model can be trained.
    """

    @property
    def task_name(self) -> str:
        """Registry key: 'style'."""
        return "style"

    @property
    def input_schema(self) -> Dict[str, type]:
        """
        Required inputs:
            cadence_class: str
            avg_syllables_per_bar: float
            inversion_rate: float
            rhyme_density: float
            semantic_fields: list of str
        """
        return {
            "cadence_class": str,
            "avg_syllables_per_bar": float,
            "inversion_rate": float,
            "rhyme_density": float,
            "semantic_fields": list,
        }

    def load(self, model_path: str) -> None:
        """
        Load trained style fingerprint model from model_path.

        Sets self._is_trained = True on success. Silent on failure.
        """
        try:
            import torch  # noqa: F401
            # self._model = torch.load(model_path, map_location='cpu')
            # self._model.eval()
            # self._is_trained = True
            pass
        except Exception:
            self._is_trained = False

    def predict(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Return genre label and phrasing tendency fingerprint.

        Returns:
            genre_label: str — 'rap'|'rnb'|'trap'|'conscious'|'undetermined'
            phrasing_tendency: str — brief descriptor
            style_confidence: float [0.0, 1.0]
            is_trained: bool
        """
        if self._is_trained:
            pass  # pragma: no cover

        # STUB — returns 'undetermined' genre with zero confidence —
        # replace with trained style classifier when models/style_model.pt exists
        return {
            "genre_label": "undetermined",
            "phrasing_tendency": "undetermined",
            "style_confidence": 0.0,
            "is_trained": False,
        }


# ---------------------------------------------------------------------------
# Stub helper — phoneme overlap heuristic for RhymeSimilarityModel
# ---------------------------------------------------------------------------

def _stub_rhyme_score(phonemes_a: List[str], phonemes_b: List[str]) -> float:
    """
    Stub phonetic similarity heuristic based on vowel nucleus + coda overlap.

    Extracts the rhyme-bearing portion of each phoneme sequence (from last
    vowel to end), then computes a Jaccard-style overlap score.

    This is a reasonable rule-based approximation. It will be fully replaced
    by the Siamese BiGRU model's cosine similarity output after training.

    Args:
        phonemes_a: CMU phoneme list for word A.
        phonemes_b: CMU phoneme list for word B.

    Returns:
        Float [0.0, 1.0] similarity score.
    """
    def _rhyme_unit(phonemes: List[str]) -> List[str]:
        """Extract from last vowel (marked 0/1/2) to end of sequence."""
        vowel_indices = [
            i for i, p in enumerate(phonemes)
            if p and p[-1].isdigit()
        ]
        if not vowel_indices:
            return phonemes
        return phonemes[vowel_indices[-1]:]

    try:
        unit_a = _rhyme_unit(phonemes_a)
        unit_b = _rhyme_unit(phonemes_b)

        if not unit_a or not unit_b:
            return 0.0

        set_a = set(unit_a)
        set_b = set(unit_b)
        intersection = set_a & set_b
        union = set_a | set_b

        if not union:
            return 0.0

        # Weighted: exact sequence match bonus
        jaccard = len(intersection) / len(union)
        sequence_match = sum(
            1 for a, b in zip(unit_a, unit_b) if a == b
        ) / max(len(unit_a), len(unit_b))

        return round((jaccard * 0.5) + (sequence_match * 0.5), 4)
    except Exception:
        return 0.0
