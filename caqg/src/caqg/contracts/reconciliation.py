"""
CAQG Contracts: Order Eligibility and Reconciliation Schemas
"""

from enum import StrEnum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class DiscrepancyClassification(StrEnum):
    MATCHED = "matched"
    MISSING_FROM_GA4 = "missing_from_ga4"            # > 72 hours elapsed since payment verification
    MISSING_FROM_BACKEND = "missing_from_backend"    # Transaction present in GA4 but absent in Firestore
    PENDING_OUTBOX = "pending_outbox"                # Event exists in outbox but status is pending/processing
    DELAYED_ARRIVAL = "delayed_arrival"              # Confirmed <= 72 hours ago, within GA4 aggregation window
    CURRENCY_MISMATCH = "currency_mismatch"          # Differing ISO 4217 currencies
    REVENUE_MISMATCH = "revenue_mismatch"            # Value diverges beyond rounding tolerance
    INELIGIBLE_EXCLUDED = "ineligible_excluded"      # Cancelled, refunded, simulation, or unpaid


class OrderEligibilityPredicate(BaseModel):
    """
    Evaluates whether a Firestore order record is eligible for commerce reconciliation.
    """
    model_config = ConfigDict(frozen=True)

    @staticmethod
    def is_eligible(
        order: Dict,
        payment_verified: bool = True,
        include_simulations: bool = False
    ) -> bool:
        # 1. Simulation Exclusion
        if not include_simulations and order.get("isSimulation") is True:
            return False

        # 2. Status Exclusion: Only active, paid commerce orders are eligible
        eligible_statuses = {"processing", "confirmed", "shipped", "delivered"}
        if order.get("status") not in eligible_statuses:
            return False

        # 3. Non-zero monetary total
        total = float(order.get("totalAmount") or 0)
        if total <= 0:
            return False

        # 4. Explicit Payment Verification Confirmation
        payment_details = order.get("paymentDetails") or {}
        payment_status = payment_details.get("status")

        # Either paymentDetails holds COMPLETED or separate verification is proven
        if payment_status != "COMPLETED" and not payment_verified:
            return False

        return True


class OrderReconciliationItem(BaseModel):
    order_id: str
    transaction_id: str
    currency: str = Field(default="KES")
    backend_revenue: float
    ga4_revenue: Optional[float] = None
    confirmed_at: str
    classification: DiscrepancyClassification
    discrepancy_explanation: Optional[str] = None


class ReconciliationReport(BaseModel):
    property_key: str
    property_id: str
    reporting_window_start: str
    reporting_window_end: str
    generated_at: str
    total_eligible_orders: int = 0
    total_matched: int = 0
    total_delayed_arrival: int = 0
    total_missing_from_ga4: int = 0
    total_missing_from_backend: int = 0
    total_mismatches: int = 0
    currency_totals: Dict[str, Dict[str, float]] = Field(
        default_factory=dict,
        description="Currency breakdown of backend vs GA4 totals"
    )
    items: List[OrderReconciliationItem] = Field(default_factory=list)

