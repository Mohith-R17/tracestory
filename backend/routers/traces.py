from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Span, Incident
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
        
        # Check cached incident or run lazy detection
        incident_rec = db.query(Incident).filter(Incident.trace_id == trace_id).first()
        incident = False
        severity = None
        if incident_rec:
            incident = True
            severity = incident_rec.severity
        else:
            # Dynamic fallback detection for legacy traces
            from backend.services.rca import detect_incident, calculate_rca, calculate_severity
            from backend.models import TraceSummary
            from sqlalchemy import func
            avg_dur = db.query(func.avg(TraceSummary.total_duration_ms)).filter(TraceSummary.category == category).scalar()
            avg_category_duration = float(avg_dur) if avg_dur is not None else 0.0
            
            is_incident, _, _ = detect_incident(spans, total_duration, avg_category_duration)
            if is_incident:
                incident = True
                root_cause, _ = calculate_rca(spans, total_duration)
                if root_cause:
                    max_pct = root_cause["latency_percentage"] / 100.0
                    error_spans_count = sum(1 for s in spans if s.status == "ERROR")
                    severity = calculate_severity(error_spans_count, max_pct, total_duration, avg_category_duration)

        result.append({
            "trace_id": trace_id,
            "span_count": len(spans),
            "has_error": has_error,
            "total_duration_ms": total_duration,
            "services": services,
            "category": category,
            "incident": incident,
            "severity": severity
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