"""
compatibility_checker.py

Before any cross-snapshot operation (alignment, drift, degradation), verify
the two snapshots used compatible segmentation methods and versions.
"""


def check(snapshot_a, snapshot_b):
    """Check segmentation compatibility between two snapshots.

    Returns a result dict with compatibility level and recommended action.
    """
    seg_a = snapshot_a.get("segmentation", {})
    seg_b = snapshot_b.get("segmentation", {})

    id_a = snapshot_a.get("snapshot_id", "unknown_a")
    id_b = snapshot_b.get("snapshot_id", "unknown_b")

    method_a = seg_a.get("method")
    method_b = seg_b.get("method")
    ver_a    = seg_a.get("algorithm_version")
    ver_b    = seg_b.get("algorithm_version")

    if method_a != method_b:
        return {
            "compatibility": "incompatible",
            "snapshot_a": id_a,
            "snapshot_b": id_b,
            "reason": (
                f"Segmentation methods differ: '{method_a}' vs '{method_b}'. "
                "Cross-method bar comparison is not supported."
            ),
            "recommended_action": "requires_resegmentation",
        }

    if ver_a != ver_b:
        return {
            "compatibility": "compatible_with_warning",
            "snapshot_a": id_a,
            "snapshot_b": id_b,
            "reason": (
                f"Same segmentation method ('{method_a}') but different algorithm "
                f"versions: '{ver_a}' vs '{ver_b}'. Bar boundaries may differ slightly."
            ),
            "recommended_action": "proceed_with_notice",
        }

    return {
        "compatibility": "identical",
        "snapshot_a": id_a,
        "snapshot_b": id_b,
        "reason": (
            f"Segmentation method '{method_a}' and version '{ver_a}' match exactly."
        ),
        "recommended_action": "proceed",
    }
