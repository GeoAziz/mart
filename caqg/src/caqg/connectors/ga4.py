import json
import logging
import os
import random
import time
from typing import Any, Dict, List, Optional, Tuple
from google.auth.transport.requests import Request
from google.oauth2 import service_account
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    DateRange,
    Dimension,
    Metric,
    RunReportRequest,
    RunReportResponse,
)
from google.api_core.exceptions import GoogleAPICallError, PermissionDenied, Unauthenticated

from caqg.contracts.envelope import (
    PaginationMetadata,
    Provenance,
    QuotaMetadata,
    ReportEnvelope,
    ReportingWindow,
    ReportStatus,
)

logger = logging.getLogger("caqg.connectors.ga4")


class GA4Connector:
    """
    Resilient, quota-aware Google Analytics 4 Data API Client.
    Features:
    - Bounded exponential backoff with jitter for HTTP 429 / 503.
    - Immediate fail-fast without retry loops on 401 / 403 authorization failures.
    - Strict pagination completeness verification (accumulated == expected).
    - Quota metadata tracking (propertyQuota tokens).
    """

    def __init__(
        self,
        credentials_path: Optional[str] = None,
        max_retries: int = 4,
        base_backoff_sec: float = 1.0,
        max_backoff_sec: float = 16.0,
        request_timeout_sec: float = 30.0,
    ):
        self.credentials_path = credentials_path or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        self.max_retries = max_retries
        self.base_backoff_sec = base_backoff_sec
        self.max_backoff_sec = max_backoff_sec
        self.request_timeout_sec = request_timeout_sec

        self._client: Optional[BetaAnalyticsDataClient] = None
        self._init_client()

    def _init_client(self) -> None:
        if self.credentials_path and os.path.isfile(self.credentials_path):
            creds = service_account.Credentials.from_service_account_file(
                self.credentials_path,
                scopes=["https://www.googleapis.com/auth/analytics.readonly"],
            )
            self._client = BetaAnalyticsDataClient(credentials=creds)
        else:
            # Fallback to Application Default Credentials (e.g. cloud runner)
            self._client = BetaAnalyticsDataClient()

    def run_report(
        self,
        property_id: str,
        property_key: str,
        report_profile: str,
        dimensions: List[str],
        metrics: List[str],
        start_date: str,
        end_date: str,
        timezone_str: str = "Africa/Nairobi",
        run_id: str = "run_default",
        config_hash: str = "nohash",
        page_size: int = 10000,
    ) -> ReportEnvelope:
        window = ReportingWindow(
            start_date=start_date,
            end_date=end_date,
            timezone=timezone_str,
            is_inclusive=True,
        )
        prov = Provenance(config_hash=config_hash)

        if not self._client:
            return ReportEnvelope(
                run_id=run_id,
                property_key=property_key,
                property_id=property_id,
                report_profile=report_profile,
                date_range=window,
                generated_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                status=ReportStatus.UNAVAILABLE,
                provenance=prov,
                errors=["GA4 Client not initialized; credentials missing."],
            )

        accumulated_rows: List[Dict[str, Any]] = []
        expected_total_rows = 0
        offset = 0
        quota_meta = QuotaMetadata()
        is_complete = False

        dim_objs = [Dimension(name=d) for d in dimensions]
        metric_objs = [Metric(name=m) for m in metrics]
        headers = dimensions + metrics

        while True:
            request = RunReportRequest(
                property=f"properties/{property_id}",
                dimensions=dim_objs,
                metrics=metric_objs,
                date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
                offset=offset,
                limit=page_size,
                return_property_quota=True,
            )

            response, error_msg, is_transient = self._execute_with_retry(request)

            if error_msg or not response:
                status = ReportStatus.PARTIAL if accumulated_rows else ReportStatus.UNAVAILABLE
                return ReportEnvelope(
                    run_id=run_id,
                    property_key=property_key,
                    property_id=property_id,
                    report_profile=report_profile,
                    date_range=window,
                    generated_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    status=status,
                    pagination=PaginationMetadata(
                        requested_offset=offset,
                        requested_limit=page_size,
                        expected_total_rows=expected_total_rows,
                        accumulated_rows=len(accumulated_rows),
                        is_pagination_complete=False,
                    ),
                    quota=quota_meta,
                    provenance=prov,
                    headers=headers,
                    rows=accumulated_rows,
                    errors=[error_msg or "Failed to retrieve complete report from GA4."],
                )

            # Extract Quota Details if present
            if response.property_quota:
                pq = response.property_quota
                if pq.tokens_per_day:
                    quota_meta.tokens_remaining = float(pq.tokens_per_day.remaining or 0)
                    quota_meta.tokens_consumed = float(pq.tokens_per_day.consumed or 0)
                    if quota_meta.tokens_remaining <= 0:
                        quota_meta.quota_exhausted = True

            # Track expected row count
            if offset == 0:
                expected_total_rows = int(response.row_count or 0)

            # Parse Rows
            for row in response.rows:
                row_dict: Dict[str, Any] = {}
                for idx, dim in enumerate(dimensions):
                    row_dict[dim] = row.dimension_values[idx].value if idx < len(row.dimension_values) else ""
                for idx, met in enumerate(metrics):
                    val_str = row.metric_values[idx].value if idx < len(row.metric_values) else "0"
                    # Preserve numeric types
                    try:
                        if "." in val_str:
                            row_dict[met] = float(val_str)
                        else:
                            row_dict[met] = int(val_str)
                    except ValueError:
                        row_dict[met] = val_str
                accumulated_rows.append(row_dict)

            # Check if all pages retrieved
            if not response.rows or len(accumulated_rows) >= expected_total_rows:
                is_complete = True
                break

            offset += len(response.rows)

        # Enforce Pagination Completeness Check
        if expected_total_rows > 0 and len(accumulated_rows) != expected_total_rows:
            final_status = ReportStatus.PARTIAL
        elif expected_total_rows == 0 and len(accumulated_rows) == 0:
            final_status = ReportStatus.EMPTY
        else:
            final_status = ReportStatus.COMPLETE

        return ReportEnvelope(
            run_id=run_id,
            property_key=property_key,
            property_id=property_id,
            report_profile=report_profile,
            date_range=window,
            generated_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            status=final_status,
            pagination=PaginationMetadata(
                requested_offset=0,
                requested_limit=page_size,
                expected_total_rows=expected_total_rows,
                accumulated_rows=len(accumulated_rows),
                is_pagination_complete=is_complete,
            ),
            quota=quota_meta,
            provenance=prov,
            headers=headers,
            rows=accumulated_rows,
        )

    def _execute_with_retry(
        self, request: RunReportRequest
    ) -> Tuple[Optional[RunReportResponse], Optional[str], bool]:
        """
        Executes RunReport with exponential backoff and jitter on transient 429/503 errors.
        Fails fast immediately on permanent 401/403 errors.
        """
        attempt = 0
        backoff = self.base_backoff_sec

        while attempt <= self.max_retries:
            try:
                response = self._client.run_report(
                    request=request, timeout=self.request_timeout_sec
                )
                return response, None, False
            except (PermissionDenied, Unauthenticated) as perm_err:
                logger.error(f"Permanent authorization failure on GA4 Data API: {perm_err.message}")
                return None, f"PermissionDenied: {perm_err.message}", False
            except GoogleAPICallError as api_err:
                status_code = getattr(api_err, "code", 500)
                # Retryable: Rate Limit (429), Unavailable (503), Gateway Timeout (504)
                if status_code in (429, 503, 504) and attempt < self.max_retries:
                    attempt += 1
                    jitter = random.uniform(0.1, 0.5)
                    sleep_time = min(backoff + jitter, self.max_backoff_sec)
                    logger.warning(
                        f"Transient GA4 API error ({status_code}). Attempt {attempt}/{self.max_retries}. Backing off {sleep_time:.2f}s..."
                    )
                    time.sleep(sleep_time)
                    backoff *= 2.0
                    continue
                else:
                    return None, f"GoogleAPICallError ({status_code}): {api_err.message}", True
            except Exception as ex:
                return None, f"Unexpected error executing GA4 request: {str(ex)}", False

        return None, "Max retries exceeded during GA4 API ingestion.", True

