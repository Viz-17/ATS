import sys
import traceback
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

print("🚀 Starting Debug Request...")
try:
    response = client.post("/generate-assessment", json={
        "role_title": "Debug Role", 
        "jd_text": "Must know Python and SQL."
    })
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception:
    traceback.print_exc()
