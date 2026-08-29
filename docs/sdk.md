# TraceStory Python Client SDK Guide

The `tracestory_sdk` package is a lightweight, zero-dependency helper client that makes it easy for other Python applications to submit transaction traces directly to the TraceStory server.

---

## What is the TraceStory SDK?

It is a thin wrapper around the TraceStory HTTP ingestion API. Instead of requiring developers to manually build HTTP requests, format JSON payloads, handle socket connections, and parse FastAPI validation errors, the SDK exposes a simple class-based API:

### Without SDK
```
Python App ──► (HTTP POST /api/ingest with JSON payload, urllib/requests setup) ──► TraceStory API
```

### With SDK
```
Python App ──► TraceStory.send_trace(spans) ──► TraceStory SDK ──► TraceStory API
```

> [!NOTE]
> The SDK does **NOT** handle trace classification, AI summaries, timeline generation, or database operations. The SDK remains thin and decoupled: all classification and intelligence logic is managed by the TraceStory backend. It communicates purely over HTTP/JSON and does **NOT** directly access the PostgreSQL database.

---

## Installation & Local Setup

Since the SDK is hosted locally within this project repository, you can consume it in other local applications by adding it to your `PYTHONPATH` or installing it in editable mode.

### Option 1: Set PYTHONPATH (Simplest for Local Run)
Set the environment variable pointing to the root of the `tracestory` repository:
```bash
# On Linux / macOS / WSL
export PYTHONPATH="/path/to/tracestory"

# On Windows PowerShell
$env:PYTHONPATH="/path/to/tracestory"
```

### Option 2: Local Editable Install
If you have a separate Python environment and want to link the SDK, install it using `pip` directly from the project directory:
```bash
pip install -e /path/to/tracestory
```

---

## Client Usage

### 1. Basic Ingestion
Import the client, initialize it with your server's host URL, and send a list of spans:

```python
from tracestory_sdk import TraceStory, TraceStoryError

# Initialize the client pointing to the TraceStory server
client = TraceStory("http://localhost:8000")

# Build a list of spans representing the request timeline
spans = [
    {
        "trace_id": "req-payment-101",
        "span_id": "span-gw-1",
        "parent_id": None,
        "service_name": "api-gateway",
        "operation_name": "POST /api/v1/charge",
        "duration_ms": 250.0,
        "status": "OK",
        "attributes": {"client.platform": "web"}
    },
    {
        "trace_id": "req-payment-101",
        "span_id": "span-pay-2",
        "parent_id": "span-gw-1",
        "service_name": "payment-service",
        "operation_name": "process_card",
        "duration_ms": 190.5,
        "status": "OK"
    }
]

try:
    # Send trace spans
    response = client.send_trace(spans)
    print(f"Ingested successfully: {response['message']}")
    print(f"Auto-classified category: {response['category']}")
except TraceStoryError as e:
    # Handles HTTP errors (like 4xx validation errors) with readable details
    print(f"API Error ({e.status_code}): {e.message}")
except Exception as e:
    # Handles networking or connection errors
    print(f"Connection Failed: {e}")
```

### 2. Client-Side Validations
To prevent unnecessary network calls, the SDK validates basic parameters before sending the HTTP request:
*   `spans` must be a non-empty `list`.
*   Each span must be a `dict`.
*   Each span must contain all required tracing keys: `trace_id`, `span_id`, `service_name`, `operation_name`, `duration_ms`, and `status`.

Failure to meet these client-side validations raises standard Python `TypeError` or `ValueError` exceptions immediately.
