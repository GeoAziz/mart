import os
from pathlib import Path
from typing import Optional, Tuple
from caqg.contracts.envelope import ReportEnvelope
from caqg.contracts.quality import QualityResult, QualityStatus
from caqg.contracts.reconciliation import ReconciliationReport


class ReportWriter:
    """
    Append-Only Historical Report Writer.
    Generates versioned JSON and human-readable Markdown snapshots into:
    reports/<property_key>/<report_profile>/<YYYY>/<MM>/<timestamp>_<run_id>.json & .md
    Refuses to silently overwrite existing files (immutable historical evidence).
    """

    def __init__(self, reports_root: Optional[str] = None):
        if not reports_root:
            base_dir = Path(__file__).resolve().parent.parent.parent.parent
            reports_root = str(base_dir / "reports")
        self.reports_root = Path(reports_root)

    def write_report_snapshot(
        self,
        envelope: ReportEnvelope,
        quality: QualityResult,
        reconciliation: Optional[ReconciliationReport] = None,
    ) -> Tuple[str, str]:
        """
        Writes JSON and Markdown artifacts.
        Returns (json_path, markdown_path).
        """
        # Determine directory path: reports/<property_key>/<profile>/<YYYY>/<MM>/
        dt_str = envelope.generated_at.replace(":", "").replace("-", "")
        year = envelope.generated_at[:4]
        month = envelope.generated_at[5:7]

        target_dir = self.reports_root / envelope.property_key / envelope.report_profile / year / month
        target_dir.mkdir(parents=True, exist_ok=True)

        filename_base = f"{dt_str}_{envelope.run_id}"
        json_file = target_dir / f"{filename_base}.json"
        md_file = target_dir / f"{filename_base}.md"

        # Immutability assertion: refuse collision overwrite
        if json_file.exists():
            raise FileExistsError(f"Append-only violation: JSON report already exists at {json_file}")
        if md_file.exists():
            raise FileExistsError(f"Append-only violation: Markdown report already exists at {md_file}")

        # 1. Render JSON
        combined_payload = {
            "envelope": envelope.model_dump(),
            "quality": quality.model_dump(),
            "reconciliation": reconciliation.model_dump() if reconciliation else None,
        }
        json_file.write_text(envelope.model_dump_json(indent=2), encoding="utf-8")

        # 2. Render Markdown Digest
        md_content = self._render_markdown(envelope, quality, reconciliation)
        md_file.write_text(md_content, encoding="utf-8")

        return str(json_file), str(md_file)

    def _render_markdown(
        self,
        envelope: ReportEnvelope,
        quality: QualityResult,
        reconciliation: Optional[ReconciliationReport],
    ) -> str:
        status_badge = "🟢 PASS"
        if quality.status == QualityStatus.FAILURE:
            status_badge = "🔴 FAILURE"
        elif quality.status == QualityStatus.WARNING:
            status_badge = "🟡 WARNING"

        lines = [
            f"# CAQG Analytics Audit Digest — {envelope.property_key.upper()}",
            f"**Property ID:** `{envelope.property_id}` | **Profile:** `{envelope.report_profile}`",
            f"**Reporting Window:** `{envelope.date_range.start_date}` to `{envelope.date_range.end_date}` (`{envelope.date_range.timezone}`)",
            f"**Run ID:** `{envelope.run_id}` | **Generated At:** `{envelope.generated_at}`",
            f"**Extraction Status:** `{envelope.status.value.upper()}` | **Quality Result:** {status_badge}",
            "",
            "---",
            "",
            "## 1. Quality Engine Evaluation",
            f"- **Rules Evaluated:** {quality.rules_evaluated}",
            f"- **Failures:** {quality.failures_count}",
            f"- **Warnings:** {quality.warnings_count}",
            "",
        ]

        if quality.findings:
            lines.append("### Findings & Anomalies:")
            lines.append("| Severity | Rule ID | Metric/Dimension | Observed | Expected | Explanation |")
            lines.append("| :--- | :--- | :--- | :--- | :--- | :--- |")
            for f in quality.findings:
                lines.append(
                    f"| {f.severity.value.upper()} | `{f.rule_id}` | `{f.metric_or_dimension or '-'}` | `{f.observed_value or '-'}` | `{f.expected_threshold or '-'}` | {f.explanation} |"
                )
            lines.append("")
        else:
            lines.append("✅ All deterministic quality rules passed with zero findings.\n")

        # Table data summary
        lines.append("## 2. Ingested Data Summary")
        if envelope.rows:
            headers = envelope.headers or list(envelope.rows[0].keys())
            header_line = "| " + " | ".join(headers) + " |"
            sep_line = "| " + " | ".join([":---" for _ in headers]) + " |"
            lines.append(header_line)
            lines.append(sep_line)
            for r in envelope.rows[:20]:  # Cap first 20 rows in Markdown
                lines.append("| " + " | ".join(str(r.get(h, "")) for h in headers) + " |")
            if len(envelope.rows) > 20:
                lines.append(f"\n*(Showing 20 of {len(envelope.rows)} total rows. Full dataset in JSON snapshot)*\n")
        else:
            lines.append("*No data rows present in this report window.*\n")

        # Reconciliation section if present
        if reconciliation:
            lines.extend([
                "",
                "## 3. Commerce Reconciliation (Backend ↔ GA4)",
                f"- **Eligible Backend Orders:** {reconciliation.total_eligible_orders}",
                f"- **1:1 Matched Transactions:** {reconciliation.total_matched}",
                f"- **Delayed Arrivals (<=72h Grace):** {reconciliation.total_delayed_arrival}",
                f"- **Missing From GA4 (>72h):** {reconciliation.total_missing_from_ga4}",
                f"- **Orphan GA4 Transactions:** {reconciliation.total_missing_from_backend}",
                f"- **Monetary Mismatches:** {reconciliation.total_mismatches}",
                "",
            ])

        lines.extend([
            "---",
            f"*Report snapshot preserved by Commerce Analytics Quality Gate (CAQG v{envelope.provenance.application_version})*",
        ])

        return "\n".join(lines)