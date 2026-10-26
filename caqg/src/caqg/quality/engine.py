from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from caqg.contracts.envelope import (
    ReportEnvelope,
    ReportStatus,
    ReportingWindow,
    Provenance,
    PaginationMetadata,
    QuotaMetadata,
)
from caqg.contracts.quality import (
    QualityResult,
    QualityStatus,
    RuleFinding,
    RuleCategory,
    RuleSeverity,
)
from caqg.config.models import QualityRulesConfig


class QualityEngine:
    """
    Deterministic Quality Evaluation Engine.
    Operates strictly on normalized ReportEnvelope and offline baselines.
    Zero network access, zero database calls, zero issue mutations.
    """

    def __init__(self, rules_config: QualityRulesConfig):
        self.config = rules_config

    def evaluate(
        self,
        envelope: ReportEnvelope,
        baseline_rows: Optional[List[Dict[str, Any]]] = None,
    ) -> QualityResult:
        findings: List[RuleFinding] = []
        rules_evaluated = 0

        # ── 1. Pipeline Integrity Rules ──
        rules_evaluated += 1
        if envelope.status != ReportStatus.COMPLETE and envelope.status != ReportStatus.EMPTY:
            findings.append(
                RuleFinding(
                    rule_id="PIPE_001_INCOMPLETE_ENVELOPE",
                    category=RuleCategory.PIPELINE_INTEGRITY,
                    severity=RuleSeverity.CRITICAL,
                    observed_value=envelope.status.value,
                    expected_threshold="complete",
                    explanation=f"Report extraction failed or was incomplete with status '{envelope.status.value}'.",
                    is_infrastructure_defect=True,
                )
            )
            # Immediate halt: Data quality anomalies must not be evaluated on broken ingestion
            return self._build_result(findings, rules_evaluated)

        # ── 2. Data Completeness Rules ──
        rules_evaluated += 1
        if envelope.status == ReportStatus.EMPTY:
            findings.append(
                RuleFinding(
                    rule_id="COMP_001_EMPTY_REPORT",
                    category=RuleCategory.DATA_COMPLETENESS,
                    severity=RuleSeverity.MEDIUM,
                    observed_value=0,
                    expected_threshold=">0 rows",
                    explanation="GA4 query completed successfully but returned 0 rows in the reporting window.",
                    is_infrastructure_defect=False,
                )
            )

        if envelope.report_profile == "acquisition_overview" and envelope.rows:
            rules_evaluated += 1
            channels = {r.get("sessionDefaultChannelGroup") for r in envelope.rows if r.get("sessionDefaultChannelGroup")}
            unassigned_sessions = sum(
                float(r.get("sessions") or 0) for r in envelope.rows if r.get("sessionDefaultChannelGroup") == "Unassigned"
            )
            total_sessions = sum(float(r.get("sessions") or 0) for r in envelope.rows)

            # Check for excessive Unassigned traffic share
            if total_sessions > self.config.min_session_volume_threshold:
                rules_evaluated += 1
                unassigned_share = (unassigned_sessions / total_sessions) * 100.0
                if unassigned_share > self.config.max_unassigned_share_percent:
                    findings.append(
                        RuleFinding(
                            rule_id="COMP_002_UNASSIGNED_TRAFFIC_SPIKE",
                            category=RuleCategory.DATA_COMPLETENESS,
                            severity=RuleSeverity.HIGH,
                            metric_or_dimension="Unassigned",
                            observed_value=f"{unassigned_share:.1f}%",
                            expected_threshold=f"<={self.config.max_unassigned_share_percent}%",
                            explanation=f"Unassigned channel represents {unassigned_share:.1f}% of total sessions.",
                        )
                    )

        # ── 3. Metric Integrity Rules ──
        if envelope.rows:
            for row in envelope.rows:
                # Assert no negative session or purchase counts
                for key in ["sessions", "engagedSessions", "ecommercePurchases", "purchaseRevenue"]:
                    if key in row:
                        val = float(row[key] or 0)
                        if val < 0:
                            rules_evaluated += 1
                            findings.append(
                                RuleFinding(
                                    rule_id="METRIC_001_NEGATIVE_VALUE",
                                    category=RuleCategory.METRIC_INTEGRITY,
                                    severity=RuleSeverity.CRITICAL,
                                    metric_or_dimension=key,
                                    observed_value=val,
                                    expected_threshold=">= 0",
                                    explanation=f"Negative metric value encountered for '{key}': {val}",
                                )
                            )

        # ── 4. Anomaly Detection (Baseline Comparisons) ──
        if baseline_rows is not None and envelope.rows:
            rules_evaluated += 1
            curr_sessions = sum(float(r.get("sessions") or 0) for r in envelope.rows)
            base_sessions = sum(float(r.get("sessions") or 0) for r in baseline_rows)

            # Check volume threshold before evaluating percentage drops
            if base_sessions >= self.config.min_session_volume_threshold:
                pct_change = ((curr_sessions - base_sessions) / base_sessions) * 100.0
                if pct_change < -self.config.max_session_drop_percent:
                    findings.append(
                        RuleFinding(
                            rule_id="ANOMALY_001_SESSION_DROP",
                            category=RuleCategory.ANOMALY_DETECTION,
                            severity=RuleSeverity.HIGH,
                            metric_or_dimension="sessions",
                            observed_value=f"{pct_change:.1f}% ({curr_sessions} vs baseline {base_sessions})",
                            expected_threshold=f">=-{self.config.max_session_drop_percent}%",
                            explanation=f"Sessions dropped by {abs(pct_change):.1f}% exceeding threshold of {self.config.max_session_drop_percent}%.",
                        )
                    )

        return self._build_result(findings, rules_evaluated)

    def _build_result(self, findings: List[RuleFinding], rules_evaluated: int) -> QualityResult:
        failures = [f for f in findings if f.severity in (RuleSeverity.CRITICAL, RuleSeverity.HIGH)]
        warnings = [f for f in findings if f.severity in (RuleSeverity.MEDIUM, RuleSeverity.LOW)]

        status = QualityStatus.PASS
        if failures:
            status = QualityStatus.FAILURE
        elif warnings:
            status = QualityStatus.WARNING

        return QualityResult(
            status=status,
            rules_evaluated=rules_evaluated,
            failures_count=len(failures),
            warnings_count=len(warnings),
            findings=findings,
            evaluated_at=datetime.now(timezone.utc).isoformat(),
        )

