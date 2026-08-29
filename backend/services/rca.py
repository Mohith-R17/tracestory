from sqlalchemy.orm import Session
from typing import List, Dict, Any, Tuple, Optional
import os
from backend.models import Span, TraceSummary, Incident

def get_attr(obj, attr, default=None):
    if isinstance(obj, dict):
        return obj.get(attr, default)
    return getattr(obj, attr, default)

def detect_incident(spans: List[Any], total_duration: float, avg_category_duration: float = 0.0) -> Tuple[bool, str, str]:
    """
    Detects if a trace behaves abnormally based on errors, latency dominance, or high total duration.
    Returns: (is_incident, title, reason)
    """
    error_spans = [s for s in spans if get_attr(s, "status") == "ERROR"]
    
    # 1. Error condition
    if len(error_spans) > 0:
        if len(error_spans) > 1:
            return True, "Multiple service failures detected", f"Detected {len(error_spans)} failed spans in the execution path."
        return True, "Service execution error", f"Operation failed in service '{get_attr(error_spans[0], 'service_name')}': status was marked as ERROR."

    if not spans:
        return False, "", ""

    # Find slowest span
    slowest_span = max(spans, key=lambda s: get_attr(s, "duration_ms", 0.0) or 0.0)
    slowest_duration = get_attr(slowest_span, "duration_ms", 0.0) or 0.0
    max_pct = (slowest_duration / total_duration) if total_duration > 0 else 0
    
    # 2. Latency dominance (>= 70% latency contribution and > 150ms to ignore fast operations)
    if max_pct >= 0.70 and total_duration > 150.0:
        return True, "Single service latency bottleneck", f"Service '{get_attr(slowest_span, 'service_name')}' consumed {int(max_pct * 100)}% of the total request duration."
        
    # 3. High total latency (relative or absolute)
    if total_duration > 1000.0:
        if avg_category_duration > 0.0 and total_duration > 1.5 * avg_category_duration:
            return True, "High request execution latency", f"Trace total latency ({total_duration:.0f} ms) is significantly higher than the category average ({avg_category_duration:.0f} ms)."
        elif total_duration > 1500.0:
            return True, "High request execution latency", f"Trace total latency ({total_duration:.0f} ms) exceeded the standard 1500 ms execution threshold."

    return False, "", ""

def calculate_severity(error_spans_count: int, max_pct: float, total_duration: float, avg_category_duration: float = 0.0) -> str:
    """
    Calculates the severity of the detected incident: LOW, MEDIUM, HIGH, CRITICAL.
    """
    # CRITICAL: multiple errors + severe latency/bottleneck
    if error_spans_count > 1 and (max_pct >= 0.50 or total_duration > 1500.0):
        return "CRITICAL"
        
    # HIGH: ERROR + major latency contribution OR severe latency anomaly
    if error_spans_count == 1 and max_pct >= 0.50:
        return "HIGH"
    if total_duration > 2000.0:
        if avg_category_duration > 0.0 and total_duration > 2.0 * avg_category_duration:
            return "HIGH"
        elif total_duration > 2500.0:
            return "HIGH"
            
    # MEDIUM: significant latency anomaly OR isolated error
    if error_spans_count >= 1:
        return "MEDIUM"
    if max_pct >= 0.70 and total_duration > 500.0:
        return "MEDIUM"
    if total_duration > 1500.0:
        if avg_category_duration > 0.0 and total_duration > 1.5 * avg_category_duration:
            return "MEDIUM"
        elif total_duration > 1500.0:
            return "MEDIUM"
            
    # LOW: minor latency anomaly
    if max_pct >= 0.50 and total_duration > 200.0:
        return "LOW"
    if total_duration > 1000.0:
        return "LOW"
        
    return "LOW"

def calculate_rca(spans: List[Any], total_duration: float) -> Tuple[Optional[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Analyzes spans and returns the root cause candidate and the full scored span list.
    """
    scored_spans = []
    
    # Map parent-child tree to find leaf nodes
    child_ids = set()
    for s in spans:
        pid = get_attr(s, "parent_id")
        if pid:
            child_ids.add(pid)
            
    for s in spans:
        span_id = get_attr(s, "span_id")
        service_name = get_attr(s, "service_name")
        operation_name = get_attr(s, "operation_name")
        duration_ms = get_attr(s, "duration_ms", 0.0) or 0.0
        status = get_attr(s, "status")
        attributes = get_attr(s, "attributes") or {}
        if not attributes:
            attributes = {}
        
        score = 0.0
        
        # A. Error status
        if status == "ERROR":
            score += 100.0
            
        # B. Latency share
        pct = (duration_ms / total_duration) if total_duration > 0 else 0
        score += pct * 50.0
        
        # C. Error attributes
        if attributes.get("error") or attributes.get("exception"):
            score += 20.0
            
        # D. Leaf node with error
        if span_id not in child_ids:
            score += 10.0
            
        # E. Absolute latency contribution
        if duration_ms > 100.0:
            score += min(duration_ms / 100.0, 30.0)
            
        scored_spans.append({
            "span_id": span_id,
            "service_name": service_name,
            "operation_name": operation_name,
            "duration_ms": duration_ms,
            "status": status,
            "latency_percentage": int(pct * 100),
            "score": score,
            "attributes": attributes
        })
        
    # Sort by score descending, then duration descending
    scored_spans.sort(key=lambda x: (x["score"], x["duration_ms"]), reverse=True)
    
    root_cause = scored_spans[0] if scored_spans else None
    return root_cause, scored_spans

def generate_rca_explanation(root_cause: Dict[str, Any], total_duration: float, has_error: bool) -> str:
    """
    Generates a description explanation for the root cause using Groq API or local backup strings.
    """
    if root_cause["status"] == "ERROR":
        err_msg = root_cause["attributes"].get("error") or root_cause["attributes"].get("exception") or "an execution error"
        fallback = f"The operation '{root_cause['operation_name']}' in service '{root_cause['service_name']}' is the most likely root cause. It failed with error '{err_msg}' and consumed approximately {root_cause['latency_percentage']}% of the total trace duration."
    else:
        fallback = f"The operation '{root_cause['operation_name']}' in service '{root_cause['service_name']}' is the primary latency bottleneck, consuming approximately {root_cause['latency_percentage']}% of the total request duration ({root_cause['duration_ms']:.1f} ms)."

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return fallback

    try:
        from backend.services.summarizer import client
        
        prompt = f"""
You are an expert systems engineer. Write a 1-2 sentence explanation of the root cause of this incident.

Root Cause Span:
- Service: {root_cause['service_name']}
- Operation: {root_cause['operation_name']}
- Duration: {root_cause['duration_ms']:.1f}ms (represents {root_cause['latency_percentage']}% of total trace duration)
- Status: {root_cause['status']}
- Attributes: {root_cause['attributes']}

Context:
Total Trace Duration: {total_duration:.1f}ms
Has Errors: {has_error}

Provide a concise, direct explanation of why this service/operation is the likely root cause. Be specific, referring to duration percentages and errors if present.
Do not use formatting markup like bolding or bullet points. Output a simple paragraph.
"""
        response = client.chat.completions.create(
            model="groq/compound-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=0.3
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"RCA AI explanation failed: {e}. Using fallback.")
        return fallback

def evaluate_incident(trace_id: str, spans: List[Any], db: Session) -> Optional[Incident]:
    """
    Evaluates a trace, creates and saves an Incident entry in SQLite if abnormal.
    """
    if not spans:
        return None
    
    category = get_attr(spans[0], "category", "general") or "general"
    
    # Query database for baseline category average
    from sqlalchemy import func
    avg_dur = db.query(func.avg(TraceSummary.total_duration_ms)).filter(TraceSummary.category == category).scalar()
    avg_category_duration = float(avg_dur) if avg_dur is not None else 0.0

    total_duration = sum(get_attr(s, "duration_ms", 0.0) or 0.0 for s in spans)
    has_error = any(get_attr(s, "status") == "ERROR" for s in spans)
    error_spans_count = sum(1 for s in spans if get_attr(s, "status") == "ERROR")

    # 1. Detect if abnormal
    is_incident, title, reason = detect_incident(spans, total_duration, avg_category_duration)
    if not is_incident:
        return None

    # 2. Run RCA scoring
    root_cause, scored_spans = calculate_rca(spans, total_duration)
    if not root_cause:
        return None

    max_pct = root_cause["latency_percentage"] / 100.0

    # 3. Determine severity
    severity = calculate_severity(error_spans_count, max_pct, total_duration, avg_category_duration)

    # 4. Generate explanation
    explanation = generate_rca_explanation(root_cause, total_duration, has_error)

    # 5. Create or retrieve Incident record
    db_incident = db.query(Incident).filter(Incident.trace_id == trace_id).first()
    if not db_incident:
        db_incident = Incident(
            trace_id=trace_id,
            severity=severity,
            title=title,
            root_cause_span_id=root_cause["span_id"],
            root_cause_service=root_cause["service_name"],
            root_cause_operation=root_cause["operation_name"],
            reason=reason,
            duration_ms=root_cause["duration_ms"],
            status=root_cause["status"],
            latency_percentage=root_cause["latency_percentage"],
            explanation=explanation
        )
        db.add(db_incident)
        db.commit()
        db.refresh(db_incident)
    
    return db_incident
