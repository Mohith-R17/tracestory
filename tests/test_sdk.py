import unittest
from unittest.mock import patch, MagicMock
import urllib.error
import io
import json
from tracestory_sdk import TraceStory, TraceStoryError

class TestTraceStorySDK(unittest.TestCase):
    def setUp(self):
        self.client = TraceStory("http://mock-localhost:8000")

    @patch("urllib.request.urlopen")
    def test_send_trace_success(self, mock_urlopen):
        # Mock a successful HTTP response from the backend
        mock_response = MagicMock()
        mock_response.read.return_value = b'{"message": "2 spans ingested successfully", "category": "retail"}'
        mock_urlopen.return_value.__enter__.return_value = mock_response

        spans = [
            {
                "trace_id": "tx-1",
                "span_id": "s-1",
                "parent_id": None,
                "service_name": "shop-service",
                "operation_name": "checkout",
                "duration_ms": 150.0,
                "status": "OK"
            }
        ]

        result = self.client.send_trace(spans)
        
        # Verify correct URL and request configurations were built
        mock_urlopen.assert_called_once()
        called_req = mock_urlopen.call_args[0][0]
        self.assertEqual(called_req.full_url, "http://mock-localhost:8000/api/ingest")
        self.assertEqual(called_req.get_header("Content-type"), "application/json")
        
        # Verify response structure matches backend contract
        self.assertEqual(result["message"], "2 spans ingested successfully")
        self.assertEqual(result["category"], "retail")

    @patch("urllib.request.urlopen")
    def test_send_trace_http_error(self, mock_urlopen):
        # Mock an HTTP 422 error detailing validation failures from the backend
        error_json = {
            "detail": [
                {
                    "loc": ["body", "spans", 0, "duration_ms"],
                    "msg": "Input should be greater than or equal to 0",
                    "type": "greater_than_equal"
                }
            ]
        }
        error_content = json.dumps(error_json).encode("utf-8")
        
        fp = io.BytesIO(error_content)
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="http://mock-localhost:8000/api/ingest",
            code=422,
            msg="Unprocessable Entity",
            hdrs={},
            fp=fp
        )

        spans = [
            {
                "trace_id": "tx-1",
                "span_id": "s-1",
                "parent_id": None,
                "service_name": "shop-service",
                "operation_name": "checkout",
                "duration_ms": -10.0, # Invalid negative duration
                "status": "OK"
            }
        ]

        # Verify Custom Exception type is raised with formatted validation detail
        with self.assertRaises(TraceStoryError) as ctx:
            self.client.send_trace(spans)
            
        self.assertEqual(ctx.exception.status_code, 422)
        self.assertIn("body.spans.0.duration_ms: Input should be greater than or equal to 0", str(ctx.exception))

    def test_client_side_validation_not_list(self):
        # Verify input structure validation
        with self.assertRaises(TypeError):
            self.client.send_trace("this is not a list")

    def test_client_side_validation_empty_list(self):
        # Verify input length validation
        with self.assertRaises(ValueError) as ctx:
            self.client.send_trace([])
        self.assertIn("spans list cannot be empty", str(ctx.exception))

    def test_client_side_validation_missing_field(self):
        # Verify required keys check
        incomplete_spans = [
            {
                "trace_id": "tx-1",
                "span_id": "s-1",
            }
        ]
        with self.assertRaises(ValueError) as ctx:
            self.client.send_trace(incomplete_spans)
        self.assertIn("missing required field: service_name", str(ctx.exception))

if __name__ == "__main__":
    unittest.main()
