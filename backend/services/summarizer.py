# Import Groq client, trace parser, and environment variable utilities
from groq import Groq
from backend.services.parser import parse_spans
from dotenv import load_dotenv
import os

# Load environment variables and initialize Groq client
load_dotenv()
# Set a defensive 2.0s timeout to prevent API hangs from blocking ingestion
client = Groq(api_key=os.getenv("GROQ_API_KEY") or "mock_key", timeout=2.0)



def generate_fallback_summary(spans):
    """Computes a plain-English explanation fallback based on trace timeline metrics."""
    parsed = parse_spans(spans)
    services = ", ".join(parsed['services_involved'])
    total_ms = parsed['total_duration_ms']
    
    summary = f"The request involved services: {services} and took {total_ms:.1f} ms to complete. "
    
    if spans:
        # Sort spans by duration to find the slowest one
        slowest_span = max(
            spans,
            key=lambda s: (getattr(s, "duration_ms", 0) if not isinstance(s, dict) else s.get("duration_ms", 0)) or 0
        )
        if isinstance(slowest_span, dict):
            slowest_name = slowest_span.get("operation_name", "")
            slowest_svc = slowest_span.get("service_name", "")
            slowest_dur = slowest_span.get("duration_ms", 0)
        else:
            slowest_name = getattr(slowest_span, "operation_name", "")
            slowest_svc = getattr(slowest_span, "service_name", "")
            slowest_dur = getattr(slowest_span, "duration_ms", 0)
            
        summary += f"The operation '{slowest_name}' in service '{slowest_svc}' contributed the most latency, taking {slowest_dur:.1f} ms. "

    error_spans = [
        s for s in spans
        if (getattr(s, "status", "") if not isinstance(s, dict) else s.get("status", "")) == "ERROR"
    ]
    if error_spans:
        err_names = [
            (getattr(s, "operation_name", "") if not isinstance(s, dict) else s.get("operation_name", ""))
            for s in error_spans
        ]
        summary += f"The trace encountered errors in operations: {', '.join(err_names)}."
    else:
        summary += "No errors were encountered during the execution."
        
    return summary


# Generate an AI summary for a single trace
def generate_summary(spans):
    try:
        # Extract important information from raw spans
        parsed = parse_spans(spans)

        # Create a prompt containing trace details
        prompt = f"""
You are an expert backend engineer analyzing a distributed trace.

Here is the trace data:

Services involved: {parsed['services_involved']}
Total duration: {parsed['total_duration_ms']}ms
Has error: {parsed['has_error']}

Spans (sorted by duration, slowest first):
{parsed['spans']}

Error spans:
{parsed['error_spans']}

Write a 2-3 sentence plain English summary of what happened in this request.

Mention which service was slowest, where the error occurred (if any), and what likely caused the failure.

Be specific and technical but easy to understand.

Do not use bullet points. Write in paragraph form.
"""

        # Send the prompt to LLaMA 3.1 and generate a summary
        response = client.chat.completions.create(
            model="groq/compound-mini",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=200,
            temperature=0.3
        )

        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"AI summary generation failed: {e}. Generating fallback summary.")
        return generate_fallback_summary(spans)


# Generate an AI comparison between two traces
def generate_comparison(spans_a, spans_b, summary_a, summary_b, category_a="general", category_b="general"):
    try:
        # Parse both traces to extract key information
        parsed_a = parse_spans(spans_a)
        parsed_b = parse_spans(spans_b)

        # Create a comparison prompt
        prompt = f"""
You are an expert backend engineer comparing two distributed traces.

Trace A:
- Category: {category_a}
- Services: {parsed_a['services_involved']}
- Total duration: {parsed_a['total_duration_ms']:.1f}ms
- Has error: {parsed_a['has_error']}
- Summary: {summary_a}

Trace B:
- Category: {category_b}
- Services: {parsed_b['services_involved']}
- Total duration: {parsed_b['total_duration_ms']:.1f}ms
- Has error: {parsed_b['has_error']}
- Summary: {summary_b}

Write a 3-4 sentence comparison of these two traces.

Highlight the key differences:
- Which was faster
- Which had more errors
- Which service caused issues
- What should be fixed first

Be specific with numbers.

Do not use bullet points. Write in paragraph form.
"""

        # Send comparison request to LLaMA 3.1
        response = client.chat.completions.create(
            model="groq/compound-mini",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=300,
            temperature=0.3
        )

        # Return the generated comparison
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"AI comparison generation failed: {e}. Generating fallback comparison.")
        dur_a = sum(s.duration_ms for s in spans_a) if hasattr(spans_a[0], "duration_ms") else sum(s.get("duration_ms", 0) for s in spans_a)
        dur_b = sum(s.duration_ms for s in spans_b) if hasattr(spans_b[0], "duration_ms") else sum(s.get("duration_ms", 0) for s in spans_b)
        diff = abs(dur_a - dur_b)
        faster = "Trace A" if dur_a < dur_b else "Trace B"
        slower = "Trace B" if dur_a < dur_b else "Trace A"
        return f"{faster} was faster than {slower} by {diff:.1f} ms. Trace A completed in {dur_a:.1f} ms, while Trace B took {dur_b:.1f} ms. Review the span breakdowns below to inspect visual execution block diffs."


def classify_trace(spans):
    # Rule-based fallback classification
    tokens = []
    for s in spans:
        if isinstance(s, dict):
            service = s.get("service_name", "")
            operation = s.get("operation_name", "")
        else:
            service = getattr(s, "service_name", "")
            operation = getattr(s, "operation_name", "")
        tokens.append(f"{service} {operation}")
    
    text_content = " ".join(tokens).lower()
    
    rule_category = "general"
    confidence = 0.0
    
    if any(kw in text_content for kw in ["bank", "transfer", "account", "withdraw", "funds", "ledger"]):
        rule_category = "banking"
        confidence = 1.0
    elif any(kw in text_content for kw in ["food", "order", "delivery", "restaurant", "pizza", "menu"]):
        rule_category = "food"
        confidence = 1.0
    elif any(kw in text_content for kw in ["retail", "shop", "checkout", "inventory", "coupon", "cart", "warehouse", "catalog"]):
        rule_category = "retail"
        confidence = 1.0

    # Try AI classification via Groq if API key is present
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return rule_category, confidence

    try:
        services = []
        operations = []
        for s in spans:
            if isinstance(s, dict):
                svc = s.get("service_name")
                op = s.get("operation_name")
            else:
                svc = getattr(s, "service_name")
                op = getattr(s, "operation_name")
            if svc: services.append(svc)
            if op: operations.append(op)
            
        services = list(set(services))
        operations = list(set(operations))
        
        prompt = f"""
You are an expert distributed tracing analyzer. Classify the following trace into exactly one of these categories:
- banking
- food
- retail
- general

Services involved: {services}
Operations: {operations}

Provide the category as a single word in lowercase (e.g., "banking", "food", "retail", or "general"). Do not include any other text, explanation, or punctuation.
"""
        response = client.chat.completions.create(
            model="groq/compound-mini",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=10,
            temperature=0.0
        )
        result = response.choices[0].message.content.strip().lower()
        if result in ["banking", "food", "retail", "general"]:
            return result, 0.98
    except Exception as e:
        print(f"Error in AI classification: {e}")
    
    return rule_category, confidence
