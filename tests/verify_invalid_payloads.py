import urllib.request
import json
import urllib.error

INGEST_URL = "http://localhost:8000/api/ingest"

def test_payload(payload, description):
    print(f"Testing: {description}")
    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        INGEST_URL,
        data=data_bytes,
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as res:
            print(f"Success: {res.status}")
            print(res.read().decode())
    except urllib.error.HTTPError as e:
        print(f"Failed (Clean HTTP 4xx): {e.code}")
        print(e.read().decode())
    except Exception as e:
        print(f"Connection Exception: {e}")
    print("-" * 50)

if __name__ == "__main__":
    # 1. Missing trace_id
    test_payload({
        "spans": [
            {"span_id": "s1", "service_name": "s", "operation_name": "o", "duration_ms": 10, "status": "OK"}
        ]
    }, "Missing trace_id")

    # 2. Missing span_id
    test_payload({
        "spans": [
            {"trace_id": "t1", "service_name": "s", "operation_name": "o", "duration_ms": 10, "status": "OK"}
        ]
    }, "Missing span_id")

    # 3. Missing service_name
    test_payload({
        "spans": [
            {"trace_id": "t1", "span_id": "s1", "operation_name": "o", "duration_ms": 10, "status": "OK"}
        ]
    }, "Missing service_name")

    # 4. Missing operation_name
    test_payload({
        "spans": [
            {"trace_id": "t1", "span_id": "s1", "service_name": "s", "duration_ms": 10, "status": "OK"}
        ]
    }, "Missing operation_name")

    # 5. Invalid duration (negative)
    test_payload({
        "spans": [
            {"trace_id": "t1", "span_id": "s1", "service_name": "s", "operation_name": "o", "duration_ms": -5.0, "status": "OK"}
        ]
    }, "Invalid duration (negative)")

    # 6. Invalid status
    test_payload({
        "spans": [
            {"trace_id": "t1", "span_id": "s1", "service_name": "s", "operation_name": "o", "duration_ms": 10, "status": "INVALID_STATUS"}
        ]
    }, "Invalid status")

    # 7. Malformed JSON
    print("Testing: Malformed JSON")
    req = urllib.request.Request(
        INGEST_URL,
        data=b"this is not json {",
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as res:
            print(f"Success: {res.status}")
    except urllib.error.HTTPError as e:
        print(f"Failed (Clean HTTP 4xx): {e.code}")
        print(e.read().decode())
    except Exception as e:
        print(f"Connection Exception: {e}")
    print("-" * 50)
