def parse_spans(spans):
    """
    Takes a list of Span DB objects and returns
    a clean structured dict for the LLM to summarize
    """
    parsed = []
    for span in spans:
        parsed.append({
            "service": span.service_name,
            "operation": span.operation_name,
            "duration_ms": span.duration_ms,
            "status": span.status,
            "parent_id": span.parent_id,
            "attributes": span.attributes or {}
        })

    # Sort by duration descending to highlight slowest spans
    parsed.sort(key=lambda x: x["duration_ms"], reverse=True)

    has_error = any(s["status"] == "ERROR" for s in parsed)
    total_duration = sum(s["duration_ms"] for s in parsed)
    services_involved = list(set(s["service"] for s in parsed))
    error_spans = [s for s in parsed if s["status"] == "ERROR"]

    return {
        "spans": parsed,
        "has_error": has_error,
        "total_duration_ms": total_duration,
        "services_involved": services_involved,
        "error_spans": error_spans
    }