import requests
import json

url = "http://localhost:8000/generate-assessment"
data = {
    "role_title": "Test Role",
    "jd_text": "We need a Python developer."
}

try:
    response = requests.post(url, json=data)
    print("Status Code:", response.status_code)
    print("Response:", json.dumps(response.json(), indent=2))
except Exception as e:
    print("Error:", e)
