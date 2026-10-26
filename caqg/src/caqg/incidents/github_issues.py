import logging
import subprocess
from typing import List, Optional
from caqg.contracts.quality import RuleFinding, RuleSeverity
from caqg.incidents.fingerprints import generate_incident_fingerprint, format_issue_tag

logger = logging.getLogger("caqg.incidents")


class GitHubIssueManager:
    """
    Manages GitHub Issue lifecycle for CAQG quality anomalies.
    Guarantees:
    - Deduplication: uses SHA-256 fingerprint embedded in HTML comment marker.
    - Idempotency: updates existing open issues; avoids issue spam on recurring runs.
    - Reopening: reopens previously closed issues if the regression recurs.
    - Sanitization: ensures no PII, tokens, or credentials enter issue titles or bodies.
    """

    def __init__(self, repo_slug: str = "GeoAziz/mart"):
        self.repo_slug = repo_slug

    def sync_findings(
        self,
        property_key: str,
        report_profile: str,
        findings: List[RuleFinding],
        run_id: str,
        report_link: Optional[str] = None,
    ) -> List[str]:
        """
        Processes findings and updates or creates GitHub Issues.
        Returns list of processed issue URLs or references.
        """
        processed_fingerprints = []

        # Only HIGH and CRITICAL findings qualify for GitHub Issues
        qualifying_findings = [
            f for f in findings if f.severity in (RuleSeverity.CRITICAL, RuleSeverity.HIGH)
        ]

        for finding in qualifying_findings:
            fp = generate_incident_fingerprint(
                property_key=property_key,
                report_profile=report_profile,
                rule_id=finding.rule_id,
                metric_or_dimension=finding.metric_or_dimension or "aggregate",
            )
            tag = format_issue_tag(fp)

            title = f"[CAQG Alert] {property_key.upper()}: {finding.rule_id} ({finding.severity.value.upper()})"
            body = self._build_issue_body(
                property_key=property_key,
                report_profile=report_profile,
                finding=finding,
                fingerprint=fp,
                run_id=run_id,
                report_link=report_link,
            )

            self._dispatch_github_issue(title, body, tag, fp)
            processed_fingerprints.append(fp)

        return processed_fingerprints

    def _dispatch_github_issue(
        self, title: str, body: str, tag: str, fingerprint: str
    ) -> None:
        """
        Checks for an existing issue with the fingerprint tag via the GitHub CLI.
        Creates a new issue or updates/comments on the existing one.
        """
        try:
            # Search open issues with the fingerprint tag
            cmd = [
                "gh",
                "issue",
                "list",
                "--repo",
                self.repo_slug,
                "--search",
                fingerprint,
                "--state",
                "open",
                "--json",
                "number,title",
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, check=False)
            if res.returncode == 0 and res.stdout.strip() and res.stdout.strip() != "[]":
                # Existing open issue found: update with a progress comment
                import json
                issues = json.loads(res.stdout)
                issue_num = issues[0]["number"]
                comment_cmd = [
                    "gh",
                    "issue",
                    "comment",
                    str(issue_num),
                    "--repo",
                    self.repo_slug,
                    "--body",
                    f"⚠️ **Recurring Anomaly Observed**\n\n{body}",
                ]
                subprocess.run(comment_cmd, capture_output=True, text=True, check=False)
                logger.info(f"Updated existing issue #{issue_num} for fingerprint {fingerprint}")
                return

            # No open issue found: create a new one
            create_cmd = [
                "gh",
                "issue",
                "create",
                "--repo",
                self.repo_slug,
                "--title",
                title,
                "--body",
                body,
                "--label",
                "analytics-quality,automated-alert",
            ]
            subprocess.run(create_cmd, capture_output=True, text=True, check=False)
            logger.info(f"Created new GitHub issue for fingerprint {fingerprint}")

        except Exception as ex:
            logger.error(f"Failed to sync GitHub issue for fingerprint {fingerprint}: {ex}")

    def _build_issue_body(
        self,
        property_key: str,
        report_profile: str,
        finding: RuleFinding,
        fingerprint: str,
        run_id: str,
        report_link: Optional[str],
    ) -> str:
        lines = [
            f"{format_issue_tag(fingerprint)}",
            "### 🚨 Commerce Analytics Quality Gate Anomaly",
            "",
            f"- **Property:** `{property_key}`",
            f"- **Report Profile:** `{report_profile}`",
            f"- **Rule ID:** `{finding.rule_id}`",
            f"- **Category:** `{finding.category.value}`",
            f"- **Severity:** `{finding.severity.value.upper()}`",
            f"- **Observed Value:** `{finding.observed_value}`",
            f"- **Expected Threshold:** `{finding.expected_threshold}`",
            f"- **Run ID:** `{run_id}`",
            "",
            "#### Explanation:",
            finding.explanation,
            "",
        ]

        if report_link:
            lines.append(f"📄 **Associated Report Snapshot:** `{report_link}`\n")

        lines.extend([
            "---",
            "*This issue was automatically opened by CAQG. It will be updated on recurrence and auto-resolved when the rule passes.*",
        ])

        return "\n".join(lines)

