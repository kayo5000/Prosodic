"""
model_registry.py

Central registry for all Prosodic ML models.

The registry is a singleton that holds one instance of each model. On startup
it scans the /models folder for .pt files and loads any it finds into the
corresponding model instance. If no .pt file exists, the stub runs silently.

This design means:
  - Callers always use the registry — they never import models directly.
  - Hot-loading a trained model requires only dropping a .pt file in /models
    and calling registry.reload(). No code changes needed.
  - All five models are always available — trained or stub — with identical
    predict() signatures.

Model → expected .pt filename mapping:
    RhymeSimilarityModel  → models/rhyme_model.pt
    CadencePatternModel   → models/cadence_model.pt
    MotifDetectionModel   → models/motif_model.pt
    StructureModel        → models/structure_model.pt
    StyleModel            → models/style_model.pt
"""

from __future__ import annotations

import logging
import os
from typing import Dict, Optional

from ml_interface import (
    BaseProsodicModel,
    CadencePatternModel,
    MotifDetectionModel,
    RhymeSimilarityModel,
    StructureModel,
    StyleModel,
)

# ---------------------------------------------------------------------------
# Error logger
# ---------------------------------------------------------------------------

ERROR_LOG_PATH = os.path.join(os.path.dirname(__file__), "prosodic_errors.log")

_logger = logging.getLogger("prosodic_model_registry")
_logger.setLevel(logging.INFO)
if not _logger.handlers:
    _file_handler = logging.FileHandler(ERROR_LOG_PATH, encoding="utf-8")
    _file_handler.setFormatter(
        logging.Formatter("%(asctime)s [model_registry] %(levelname)s: %(message)s")
    )
    _logger.addHandler(_file_handler)


def _log_error(context: str, exc: Exception) -> None:
    """Log an error silently to prosodic_errors.log. Never raises."""
    try:
        _logger.error("%s — %s: %s", context, type(exc).__name__, exc)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Model filename mapping
# ---------------------------------------------------------------------------

# Maps each model's task_name to the .pt filename the registry expects.
# When a file is found at models/<filename>, that model is loaded.
_MODEL_FILENAMES: Dict[str, str] = {
    "rhyme_similarity": "rhyme_model.pt",
    "cadence_pattern":  "cadence_model.pt",
    "motif_detection":  "motif_model.pt",
    "structure":        "structure_model.pt",
    "style":            "style_model.pt",
}

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")


# ---------------------------------------------------------------------------
# Registry class
# ---------------------------------------------------------------------------

class ModelRegistry:
    """
    Singleton registry holding one instance of each Prosodic ML model.

    On initialization, creates all five model instances and attempts to load
    any .pt files present in the /models directory. Models without a .pt file
    run as rule-based stubs transparently.

    Usage:
        from model_registry import registry
        result = registry.predict('rhyme_similarity', {'phonemes_a': [...], 'phonemes_b': [...]})
        status = registry.status()

    Never raises — all errors are logged silently to prosodic_errors.log.
    """

    def __init__(self) -> None:
        """Initialize all five model instances and attempt to load .pt files."""
        self._models: Dict[str, BaseProsodicModel] = {}
        self._initialize_models()
        self._load_trained_models()

    def _initialize_models(self) -> None:
        """
        Instantiate all five model stubs and register them by task_name.

        This always succeeds — stub models require no dependencies.
        """
        try:
            models = [
                RhymeSimilarityModel(),
                CadencePatternModel(),
                MotifDetectionModel(),
                StructureModel(),
                StyleModel(),
            ]
            for model in models:
                self._models[model.task_name] = model
            _logger.info(
                "Registry initialized with %d stub models: %s",
                len(self._models),
                list(self._models.keys()),
            )
        except Exception as exc:
            _log_error("_initialize_models", exc)

    def _load_trained_models(self) -> None:
        """
        Scan /models directory for .pt files and load any found.

        For each expected .pt filename, if the file exists it is passed to
        the corresponding model's load() method. If the file does not exist,
        the stub continues running silently.
        """
        if not os.path.isdir(MODELS_DIR):
            _logger.info("models/ directory not found — all models running as stubs")
            return

        for task_name, filename in _MODEL_FILENAMES.items():
            model_path = os.path.join(MODELS_DIR, filename)
            if os.path.isfile(model_path):
                try:
                    model = self._models.get(task_name)
                    if model is not None:
                        model.load(model_path)
                        status = "TRAINED" if model.is_trained else "STUB (load failed)"
                        _logger.info(
                            "Model '%s': loaded %s — status: %s",
                            task_name, filename, status,
                        )
                except Exception as exc:
                    _log_error(f"_load_trained_models:{task_name}", exc)
            else:
                _logger.info(
                    "Model '%s': %s not found — running as stub",
                    task_name, filename,
                )

    def get(self, task_name: str) -> Optional[BaseProsodicModel]:
        """
        Return the model instance for a given task_name.

        Args:
            task_name: One of 'rhyme_similarity', 'cadence_pattern',
                       'motif_detection', 'structure', 'style'.

        Returns:
            The model instance, or None if task_name is not registered.
        """
        return self._models.get(task_name)

    def predict(self, task_name: str, input_data: dict) -> dict:
        """
        Run prediction on the model registered under task_name.

        Convenience method that retrieves the model and calls predict() in
        one step. Returns an error dict if the model is not found or if
        predict() itself raises — the caller always gets a dict back.

        Args:
            task_name:  Task identifier string.
            input_data: Dict matching the model's input_schema.

        Returns:
            Result dict from model.predict(), or
            {'error': 'model not found', 'task_name': task_name} if unknown.
        """
        try:
            model = self._models.get(task_name)
            if model is None:
                return {"error": "model not found", "task_name": task_name}
            return model.predict(input_data)
        except Exception as exc:
            _log_error(f"predict:{task_name}", exc)
            return {"error": str(exc), "task_name": task_name}

    def reload(self, task_name: Optional[str] = None) -> None:
        """
        Reload trained model(s) from the /models directory.

        Call this after dropping a new .pt file into /models without
        restarting the server.

        Args:
            task_name: If provided, reload only that model.
                       If None, reload all models.
        """
        try:
            if task_name is not None:
                filename = _MODEL_FILENAMES.get(task_name)
                if filename is None:
                    return
                model_path = os.path.join(MODELS_DIR, filename)
                if os.path.isfile(model_path):
                    model = self._models.get(task_name)
                    if model is not None:
                        model.load(model_path)
                        _logger.info("Reloaded model '%s' from %s", task_name, filename)
            else:
                self._load_trained_models()
        except Exception as exc:
            _log_error(f"reload:{task_name}", exc)

    def status(self) -> Dict[str, dict]:
        """
        Return a status snapshot for all registered models.

        Returns:
            Dict mapping task_name → {is_trained, model_class, pt_file_exists}
            Useful for health checks and the Step 14 verification report.
        """
        result = {}
        try:
            for task_name, model in self._models.items():
                filename = _MODEL_FILENAMES.get(task_name, "unknown.pt")
                model_path = os.path.join(MODELS_DIR, filename)
                result[task_name] = {
                    "is_trained": model.is_trained,
                    "model_class": type(model).__name__,
                    "pt_filename": filename,
                    "pt_file_exists": os.path.isfile(model_path),
                }
        except Exception as exc:
            _log_error("status", exc)
        return result

    def trained_count(self) -> int:
        """Return how many models are running with trained weights (not stubs)."""
        return sum(1 for m in self._models.values() if m.is_trained)

    def __repr__(self) -> str:
        """Human-readable summary of registry state."""
        trained = self.trained_count()
        total = len(self._models)
        return (
            f"<ModelRegistry: {total} models, "
            f"{trained} trained, {total - trained} stubs>"
        )


# ---------------------------------------------------------------------------
# Module-level singleton — import this everywhere
# ---------------------------------------------------------------------------

registry = ModelRegistry()
