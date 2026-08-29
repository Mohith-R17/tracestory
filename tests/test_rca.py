import pytest
from backend.services.rca import detect_incident, calculate_rca, calculate_severity, generate_rca_explanation
import os

def test_error_incident_detection():
    spans = [
        {"span_id": "s1", "parent_id": None, "service_name": "gateway", "operation_name": "op1", "duration_ms": 100.0, "status": "OK"},
        {"span_id": "s2", "parent_id": "s1", "service_name": "auth", "operation_name": "op2", "duration_ms": 50.0, "status": "ERROR"},
    ]
    is_inc, title, reason = detect_incident(spans, 150.0)
    assert is_inc is True
    assert "error" in title.lower()

def test_latency_dominance_detection():
    spans = [
        {"span_id": "s1", "parent_id": None, "service_name": "gateway", "operation_name": "op1", "duration_ms": 200.0, "status": "OK"},
        {"span_id": "s2", "parent_id": "s1", "service_name": "payment", "operation_name": "op2", "duration_ms": 800.0, "status": "OK"},
    ]
    # Total duration = 1000ms. s2 contributes 80%
    is_inc, title, reason = detect_incident(spans, 1000.0)
    assert is_inc is True
    assert "bottleneck" in title.lower()

def test_high_total_latency_detection():
    spans = [
        {"span_id": "s1", "parent_id": None, "service_name": "gateway", "operation_name": "op1", "duration_ms": 600.0, "status": "OK"},
        {"span_id": "s2", "parent_id": "s1", "service_name": "db", "operation_name": "op2", "duration_ms": 600.0, "status": "OK"},
    ]
    # Total duration = 1200ms (> 1000ms threshold). avg_category_duration = 500ms (1200 > 1.5 * 500)
    is_inc, title, reason = detect_incident(spans, 1200.0, avg_category_duration=500.0)
    assert is_inc is True
    assert "high request execution latency" in title.lower()

def test_normal_trace_no_incident():
    spans = [
        {"span_id": "s1", "parent_id": None, "service_name": "gateway", "operation_name": "op1", "duration_ms": 50.0, "status": "OK"},
        {"span_id": "s2", "parent_id": "s1", "service_name": "auth", "operation_name": "op2", "duration_ms": 40.0, "status": "OK"},
        {"span_id": "s3", "parent_id": "s1", "service_name": "db", "operation_name": "op3", "duration_ms": 60.0, "status": "OK"},
    ]
    is_inc, title, reason = detect_incident(spans, 150.0, avg_category_duration=200.0)
    assert is_inc is False

def test_root_cause_selection_and_scoring():
    spans = [
        {"span_id": "s1", "parent_id": None, "service_name": "gateway", "operation_name": "op1", "duration_ms": 1800.0, "status": "OK", "attributes": {}},
        {"span_id": "s2", "parent_id": "s1", "service_name": "payment", "operation_name": "op2", "duration_ms": 1450.0, "status": "ERROR", "attributes": {"error": "bank_api_timeout"}},
        {"span_id": "s3", "parent_id": "s1", "service_name": "notification", "operation_name": "op3", "duration_ms": 300.0, "status": "OK", "attributes": {}},
    ]
    root_cause, scored_spans = calculate_rca(spans, 3550.0)
    assert root_cause is not None
    assert root_cause["service_name"] == "payment"
    assert root_cause["operation_name"] == "op2"
    # s2 score should be high because it is ERROR (100) + latency (1450/3550 * 50 = ~20) + error attributes (20) + leaf (10) = ~150 points
    assert root_cause["score"] > 140

def test_severity_calculation():
    # CRITICAL: multiple errors + severe latency
    assert calculate_severity(error_spans_count=2, max_pct=0.60, total_duration=1600.0) == "CRITICAL"
    # HIGH: single error + major latency
    assert calculate_severity(error_spans_count=1, max_pct=0.60, total_duration=1000.0) == "HIGH"
    # MEDIUM: single error, minor latency OR severe latency with no error
    assert calculate_severity(error_spans_count=1, max_pct=0.10, total_duration=200.0) == "MEDIUM"
    assert calculate_severity(error_spans_count=0, max_pct=0.75, total_duration=600.0) == "MEDIUM"
    # LOW: minor latency
    assert calculate_severity(error_spans_count=0, max_pct=0.55, total_duration=300.0) == "LOW"

def test_groq_unavailable_fallback():
    root_cause = {
        "span_id": "span-2",
        "service_name": "payment-service",
        "operation_name": "process-payment",
        "duration_ms": 1450.0,
        "status": "ERROR",
        "latency_percentage": 91,
        "attributes": {"error": "bank_api_timeout"}
    }
    # Temporarily force GROQ_API_KEY environment variable to be unset
    old_key = os.environ.get("GROQ_API_KEY")
    if "GROQ_API_KEY" in os.environ:
        del os.environ["GROQ_API_KEY"]
    
    try:
        explanation = generate_rca_explanation(root_cause, 1800.0, has_error=True)
        assert "payment-service" in explanation
        assert "process-payment" in explanation
        assert "91%" in explanation
        assert "bank_api_timeout" in explanation
    finally:
        if old_key is not None:
            os.environ["GROQ_API_KEY"] = old_key
