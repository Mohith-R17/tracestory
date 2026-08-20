# Import FastAPI router, database session, and Span model
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Span
from sqlalchemy import distinct

router = APIRouter()


# Get a summary of all traces stored in the database
@router.get("/traces")
def get_all_traces(db: Session = Depends(get_db)):

    # Fetch all unique trace IDs
    trace_ids = db.query(distinct(Span.trace_id)).all()

    result = []

    # Process each trace individually
    for (trace_id,) in trace_ids:

        # Get all spans belonging to the current trace
        spans = db.query(Span).filter(Span.trace_id == trace_id).all()

        # Check whether any span contains an error
        has_error = any(s.status == "ERROR" for s in spans)

        # Calculate total execution time of the trace
        total_duration = sum(s.duration_ms for s in spans)

        # Get all services involved in the trace
        services = list(set(s.service_name for s in spans))

        # Get the trace category
        category = spans[0].category if spans else "general"

        # Build trace summary response
        result.append({
            "trace_id": trace_id,
            "span_count": len(spans),
            "has_error": has_error,
            "total_duration_ms": total_duration,
            "services": services,
            "category": category
        })

    return result


# Get complete details of a specific trace
@router.get("/traces/{trace_id}")
def get_trace_detail(trace_id: str, db: Session = Depends(get_db)):

    # Fetch all spans for the given trace ID
    spans = db.query(Span).filter(Span.trace_id == trace_id).all()

    # Return error if trace does not exist
    if not spans:
        return {"error": "Trace not found"}

    # Return detailed span information
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