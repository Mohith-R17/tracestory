import urllib.request
import json
import uuid

API = "http://127.0.0.1:8000/api"

def post_payload(endpoint, payload):
    req = urllib.request.Request(
        f"{API}{endpoint}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode("utf-8"))

def get_request(endpoint):
    req = urllib.request.Request(f"{API}{endpoint}", method="GET")
    try:
        with urllib.request.urlopen(req) as res:
            return json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
        raise e

def run_verification():
    print("=== STARTING INCIDENT DETECTION E2E VERIFICATION ===")

    # 1. Post a normal trace
    normal_trace_id = f"test-normal-{uuid.uuid4().hex[:6]}"
    normal_payload = {
        "spans": [
            {"trace_id": normal_trace_id, "span_id": "span-n1", "parent_id": None, "service_name": "api-gateway", "operation_name": "get_status", "duration_ms": 50.0, "status": "OK", "attributes": {}},
            {"trace_id": normal_trace_id, "span_id": "span-n2", "parent_id": "span-n1", "service_name": "auth-service", "operation_name": "check_token", "duration_ms": 40.0, "status": "OK", "attributes": {}},
            {"trace_id": normal_trace_id, "span_id": "span-n3", "parent_id": "span-n1", "service_name": "database-service", "operation_name": "fetch_user", "duration_ms": 60.0, "status": "OK", "attributes": {}}
        ]
    }
    print(f"\nIngesting normal trace: {normal_trace_id}...")
    res_normal = post_payload("/ingest", normal_payload)
    print("Normal Trace Ingestion Response:", res_normal)

    # 2. Post a trace with ERROR payment timeout
    error_trace_id = f"test-error-{uuid.uuid4().hex[:6]}"
    error_payload = {
        "spans": [
            {"trace_id": error_trace_id, "span_id": "span-e1", "parent_id": None, "service_name": "api-gateway", "operation_name": "checkout", "duration_ms": 1800.0, "status": "OK", "attributes": {}},
            {"trace_id": error_trace_id, "span_id": "span-e2", "parent_id": "span-e1", "service_name": "payment-service", "operation_name": "process-payment", "duration_ms": 1450.0, "status": "ERROR", "attributes": {"error": "bank_api_timeout", "payment_method": "card"}},
            {"trace_id": error_trace_id, "span_id": "span-e3", "parent_id": "span-e1", "service_name": "notification-service", "operation_name": "send-confirmation", "duration_ms": 300.0, "status": "OK", "attributes": {}}
        ]
    }
    print(f"\nIngesting error incident trace: {error_trace_id}...")
    res_error = post_payload("/ingest", error_payload)
    print("Error Trace Ingestion Response:", res_error)

    # 3. Post a trace with high-latency bottleneck but no error (OK status)
    latency_trace_id = f"test-latency-{uuid.uuid4().hex[:6]}"
    latency_payload = {
        "spans": [
            {"trace_id": latency_trace_id, "span_id": "span-l1", "parent_id": None, "service_name": "api-gateway", "operation_name": "checkout", "duration_ms": 1990.0, "status": "OK", "attributes": {}},
            {"trace_id": latency_trace_id, "span_id": "span-l2", "parent_id": "span-l1", "service_name": "auth-service", "operation_name": "check_token", "duration_ms": 40.0, "status": "OK", "attributes": {}},
            {"trace_id": latency_trace_id, "span_id": "span-l3", "parent_id": "span-l1", "service_name": "payment-service", "operation_name": "process-payment", "duration_ms": 1800.0, "status": "OK", "attributes": {}},
            {"trace_id": latency_trace_id, "span_id": "span-l4", "parent_id": "span-l1", "service_name": "database-service", "operation_name": "fetch_user", "duration_ms": 150.0, "status": "OK", "attributes": {}}
        ]
    }
    print(f"\nIngesting no-error latency bottleneck trace: {latency_trace_id}...")
    res_latency = post_payload("/ingest", latency_payload)
    print("Latency Trace Ingestion Response:", res_latency)

    # 4. Fetch list of incidents
    print("\nFetching all incidents from /api/incidents...")
    incidents = get_request("/incidents")
    print(f"Total incidents found: {len(incidents)}")
    
    # 5. Verify normal trace produces no incident
    normal_inc = get_request(f"/incidents/{normal_trace_id}")
    print(f"\nVerifying normal trace incident response: {normal_inc}")
    assert normal_inc["incident"] is False, "Normal trace should not produce an incident!"

    # 6. Verify error trace incident properties and root cause
    error_inc = get_request(f"/incidents/{error_trace_id}")
    print(f"\nVerifying error trace incident details: {json.dumps(error_inc, indent=2)}")
    assert error_inc["incident"] is True
    assert error_inc["severity"] == "HIGH"
    assert error_inc["root_cause"]["service_name"] == "payment-service"
    assert error_inc["root_cause"]["operation_name"] == "process-payment"
    assert error_inc["evidence"]["status"] == "ERROR"

    # 7. Verify latency trace incident properties and root cause
    latency_inc = get_request(f"/incidents/{latency_trace_id}")
    print(f"\nVerifying latency trace incident details: {json.dumps(latency_inc, indent=2)}")
    assert latency_inc["incident"] is True
    assert latency_inc["severity"] in ["MEDIUM", "HIGH", "LOW"]
    assert latency_inc["root_cause"]["service_name"] == "payment-service"
    assert latency_inc["root_cause"]["operation_name"] == "process-payment"
    assert latency_inc["evidence"]["status"] == "OK"

    print("\n=== ALL E2E VERIFICATIONS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_verification()
