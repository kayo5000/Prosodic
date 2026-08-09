"""
behavior/label_capture.py

Logs every State Engine prediction with the bar features that produced it.
Exposes thumbs-up/thumbs-down feedback API. Accumulates a labeled training
set. When ~200 confirmed records exist, a classifier can replace the
rule-based engine with no other rework.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import sqlite3
import json
import uuid
import datetime
import logging

log = logging.getLogger(__name__)

_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                        "prosodic_labels.db")

_CREATE_SQL = """
CREATE TABLE IF NOT EXISTS state_labels (
    label_id              TEXT PRIMARY KEY,
    snapshot_id           TEXT NOT NULL,
    bar_features_json     TEXT NOT NULL,
    predicted_state       TEXT NOT NULL,
    predicted_confidence  REAL NOT NULL,
    rule_path_json        TEXT,
    user_agree            INTEGER,
    user_corrected_state  TEXT,
    user_feedback_at      TEXT,
    created_at            TEXT NOT NULL
);
"""


# ── DB helpers ────────────────────────────────────────────────────────────────

def _conn():
    con = sqlite3.connect(_DB_PATH)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL;")
    con.execute(_CREATE_SQL)
    con.commit()
    return con


# ── public API ────────────────────────────────────────────────────────────────

def capture_prediction(snapshot_id, bar_features, predicted_state,
                       confidence, rule_path=None):
    """Insert a new prediction row. Returns label_id."""
    label_id = str(uuid.uuid4())
    now      = datetime.datetime.utcnow().isoformat() + "Z"
    try:
        con = _conn()
        con.execute(
            """INSERT INTO state_labels
               (label_id, snapshot_id, bar_features_json, predicted_state,
                predicted_confidence, rule_path_json, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                label_id,
                snapshot_id,
                json.dumps(bar_features),
                predicted_state,
                float(confidence),
                json.dumps(rule_path) if rule_path is not None else None,
                now,
            ),
        )
        con.commit()
        con.close()
    except Exception as exc:
        log.warning("label_capture: insert failed — %s", exc)
    return label_id


def record_feedback(label_id, agree, corrected_state=None):
    """Update user feedback on a prediction row.

    Args:
        label_id:        UUID string returned by capture_prediction
        agree:           True / False (thumbs up / down)
        corrected_state: one of the 6 labels if user picked a different one
    """
    now = datetime.datetime.utcnow().isoformat() + "Z"
    try:
        con = _conn()
        con.execute(
            """UPDATE state_labels
               SET user_agree = ?, user_corrected_state = ?, user_feedback_at = ?
               WHERE label_id = ?""",
            (1 if agree else 0, corrected_state, now, label_id),
        )
        con.commit()
        con.close()
    except Exception as exc:
        log.warning("label_capture: feedback update failed — %s", exc)


def get_label_stats():
    """Return aggregate stats for telemetry.

    Returns dict with:
      total_labels, agreement_rate_by_label, common_corrections_by_label
    """
    try:
        con = _conn()

        total = con.execute("SELECT COUNT(*) FROM state_labels").fetchone()[0]

        # agreement rate per predicted label
        rows = con.execute(
            """SELECT predicted_state,
                      SUM(CASE WHEN user_agree = 1 THEN 1 ELSE 0 END) AS agreed,
                      SUM(CASE WHEN user_agree IS NOT NULL THEN 1 ELSE 0 END) AS total
               FROM state_labels
               GROUP BY predicted_state"""
        ).fetchall()

        agreement_rate = {}
        for r in rows:
            if r["total"] > 0:
                agreement_rate[r["predicted_state"]] = round(
                    r["agreed"] / r["total"], 3
                )

        # most common corrections per predicted label
        corr_rows = con.execute(
            """SELECT predicted_state, user_corrected_state, COUNT(*) AS n
               FROM state_labels
               WHERE user_corrected_state IS NOT NULL
               GROUP BY predicted_state, user_corrected_state
               ORDER BY n DESC"""
        ).fetchall()

        corrections = {}
        for r in corr_rows:
            ps = r["predicted_state"]
            corrections.setdefault(ps, [])
            corrections[ps].append({
                "correction": r["user_corrected_state"],
                "count":      r["n"],
            })

        con.close()
        return {
            "total_labels":               total,
            "agreement_rate_by_label":    agreement_rate,
            "common_corrections_by_label": corrections,
        }
    except Exception as exc:
        log.warning("label_capture: get_label_stats failed — %s", exc)
        return {"total_labels": 0, "agreement_rate_by_label": {},
                "common_corrections_by_label": {}}


def get_training_set(min_confidence=None):
    """Return all rows with user feedback (user_agree IS NOT NULL).

    Args:
        min_confidence: optional float — only return rows above this threshold

    Returns:
        list of dicts with label_id, snapshot_id, bar_features,
        predicted_state, user_agree, user_corrected_state
    """
    try:
        con  = _conn()
        sql  = "SELECT * FROM state_labels WHERE user_agree IS NOT NULL"
        params = []
        if min_confidence is not None:
            sql    += " AND predicted_confidence >= ?"
            params  = [min_confidence]
        rows = con.execute(sql, params).fetchall()
        con.close()
        result = []
        for r in rows:
            result.append({
                "label_id":             r["label_id"],
                "snapshot_id":          r["snapshot_id"],
                "bar_features":         json.loads(r["bar_features_json"]),
                "predicted_state":      r["predicted_state"],
                "predicted_confidence": r["predicted_confidence"],
                "user_agree":           r["user_agree"],
                "user_corrected_state": r["user_corrected_state"],
            })
        return result
    except Exception as exc:
        log.warning("label_capture: get_training_set failed — %s", exc)
        return []
