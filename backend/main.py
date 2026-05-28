from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import engine, Base
from backend.routers import ingest, traces, summary

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TraceStory",
    description="Converts unreadable distributed traces into plain-English summaries",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router, prefix="/api", tags=["Ingest"])
app.include_router(traces.router, prefix="/api", tags=["Traces"])
app.include_router(summary.router, prefix="/api", tags=["Summary"])

@app.get("/")
def root():
    return {"message": "TraceStory is running"}