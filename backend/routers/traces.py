from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Span
from sqlalchemy import distinct

router = APIRouter()

@router.get("/traces")
def get_all_traces(db: Session = Depends(get_db)):
    trace_ids = db.query(distinct(Span.trace_id)).all()
    result = []
    for (trace_id,) in trace_ids:
        spans = db.query(Span).filter(Span.trace_id == trace_id).all()
        has_error = any(s.status == "ERROR" for s in spans)
        total_duration = sum(s.duration_ms for s in spans)
        services = list(set(s.service_name for s in spans))
        # Get category from first span
        category = spans[0].category if spans else "general"
        result.append({
            "trace_id": trace_id,
            "span_count": len(spans),
            "has_error": has_error,
            "total_duration_ms": total_duration,
            "services": services,
            "category": category
        })
    return result


@router.get("/traces/{trace_id}")
def get_trace_detail(trace_id: str, db: Session = Depends(get_db)):
    spans = db.query(Span).filter(Span.trace_id == trace_id).all()
    if not spans:
        return {"error": "Trace not found"}
    return {
        "trace_id": trace_id,
        "spans": [
            {
                "span_id": s.span_id,
                "parent_id": s.parent_id,
                "service_name": s.service_name,
                "operation_name": s.operation_name,
                "duration_ms": s.duration_ms,
                "status": s.status,
                "attributes": s.attributes,
                "category": s.category
            }
            for s in spans
        ]
    }