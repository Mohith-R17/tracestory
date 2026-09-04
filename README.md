# TraceStory — Observability

Converts unreadable distributed traces into plain-English summaries, detects incidents, and diagnoses root causes using AI.

---

## Project Overview

**TraceStory** is an AI-powered distributed tracing and observability platform. Distributed systems are difficult to monitor because a single user transaction travels through multiple service boundaries over the network. When a request fails or experiences latency, developers are forced to parse unreadable, nested JSON telemetry logs to locate the issue.

TraceStory solves this problem by:
*   **Ingesting** distributed trace spans directly from external applications via an HTTP API or Python SDK.
*   **Classifying** trace logs into domain dashboards (Banking, Food Delivery, Retail, General).
*   **Analyzing** system behaviors deterministically to flag explainable Incidents.
*   **Locating** the exact culprit span utilizing a custom Root Cause Analysis (RCA) scoring algorithm.
*   **Summarizing** execution bottlenecks and errors into plain-English narratives using Large Language Models (LLMs).
*   **Visualizing** trace timelines (Gantt-style charts), metrics dashboards, comparison reports, and incident logs in a professional, deep-black observability dashboard.

---

## Problem Statement

In microservices architectures, user actions trigger a chain of internal service calls (e.g. `api-gateway` ──► `auth-service` ──► `payment-service` ──► `database-service`). 
If the overall request takes 2 seconds or crashes:
*   **Logs are siloed**: Each service writes its own logs, making cross-boundary timelines hard to reconstruct.
*   **JSON is unreadable**: A raw distributed trace payload is a verbose, deeply nested list of timestamps and IDs.
*   **Bottlenecks are hidden**: Without correlation, it is difficult to determine if a slow response is caused by a slow database query, network transport overhead, or an external API timeout.
*   **Alert fatigue is real**: Standard systems flag every minor error or slow query, masking the true root cause of failure.

TraceStory takes this complex distributed telemetry, correlates spans by context propagation, and provides plain-English diagnostics immediately.

---

## Key Features

- **AI-Powered Trace Summarization**: Translates raw trace timing data and error strings into a 2-3 sentence natural language explanation of the request execution (Groq + LLaMA 3.1).
- **Domain Classification Routing**: Inspects service and operation names to automatically categorize traces into Banking, Food Delivery, Retail, or General views.
- **Incident Detection**: Evaluates system behavior deterministically to flag incidents based on failures, latency dominance ($\ge 70\%$ execution share), and SLA baselines.
- **Root Cause Analysis (RCA)**: Pinpoints the exact failure culprit utilizing a deterministic scoring algorithm (assessing error status, duration, leaf node position, and attributes).
- **Compare Traces**: Compares a baseline and regression trace side by side, highlighting duration deltas and isolating performance bottlenecks.
- **Timeline Gantt Charts**: Draws distributed parent-child spans in a nesting layout showing sequence, depth, and duration metrics.
- **Zero-Dependency Python SDK**: A lightweight, urllib-based client wrapper for external application integration.
- **Direct HTTP Ingestion**: Accepts standard OpenTelemetry-compatible span arrays via `POST /api/ingest`.

---

## Complete Project Flow

```
External Application (Direct HTTP / Python SDK)
                     │
                     ▼
          POST /api/ingest Endpoint
                     │
                     ▼
          FastAPI Ingestion Router
                     │ (Pydantic validation, deduplication)
                     ▼
         Active Database Ingest
         (PostgreSQL / local SQLite)
                     │
            ┌────────┴────────┐
            ▼                 ▼
     AI Classification     Incident Detection & RCA
     (Keyword / LLaMA)     (Latency/Error Scorer)
            │                 │
            └────────┬────────┘
                     ▼
               AI Summarizer (Groq LLaMA / Fallbacks)
                     │
                     ▼
             Persist Summaries & Incidents in DB
                     │
                     ▼
             React UI Refresh (Axios GET pulls)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.14, FastAPI |
| **Database** | PostgreSQL 17 (production/local), SQLite (fallback), SQLAlchemy ORM |
| **AI Client** | Groq SDK (LLaMA-3.1-8b-instant model) |
| **Frontend** | React, Axios, Vanilla CSS |
| **Testing** | pytest, pytest-anyio |

---

## Backend Architecture

The backend is built with Python and FastAPI under `backend/`:
*   [`main.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/backend/main.py): Registers routers, CORS settings, health check routes, and initializes databases.
*   [`database.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/backend/database.py): Manages connections. Automatically normalizes Render/PostgreSQL connection string prefixes (`postgres://` / `postgresql://` ──► `postgresql+psycopg://`) and loads drivers.
*   [`models.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/backend/models.py): Defines schemas for `spans`, `trace_summaries`, and `incidents`.
*   [`routers/`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/backend/routers): Exposes REST APIs: `/api/ingest`, `/api/traces`, `/api/summary`, `/api/incidents`.
*   [`services/rca.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/backend/services/rca.py): Evaluates latency regressions, SLA breaches, and executes the Root Cause Analysis scoring engine.
*   [`services/summarizer.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/backend/services/summarizer.py): Prompts Groq for summarization, classification, compare mode details, and runs rule-based backup fallbacks.

---

## Frontend Architecture

The React UI is located under `frontend/src/`:
*   [`App.js`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/frontend/src/App.js): Core container routing view states.
*   [`components/Sidebar.js`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/frontend/src/components/Sidebar.js): Navigation panel mapping dashboards and ingest forms.
*   [`components/TopBar.js`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/frontend/src/components/TopBar.js): Header containing query searching.
*   [`components/TraceDetail.js`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/frontend/src/components/TraceDetail.js): Renders trace Gantt timelines and the custom AI RCA cards.
*   [`components/IncidentsList.js`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/frontend/src/components/IncidentsList.js): Displays active system incidents and their root cause explanations.
*   [`components/CompareView.js`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/frontend/src/components/CompareView.js): Compares two traces side-by-side.

---

## Project Structure

```
tracestory/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── database.py             # DB connection session configuration
│   ├── models.py               # SQLAlchemy schema definitions
│   ├── routers/
│   │   ├── ingest.py           # Telemetry ingestion endpoint
│   │   ├── traces.py           # Trace list/detail API
│   │   ├── summary.py          # AI summary/compare API
│   │   └── incidents.py        # RCA list/details API
│   └── services/
│       ├── parser.py           # Tracing timeline call tree parser
│       ├── summarizer.py       # Groq AI summary & classification tasks
│       └── rca.py              # Incident scoring & RCA engine
├── docs/
│   ├── deployment.md           # Render/Vercel production deployment guides
│   ├── integration.md          # REST API payloads & curl schemas
│   └── sdk.md                  # Python Client SDK operations guide
├── examples/
│   ├── external_app.py         # Standard urllib ingestion integration
│   └── sdk_example.py          # tracestory_sdk integration
├── frontend/                   # React Single-Page Application (SPA)
├── screenshots/                # Dashboard PNG captures
├── tests/                      # pytest unit/integration test suites
├── tracestory_sdk/             # Python Client SDK package directory
├── TraceStory_Project_Notes.md # Master placement preparation note file
├── requirements.txt            # Python dependencies file
├── .env.example                # Local environment placeholders
└── .gitignore                  # Git untracked ignore rules
```

---

## Setup & Run

### 1. Database Creation
Make sure PostgreSQL 17 is running, and create the local `tracestory` database:
```bash
psql -U postgres -c "CREATE DATABASE tracestory;"
```

### 2. Configure Environment
Duplicate the environment template file:
```bash
cp .env.example .env
```
Update `.env` with your PostgreSQL password and Groq API key:
```env
DATABASE_URL=postgresql+psycopg://postgres:yourpassword@localhost:5432/tracestory
GROQ_API_KEY=gsk_yourkeyhere
FRONTEND_ORIGIN=http://localhost:3000
```

### 3. Setup Virtual Environment & Install Dependencies
```bash
# Create and activate virtual environment
python -m venv .venv
# On Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### 4. Running the Backend
```bash
python -m uvicorn backend.main:app --reload --port 8000
```
*   Backend API runs at: `http://127.0.0.1:8000`
*   OpenAPI docs run at: `http://127.0.0.1:8000/docs`

### 5. Running the Frontend
```bash
cd frontend
npm install
npm start
```
*   React dashboard runs at: `http://localhost:3000`

---

## Ingesting Traces

### Using the Python SDK
Initialize the SDK client and push your spans array:
```python
from tracestory_sdk import TraceStory
client = TraceStory("http://localhost:8000")
response = client.send_trace(spans)
```
See [docs/sdk.md](docs/sdk.md) for full SDK features.

### Using Direct HTTP Integration
Post a wrapped JSON list containing the spans array to `/api/ingest`:
```bash
curl -X POST http://localhost:8000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"spans": [{"trace_id": "tx-1", "span_id": "s-1", "parent_id": null, "service_name": "gateway", "operation_name": "auth", "duration_ms": 15.0, "status": "OK", "attributes": {}}]}'
```
See [docs/integration.md](docs/integration.md) for endpoint details and attributes documentation.

---

## Running Verification Tests

Run the complete test suite (E2E integration, RCA scoring rules, and SDK mocks):
```bash
# From workspace root
.venv\Scripts\python -m pytest
```

---

## Deployment Architecture

```
[ Vercel Static Hosting ] (React UI Frontend)
           │
           ▼
[ Render Web Service ] (FastAPI Backend Server) ◄─────► [ Groq API ] (LLaMA Summaries)
           │
           ▼
[ Render Databases ] (PostgreSQL 17 Database Engine)
```
*   The repository includes a `render.yaml` Blueprint for automated backend and database provisioning.
*   See [docs/deployment.md](docs/deployment.md) for step-by-step instructions on Render/Vercel production setups.
