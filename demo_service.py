import requests
import uuid
import random
import time

BASE_URL = "http://127.0.0.1:8000/api"

def generate_trace():
    trace_id = str(uuid.uuid4())
    
    # Simulate a payment request flow
    spans = [
        {
            "span_id": str(uuid.uuid4()),
            "trace_id": trace_id,
            "parent_id": None,
            "service_name": "api-gateway",
            "operation_name": "POST /order",
            "duration_ms": random.uniform(10, 30),
            "status": "OK",
            "attributes": {"http.method": "POST", "http.route": "/order"}
        },
        {
            "span_id": str(uuid.uuid4()),
            "trace_id": trace_id,
            "parent_id": None,
            "service_name": "auth-service",
            "operation_name": "validate_token",
            "duration_ms": random.uniform(5, 20),
            "status": "OK",
            "attributes": {"user.id": "user_123"}
        },
        {
            "span_id": str(uuid.uuid4()),
            "trace_id": trace_id,
            "parent_id": None,
            "service_name": "order-service",
            "operation_name": "create_order",
            "duration_ms": random.uniform(50, 150),
            "status": "OK",
            "attributes": {"order.id": "ord_456", "items.count": "3"}
        },
        {
            "span_id": str(uuid.uuid4()),
            "trace_id": trace_id,
            "parent_id": None,
            "service_name": "payment-service",
            "operation_name": "process_payment",
            "duration_ms": random.uniform(300, 600),
            "status": "ERROR",
            "attributes": {
                "error": "Payment gateway timeout",
                "payment.method": "card",
                "amount": "899.00"
            }
        },
        {
            "span_id": str(uuid.uuid4()),
            "trace_id": trace_id,
            "parent_id": None,
            "service_name": "notification-service",
            "operation_name": "send_notification",
            "duration_ms": random.uniform(10, 40),
            "status": "ERROR",
            "attributes": {"error": "Notification skipped due to payment failure"}
        }
    ]

    response = requests.post(f"{BASE_URL}/ingest", json={"spans": spans})
    print(f"Ingested trace: {trace_id}")
    print(f"Response: {response.json()}")
    return trace_id

if __name__ == "__main__":
    trace_id = generate_trace()
    print(f"\nNow visit: http://127.0.0.1:8000/api/traces/{trace_id}")
    print(f"Summary:   http://127.0.0.1:8000/api/summary/{trace_id}")