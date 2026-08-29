import requests
import json
import time

url = "http://localhost:8000/api/ingest/paste"

# Food Delivery Trace
food_trace = {
    "spans": [
        {"trace_id": "req-food-1", "span_id": "s1", "service_name": "checkout-service", "operation_name": "place_order", "duration_ms": 150, "status": "OK"},
        {"trace_id": "req-food-1", "span_id": "s2", "service_name": "restaurant-service", "operation_name": "confirm_order", "duration_ms": 80, "status": "OK"},
        {"trace_id": "req-food-1", "span_id": "s3", "service_name": "delivery-service", "operation_name": "assign_driver", "duration_ms": 200, "status": "OK", "attributes": {"driver_id": "d-123"}},
    ]
}

# Banking Trace
banking_trace = {
    "spans": [
        {"trace_id": "req-bank-1", "span_id": "b-s1", "service_name": "auth-service", "operation_name": "verify_token", "duration_ms": 50, "status": "OK"},
        {"trace_id": "req-bank-1", "span_id": "b-s2", "service_name": "ledger-service", "operation_name": "transfer_funds", "duration_ms": 120, "status": "OK", "attributes": {"currency": "USD"}},
        {"trace_id": "req-bank-1", "span_id": "b-s3", "service_name": "notification-service", "operation_name": "send_sms", "duration_ms": 90, "status": "OK"},
    ]
}

# Retail Trace
retail_trace = {
    "spans": [
        {"trace_id": "req-ret-1", "span_id": "r-s1", "service_name": "catalog-service", "operation_name": "search_products", "duration_ms": 250, "status": "OK"},
        {"trace_id": "req-ret-1", "span_id": "r-s2", "service_name": "inventory-service", "operation_name": "check_stock", "duration_ms": 110, "status": "OK"},
        {"trace_id": "req-ret-1", "span_id": "r-s3", "service_name": "cart-service", "operation_name": "add_item", "duration_ms": 40, "status": "OK"},
    ]
}

def test_trace(trace, name):
    print(f"Testing {name}...")
    try:
        r = requests.post(url, json=trace)
        print(f"Status Code: {r.status_code}")
        print(f"Response: {json.dumps(r.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")
    print("-" * 40)
    time.sleep(1)

test_trace(food_trace, "Food Delivery")
test_trace(banking_trace, "Banking")
test_trace(retail_trace, "Retail")
