import argparse
import datetime
import logging
import os
import sys
import uuid
from typing import List, Optional

from caqg.config.loader import load_config
from caqg.connectors.ga4 import GA4Connector
from caqg.contracts.envelope import ReportStatus
from caqg.incidents.github_issues import GitHubIssueManager
from caqg.quality.engine import QualityEngine
from caqg.storage.git_reports import ReportWriter

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("caqg.orchestrator")


def run_pipeline(
    config_path: Optional[str] = None,
    property_filter: Optional[str] = None,
    dry_run: bool = False,
    override_run_id: Optional[str] = None,
) -> int:
    """
    Main CAQG Pipeline Orchestrator.
    Executes Ingestion -> Quality Evaluation -> Historical Publication -> Incident Sync.
    Maintains independent outcomes for every stage and property.
    """
    run_id = override_run_id or f"run_{datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:6]}"
    logger.info(f"🚀 Starting CAQG Pipeline Execution: {run_id}")

    config, config_hash = load_config(config_path)
    writer = ReportWriter()
    issue_manager = GitHubIssueManager()

    # Determine enabled properties
    enabled_properties = config.get_enabled_properties()
    if property_filter:
        enabled_properties = [p for p in enabled_properties if p.key == property_filter]

    if not enabled_properties:
        logger.warning("No enabled properties found to process.")
        return 0

    has_pipeline_failures = False
    has_critical_findings = False

    # Standard Profile Dimension/Metric Mappings
    profile_definitions = {
        "acquisition_overview": {
            "dimensions": ["sessionDefaultChannelGroup"],
            "metrics": ["sessions", "engagedSessions", "engagementRate", "averageSessionDuration"],
        },
        "commerce_overview": {
            "dimensions": ["date"],
            "metrics": ["ecommercePurchases", "purchaseRevenue"],
        },
        "commerce_transactions": {
            "dimensions": ["transactionId"],
            "metrics": ["purchaseRevenue"],
        },
    }

    connector = GA4Connector()

    for prop in enabled_properties:
        logger.info(f"\n=======================================================")
        logger.info(f"🏢 Processing Property: {prop.key} (ID: {prop.ga4_property_id})")
        logger.info(f"=======================================================")

        # Calculate completed date window (lag_days applied to avoid GA4 data processing delay)
        now_utc = datetime.datetime.now(datetime.timezone.utc)
        lag_days = config.defaults.lag_days
        window_days = config.defaults.days

        end_date_dt = now_utc.date() - datetime.timedelta(days=lag_days)
        start_date_dt = end_date_dt - datetime.timedelta(days=window_days)

        start_date_str = start_date_dt.strftime("%Y-%m-%d")
        end_date_str = end_date_dt.strftime("%Y-%m-%d")

        quality_engine = QualityEngine(prop.rules)

        for report_profile in prop.reports:
            if report_profile not in profile_definitions:
                logger.warning(f"Skipping unknown profile: {report_profile}")
                continue

            prof_def = profile_definitions[report_profile]
            logger.info(f"  📊 Ingesting Profile: {report_profile} [{start_date_str} -> {end_date_str}]...")

            # ── Stage 1: Ingestion ──
            envelope = connector.run_report(
                property_id=prop.ga4_property_id,
                property_key=prop.key,
                report_profile=report_profile,
                dimensions=prof_def["dimensions"],
                metrics=prof_def["metrics"],
                start_date=start_date_str,
                end_date=end_date_str,
                timezone_str=prop.timezone,
                run_id=run_id,
                config_hash=config_hash,
            )

            logger.info(f"     Ingestion Status: {envelope.status.value.upper()} ({len(envelope.rows)} rows)")
            if envelope.status in (ReportStatus.UNAVAILABLE, ReportStatus.INVALID, ReportStatus.PARTIAL):
                has_pipeline_failures = True

            # ── Stage 2: Quality Evaluation ──
            quality_result = quality_engine.evaluate(envelope)
            logger.info(
                f"     Quality Result: {quality_result.status.value.upper()} "
                f"(Failures: {quality_result.failures_count}, Warnings: {quality_result.warnings_count})"
            )
            if quality_result.failures_count > 0:
                has_critical_findings = True

            # ── Stage 3: Historical Publication (Append-Only) ──
            if not dry_run:
                try:
                    json_path, md_path = writer.write_report_snapshot(envelope, quality_result)
                    logger.info(f"     💾 Preserved snapshot: {md_path}")
                except Exception as ex:
                    logger.error(f"     ❌ Publication failed: {ex}")
                    has_pipeline_failures = True

            # ── Stage 4: Incident Management ──
            if not dry_run and quality_result.failures_count > 0:
                issue_manager.sync_findings(
                    property_key=prop.key,
                    report_profile=report_profile,
                    findings=quality_result.findings,
                    run_id=run_id,
                )

    logger.info(f"\n=======================================================")
    logger.info(f"🏁 CAQG Pipeline Run Finished: {run_id}")
    logger.info(f"   Pipeline Infrastructure Failures: {has_pipeline_failures}")
    logger.info(f"   Critical Data Quality Findings:   {has_critical_findings}")
    logger.info(f"=======================================================\n")

    # Exit code: 1 on pipeline infrastructure failure, 0 on successful pipeline completion
    return 1 if has_pipeline_failures else 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CAQG Pipeline Orchestrator")
    parser.add_argument("--config", help="Path to properties.yml")
    parser.add_argument("--property", help="Filter by property key (e.g. mart_ke)")
    parser.add_argument("--dry-run", action="store_true", help="Execute without publishing files or opening issues")
    args = parser.parse_args()

    exit_code = run_pipeline(
        config_path=args.config,
        property_filter=args.property,
        dry_run=args.dry_run,
    )
    sys.exit(exit_code)

