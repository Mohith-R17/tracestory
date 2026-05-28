from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Span, TraceSummary
from backend.services.summarizer import generate_summary, generate_comparison
from pydantic import BaseModel

router = APIRouter()

@router.get("/summary/{trace_id}")
def get_summary(trace_id: str, db: Session = Depends(get_db)):
    existing = db.query(TraceSummary).filter(TraceSummary.trace_id == trace_id).first()
    if existing:
        return {"trace_id": trace_id, "summary": existing.summary}

    spans = db.query(Span).filter(Span.trace_id == trace_id).all()
    if not spans:
        return {"error": "Trace not found"}

    summary_text = generate_summary(spans)

    db_summary = TraceSummary(
        trace_id=trace_id,
        summary=summary_text,
        root_service=spans[0].service_name,
        total_duration_ms=sum(s.duration_ms for s in spans),
        has_error=str(any(s.status == "ERROR" for s in spans)),
        category=spans[0].category
    )
    db.add(db_summary)
    db.commit()
    return {"trace_id": trace_id, "summary": summary_text}


@router.post("/summary/{trace_id}/regenerate")
def regenerate_summary(trace_id: str, db: Session = Depends(get_db)):
    db.query(TraceSummary).filter(TraceSummary.trace_id == trace_id).delete()
    db.commit()

    spans = db.query(Span).filter(Span.trace_id == trace_id).all()
    if not spans:
        return {"error": "Trace not found"}

    summary_text = generate_summary(spans)

    db_summary = TraceSummary(
        trace_id=trace_id,
        summary=summary_text,
        root_service=spans[0].service_name,
        total_duration_ms=sum(s.duration_ms for s in spans),
        has_error=str(any(s.status == "ERROR" for s in spans)),
        category=spans[0].category
    )
    db.add(db_summary)
    db.commit()
    return {"trace_id": trace_id, "summary": summary_text}


class CompareRequest(BaseModel):
    trace_id_a: str
    trace_id_b: str

@router.post("/compare")
def compare_traces(payload: CompareRequest, db: Session = Depends(get_db)):
    spans_a = db.query(Span).filter(Span.trace_id == payload.trace_id_a).all()
    spans_b = db.query(Span).filter(Span.trace_id == payload.trace_id_b).all()

    if not spans_a or not spans_b:
        return {"error": "One or both traces not found"}

    summary_a = db.query(TraceSummary).filter(TraceSummary.trace_id == payload.trace_id_a).first()
    summary_b = db.query(TraceSummary).filter(TraceSummary.trace_id == payload.trace_id_b).first()

    text_a = summary_a.summary if summary_a else generate_summary(spans_a)
    text_b = summary_b.summary if summary_b else generate_summary(spans_b)

    comparison = generate_comparison(spans_a, spans_b, text_a, text_b)

    return {
        "trace_id_a": payload.trace_id_a,
        "trace_id_b": payload.trace_id_b,
        "summary_a": text_a,
        "summary_b": text_b,
        "comparison": comparison
    }