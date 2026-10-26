"""
CAQG Contracts: Quality Findings, Categories, and Result Aggregation
"""

from enum import StrEnum
from typing import Any, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class QualityStatus(StrEnum):
    PASS = "pass"
    WARNING = "warning"
    FAILURE = "failure"


class RuleSeverity(StrEnum):
    CRITICAL = "critical"  # Corrupts pipeline / blocks reporting
    HIGH = "high"          # Material data loss or severe anomaly
    MEDIUM = "medium"      # Noticeable anomaly requiring operational check
    LOW = "low"            # Informational / minor deviation


class RuleCategory(StrEnum):
    PIPELINE_INTEGRITY = "pipeline_integrity"
    DATA_COMPLETENESS = "data_completeness"
    METRIC_INTEGRITY = "metric_integrity"
    ANOMALY_DETECTION = "anomaly_detection"
    COMMERCE_RECONCILIATION = "commerce_reconciliation"


class RuleFinding(BaseModel):
    model_config = ConfigDict(frozen=True)

    rule_id: str = Field(..., description="Unique stable rule identifier, e.g. COMP_001_NO_DATA")
    category: RuleCategory
    severity: RuleSeverity
    metric_or_dimension: Optional[str] = Field(default=None)
    observed_value: Any = Field(default=None)
    expected_threshold: Any = Field(default=None)
    explanation: str = Field(..., description="Human-readable explanation of the finding")
    is_infrastructure_defect: bool = Field(
        default=False,
        description="True if caused by API failure/interruption rather than data anomaly"
    )


class QualityResult(BaseModel):
    """
    Evaluation output from the deterministic quality engine.
    """
    status: QualityStatus
    rules_evaluated: int = Field(default=0)
    failures_count: int = Field(default=0)
    warnings_count: int = Field(default=0)
    findings: List[RuleFinding] = Field(default_factory=list)
    evaluated_at: str = Field(..., description="ISO 8601 UTC timestamp")

