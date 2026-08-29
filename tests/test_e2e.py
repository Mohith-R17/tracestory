import os
import time
import subprocess
import urllib.request
import json
import sys

def test_e2e():
    # Dynamically clean table records using database-agnostic SQLAlchemy session
    try:
        from backend.database import SessionLocal
        from backend.models import Span, TraceSummary, Incident
        db = SessionLocal()
        try:
            db.query(Span).delete()
            db.query(TraceSummary).delete()
            db.query(Incident).delete()
            db.commit()
            print("Successfully cleared database tables dynamically.")
        except Exception as e:
            db.rollback()
            print(f"Direct SQLAlchemy session cleanup failed: {e}. Attempting file cleanups...")
        finally:
            db.close()
    except Exception as e:
        print(f"Could not load database session: {e}. Continuing...")

    # Backwards compatibility SQLite file removal
    if os.path.exists("tracestory.db"):
        try:
            os.remove("tracestory.db")
        except PermissionError:
            pass
        
    print("Starting backend...")
    backend_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.main:app", "--port", "8000"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    try:
        # Wait for backend to start
        time.sleep(2)
        
        # Run the example script
        print("Running retail_service.py...")
        env = os.environ.copy()
        env["PYTHONPATH"] = "."
        env["PYTHONIOENCODING"] = "utf-8"
        result = subprocess.run(
            [sys.executable, "retail_service.py"], 
            env=env,
            capture_output=True,
            text=True,
            encoding="utf-8"
        )
        print(result.stdout)
        print(result.stderr)
        assert result.returncode == 0
        
        # Give it a second for ingestion to finish
        time.sleep(1)
        
        # Query backend
        print("Checking traces via API...")
        req = urllib.request.Request("http://localhost:8000/api/traces")
        with urllib.request.urlopen(req) as response:
            assert response.status == 200
            data = json.loads(response.read().decode())
        
        # Find our trace
        assert len(data) > 0
        trace = data[0]
        print(f"DEBUG Trace from API: {trace}")
        assert trace["category"] == "retail"
        
        # Get trace details
        trace_id = trace["trace_id"]
        req_detail = urllib.request.Request(f"http://localhost:8000/api/traces/{trace_id}")
        with urllib.request.urlopen(req_detail) as detail_res:
            assert detail_res.status == 200
            detail = json.loads(detail_res.read().decode())
        
        spans = detail["spans"]
        assert len(spans) == 6 # checkout-process, validate-cart, process-payment, check-fraud, charge-card, send-receipt
        print("E2E Test Passed successfully.")
        
    finally:
        print("Shutting down backend...")
        backend_process.terminate()
        backend_process.wait()

if __name__ == "__main__":
    test_e2e()
