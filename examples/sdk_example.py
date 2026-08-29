import uuid
from tracestory_sdk import TraceStory, TraceStoryError

def run_sdk_demo():
    # Initialize the local client
    client = TraceStory("http://localhost:8000")
    
    # Generate unique IDs
    trace_id = f"sdk-food-{uuid.uuid4()}"
    span_web_id = f"span-web-{uuid.uuid4().hex[:8]}"
    span_kitchen_id = f"span-kitchen-{uuid.uuid4().hex[:8]}"
    span_courier_id = f"span-courier-{uuid.uuid4().hex[:8]}"

    print(f"Creating food delivery trace structure using SDK...")
    print(f"Generated Trace ID: {trace_id}")
    print("-" * 50)
    
    # Build a realistic multi-span trace representing a food delivery order
    spans = [
        {
            "trace_id": trace_id,
            "span_id": span_web_id,
            "parent_id": None,
            "service_name": "checkout-service",
            "operation_name": "place_food_order",
            "duration_ms": 115.4,
            "status": "OK",
            "attributes": {
                "order.items_count": 4,
                "promo.applied": "PIZZA50"
            }
        },
        {
            "trace_id": trace_id,
            "span_id": span_kitchen_id,
            "parent_id": span_web_id,
            "service_name": "restaurant-service",
            "operation_name": "prepare_pizza_meal",
            "duration_ms": 950.0,
            "status": "OK",
            "attributes": {
                "kitchen.id": "k-east-4",
                "chef.name": "Mario"
            }
        },
        {
            "trace_id": trace_id,
            "span_id": span_courier_id,
            "parent_id": span_web_id,
            "service_name": "delivery-service",
            "operation_name": "assign_courier_driver",
            "duration_ms": 180.2,
            "status": "OK",
            "attributes": {
                "driver.id": "d-courier-405",
                "delivery.vehicle": "bike"
            }
        }
    ]

    # Send trace spans via the SDK wrapper
    try:
        response = client.send_trace(spans)
        print("Success: Traces successfully processed by TraceStory SDK.")
        print(f"API Response message: {response.get('message')}")
        print(f"API Response category: {response.get('category')}")
    except TraceStoryError as e:
        print(f"Error: TraceStory client raised an API exception: {e}")
    except Exception as e:
        print(f"Error: Client failed to communicate: {e}")

if __name__ == "__main__":
    run_sdk_demo()
