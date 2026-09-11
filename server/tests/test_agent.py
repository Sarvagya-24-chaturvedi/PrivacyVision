from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_agent_endpoint_with_sanitized_data():
    payload = {
        "task": "Click the login button",
        "screenshot": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "dom": {
            "nodes": [
                {
                    "agentId": "el-1",
                    "tag": "input",
                    "role": "textbox",
                    "type": "email",
                    "value": "[EMAIL_REDACTED]",
                    "sensitive": True
                },
                {
                    "agentId": "el-2",
                    "tag": "input",
                    "role": "textbox",
                    "type": "password",
                    "value": "[PASSWORD_REDACTED]",
                    "sensitive": True
                },
                {
                    "agentId": "el-3",
                    "tag": "button",
                    "role": "button",
                    "text": "Log In",
                    "sensitive": False
                }
            ]
        },
        "privacy": {
            "redactions": 2,
            "faces": 0
        }
    }

    response = client.post("/api/agent", json=payload)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["status"] == "ok"
    assert res_data["received_sanitized"] is True
    assert res_data["action"]["action"] in ["CLICK", "SCROLL", "FOCUS", "TYPE", "SELECT", "PRESS_KEY", "WAIT"]


def test_classify_endpoint():
    payload = {
        "task": "Analyze this page",
        "screenshot": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "dom": {"nodes": []}
    }
    response = client.post("/api/classify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["sanitized_verified"] is True
    assert "classification" in data
    # Model may not be present (not yet trained), check graceful degradation
    assert "page_type" in data["classification"]
