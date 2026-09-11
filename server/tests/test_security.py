import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.security.payload_validator import ServerPayloadSecurityAuditor

client = TestClient(app)

def test_original_data_never_leaves_client():
    """
    Requirement 38 Security Test:
    Verifies that payloads containing leaked sensitive information are
    immediately caught and rejected by the server's security auditor.
    """
    leaked_payload = {
        "task": "Perform confidential transaction",
        "screenshot": "data:image/png;base64,mock",
        "dom": {
            "nodes": [
                {
                    "agentId": "el-pwd",
                    "tag": "input",
                    "type": "password",
                    "value": "MyActualSecretPassword!123", # UNREDACTED RAW VALUE
                    "sensitive": True
                }
            ]
        }
    }

    audit = ServerPayloadSecurityAuditor.audit_incoming_payload(leaked_payload)
    assert audit["compliant"] is False
    assert len(audit["violations"]) > 0
    assert "unredacted value" in audit["violations"][0].lower()

    # HTTP endpoint test
    response = client.post("/api/agent", json=leaked_payload)
    assert response.status_code == 400
    assert "Privacy violation" in response.json()["detail"]

def test_raw_credit_card_rejection():
    """
    Ensures that raw credit card numbers accidentally embedded in request
    are intercepted and rejected.
    """
    card_leaked_payload = {
        "task": "Paying with 4111 1111 1111 1111", # LEAKED CARD
        "screenshot": "data:image/png;base64,mock",
        "dom": {"nodes": []}
    }

    response = client.post("/api/agent", json=card_leaked_payload)
    assert response.status_code == 400
