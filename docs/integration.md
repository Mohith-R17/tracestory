# TraceStory Integration Guide

This guide describes how to integrate external applications with TraceStory's HTTP ingestion engine. By sending tracing payloads to the ingestion API, your system can leverage TraceStory's automated AI classification, natural language summaries, and professional observability dashboard.

---

## Ingestion Endpoint

```http
POST /api/ingest
```

*   **Headers**: `Content-Type: application/json`
*   **Protocol**: HTTP/1.1 or HTTP/2
*   **Security Scope**: No authentication or API keys are required for local development.

---

## Request Format

Telemetry is submitted as a list of span objects wrapped in a root `"spans"` array. This layout allows you to send multiple spans from one or more traces in a single request.

### Example JSON Payload
```json
{
  "spans": [
    {
      "trace_id": "req-banking-1002",
      "span_id": "span-gateway-1",
      "parent_id": null,
      "service_name": "api-gateway",
      "operation_name": "POST /api/v1/transfer",
      "duration_ms": 320.5,
      "status": "OK",
      "attributes": {
        "http.method": "POST",
        "client.ip": "192.168.1.45"
      }
    },
    {
      "trace_id": "req-banking-1002",
      "span_id": "span-ledger-2",
      "parent_id": "span-gateway-1",
      "service_name": "ledger-service",
      "operation_name": "record_transaction",
      "duration_ms": 185.2,
      "status": "OK",
      "attributes": {
        "amount": 250,
        "currency": "USD"
      }
    }
  ]
}
```

### Fields Explanation
*   **`trace_id`** (String, Required): A unique string identifying the complete request lifecycle. All spans participating in the same request chain must share the same `trace_id`.
*   **`span_id`** (String, Required): A unique identifier for this specific operation/unit of work.
*   **`parent_id`** (String or Null, Required/Optional): The `span_id` of the parent operation that triggered this span. Set to `null` for the root span (entrypoint).
*   **`service_name`** (String, Required): The name of the microservice executing the operation (e.g., `ledger-service`).
*   **`operation_name`** (String, Required): The name of the specific method, query, or API path (e.g., `record_transaction`).
*   **`duration_ms`** (Float, Required): The duration of the operation in milliseconds. Must be `>= 0`.
*   **`status`** (String, Required): The completion status. Must be one of `OK`, `ERROR`, or `UNSET` (validated case-insensitively).
*   **`attributes`** (Object, Optional): A key-value dictionary of metadata tags. Used by AI summaries for detailed diagnostic explanations.
*   **`category`** (String, Optional): An override category (e.g., `banking`, `food`, `retail`). If omitted, TraceStory automatically classifies it.

### How Parent-Child Spans & Timelines Work
Spans form a nested execution tree using the `parent_id` link:

```
api-gateway (Root Span: parent_id = null)
   ├── auth-service (Child Span: parent_id = api-gateway)
   └── ledger-service (Child Span: parent_id = api-gateway)
          └── database (Grandchild Span: parent_id = ledger-service)
```

By linking spans via `parent_id`, the TraceStory dashboard can build a Gantt-style tree timeline showing sequence, depth, and duration metrics.

### Batch and Multi-Trace Submission
*   **Multiple Spans in One Trace**: Submit all spans with the same `trace_id` inside the `spans` array.
*   **Multiple Separate Traces**: You can submit spans belonging to different traces in the same payload by specifying different `trace_id` values on the spans.

---

## Response Format

The API returns a JSON object confirming ingestion status and the calculated trace category.

### Success Response (HTTP 200)
```json
{
  "message": "2 spans ingested successfully",
  "category": "banking"
}
```

### Validation Error Response (HTTP 422)
If any field constraints fail (e.g. negative duration, invalid status, missing trace ID), the backend returns a structured 422 error list:
```json
{
  "detail": [
    {
      "loc": ["body", "spans", 0, "duration_ms"],
      "msg": "Input should be greater than or equal to 0",
      "type": "greater_than_equal"
    }
  ]
}
```

---

## Ingestion Code Examples

### cURL Example
```bash
curl -X POST http://localhost:8000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "spans": [
      {
        "trace_id": "curl-trace-101",
        "span_id": "span-curl-1",
        "parent_id": null,
        "service_name": "curl-client",
        "operation_name": "ping",
        "duration_ms": 15.4,
        "status": "OK",
        "attributes": {"agent": "curl"}
      }
    ]
  }'
```

### Python Example
```python
import urllib.request
import json

payload = {
    "spans": [
        {
            "trace_id": "external-trace-202",
            "span_id": "span-py-1",
            "parent_id": None,
            "service_name": "python-app",
            "operation_name": "run_process",
            "duration_ms": 125.0,
            "status": "OK"
        }
    ]
}

req = urllib.request.Request(
    "http://localhost:8000/api/ingest",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(req) as res:
        print(f"Status: {res.status}")
        print(res.read().decode())
except Exception as e:
    print(f"Error: {e}")
```
