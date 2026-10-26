import hashlib


def generate_incident_fingerprint(
    property_key: str,
    report_profile: str,
    rule_id: str,
    metric_or_dimension: str = "aggregate",
) -> str:
    """
    Computes a deterministic, stable SHA-256 fingerprint for deduplicating GitHub Issues.
    Excludes volatile values (timestamps, session counts, run IDs).
    """
    raw_identity = f"{property_key}:{report_profile}:{rule_id}:{metric_or_dimension or 'aggregate'}"
    return hashlib.sha256(raw_identity.encode("utf-8")).hexdigest()[:16]


def format_issue_tag(fingerprint: str) -> str:
    """
    Formats the HTML comment marker embedded in issue descriptions for searchability.
    """
    return f"<!-- caqg-fingerprint: {fingerprint} -->"

