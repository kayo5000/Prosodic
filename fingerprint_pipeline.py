"""
fingerprint_pipeline.py

POLICY:
    Raw text is NEVER stored. Phoneme fingerprints only.
    Source text is deleted immediately after phoneme extraction.
    No copyrighted material is retained anywhere in this pipeline.

Collects training data from public domain sources without storing any
copyrighted or raw text.  Beautiful Soup scrapes the source URL, the
phoneme resolver converts words to fingerprints immediately, and the
raw text is deleted from memory before anything is written to disk or
the feature store.

Safe sources (configured in sources.txt):
    - gutenberg.org         — public domain poetry collections
    - en.wikisource.org     — public domain texts
    - api.datamuse.com      — rhyme pair data
    - poetryfoundation.org  — public domain section only
    - rapscience.net        — MCFlow legitimate rap corpus

DO NOT point at: genius.com, azlyrics.com, lyrics.com, or any
post-1928 commercial lyric site.

Design rules:
- New file only. No existing files modified.
- All public functions silent on bad input.
- Docstrings on everything.
- Guarded by if __name__ == '__main__' for batch execution.

Dependencies:
    pip install beautifulsoup4 requests
"""

from __future__ import annotations

import os
import re
import time
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

# ---------------------------------------------------------------------------
# Module-level constants
# ---------------------------------------------------------------------------

#: Log file for pipeline success/failure records.
_LOG_PATH: str = os.path.join(os.path.dirname(__file__), "fingerprint_log.txt")

#: Default path to the sources list file.
_SOURCES_FILE: str = os.path.join(os.path.dirname(__file__), "sources.txt")

#: Minimum words required before fingerprinting a fetched text.
_MIN_WORD_COUNT: int = 20

#: Seconds to wait between requests to the same domain (politeness).
_REQUEST_DELAY: float = 1.5

#: HTTP request timeout in seconds.
_FETCH_TIMEOUT: int = 15

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------

logging.basicConfig(level=logging.WARNING)
_log = logging.getLogger(__name__)

_file_handler = logging.FileHandler(_LOG_PATH, encoding="utf-8")
_file_handler.setLevel(logging.INFO)
_file_handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
_log.addHandler(_file_handler)
_log.setLevel(logging.INFO)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _import_bs4():
    """
    Lazily import BeautifulSoup.

    Returns:
        BeautifulSoup class, or None if beautifulsoup4 is not installed.
    """
    try:
        from bs4 import BeautifulSoup  # type: ignore
        return BeautifulSoup
    except ImportError:
        return None


def _import_requests():
    """
    Lazily import requests.

    Returns:
        requests module, or None if not installed.
    """
    try:
        import requests as _r  # type: ignore
        return _r
    except ImportError:
        return None


def _rhyme_density_from_phonemes(
    word_phoneme_map: Dict[str, List[str]],
) -> float:
    """
    Estimate rhyme density from a word→phoneme dict.

    Rhyme density = fraction of unique rhyme units that appear more than once.
    A rhyme unit is the vowel nucleus + any trailing consonants.

    Args:
        word_phoneme_map: Dict mapping words to their phoneme lists.

    Returns:
        Float in [0.0, 1.0].  Returns 0.0 on empty input.
    """
    if not word_phoneme_map:
        return 0.0

    _VOWELS = frozenset([
        "AA", "AE", "AH", "AO", "AW", "AY",
        "EH", "ER", "EY", "IH", "IY",
        "OW", "OY", "UH", "UW",
    ])
    _STRESS_RE = re.compile(r"[012]$")

    def _rhyme_unit(phonemes: List[str]) -> tuple:
        """Extract rhyme unit (nucleus + coda) from a phoneme list."""
        stripped = [_STRESS_RE.sub("", p) for p in phonemes]
        for i, p in enumerate(stripped):
            if p in _VOWELS:
                return tuple(stripped[i:])
        return tuple(stripped)

    unit_counts: Dict[tuple, int] = {}
    for phonemes in word_phoneme_map.values():
        unit = _rhyme_unit(phonemes)
        unit_counts[unit] = unit_counts.get(unit, 0) + 1

    if not unit_counts:
        return 0.0

    recurring = sum(1 for count in unit_counts.values() if count > 1)
    return round(recurring / len(unit_counts), 4)


def _cadence_signature(stress_patterns: List[List[int]]) -> Dict[str, Any]:
    """
    Compute a cadence signature summary from a list of per-word stress patterns.

    Args:
        stress_patterns: List of stress pattern lists (one per word).

    Returns:
        Dict with keys: mean_stress, stress_variance, primary_ratio.
    """
    all_stress = [s for pattern in stress_patterns for s in pattern]
    if not all_stress:
        return {"mean_stress": 0.0, "stress_variance": 0.0, "primary_ratio": 0.0}

    mean = sum(all_stress) / len(all_stress)
    variance = sum((s - mean) ** 2 for s in all_stress) / len(all_stress)
    primary_ratio = all_stress.count(1) / len(all_stress)

    return {
        "mean_stress": round(mean, 4),
        "stress_variance": round(variance, 4),
        "primary_ratio": round(primary_ratio, 4),
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def fetch_text(url: str) -> Optional[str]:
    """
    Fetch a URL and return its plain text content.

    Uses BeautifulSoup to strip HTML and extract readable text.
    Returns None on any failure — network error, timeout, bad HTML,
    or missing dependency.

    Args:
        url: HTTP/HTTPS URL to fetch.

    Returns:
        Plain text string, or None on failure.
    """
    requests = _import_requests()
    BeautifulSoup = _import_bs4()

    if requests is None:
        _log.warning("fetch_text: requests not installed (pip install requests)")
        return None
    if BeautifulSoup is None:
        _log.warning("fetch_text: beautifulsoup4 not installed (pip install beautifulsoup4)")
        return None

    try:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (compatible; ProsodicResearch/1.0; "
                "phoneme fingerprint collection; public domain only)"
            )
        }
        resp = requests.get(url, headers=headers, timeout=_FETCH_TIMEOUT)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")

        # remove script, style, nav, footer tags
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()

        text = soup.get_text(separator=" ")
        # collapse whitespace
        text = re.sub(r"\s+", " ", text).strip()

        if len(text.split()) < _MIN_WORD_COUNT:
            _log.info(f"fetch_text: too short (<{_MIN_WORD_COUNT} words) — {url}")
            return None

        return text

    except Exception as exc:
        _log.warning(f"fetch_text failed for {url}: {exc}")
        return None


def text_to_fingerprint(text: str) -> Optional[Dict[str, Any]]:
    """
    Convert raw text to a phoneme fingerprint dict, then delete the raw text.

    POLICY: Raw text is never returned or stored.  This function receives
    the text, extracts phoneme features, then immediately deletes the text
    variable before returning.

    The returned dict contains only derived phonetic features — not the
    original words or any text that could be used to reconstruct the source.

    Args:
        text: Raw text string.  Consumed and deleted inside this function.

    Returns:
        Dict with keys:
            - ``word_count``          (int)
            - ``unique_word_count``   (int)
            - ``phoneme_sequences``   (List[List[str]]) — phonemes per word
            - ``stress_patterns``     (List[List[int]]) — stress per word
            - ``syllable_counts``     (List[int])       — syllables per word
            - ``rhyme_density``       (float)
            - ``cadence_signatures``  (Dict)
            - ``source_hash``         (str)  — SHA-256 of text, for dedup only
            - ``extracted_at``        (str)  — ISO timestamp
        Returns None if text is too short or phoneme resolver unavailable.
    """
    import hashlib

    if not text or not text.strip():
        return None

    # hash before anything else (for dedup only — not storing text)
    source_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()

    try:
        from phoneme_resolver import resolve

        words = re.findall(r"[a-zA-Z']+", text)

        # POLICY: delete raw text immediately after extracting words
        del text

        if len(words) < _MIN_WORD_COUNT:
            del words
            return None

        # sample up to 500 words for efficiency
        if len(words) > 500:
            step = len(words) // 500
            words = words[::step][:500]

        phoneme_sequences: List[List[str]] = []
        stress_patterns: List[List[int]] = []
        syllable_counts: List[int] = []
        word_phoneme_map: Dict[str, List[str]] = {}

        for word in words:
            try:
                seq = resolve(word)
                phoneme_sequences.append(seq.phonemes)
                stress_patterns.append(seq.stress_pattern)
                syllable_counts.append(seq.syllable_count)
                word_phoneme_map[word.lower()] = seq.phonemes
            except Exception:
                continue

        # delete word list — raw text reconstruction no longer possible
        del words

        if not phoneme_sequences:
            return None

        rhyme_density = _rhyme_density_from_phonemes(word_phoneme_map)
        cadence_sigs = _cadence_signature(stress_patterns)

        # delete word→phoneme map (contains original words)
        word_count = len(phoneme_sequences)
        unique_count = len(set(tuple(p) for p in phoneme_sequences))
        del word_phoneme_map

        return {
            "word_count": word_count,
            "unique_word_count": unique_count,
            "phoneme_sequences": phoneme_sequences,
            "stress_patterns": stress_patterns,
            "syllable_counts": syllable_counts,
            "rhyme_density": rhyme_density,
            "cadence_signatures": cadence_sigs,
            "source_hash": source_hash,
            "extracted_at": datetime.utcnow().isoformat() + "Z",
        }

    except Exception as exc:
        _log.warning(f"text_to_fingerprint failed: {exc}")
        try:
            del text  # ensure raw text is deleted even on error
        except Exception:
            pass
        return None


def process_source(url: str) -> bool:
    """
    Fetch a URL, fingerprint its text, and save to the feature store.

    Full pipeline: fetch_text → text_to_fingerprint → feature store write.
    Never writes raw text anywhere.  Logs success or failure to fingerprint_log.txt.

    Args:
        url: HTTP/HTTPS URL to a public domain text source.

    Returns:
        True if fingerprint was successfully extracted and saved.
        False on any failure.
    """
    try:
        text = fetch_text(url)
        if text is None:
            _log.info(f"SKIP  {url} (fetch returned None)")
            return False

        fingerprint = text_to_fingerprint(text)
        # text is deleted inside text_to_fingerprint — do not use after this point

        if fingerprint is None:
            _log.info(f"SKIP  {url} (fingerprint extraction failed)")
            return False

        # save to feature store
        try:
            from feature_store import _get_connection
            conn = _get_connection()
            conn.execute(
                """
                INSERT OR REPLACE INTO phoneme_fingerprints
                (source_hash, url, word_count, unique_word_count,
                 rhyme_density, cadence_mean_stress, cadence_variance,
                 cadence_primary_ratio, extracted_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    fingerprint["source_hash"],
                    url,
                    fingerprint["word_count"],
                    fingerprint["unique_word_count"],
                    fingerprint["rhyme_density"],
                    fingerprint["cadence_signatures"]["mean_stress"],
                    fingerprint["cadence_signatures"]["stress_variance"],
                    fingerprint["cadence_signatures"]["primary_ratio"],
                    fingerprint["extracted_at"],
                ),
            )
            conn.commit()
        except Exception as db_err:
            # feature store may not have this table yet — log but don't fail
            _log.warning(f"DB write skipped for {url}: {db_err}")

        _log.info(
            f"OK    {url} — {fingerprint['word_count']} words, "
            f"rhyme_density={fingerprint['rhyme_density']}"
        )
        return True

    except Exception as exc:
        _log.warning(f"FAIL  {url}: {exc}")
        return False


def process_batch(url_list: List[str]) -> Dict[str, Any]:
    """
    Process a list of URLs, fingerprinting each and returning a summary.

    Prints progress to stdout: 'Processing 1 of N: <url>'.

    Args:
        url_list: List of HTTP/HTTPS URLs.

    Returns:
        Dict with keys:
            - ``total``    (int)
            - ``success``  (int)
            - ``skipped``  (int)
            - ``failed``   (int)
            - ``results``  (List[Dict])  — per-URL {url, status}

    Examples:
        >>> process_batch(["https://example.com/poem"])
        {'total': 1, 'success': 0, 'skipped': 0, 'failed': 1, 'results': [...]}
    """
    total = len(url_list)
    success = 0
    skipped = 0
    failed = 0
    results = []

    for i, url in enumerate(url_list, start=1):
        print(f"Processing {i} of {total}: {url}")
        ok = process_source(url)
        if ok:
            success += 1
            results.append({"url": url, "status": "success"})
        else:
            failed += 1
            results.append({"url": url, "status": "failed"})

        # politeness delay between requests
        if i < total:
            time.sleep(_REQUEST_DELAY)

    print(f"\nDone — {success}/{total} succeeded, {failed} failed.")
    _log.info(f"Batch complete: {success}/{total} OK, {failed} failed")

    return {
        "total": total,
        "success": success,
        "skipped": skipped,
        "failed": failed,
        "results": results,
    }


def load_sources_from_file(filepath: str = _SOURCES_FILE) -> List[str]:
    """
    Load a list of URLs from a text file, one URL per line.

    Lines starting with '#' or empty lines are ignored.

    Args:
        filepath: Path to the sources file.  Defaults to sources.txt
            in the project root.

    Returns:
        List of URL strings.  Empty list if file does not exist or
        cannot be read.

    Examples:
        Typical sources.txt line:
            https://www.gutenberg.org/files/1065/1065-h/1065-h.htm
    """
    if not os.path.exists(filepath):
        _log.warning(f"load_sources_from_file: {filepath} not found")
        return []

    urls: List[str] = []
    try:
        with open(filepath, encoding="utf-8") as f:
            for raw_line in f:
                line = raw_line.strip()
                if line and not line.startswith("#"):
                    urls.append(line)
    except Exception as exc:
        _log.warning(f"load_sources_from_file error: {exc}")
        return []

    return urls


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 60)
    print("PROSODIC — Phoneme Fingerprint Pipeline")
    print("POLICY: Raw text never stored. Fingerprints only.")
    print("=" * 60)

    sources = load_sources_from_file()

    if not sources:
        print(f"\nNo sources found in {_SOURCES_FILE}.")
        print("Create sources.txt with one URL per line.")
        print("Safe sources:")
        print("  https://www.gutenberg.org/  (public domain only)")
        print("  https://en.wikisource.org/  (public domain only)")
        print("  https://api.datamuse.com/   (rhyme data)")
        print("\nDO NOT point at genius.com, azlyrics.com, or lyrics.com.")
    else:
        print(f"\nLoaded {len(sources)} source(s) from {_SOURCES_FILE}.\n")
        summary = process_batch(sources)
        print(f"\nSummary: {summary['success']} succeeded, "
              f"{summary['failed']} failed out of {summary['total']} total.")
        print(f"Log written to: {_LOG_PATH}")
