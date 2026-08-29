from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Span, TraceSummary
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any

router = APIRouter()

class SpanInput(BaseModel):
    span_id: str = Field(..., min_length=1)
    trace_id: str = Field(..., min_length=1)
    parent_id: Optional[str] = None
    service_name: str = Field(..., min_length=1)
    operation_name: str = Field(..., min_length=1)
    duration_ms: float = Field(..., ge=0)
    status: str
    attributes: Optional[Dict[str, Any]] = {}
    category: Optional[str] = "general"

    @field_validator('status')
    @classmethod
    def validate_status(cls, v: str) -> str:
        v_upper = v.upper()
        if v_upper not in ['OK', 'ERROR', 'UNSET']:
            raise ValueError("status must be one of 'OK', 'ERROR', 'UNSET'")
        return v_upper

class IngestRequest(BaseModel):
    spans: List[SpanInput]

@router.post("/ingest")
def ingest_spans(payload: IngestRequest, db: Session = Depends(get_db)):
    # Check if a category is already explicitly provided in spans
    explicit_category = None
    for span in payload.spans:
        if span.category and span.category not in ["general", "custom"]:
            explicit_category = span.category
            break
        if span.attributes and span.attributes.get("category") and span.attributes.get("category") not in ["general", "custom"]:
            explicit_category = span.attributes.get("category")
            break
            
    if explicit_category:
        category = explicit_category
        confidence = 1.0
    else:
        from backend.services.summarizer import classify_trace
        category, confidence = classify_trace(payload.spans)

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
            category=category
        )
        db.add(db_span)
    db.commit()

    # Automatically generate trace summary and evaluate incident
    try:
        trace_id = payload.spans[0].trace_id if payload.spans else None
        if trace_id:
            existing_summary = db.query(TraceSummary).filter(TraceSummary.trace_id == trace_id).first()
            if not existing_summary:
                from backend.services.summarizer import generate_summary
                summary_text = generate_summary(payload.spans)
                db_summary = TraceSummary(
                    trace_id=trace_id,
                    summary=summary_text,
                    root_service=payload.spans[0].service_name,
                    total_duration_ms=sum(s.duration_ms for s in payload.spans),
                    has_error=str(any(s.status == "ERROR" for s in payload.spans)),
                    category=category
                )
                db.add(db_summary)
                db.commit()
            
            # Evaluate and store incident details if abnormal
            from backend.services.rca import evaluate_incident
            evaluate_incident(trace_id, payload.spans, db)
    except Exception as e:
        print(f"Error generating summary or incident during ingestion: {e}")

    return {"message": f"{len(payload.spans)} spans ingested successfully", "category": category}


@router.post("/ingest/paste")
def ingest_paste(payload: IngestRequest, db: Session = Depends(get_db)):
    trace_id = payload.spans[0].trace_id if payload.spans else None
    
    # Classify trace based on content
    from backend.services.summarizer import classify_trace
    category, confidence = classify_trace(payload.spans)
    
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
            category=category
        )
        db.add(db_span)
    db.commit()

    # Automatically generate trace summary and evaluate incident
    try:
        if trace_id:
            existing_summary = db.query(TraceSummary).filter(TraceSummary.trace_id == trace_id).first()
            if not existing_summary:
                from backend.services.summarizer import generate_summary
                summary_text = generate_summary(payload.spans)
                db_summary = TraceSummary(
                    trace_id=trace_id,
                    summary=summary_text,
                    root_service=payload.spans[0].service_name,
                    total_duration_ms=sum(s.duration_ms for s in payload.spans),
                    has_error=str(any(s.status == "ERROR" for s in payload.spans)),
                    category=category
                )
                db.add(db_summary)
                db.commit()
            
            # Evaluate and store incident details if abnormal
            from backend.services.rca import evaluate_incident
            evaluate_incident(trace_id, payload.spans, db)
    except Exception as e:
        print(f"Error generating summary or incident during ingestion: {e}")

    return {"trace_id": trace_id, "message": f"{len(payload.spans)} spans ingested", "category": category}