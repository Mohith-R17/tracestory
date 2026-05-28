# 🔍 TraceStory — Observability AI

> Converts unreadable distributed traces into plain-English summaries using AI.

Engineers waste hours reading unreadable distributed traces. TraceStory takes raw span data and generates a 2-3 sentence plain-English explanation of what happened, which service was slowest, and where errors occurred.

---

## Screenshots

### All Traces Dashboard
![All Traces](screenshots/1_all_traces.png)

### Trace Timeline + AI Summary
![Summary](screenshots/2_general_summary.png)

### Banking Traces
![Banking](screenshots/3_banking.png)

### Food Delivery Traces
![Food](screenshots/4_food_delivery.png)

### Retail Traces
![Retail](screenshots/5_retail.png)

### Compare Traces with Difference Analysis
![Compare](screenshots/6_compare.png)

### Paste Your Own Trace
![Paste](screenshots/7_paste_trace.png)

---

## Features

- AI-powered trace summarization (Groq + LLaMA 3.1)
- Trace timeline visualization (Gantt-style)
- Filter traces by ERROR / OK status
- Category views: Banking, Food Delivery, Retail, General
- Compare two traces side by side with AI difference analysis
- Paste any trace JSON and get instant AI summary
- Auto-refresh dashboard every 10 seconds
- Real OpenTelemetry instrumentation with custom exporter

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI |
| Database | PostgreSQL, SQLAlchemy |
| AI | Groq API (LLaMA 3.1 8B Instant) |
| Tracing | OpenTelemetry SDK |
| Frontend | React, Axios |

---

## Project Structure
tracestory/
├── backend/
│   ├── main.py               # FastAPI app entry point
│   ├── models.py             # SQLAlchemy DB models
│   ├── database.py           # DB connection and session
│   ├── routers/
│   │   ├── ingest.py         # POST /ingest — receives spans
│   │   ├── traces.py         # GET /traces — list and detail
│   │   └── summary.py        # GET /summary — AI summary + compare
│   └── services/
│       ├── parser.py         # Parses raw spans for LLM input
│       └── summarizer.py     # Groq LLM calls
├── frontend/
│   └── src/
│       └── App.js            # Full React dashboard
├── screenshots/              # README screenshots
├── banking_service.py        # OpenTelemetry banking demo
├── food_service.py           # OpenTelemetry food delivery demo
├── retail_service.py         # OpenTelemetry retail demo
├── demo_service.py           # Basic demo trace generator
├── .env.example
└── README.md

---

## Setup & Run

### 1. Clone the repo
```bash
git clone https://github.com/Mohith-R17/tracestory.git
cd tracestory
```

### 2. Create the database
```bash
psql -U postgres -c "CREATE DATABASE tracestory;"
```

### 3. Set up environment variables
```bash
cp .env.example .env
```

Fill in your .env:
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/tracestory
GROQ_API_KEY=your_groq_key_here

### 4. Install backend dependencies
```bash
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn sqlalchemy psycopg2-binary python-dotenv groq opentelemetry-sdk opentelemetry-api requests
```

### 5. Start the backend
```bash
uvicorn backend.main:app --reload
```
Backend runs at http://127.0.0.1:8000
API docs at http://127.0.0.1:8000/docs

### 6. Install and start the frontend
```bash
cd frontend
npm install
npm start
```
Frontend runs at http://localhost:3000

### 7. Generate sample traces
```bash
python banking_service.py
python food_service.py
python retail_service.py
```

### 8. Paste your own trace

Click Paste Trace in the sidebar and paste JSON in this format:
```json
{
  "spans": [
    {
      "span_id": "abc001",
      "trace_id": "trace-001",
      "parent_id": null,
      "service_name": "api-gateway",
      "operation_name": "POST /checkout",
      "duration_ms": 25,
      "status": "OK",
      "attributes": {}
    },
    {
      "span_id": "abc002",
      "trace_id": "trace-001",
      "parent_id": "abc001",
      "service_name": "payment-service",
      "operation_name": "process_payment",
      "duration_ms": 450,
      "status": "ERROR",
      "attributes": { "error": "Gateway timeout" }
    }
  ]
}
```

---

## Built by

Mohith R — RV University, Bengaluru
