import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import engine, Base
from backend.routers import ingest, traces, summary, incidents

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TraceStory",
    description="Converts unreadable distributed traces into plain-English summaries",
    version="1.0.0"
)

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
allow_origins = [origin.strip() for origin in frontend_origin.split(",")] if frontend_origin else ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router, prefix="/api", tags=["Ingest"])
app.include_router(traces.router, prefix="/api", tags=["Traces"])
app.include_router(summary.router, prefix="/api", tags=["Summary"])
app.include_router(incidents.router, prefix="/api", tags=["Incidents"])

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/")
def root():
    return {"message": "TraceStory is running"}