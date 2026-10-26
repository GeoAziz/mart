"""
CAQG Contracts: Report Envelope and Lifecycle Status Definitions
"""

from enum import StrEnum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class ReportStatus(StrEnum):
    """
    Explicit status of the report envelope.
    Missing API data must never be marked as numeric zero.
    """
    COMPLETE = "complete"          # Full window queried, all pages verified
    EMPTY = "empty"                # Query succeeded, genuine 0 rows returned
    PARTIAL = "partial"            # Incomplete (truncated, pagination interrupted)
    UNAVAILABLE = "unavailable"    # Upstream GA4 Data API / Network failed
    INVALID = "invalid"            # Schema mismatch or unparseable API response


class Provenance(BaseModel):
    model_config = ConfigDict(frozen=True)

    config_version: str = Field(default="1.0", description="Configuration schema version")
    config_hash: str = Field(..., description="SHA-256 hash of active property configuration")
    ruleset_version: str = Field(default="1.0", description="Quality ruleset version")
    application_version: str = Field(default="0.3.0", description="CAQG application release")
    code_revision: Optional[str] = Field(default=None, description="Git commit hash")


class ReportingWindow(BaseModel):
    model_config = ConfigDict(frozen=True)

    start_date: str = Field(..., description="YYYY-MM-DD inclusive start date")
    end_date: str = Field(..., description="YYYY-MM-DD inclusive end date")
    timezone: str = Field(default="Africa/Nairobi", description="Configured property timezone")
    is_inclusive: bool = Field(default=True, description="Whether both boundary dates are included")


class PaginationMetadata(BaseModel):
    requested_offset: int = Field(default=0)
    requested_limit: int = Field(default=10000)
    expected_total_rows: int = Field(default=0)
    accumulated_rows: int = Field(default=0)
    is_pagination_complete: bool = Field(default=True)


class QuotaMetadata(BaseModel):
    tokens_consumed: Optional[float] = None
    tokens_remaining: Optional[float] = None
    quota_exhausted: bool = Field(default=False)


class ReportEnvelope(BaseModel):
    """
    Canonical, versioned envelope enclosing normalized GA4 reports.
    """
    schema_version: str = Field(default="2.0", description="Envelope schema version")
    run_id: str = Field(..., description="Unique run identifier for this execution")
    property_key: str = Field(..., description="Logical property key, e.g. mart_ke")
    property_id: str = Field(..., description="Numeric GA4 property identifier")
    report_profile: str = Field(..., description="Report profile name, e.g. acquisition_overview")
    date_range: ReportingWindow = Field(..., description="Explicit calendar date window")
    generated_at: str = Field(..., description="ISO 8601 UTC timestamp of retrieval")
    status: ReportStatus = Field(..., description="Explicit extraction status")
    pagination: PaginationMetadata = Field(default_factory=PaginationMetadata)
    quota: QuotaMetadata = Field(default_factory=QuotaMetadata)
    provenance: Provenance
    headers: List[str] = Field(default_factory=list, description="Ordered dimension and metric names")
    rows: List[Dict[str, Any]] = Field(default_factory=list, description="Normalized data rows")
    errors: List[str] = Field(default_factory=list, description="Structured infrastructure errors if any")
    warnings: List[str] = Field(default_factory=list, description="Non-fatal data warnings if any")

