from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Span
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

router = APIRouter()

class SpanInput(BaseModel):
    span_id: str
    trace_id: str
    parent_id: Optional[str] = None
    service_name: str
    operation_name: str
    duration_ms: float
    status: str
    attributes: Optional[Dict[str, Any]] = {}
    category: Optional[str] = "general"

class IngestRequest(BaseModel):
    spans: List[SpanInput]

@router.post("/ingest")
def ingest_spans(payload: IngestRequest, db: Session = Depends(get_db)):
    for span in payload.spans:
        category = span.category or "general"
        if category == "general" and span.attributes:
            cat = span.attributes.get("category", "general")
            category = cat

        db_span = Span(
            span_id=span.span_id,
            trace_id=span.trace_id,
            parent_id=span.parent_id,
            service_name=span.service_name,
            operation_name=span.operation_name,
            duration_ms=span.duration_ms,
            status=span.status,
            attributes=span.attributes,
            category=category
        )
        db.add(db_span)
    db.commit()
    return {"message": f"{len(payload.spans)} spans ingested successfully"}


@router.post("/ingest/paste")
def ingest_paste(payload: IngestRequest, db: Session = Depends(get_db)):
    trace_id = payload.spans[0].trace_id if payload.spans else None
    for span in payload.spans:
        existing = db.query(Span).filter(Span.span_id == span.span_id).first()
        if existing:
            continue
        db_span = Span(
            span_id=span.span_id,
            trace_id=span.trace_id,
            parent_id=span.parent_id,
            service_name=span.service_name,
            operation_name=span.operation_name,
            duration_ms=span.duration_ms,
            status=span.status,
            attributes=span.attributes,
            category="custom"
        )
        db.add(db_span)
    db.commit()
    return {"trace_id": trace_id, "message": f"{len(payload.spans)} spans ingested"}
    