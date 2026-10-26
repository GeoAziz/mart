import pytest
from caqg.contracts.envelope import ReportEnvelope, ReportStatus, ReportingWindow, Provenance
from caqg.contracts.reconciliation import OrderEligibilityPredicate, DiscrepancyClassification
from caqg.config.loader import load_config


def test_report_envelope_status_semantics():
    window = ReportingWindow(
        start_date="2026-09-25",
        end_date="2026-10-23",
        timezone="Africa/Nairobi"
    )
    prov = Provenance(config_hash="abc123hash")

    # Complete envelope with valid rows
    env = ReportEnvelope(
        run_id="run_001",
        property_key="mart_ke",
        property_id="558077199",
        report_profile="acquisition_overview",
        date_range=window,
        generated_at="2026-10-25T12:00:00Z",
        status=ReportStatus.COMPLETE,
        provenance=prov,
        rows=[{"sessionDefaultChannelGroup": "Direct", "sessions": 150}]
    )
    assert env.status == ReportStatus.COMPLETE
    assert len(env.rows) == 1

    # Empty envelope: genuine zero rows, distinct from missing
    empty_env = ReportEnvelope(
        run_id="run_002",
        property_key="mart_ke",
        property_id="558077199",
        report_profile="acquisition_overview",
        date_range=window,
        generated_at="2026-10-25T12:00:00Z",
        status=ReportStatus.EMPTY,
        provenance=prov,
        rows=[]
    )
    assert empty_env.status == ReportStatus.EMPTY

    # Unavailable envelope: infrastructure failure
    unavail_env = ReportEnvelope(
        run_id="run_003",
        property_key="mart_ke",
        property_id="558077199",
        report_profile="acquisition_overview",
        date_range=window,
        generated_at="2026-10-25T12:00:00Z",
        status=ReportStatus.UNAVAILABLE,
        provenance=prov,
        errors=["429 Quota Exceeded"]
    )
    assert unavail_env.status == ReportStatus.UNAVAILABLE
    assert "429 Quota Exceeded" in unavail_env.errors


def test_order_eligibility_predicate():
    # Eligible paid order
    valid_order = {
        "id": "ORD_001",
        "status": "confirmed",
        "totalAmount": 4500.0,
        "isSimulation": False,
        "paymentDetails": {"status": "COMPLETED"}
    }
    assert OrderEligibilityPredicate.is_eligible(valid_order) is True

    # Simulation order should be excluded by default
    sim_order = {**valid_order, "isSimulation": True}
    assert OrderEligibilityPredicate.is_eligible(sim_order) is False

    # Pending payment order should be excluded
    pending_order = {**valid_order, "status": "pending", "paymentDetails": {"status": "PENDING"}}
    assert OrderEligibilityPredicate.is_eligible(pending_order) is False

    # Cancelled order should be excluded
    cancelled_order = {**valid_order, "status": "cancelled"}
    assert OrderEligibilityPredicate.is_eligible(cancelled_order) is False

    # Unpaid / 0 amount order should be excluded
    free_order = {**valid_order, "totalAmount": 0.0}
    assert OrderEligibilityPredicate.is_eligible(free_order) is False


def test_config_loader():
    config, config_hash = load_config()
    assert config.schema_version == "1.0"
    assert config.defaults.days == 28
    assert config.defaults.lag_days == 2
    assert len(config_hash) == 64

    # mart_ke is enabled
    mart = config.get_property("mart_ke")
    assert mart is not None
    assert mart.enabled is True
    assert mart.ga4_property_id == "558077199"

    # techstore_ke is disabled in this repo
    tech = config.get_property("techstore_ke")
    assert tech is not None
    assert tech.enabled is False

    # Only mart_ke in enabled properties
    enabled_keys = [p.key for p in config.get_enabled_properties()]
    assert enabled_keys == ["mart_ke"]

