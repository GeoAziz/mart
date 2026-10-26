from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from caqg.contracts.reconciliation import (
    ReconciliationReport,
    OrderReconciliationItem,
    DiscrepancyClassification,
    OrderEligibilityPredicate,
)
from caqg.config.models import QualityRulesConfig


class CommerceReconciler:
    """
    Transaction-Level Commerce Reconciler.
    Performs 1:1 matching between Firestore Orders, Analytics Outbox, and GA4 Transaction records.
    Distinguishes delayed arrivals (within grace period) from genuinely missing orders.
    """

    def __init__(self, property_key: str, property_id: str, rules_config: QualityRulesConfig):
        self.property_key = property_key
        self.property_id = property_id
        self.config = rules_config

    def reconcile(
        self,
        orders: List[Dict[str, Any]],
        ga4_transactions: List[Dict[str, Any]],
        start_date: str,
        end_date: str,
        reference_time: Optional[datetime] = None,
    ) -> ReconciliationReport:
        now = reference_time or datetime.now(timezone.utc)
        items: List[OrderReconciliationItem] = []

        # 1. Index GA4 transactions by transactionId
        ga4_index: Dict[str, Dict[str, Any]] = {}
        duplicate_ga4_ids = set()

        for tx in ga4_transactions:
            tid = str(tx.get("transactionId") or "").strip()
            if not tid or tid == "(not set)":
                continue
            if tid in ga4_index:
                duplicate_ga4_ids.add(tid)
            ga4_index[tid] = tx

        # 2. Filter eligible backend orders
        eligible_orders = [o for o in orders if OrderEligibilityPredicate.is_eligible(o)]

        matched_count = 0
        delayed_count = 0
        missing_count = 0
        mismatch_count = 0

        currency_totals: Dict[str, Dict[str, float]] = {}

        for order in eligible_orders:
            order_id = str(order["id"])
            currency = str(order.get("paymentDetails", {}).get("currency") or "KES")

            # Calculate expected GA4 value (Item price * quantity, excluding shipping and tax)
            items_list = order.get("items") or []
            ga4_expected_value = sum(
                float(it.get("price") or 0) * int(it.get("quantity") or 1)
                for it in items_list
            )
            if ga4_expected_value <= 0:
                ga4_expected_value = float(order.get("totalAmount") or 0)

            # Determine age in hours since confirmation
            confirmed_at_str = order.get("updatedAt") or order.get("createdAt") or now.isoformat()
            if isinstance(confirmed_at_str, datetime):
                confirmed_at_dt = confirmed_at_str
            else:
                try:
                    confirmed_at_dt = datetime.fromisoformat(str(confirmed_at_str).replace("Z", "+00:00"))
                except Exception:
                    confirmed_at_dt = now

            age_hours = (now - confirmed_at_dt).total_seconds() / 3600.0

            # Match against GA4
            if order_id in ga4_index:
                ga4_tx = ga4_index[order_id]
                ga4_rev = float(ga4_tx.get("purchaseRevenue") or 0)

                # Check monetary variance
                variance = abs(ga4_expected_value - ga4_rev)
                if variance > self.config.revenue_tolerance_kes:
                    classification = DiscrepancyClassification.REVENUE_MISMATCH
                    mismatch_count += 1
                    explanation = f"Revenue mismatch: Backend KES {ga4_expected_value:.2f} vs GA4 KES {ga4_rev:.2f}"
                else:
                    classification = DiscrepancyClassification.MATCHED
                    matched_count += 1
                    explanation = None

                items.append(
                    OrderReconciliationItem(
                        order_id=order_id,
                        transaction_id=order_id,
                        currency=currency,
                        backend_revenue=ga4_expected_value,
                        ga4_revenue=ga4_rev,
                        confirmed_at=confirmed_at_dt.isoformat(),
                        classification=classification,
                        discrepancy_explanation=explanation,
                    )
                )
            else:
                # Order missing from GA4: check grace period
                if age_hours <= self.config.reconciliation_grace_period_hours:
                    classification = DiscrepancyClassification.DELAYED_ARRIVAL
                    delayed_count += 1
                    explanation = f"Pending GA4 processing (Order confirmed {age_hours:.1f}h ago <= {self.config.reconciliation_grace_period_hours}h grace period)."
                else:
                    classification = DiscrepancyClassification.MISSING_FROM_GA4
                    missing_count += 1
                    explanation = f"Missing from GA4 (Order confirmed {age_hours:.1f}h ago > {self.config.reconciliation_grace_period_hours}h grace period)."

                items.append(
                    OrderReconciliationItem(
                        order_id=order_id,
                        transaction_id=order_id,
                        currency=currency,
                        backend_revenue=ga4_expected_value,
                        ga4_revenue=None,
                        confirmed_at=confirmed_at_dt.isoformat(),
                        classification=classification,
                        discrepancy_explanation=explanation,
                    )
                )

            # Track currency breakdowns
            if currency not in currency_totals:
                currency_totals[currency] = {"backend_total": 0.0, "ga4_total": 0.0}
            currency_totals[currency]["backend_total"] += ga4_expected_value
            if order_id in ga4_index:
                currency_totals[currency]["ga4_total"] += float(ga4_index[order_id].get("purchaseRevenue") or 0)

        # 3. Check for GA4 transactions that do not exist in Firestore
        backend_order_ids = {str(o["id"]) for o in orders}
        missing_backend_count = 0
        for tid, gtx in ga4_index.items():
            if tid not in backend_order_ids:
                missing_backend_count += 1
                items.append(
                    OrderReconciliationItem(
                        order_id="UNKNOWN",
                        transaction_id=tid,
                        currency="KES",
                        backend_revenue=0.0,
                        ga4_revenue=float(gtx.get("purchaseRevenue") or 0),
                        confirmed_at=now.isoformat(),
                        classification=DiscrepancyClassification.MISSING_FROM_BACKEND,
                        discrepancy_explanation=f"GA4 recorded purchase for transactionId '{tid}' which does not exist in backend Firestore orders.",
                    )
                )

        return ReconciliationReport(
            property_key=self.property_key,
            property_id=self.property_id,
            reporting_window_start=start_date,
            reporting_window_end=end_date,
            generated_at=now.isoformat(),
            total_eligible_orders=len(eligible_orders),
            total_matched=matched_count,
            total_delayed_arrival=delayed_count,
            total_missing_from_ga4=missing_count,
            total_missing_from_backend=missing_backend_count,
            total_mismatches=mismatch_count,
            currency_totals=currency_totals,
            items=items,
        )

