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
                "category": "retail"
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


def simulate_retail_order():
    tracer = setup_tracer("api-gateway")

    with tracer.start_as_current_span("POST /checkout") as root:
        root.set_attribute("http.method", "POST")
        root.set_attribute("http.route", "/checkout")
        root.set_attribute("customer.id", f"cust_{random.randint(100, 999)}")
        root.set_attribute("category", "retail")
        time.sleep(random.uniform(0.01, 0.03))

        # Product inventory check
        with tracer.start_as_current_span("inventory.check_stock") as inv:
            inv.set_attribute("service.name", "inventory-service")
            inv.set_attribute("product.id", f"SKU_{random.randint(1000, 9999)}")
            time.sleep(random.uniform(0.03, 0.12))
            out_of_stock = random.random() < 0.2
            if out_of_stock:
                inv.set_attribute("error", "true")
                inv.set_attribute("inventory.error", "Product out of stock")
            else:
                inv.set_attribute("stock.available", str(random.randint(1, 50)))

        # Coupon/discount validation
        with tracer.start_as_current_span("discount.validate_coupon") as disc:
            disc.set_attribute("service.name", "discount-service")
            disc.set_attribute("coupon.code", f"SAVE{random.randint(10, 50)}")
            time.sleep(random.uniform(0.02, 0.07))
            invalid = random.random() < 0.3
            if invalid:
                disc.set_attribute("error", "true")
                disc.set_attribute("coupon.error", "Coupon expired or invalid")
            else:
                disc.set_attribute("discount.percent", str(random.randint(5, 30)))

        # Payment
        with tracer.start_as_current_span("payment.process_checkout") as pay:
            pay.set_attribute("service.name", "payment-service")
            pay.set_attribute("amount", str(random.randint(500, 5000)))
            pay.set_attribute("payment.method", random.choice(["UPI", "card", "EMI", "COD"]))
            time.sleep(random.uniform(0.15, 0.45))
            failed = random.random() < 0.2
            if failed:
                pay.set_attribute("error", "true")
                pay.set_attribute("payment.error", "Card declined")

        # Warehouse & shipping
        with tracer.start_as_current_span("warehouse.create_shipment") as ship:
            ship.set_attribute("service.name", "warehouse-service")
            ship.set_attribute("warehouse.id", f"WH_{random.randint(1, 10)}")
            time.sleep(random.uniform(0.05, 0.15))
            ship.set_attribute("tracking.id", f"TRK{random.randint(100000, 999999)}")
            ship.set_attribute("estimated.days", str(random.randint(1, 5)))

        # Email confirmation
        with tracer.start_as_current_span("notification.send_confirmation") as notif:
            notif.set_attribute("service.name", "notification-service")
            notif.set_attribute("channel", "email")
            time.sleep(random.uniform(0.01, 0.04))


if __name__ == "__main__":
    print("🛍️ Generating retail traces...\n")
    for i in range(3):
        print(f"Order {i+1}:")
        simulate_retail_order()
        print()
    print("✅ Done! Check your TraceStory dashboard.")