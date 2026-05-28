import time
import random
import requests
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor, SpanExporter, SpanExportResult
from opentelemetry.sdk.resources import Resource

TRACESTORY_URL = "http://127.0.0.1:8000/api/ingest"

class TraceStoryExporter(SpanExporter):
    def export(self, spans):
        payload = []
        trace_id = None
        for span in spans:
            trace_id = format(span.context.trace_id, '032x')
            span_id = format(span.context.span_id, '016x')
            parent_id = format(span.parent.span_id, '016x') if span.parent else None
            status = "ERROR" if span.attributes.get("error") else "OK"
            payload.append({
                "span_id": span_id,
                "trace_id": trace_id,
                "parent_id": parent_id,
                "service_name": span.resource.attributes.get("service.name", "unknown"),
                "operation_name": span.name,
                "duration_ms": (span.end_time - span.start_time) / 1_000_000,
                "status": status,
                "attributes": dict(span.attributes or {}),
                "category": "food"
            })
        if payload:
            try:
                requests.post(TRACESTORY_URL, json={"spans": payload})
                print(f"✅ Sent {len(payload)} spans for trace {trace_id[:8]}...")
            except Exception as e:
                print(f"❌ Failed: {e}")
        return SpanExportResult.SUCCESS

    def shutdown(self):
        pass


def setup_tracer(service_name):
    resource = Resource(attributes={"service.name": service_name})
    provider = TracerProvider(resource=resource)
    provider.add_span_processor(SimpleSpanProcessor(TraceStoryExporter()))
    trace.set_tracer_provider(provider)
    return trace.get_tracer(service_name)


def simulate_food_order():
    tracer = setup_tracer("api-gateway")

    with tracer.start_as_current_span("POST /place-order") as root:
        root.set_attribute("http.method", "POST")
        root.set_attribute("http.route", "/place-order")
        root.set_attribute("customer.id", f"cust_{random.randint(100, 999)}")
        root.set_attribute("category", "food")
        time.sleep(random.uniform(0.01, 0.03))

        # Restaurant availability check
        with tracer.start_as_current_span("restaurant.check_availability") as rest:
            rest.set_attribute("service.name", "restaurant-service")
            rest.set_attribute("restaurant.id", f"rest_{random.randint(1, 50)}")
            time.sleep(random.uniform(0.03, 0.1))
            unavailable = random.random() < 0.2
            if unavailable:
                rest.set_attribute("error", "true")
                rest.set_attribute("restaurant.error", "Restaurant closed or busy")

        # Menu & pricing
        with tracer.start_as_current_span("menu.calculate_price") as menu:
            menu.set_attribute("service.name", "menu-service")
            menu.set_attribute("items.count", str(random.randint(1, 5)))
            time.sleep(random.uniform(0.02, 0.06))
            menu.set_attribute("order.total", str(random.randint(100, 800)))

        # Payment
        with tracer.start_as_current_span("payment.process") as pay:
            pay.set_attribute("service.name", "payment-service")
            pay.set_attribute("payment.method", random.choice(["UPI", "card", "COD"]))
            time.sleep(random.uniform(0.1, 0.35))
            failed = random.random() < 0.25
            if failed:
                pay.set_attribute("error", "true")
                pay.set_attribute("payment.error", "Payment gateway timeout")

        # Assign delivery partner
        with tracer.start_as_current_span("delivery.assign_partner") as delivery:
            delivery.set_attribute("service.name", "delivery-service")
            time.sleep(random.uniform(0.05, 0.2))
            no_partner = random.random() < 0.15
            if no_partner:
                delivery.set_attribute("error", "true")
                delivery.set_attribute("delivery.error", "No delivery partners available")
            else:
                delivery.set_attribute("partner.id", f"rider_{random.randint(1, 100)}")
                delivery.set_attribute("eta.minutes", str(random.randint(20, 45)))

        # Notification
        with tracer.start_as_current_span("notification.send_order_update") as notif:
            notif.set_attribute("service.name", "notification-service")
            notif.set_attribute("channel", random.choice(["SMS", "push", "email"]))
            time.sleep(random.uniform(0.01, 0.04))


if __name__ == "__main__":
    print("🍕 Generating food delivery traces...\n")
    for i in range(3):
        print(f"Order {i+1}:")
        simulate_food_order()
        print()
    print("✅ Done! Check your TraceStory dashboard.")