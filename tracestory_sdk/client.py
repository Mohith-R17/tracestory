import urllib.request
import urllib.error
import json
from typing import List, Dict, Any

class TraceStoryError(Exception):
    """Custom exception raised when the TraceStory API returns an HTTP error."""
    def __init__(self, status_code: int, message: str):
        super().__init__(f"TraceStory API returned {status_code}: {message}")
        self.status_code = status_code
        self.message = message

class TraceStory:
    def __init__(self, base_url: str):
        if not base_url:
            raise ValueError("base_url must be provided")
        # Strip trailing slash if present
        self.base_url = base_url.rstrip("/")
        self.ingest_url = f"{self.base_url}/api/ingest"

    def send_trace(self, spans: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Sends a list of trace spans to the TraceStory HTTP API.
        
        Args:
            spans: List of span dictionaries. Each dictionary must contain:
                   trace_id, span_id, service_name, operation_name, duration_ms, status.
        
        Returns:
            Dict containing the API success response.
        
        Raises:
            TypeError: If input types are incorrect.
            ValueError: If inputs or spans lack required fields.
            TraceStoryError: If the server returns an HTTP error (4xx/5xx).
            ConnectionError: If connection to the API fails.
        """
        if not isinstance(spans, list):
            raise TypeError("spans must be a list of dictionaries")
        
        if not spans:
            raise ValueError("spans list cannot be empty")

        required_fields = ["trace_id", "span_id", "service_name", "operation_name", "duration_ms", "status"]
        for idx, span in enumerate(spans):
            if not isinstance(span, dict):
                raise TypeError(f"span at index {idx} must be a dictionary")
            for field in required_fields:
                if field not in span:
                    raise ValueError(f"span at index {idx} is missing required field: {field}")

        # Construct JSON request payload
        payload = {"spans": spans}
        data_bytes = json.dumps(payload).encode("utf-8")

        req = urllib.request.Request(
            self.ingest_url,
            data=data_bytes,
            headers={"Content-Type": "application/json"}
        )

        try:
            with urllib.request.urlopen(req) as response:
                response_body = response.read().decode("utf-8")
                return json.loads(response_body)
        except urllib.error.HTTPError as e:
            message = ""
            try:
                error_body = e.read().decode("utf-8")
                error_json = json.loads(error_body)
                if "detail" in error_json:
                    detail = error_json["detail"]
                    if isinstance(detail, list):
                        msg_list = []
                        for item in detail:
                            if isinstance(item, dict):
                                loc = ".".join(str(x) for x in item.get("loc", []))
                                msg = item.get("msg", "Validation error")
                                msg_list.append(f"{loc}: {msg}")
                            else:
                                msg_list.append(str(item))
                        message = "; ".join(msg_list)
                    else:
                        message = str(detail)
                else:
                    message = error_body
            except Exception:
                message = e.reason or "Unknown Error"

            raise TraceStoryError(status_code=e.code, message=message) from e
        except Exception as e:
            raise ConnectionError(f"Failed to connect to TraceStory API: {e}") from e
