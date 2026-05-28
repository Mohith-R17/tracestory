import time
import random
import uuid
import requests
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor, SpanExporter, SpanExportResult

TRACESTORY_URL = "http://127.0.0.1:8000/api/ingest"

# Custom exporter that sends spans to TraceStory
class TraceStoryExporter(SpanExporter):
    def export(self, spans):
        payload = []
        trace_id = None

        for span in spans:
            trace_id = format(span.context.trace_id, '032x')
            span_id = format(span.context.span_id, '016x')
            parent_id = format(span.parent.span_id, '016x') if span.parent else None
            status = "ERROR" if span.status.is_ok == False and span.attributes.get("error") else "OK"

            payload.append({
                "span_id": span_id,
                "trace_id": trace_id,
                "parent_id": parent_id,
                "service_name": span.resource.attributes.get("service.name", "unknown"),
                "operation_name": span.name,
                "duration_ms": (span.end_time - span.start_time) / 1_000_000,
                "status": status,
                "attributes": dict(span.attributes or {})
            })

        if payload:
            try:
                requests.post(TRACESTORY_URL, json={"spans": payload})
                print(f"✅ Sent {len(payload)} spans for trace {trace_id[:8]}...")
            except Exception as e:
                print(f"❌ Failed to send spans: {e}")

        return SpanExportResult.SUCCESS

    def shutdown(self):
        pass


def setup_tracer(service_name):
    from opentelemetry.sdk.resources import Resource
    resource = Resource(attributes={"service.name": service_name})
    provider = TracerProvider(resource=resource)
    provider.add_span_processor(SimpleSpanProcessor(TraceStoryExporter()))
    trace.set_tracer_provider(provider)
    return trace.get_tracer(service_name)


def simulate_banking_request():
    tracer = setup_tracer("api-gateway")

    with tracer.start_as_current_span("POST /transfer") as root:
        root.set_attribute("http.method", "POST")
        root.set_attribute("http.route", "/transfer")
        root.set_attribute("user.id", f"user_{random.randint(100, 999)}")

        time.sleep(random.uniform(0.01, 0.03))

        # Auth check
        with tracer.start_as_current_span("auth.validate_token") as auth:
            auth.set_attribute("service.name", "auth-service")
            time.sleep(random.uniform(0.01, 0.05))
            auth.set_attribute("auth.result", "success")

        # Fraud check
        with tracer.start_as_current_span("fraud.check_transaction") as fraud:
            fraud.set_attribute("service.name", "fraud-service")
            fraud.set_attribute("amount", str(random.randint(100, 50000)))
            time.sleep(random.uniform(0.05, 0.2))
            is_suspicious = random.random() < 0.3
            fraud.set_attribute("fraud.suspicious", str(is_suspicious))
            if is_suspicious:
                fraud.set_attribute("error", "true")
                fraud.set_attribute("fraud.reason", "Unusual transaction pattern detected")

        # Balance check
        with tracer.start_as_current_span("account.check_balance") as balance:
            balance.set_attribute("service.name", "account-service")
            time.sleep(random.uniform(0.02, 0.08))
            sufficient = random.random() > 0.2
            balance.set_attribute("balance.sufficient", str(sufficient))
            if not sufficient:
                balance.set_attribute("error", "true")
                balance.set_attribute("balance.error", "Insufficient funds")

        # Transfer execution
        with tracer.start_as_current_span("transfer.execute") as transfer:
            transfer.set_attribute("service.name", "transfer-service")
            time.sleep(random.uniform(0.1, 0.4))
            failed = random.random() < 0.2
            if failed:
                transfer.set_attribute("error", "true")
                transfer.set_attribute("transfer.error", "Bank network timeout")
            else:
                transfer.set_attribute("transfer.status", "success")
                transfer.set_attribute("transfer.reference", f"TXN{random.randint(10000,99999)}")

        # Notification
        with tracer.start_as_current_span("notification.send_sms") as notif:
            notif.set_attribute("service.name", "notification-service")
            time.sleep(random.uniform(0.01, 0.05))
            notif.set_attribute("notification.channel", "SMS")


if __name__ == "__main__":
    print("🏦 Generating banking traces...\n")
    for i in range(3):
        print(f"Request {i+1}:")
        simulate_banking_request()
        print()
    print("✅ Done! Check your TraceStory dashboard.")