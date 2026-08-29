# TraceStory — Complete Project Documentation

This document serves as the master placement-preparation guide and technical study documentation for the **TraceStory Observability AI** project. It details the complete project history, architecture, workflows, algorithms, testing logs, and interview preparation questions.

---

## 1. Project Overview

**TraceStory** is an AI-powered distributed tracing and observability platform. Distributed systems are difficult to monitor because a single user transaction travels through multiple service boundaries over the network. When a request fails or experiences latency, developers are forced to parse unreadable, nested JSON telemetry logs to locate the issue.

TraceStory solves this problem by:
*   **Ingesting** distributed trace spans directly from external applications via an HTTP API or Python SDK.
*   **Classifying** trace logs into domain dashboards (Banking, Food Delivery, Retail, General).
*   **Analyzing** system behaviors deterministically to flag explainable Incidents.
*   **Locating** the exact culprit span utilizing a custom Root Cause Analysis (RCA) scoring algorithm.
*   **Summarizing** execution bottlenecks and errors into plain-English narratives using Large Language Models (LLMs).
*   **Visualizing** trace timelines (Gantt-style charts), metrics dashboards, comparison reports, and incident logs in a professional, deep-black observability dashboard.

---

## 2. Problem Statement

In microservices architectures, user actions trigger a chain of internal service calls (e.g. `api-gateway` ──► `auth-service` ──► `payment-service` ──► `database-service`). 
If the overall request takes 2 seconds or crashes:
*   **Logs are siloed**: Each service writes its own logs, making cross-boundary timelines hard to reconstruct.
*   **JSON is unreadable**: A raw distributed trace payload is a verbose, deeply nested list of timestamps and IDs.
*   **Bottlenecks are hidden**: Without correlation, it is difficult to determine if a slow response is caused by a slow database query, network transport overhead, or an external API timeout.
*   **Alert fatigue is real**: Standard systems flag every minor error or slow query, masking the true root cause of failure.

TraceStory takes this complex distributed telemetry, correlates spans by context propagation, and provides plain-English diagnostics immediately.

---

## 3. Project Evolution

The platform evolved chronologically through ten distinct development stages:

### Stage 1 — Initial TraceStory
*   **Core Setup**: Built a React frontend, a FastAPI backend, and an SQLite database utilizing SQLAlchemy ORM.
*   **Trace Ingestion**: Created endpoints to accept distributed tracing span data.
*   **Service Simulators**: Designed simulated distributed workloads using OpenTelemetry to mimic real-world system interactions:
    *   **Banking**: Traces representing token verification, ledger updates, and SMS notifications.
    *   **Food Delivery**: Traces representing checkout validation, restaurant confirmation, and driver assignment.
    *   **Retail**: Traces representing inventory checking, coupon validation, checkout processing, and shipping.
    *   **Demo/General**: A generic gateway status query flow.
*   **AI Summaries**: Used LLMs to summarize raw JSON telemetry into natural language.

### Stage 2 — Professional UI Redesign
*   **Dark Theme**: Transitioned the frontend to a professional black observability dashboard.
*   **Layout Elements**: Introduced a structural Sidebar, a functional TopBar, and responsive Metric Cards displaying metrics (total spans, error counts, latency statistics).
*   **Observability Views**:
    *   **All Traces**: Table summarizing ingested traces.
    *   **Trace Detail**: Timeline Gantt chart visualization showing parent-child relationships and span durations.
    *   **Compare View**: Side-by-side comparison of two traces to isolate latency regressions.
    *   **Paste Trace**: A JSON input pane allowing developers to paste and ingest raw telemetry.

### Stage 3 — AI Classification
*   **Domain Classification**: Introduced a classification model using rule-based fallbacks and Groq API calls to route incoming traces to specific domain dashboards.
*   **Dashboards**: Categorized traces into **Banking**, **Food Delivery**, **Retail**, or **General** views to organize complex service architectures.

### Stage 4 — AI Summary vs. AI Classification
*   **Scope Separation**: Differentiated between **AI Classification** (done at ingestion to route traces based on keywords/services) and **AI Summary** (done to explain latency regressions and error causes in plain English).

### Stage 5 — Scope Refinements
*   **Over-Engineering Prevention**: Removed heavy proprietary auto-instrumentation packages, HTTPX wrappers, GZIP transport layers, multi-tenancy auth blocks, and billing connectors to maintain a fast, local, and lightweight core engine.

### Stage 6 — Integration-Ready HTTP API
*   **Public API Ingest**: Configured `POST /api/ingest` and `/api/ingest/paste` with Pydantic field constraints (minimum length checks for IDs, non-negative latency, case-insensitive status enums) and SQLite duplicate span skipping.

### Stage 7 — Python SDK
*   **Zero-Dependency client**: Implemented `tracestory_sdk`, a lightweight client package wrapping standard `urllib.request` libraries (requiring zero external pip dependencies). Translates backend validation lists into readable client exceptions.

### Stage 8 — Incident Detection
*   **Explainable Detection**: Implemented deterministic rules checking for errors, latency dominance (single span consuming $\ge 70\%$ of request time), or high category latency compared to historical averages.

### Stage 9 — Root Cause Analysis (RCA)
*   **RCA Scorer**: Added `backend/services/rca.py` to evaluate child/parent relationships, scoring each span based on error statuses, latency percentage, leaf nodes (downstream calls), and error attributes. Caches analysis logs and LLM explanations in the database.

### Stage 10 — Final Cleanup
*   **Polish**: Removed non-functional Settings/Notification buttons in `TopBar.js`, cleaned unused lucide icon imports across frontend components, and ran full validation test suites to ensure 0 compile warnings or errors.

---

## 4. Final Architecture

```
External Application
        │
        ├────────────── HTTP API (direct HTTP POST)
        │
        └────────────── Python SDK (tracestory_sdk wrapper client)
                         │
                         ▼
                 POST /api/ingest
                         │
                         ▼
                  FastAPI Backend
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
        Validation   Classification  Incident
       (Pydantic)    (Rule/LLM)     Detection
              │          │          │
              └──────────┼──────────┘
                         ▼
                    RCA Analysis (rca.py Scoring Engine)
                         │
                         ▼
                     AI Summary (Groq LLaMA / Fallbacks)
                          │
                          ▼
                    PostgreSQL Database (spans, trace_summaries, incidents tables)
                          │
                          ▼
                    React Frontend (Obsvervability Dashboard)
                         │
       ┌─────────┬───────┼────────┬─────────┐
       ▼         ▼       ▼        ▼         ▼
   All Traces Incidents Banking  Compare  Trace Detail
                         │
                 Food / Retail / General
```

---

## 5. Backend Architecture

The backend is built with Python and FastAPI, located under the `backend/` directory:

*   [backend/main.py](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/backend/main.py): Sets up the FastAPI app, manages CORS origins, automatically initializes the database engine tables, and registers API routers.
*   [backend/database.py](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/backend/database.py): Configures SQLAlchemy connection session markers (resolving PostgreSQL via `DATABASE_URL` with SQLite thread fallbacks).
*   [backend/models.py](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/backend/models.py): Defines DB schemas: `Span` (raw telemetry), `TraceSummary` (AI summaries and metrics), and `Incident` (RCA findings, severities, and AI root cause descriptions).
*   [backend/routers/ingest.py](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/backend/routers/ingest.py): Handles ingestion endpoints. Runs Pydantic validators, checks and discards duplicate spans, and triggers the classification/summarization/incident pipeline.
*   [backend/routers/traces.py](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/backend/routers/traces.py): Serves list data, embedding lazy-evaluated incident information for legacy traces.
*   [backend/routers/summary.py](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/backend/routers/summary.py): Fetches trace summary summaries or triggers summaries generation.
*   [backend/routers/incidents.py](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/backend/routers/incidents.py): Exposes `GET /api/incidents` and `GET /api/incidents/{trace_id}` to retrieve RCA metadata.
*   [backend/services/parser.py](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/backend/services/parser.py): Groups raw flat spans list into structured call hierarchies.
*   [backend/services/summarizer.py](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/backend/services/summarizer.py): Integrates with the Groq API (LLaMA-3.1-8b) to run trace routing classification, trace summarizations, and rule-based fallbacks.
*   [backend/services/rca.py](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/backend/services/rca.py): Evaluates trace latency dominance, computes span suspicion scores, identifies likely root causes, and generates the AI explanation.

---

## 6. Frontend Architecture

The React single-page application is structured under `frontend/src/`:

*   [frontend/src/App.js](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/frontend/src/App.js): Serves as the central application shell, managing the active view state and mounting dashboard panels.
*   [frontend/src/components/Sidebar.js](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/frontend/src/components/Sidebar.js): The left-side navigation panel divided into logical groups: Ingest, Views, and Categories.
*   [frontend/src/components/TopBar.js](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/frontend/src/components/TopBar.js): Header containing the trace search engine and static Admin indicators.
*   [frontend/src/components/PasteTrace.js](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/frontend/src/components/PasteTrace.js): Code input editor for pasting custom JSON spans. Formats FastAPI validation details to prevent React child rendering crashes.
*   [frontend/src/components/AllTraces.js](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/frontend/src/components/AllTraces.js): Renders traces in lists with metric aggregates (error rates, durations) and severity incident badges.
*   [frontend/src/components/TraceDetail.js](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/frontend/src/components/TraceDetail.js): Displays trace timelines in Gantt style, parent-child hierarchies, attributes tables, AI summary narratives, and the Incident RCA drawer card.
*   [frontend/src/components/CompareView.js](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/frontend/src/components/CompareView.js): Mounts a split panel comparing latency logs and highlighting regression roots.
*   [frontend/src/components/IncidentsList.js](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/frontend/src/components/IncidentsList.js): Displays active system incident tickets, detailing root causes and severities.
*   [frontend/src/components/MetricCard.js](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/frontend/src/components/MetricCard.js): Small dashboard metric widget displaying values and icons.

---

## 7. Trace Ingestion Flow

1.  **Application Workload**: An external system generates OpenTelemetry-compatible span events.
2.  **API Transport**: The spans are submitted via HTTP POST to `/api/ingest` (or manually pasted in the UI).
3.  **Pydantic Assertions**: FastAPI checks the payload for correct data types, non-empty IDs/names, and case-insensitive status entries.
4.  **Database Commit**: Clean, non-duplicate spans are committed to the database (PostgreSQL or local SQLite fallback).
5.  **Domain Classification**: `classify_trace` matches trace operations to keywords, falling back to LLaMA classification to route the trace to a category.
6.  **Incident Evaluation**: The system runs `evaluate_incident()` to verify if spans violate errors, latency, or SLA average baselines.
7.  **RCA Scoring**: If an incident is detected, it runs a deterministic scoring algorithm to identify the root cause span, queries Groq for explanation context, and caches the result.
8.  **AI Summarization**: The backend calls `generate_summary()` to write a plain-English explanation.
9.  **Relational Persistence**: The summary, category classification, and incident details are saved in `trace_summaries` and `incidents`.
10. **Frontend Display**: React pulls summaries, updates dashboards, and displays timeline Gantt blocks.

---

## 8. AI Classification

*   **Definition**: Classification routes trace telemetry into business category channels.
*   **Supported Categories**: `banking`, `food`, `retail`, or `general`.
*   **Resolution Strategy**:
    *   *Direct Assignment*: Checks if the span payload contains category tags.
    *   *Keyword Parsing*: Scans operation and service names for key matches (e.g. `ledger` ──► `banking`, `restaurant` ──► `food`).
    *   *AI Fallback*: Prompts the LLaMA model to categorize based on service architecture.
*   **Classification vs. AI Summary**: Classification is an ingestion-time routing decision, whereas the AI Summary is a narrative analysis explaining execution times and error events.

---

## 9. AI Summary

*   **Context Provided**: The model is prompted with structured JSON trace parameters: service name, operation name, absolute latencies, status flags, attributes, and total trace timings.
*   **AI Summary Output**: A 2-3 sentence overview highlighting errors and slow services.
*   **Rule-Based Fallbacks**: If Groq is unavailable, a local python parser calculates the slowest span and failed operations to formulate a backup summary.

---

## 10. Incident Detection

*   **Anomalous Signals**:
    1.  *Error Condition*: One or more spans have `status == "ERROR"`.
    2.  *Latency Dominance*: A single span takes $\ge 70\%$ of the trace's total duration.
    3.  *High Total Latency*: Total trace duration is $\ge 1.5\times$ higher than the category average.
*   **Severity Tiers**: `LOW` (minor bottlenecks), `MEDIUM` (isolated error or significant latency), `HIGH` (errors combined with latency bottlenecks, or severe SLA deviations), and `CRITICAL` (multiple error spans and major bottlenecks).
*   **Why It Differs from Red Spans**: An individual operation failing (`ERROR`) might be a minor retryable warning. An **Incident** flags systemic regressions or severe bottlenecks affecting the overall user request.

---

## 11. Root Cause Analysis

*   **Deterministic Scorer**: Scores spans using predefined points:
    *   `ERROR` status: `+100` points
    *   Latency share: `percentage * 50` points
    *   Error metadata: `+20` points (e.g. if the attributes dict contains `"error"` or `"exception"`)
    *   Leaf Node: `+10` points (spans with no children in the trace tree structure, indicative of database/cache/downstream issues)
    *   Absolute Duration: `min(duration_ms / 100, 30)` points (for spans taking $> 100 \text{ ms}$)
*   **AI explanation**: Generates a 1-2 sentence description explaining the root cause span, utilizing a rule-based backup string if Groq is offline.

---

## 12. Compare Feature

Compare mode takes two trace IDs, groups their service operations side-by-side, identifies where latencies diverge (e.g. baseline `check_stock` takes 50ms, regression trace takes 800ms), and calls the AI summarizer to explain the performance degradation.

---

## 13. Integration API

*   **Endpoint**: `POST /api/ingest`
*   **Payload Format**:
    ```json
    {
      "spans": [
        {
          "trace_id": "tx-100",
          "span_id": "span-200",
          "parent_id": "span-199",
          "service_name": "payment-service",
          "operation_name": "charge_card",
          "duration_ms": 120.4,
          "status": "OK",
          "attributes": {
            "amount": 25.0
          }
        }
      ]
    }
    ```
*   **Response**: `{"message": "1 spans ingested successfully", "category": "retail"}`.

---

## 14. Python SDK

*   **Package**: `tracestory_sdk`
*   **Client Class**: `TraceStory` initialized with base URL.
*   **Mechanism**: Uses Python standard library `urllib` to make HTTP POST requests, avoiding third-party package dependencies like `httpx` or `requests`.
*   **Validation**: Performs client-side checks and converts backend HTTP errors into structured exceptions (`TraceStoryError`).

---

## 15. Database Schema & Relationships

```
┌─────────────────────────────────┐
│              spans              │
├─────────────────────────────────┤
│ span_id (PK, String)            │
│ trace_id (String, FK-Link)      │◄───────┐
│ parent_id (String, Nullable)    │        │
│ service_name (String)           │        │
│ operation_name (String)         │        │
│ duration_ms (Float)             │        │
│ status (String)                 │        │
│ attributes (JSON)               │        │
│ category (String)               │        │
│ created_at (DateTime)           │        │
└─────────────────────────────────┘        │
                                           │
┌─────────────────────────────────┐        │ (trace_id links)
│         trace_summaries         │        │
├─────────────────────────────────┤        │
│ trace_id (PK, String)           │◄───────┤
│ summary (Text)                  │        │
│ root_service (String)           │        │
│ total_duration_ms (Float)       │        │
│ has_error (String)              │        │
│ category (String)               │        │
│ created_at (DateTime)           │        │
└─────────────────────────────────┘        │
                                           │
┌─────────────────────────────────┐        │
│            incidents            │        │
├─────────────────────────────────┤        │
│ trace_id (PK, String)           │◄───────┘
│ severity (String)               │
│ title (String)                  │
│ root_cause_span_id (String)     │
│ root_cause_service (String)     │
│ root_cause_operation (String)   │
│ reason (String)                 │
│ duration_ms (Float)             │
│ status (String)                 │
│ latency_percentage (Float)      │
│ explanation (Text, Nullable)    │
│ created_at (DateTime)           │
└─────────────────────────────────┘

---

## 15b. Database Architecture

### Original
SQLite

### Current
PostgreSQL

### Rationale
Moving to PostgreSQL was done to prepare the application for external integration and production deployment. Rationale points:
- **Concurrent Access**: PostgreSQL safely coordinates multiple concurrent write operations from different external client instances, which would block or lock a single-write SQLite file.
- **Production Deployment**: Platforms like Render expect robust, client-server databases rather than local disk files which are wiped on server restart/redeploy.
- **Scalability & Persistence**: Ensures transaction traces are safely and permanently stored, queryable over long-term operations, and scales with data volume.
- **ORM Isolation**: The application uses SQLAlchemy so the database implementation remains separated from the application logic.
```

---

## 16. Testing

### Test Suites
*   [tests/test_e2e.py](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/tests/test_e2e.py): End-to-end integration test spawning backend, ingesting traces, and asserting classifications. Handles database locks on Windows consoles safely by truncating tables directly using SQLite.
*   [tests/test_rca.py](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/tests/test_rca.py): Unit tests for incident detection, scoring thresholds, and fallbacks.
*   [tests/test_sdk.py](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/tests/test_sdk.py): Mock tests asserting SDK client parameter checks and error conversions.
*   [tests/verify_invalid_payloads.py](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/tracestory/tests/verify_invalid_payloads.py): Integration test checking validation rules against incorrect API requests.

### Test Results
Running `pytest` passes all 13 tests:
```
tests\test_e2e.py .                                                      [  7%]
tests\test_rca.py .......                                                [ 61%]
tests\test_sdk.py .....                                                  [100%]

======================= 13 passed, 1 warning in 25.37s ========================
```

---

## 17. Known Limitations

*   **Local SQLite Persistence**: SQLite is single-write only, which can limit scalability under high-throughput concurrent ingestion workloads.
*   **No Authentication/Security**: Ingestion API endpoints have no JWT authentication, API keys, or role-based access control (RBAC).
*   **Manual Instrumentation**: TraceStory does not support auto-instrumentation or framework injection agents; developers must manually export span lists.
*   **Static SLA Baselines**: High-latency anomalies rely on static averages rather than dynamic percentiles.

---

## 18. Why Certain Features Were Omitted

To keep the platform lightweight and local, several features were intentionally avoided:
*   **Kafka/RabbitMQ**: Added unnecessary infrastructure overhead for local workloads.
*   **Celery/Redis**: Avoided to keep the system serverless and run backend processes in-memory without background worker setups.
*   **OTel Auto-Instrumentation**: Explicit REST API endpoints provide clearer code control and easier language integrations.
*   **GZIP/Batching/Billing**: Removed to keep the client SDK simple, readable, and easy to maintain.

---

## 19. Interview Questions

### General Observability
*   **Q: What is TraceStory?**
    *   *A*: TraceStory is an AI-powered distributed tracing and observability platform that ingests distributed trace JSON payloads, visualizes execution paths, detects abnormal behavior, and uses LLMs to write plain-English summaries and root cause explanations.
*   **Q: What problem does it solve?**
    *   *A*: In microservice architectures, requests span across multiple service boundaries. Diagnosing failures or latency spikes from raw JSON logs is slow and complex. TraceStory translates this telemetry into natural language and highlights bottlenecks automatically.
*   **Q: Why distributed tracing?**
    *   *A*: Traditional logging tracks isolated service events. Distributed tracing links related calls across network boundaries using a shared correlation ID, enabling system-wide timeline analysis.
*   **Q: What is a span?**
    *   *A*: The basic building block of a trace. It represents a single unit of work (e.g. database query, authorization check) with start/end times, metadata, and status.
*   **Q: What is a trace?**
    *   *A*: A collection of parent-child spans representing the complete end-to-end execution path of a transaction request.

### Backend & Databases
*   **Q: Why FastAPI?**
    *   *A*: FastAPI is fast, asynchronous, auto-generates OpenAPI specs, and uses Pydantic to enforce data validation.
*   **Q: How does `/api/ingest` work?**
    *   *A*: It validates the JSON format against Pydantic models, skips duplicate spans, persists them to the database, routes the trace to a category, and triggers incident detection and RCA.
*   **Q: Why Pydantic?**
    *   *A*: It enforces strict types (e.g., non-negative duration, string lengths) at the API boundary, returning clear HTTP 422 validations for bad data.
*   **Q: Why SQLite?**
    *   *A*: It is a serverless, local database file that requires zero setup, making it ideal for local testing and prototyping.
*   **Q: Why did you move from SQLite to PostgreSQL?**
    *   *A*: We initially used SQLite because it was simple for local development. When preparing TraceStory for external integration and deployment, I moved to PostgreSQL because TraceStory can receive telemetry from multiple external applications and PostgreSQL provides better concurrency, persistence, and scalability.
*   **Q: How are parent-child spans represented?**
    *   *A*: Through the `parent_id` column. If span B has `parent_id` matching span A's `span_id`, span B is a child operation of span A.

### Frontend
*   **Q: Why React?**
    *   *A*: React allows building a responsive, single-page application dashboard with reusable components.
*   **Q: How does `App.js` manage views?**
    *   *A*: It uses a state variable `currentView` (e.g. `"paste"`, `"all"`, `"incidents"`) to determine which dashboard component to mount.
*   **Q: How does Trace Detail work?**
    *   *A*: It fetches all spans for a trace, sorts them by timestamp, and renders a Gantt timeline showing parent-child hierarchies and absolute execution latencies.

### AI Capabilities
*   **Q: What does classification do?**
    *   *A*: Routes traces to specific domain dashboards (Banking, Food Delivery, Retail, General) by parsing service names for keywords or calling LLaMA.
*   **Q: What does summarization do?**
    *   *A*: Translates the trace timelines, error statuses, and attributes into a short plain-English explanation of the transaction.
*   **Q: Why use an LLM?**
    *   *A*: LLMs excel at synthesizing unstructured attributes and complex dependencies into a readable narrative for operators.
*   **Q: What happens if the LLM fails?**
    *   *A*: The backend catches the exception and falls back to a rule-based generator that calculates the slowest span and failed operations, ensuring the system remains functional.

### Incident Detection & RCA
*   **Q: What is an incident?**
    *   *A*: A trace exhibiting abnormal behavior, such as containing failed spans, latency bottlenecks, or exceeding SLA execution times.
*   **Q: Why isn't every ERROR span an incident?**
    *   *A*: A minor, non-blocking operation (e.g. a failed retryable notification) might return `ERROR` but not impact the user transaction. Incidents are reserved for significant system regressions.
*   **Q: How do you detect latency anomalies?**
    *   *A*: By checking if a single span consumes $\ge 70\%$ of the request duration, or if total duration exceeds $1.5\times$ the category average.
*   **Q: How does RCA select the root cause?**
    *   *A*: It uses a scoring algorithm that awards points for errors, latency contributions, leaf node positions (downstream APIs/DBs), and error attributes.
*   **Q: Why use deterministic scoring instead of a pure LLM?**
    *   *A*: Deterministic scoring is explainable, consistent, and fast. The LLM is used only to translate these findings into a natural language description.

### Integration
*   **Q: How can another application use TraceStory?**
    *   *A*: By posting JSON trace lists to `/api/ingest` directly or using the `tracestory_sdk` Python client.
*   **Q: What is an SDK?**
    *   *A*: A Software Development Kit that abstracts low-level network details (HTTP requests, JSON parsing, error mappings) into easy-to-use client methods.
*   **Q: Why create a Python SDK?**
    *   *A*: It provides developers with a convenient, type-safe wrapper to ingest traces with minimal code.
*   **Q: How does the SDK communicate with TraceStory?**
    *   *A*: It posts JSON payloads to the `/api/ingest` HTTP endpoint via Python's standard `urllib` module.
*   **Q: Why doesn't the SDK access the database?**
    *   *A*: To maintain separation of concerns. The client SDK is responsible only for transport, while the backend API handles validation, routing, persistence, and AI summaries.

### Architecture & Production
*   **Q: Explain the complete project flow.**
    *   *A*: Client triggers trace ──► SDK wraps and posts to `/api/ingest` ──► FastAPI validates ──► Commits to SQLite ──► Ingestion triggers classification, incident detection, and RCA scoring ──► Caches summary results ──► React pulls data and updates the UI.
*   **Q: What would you change for production?**
    *   *A*: I would migrate persistence to ClickHouse, introduce Redis for caching, buffer requests with Kafka, and add OAuth2 JWT security.
*   **Q: What are the current limitations?**
    *   *A*: Lack of user authentication, local file database write locks, manual trace export, and static SLA averages.

---

## 20. Final Placement Explanation

### 30-Second Version
"TraceStory is an AI-powered distributed tracing platform that translates complex microservice traces into plain-English diagnostics. External apps ingest data through our HTTP API or zero-dependency Python SDK. The FastAPI backend validates telemetry, classifies traces into business domains, runs a scoring algorithm to identify the root cause of failures, and generates natural-language incident summaries using Groq's LLaMA model."

### 1-Minute Version
"TraceStory is an observability platform designed to simplify debugging in microservice architectures. Modern requests traverse multiple boundaries, producing unreadable JSON traces. TraceStory ingests this telemetry via an API or a custom, lightweight Python SDK. 
The backend groups spans, validates data types using Pydantic, and routes traces to category dashboards (Banking, Food, Retail, General). It then runs a deterministic incident detection engine checking for error spans or latency regressions. If an anomaly is found, a scoring algorithm analyzes the trace tree to isolate the root cause span. Finally, LLaMA summarizes the issue into a plain-English explanation, displayed on a responsive, dark-themed React dashboard."

### 2-Minute Version
"TraceStory is an AI-enhanced distributed tracing platform that solves log fragmentation and alert fatigue in distributed systems. When a microservices request fails or slows down, finding the source is difficult. TraceStory provides a clean, open HTTP ingestion API and a custom Python SDK to stream OTel-compatible spans to a FastAPI backend.
The backend parses spans, enforces strict validation constraints, and performs domain-specific classification. An incident detection engine evaluates execution parameters against SLA baselines. When anomalies are detected, a deterministic scoring algorithm ranks spans by error status, latency share, leaf node positions, and error attributes to pinpoint the exact root cause. 
Rather than forcing operators to inspect timeline charts manually, TraceStory queries Groq's LLaMA model to write a concise, plain-English summary of what broke and why. These insights are cached in a local SQLite database and served to a React frontend, which displays timeline charts, comparison reports, and active incident lists."

### Detailed Technical Architecture Version
"TraceStory is structured as a decoupled web application utilizing python, React, SQLite, and Groq LLaMA models. 

On the ingestion path, client services send JSON arrays of spans to `/api/ingest` using the zero-dependency standard library `tracestory_sdk`. FastAPI validates this data using Pydantic models (e.g. `SpanInput`). To prevent integrity conflicts, a deduplication step discards pre-existing `span_id` entries.

Once spans are committed via SQLAlchemy, the ingestion pipeline evaluates the trace. It calculates total duration, checks for errors, and queries SQLite to find the historical average duration of the category baseline. 

Next, the trace is routed to a domain dashboard using keyword parsing and LLM fallbacks. If the trace is abnormal, `backend/services/rca.py` runs incident checks. Spans are scored based on failure statuses (+100), latency share (up to +50), error attributes (+20), and leaf node positions (+10). The highest-scoring span is designated as the root cause. 

The backend then queries Groq's LLaMA model, sending it details of the root cause span and trace timings to generate a 1-2 sentence plain-English explanation. If Groq is rate-limited or offline, the system falls back to a rule-based parser. 

These summaries and classification categories are cached in the database. The React frontend pulls data from `/api/traces` and `/api/incidents` to render domain-specific views, timeline Gantt charts, metrics aggregates, and detailed root-cause explanation cards."
