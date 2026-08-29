from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Incident, Span
from typing import List

router = APIRouter()

@router.get("/incidents")
def get_all_incidents(db: Session = Depends(get_db)):
    """
    Returns all cached incidents in the database.
    """
    incidents = db.query(Incident).order_by(Incident.created_at.desc()).all()
    result = []
    for inc in incidents:
        result.append({
            "trace_id": inc.trace_id,
            "severity": inc.severity,
            "title": inc.title,
            "root_cause_service": inc.root_cause_service,
            "root_cause_operation": inc.root_cause_operation,
            "duration_ms": inc.duration_ms,
            "created_at": inc.created_at
        })
    return result

@router.get("/incidents/{trace_id}")
def get_incident_detail(trace_id: str, db: Session = Depends(get_db)):
    """
    Returns incident RCA metadata for a specific trace_id.
    """
    incident = db.query(Incident).filter(Incident.trace_id == trace_id).first()
    if incident:
        return {
            "trace_id": incident.trace_id,
            "incident": True,
            "severity": incident.severity,
            "title": incident.title,
            "root_cause": {
                "service_name": incident.root_cause_service,
                "operation_name": incident.root_cause_operation,
                "span_id": incident.root_cause_span_id
            },
            "reason": incident.reason,
            "evidence": {
                "duration_ms": incident.duration_ms,
                "status": incident.status,
                "latency_percentage": incident.latency_percentage
            },
            "explanation": incident.explanation
        }
    
    # Try dynamic dynamic evaluation fallback for legacy traces
    spans = db.query(Span).filter(Span.trace_id == trace_id).all()
    if not spans:
        return {"trace_id": trace_id, "incident": False}
        
    from backend.services.rca import evaluate_incident
    new_incident = evaluate_incident(trace_id, spans, db)
    if new_incident:
        return {
            "trace_id": new_incident.trace_id,
            "incident": True,
            "severity": new_incident.severity,
            "title": new_incident.title,
            "root_cause": {
                "service_name": new_incident.root_cause_service,
                "operation_name": new_incident.root_cause_operation,
                "span_id": new_incident.root_cause_span_id
            },
            "reason": new_incident.reason,
            "evidence": {
                "duration_ms": new_incident.duration_ms,
                "status": new_incident.status,
                "latency_percentage": new_incident.latency_percentage
            },
            "explanation": new_incident.explanation
        }
        
    return {"trace_id": trace_id, "incident": False}
