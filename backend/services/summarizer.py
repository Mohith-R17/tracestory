# Import Groq client, trace parser, and environment variable utilities
from groq import Groq
from backend.services.parser import parse_spans
from dotenv import load_dotenv
import os


# Load environment variables and initialize Groq client
load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))


# Generate an AI summary for a single trace
def generate_summary(spans):

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

    # Return the generated summary
    return response.choices[0].message.content.strip()


# Generate an AI comparison between two traces
def generate_comparison(spans_a, spans_b, summary_a, summary_b):

    # Parse both traces to extract key information
    parsed_a = parse_spans(spans_a)
    parsed_b = parse_spans(spans_b)

    # Create a comparison prompt
    prompt = f"""
You are an expert backend engineer comparing two distributed traces.

Trace A:
- Category: {spans_a[0].category}
- Services: {parsed_a['services_involved']}
- Total duration: {parsed_a['total_duration_ms']:.1f}ms
- Has error: {parsed_a['has_error']}
- Summary: {summary_a}

Trace B:
- Category: {spans_b[0].category}
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