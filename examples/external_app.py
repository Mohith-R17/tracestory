import urllib.request
import json
import uuid
import time
import random

# Target TraceStory Ingestion API
INGEST_URL = "http://localhost:8000/api/ingest"

def run_integration_demo():
    # Generate unique IDs
    trace_id = f"ext-bank-{uuid.uuid4()}"
    span_gateway_id = f"span-gw-{uuid.uuid4().hex[:8]}"
    span_auth_id = f"span-auth-{uuid.uuid4().hex[:8]}"
    span_account_id = f"span-acct-{uuid.uuid4().hex[:8]}"
    span_ledger_id = f"span-ledg-{uuid.uuid4().hex[:8]}"
    span_notif_id = f"span-notif-{uuid.uuid4().hex[:8]}"

    print(f"Generating realistic distributed banking trace...")
    print(f"Trace ID: {trace_id}")
    print("-" * 50)

    # Construct trace spans representing a money transfer flow
    payload = {
        "spans": [
            {
                "trace_id": trace_id,
                "span_id": span_gateway_id,
                "parent_id": None,
                "service_name": "api-gateway",
                "operation_name": "POST /api/v1/transfer",
                "duration_ms": 320.5,
                "status": "OK",
                "attributes": {
                    "http.method": "POST",
                    "http.url": "/api/v1/transfer",
                    "client.ip": "192.168.1.45"
                }
            },
            {
                "trace_id": trace_id,
                "span_id": span_auth_id,
                "parent_id": span_gateway_id,
                "service_name": "auth-service",
                "operation_name": "verify_session",
                "duration_ms": 45.2,
                "status": "OK",
                "attributes": {
                    "auth.type": "JWT",
                    "user.id": "user_id_9901"
                }
            },
            {
                "trace_id": trace_id,
                "span_id": span_account_id,
                "parent_id": span_gateway_id,
                "service_name": "bank-account-service",
                "operation_name": "withdraw_funds",
                "duration_ms": 150.8,
                "status": "OK",
                "attributes": {
                    "account.type": "savings",
                    "currency": "USD"
                }
            },
            {
                "trace_id": trace_id,
                "span_id": span_ledger_id,
                "parent_id": span_account_id,
                "service_name": "ledger-service",
                "operation_name": "record_transaction",
                "duration_ms": 85.1,
                "status": "OK",
                "attributes": {
                    "ledger.ref": "ref_tx_908812"
                }
            },
            {
                "trace_id": trace_id,
                "span_id": span_notif_id,
                "parent_id": span_gateway_id,
                "service_name": "notification-service",
                "operation_name": "send_sms_alert",
                "duration_ms": 35.4,
                "status": "OK",
                "attributes": {
                    "notification.channel": "SMS",
                    "recipient.phone": "+1-555-0199"
                }
            }
        ]
    }

    # Format JSON payload
    data_bytes = json.dumps(payload).encode("utf-8")

    # Construct request
    req = urllib.request.Request(
        INGEST_URL,
        data=data_bytes,
        headers={"Content-Type": "application/json"}
    )

    # Send request and inspect response
    try:
        with urllib.request.urlopen(req) as response:
            status_code = response.status
            response_body = response.read().decode("utf-8")
            response_json = json.loads(response_body)

            print(f"HTTP Status: {status_code}")
            print(f"Response: {json.dumps(response_json, indent=2)}")
            print("Success: Ingestion successful. Trace is ready for observability.")
    except urllib.error.HTTPError as e:
        status_code = e.code
        error_body = e.read().decode("utf-8")
        print(f"Error: Ingestion failed with HTTP Status: {status_code}")
        print(f"Error Response: {error_body}")
    except Exception as e:
        print(f"Error: Failed to connect or send request: {e}")

if __name__ == "__main__":
    run_integration_demo()
