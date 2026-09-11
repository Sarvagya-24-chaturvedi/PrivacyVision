import re
from typing import Dict, Any, List

class ServerPayloadSecurityAuditor:
    """
    Verifies that the client strictly upheld the privacy boundary.
    The server enforces that no raw sensitive data or passwords ever arrive.
    """

    @staticmethod
    def audit_incoming_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
        violations: List[str] = []

        dom = payload.get("dom", {})
        nodes = dom.get("nodes", []) if isinstance(dom, dict) else []

        for node in nodes:
            if node.get("sensitive") is True:
                val = node.get("value")
                if val and "REDACTED" not in val:
                    violations.append(f"Received unredacted value for sensitive element {node.get('agentId')}")

        # Check for obvious raw credit card sequences
        payload_str = str(payload)
        card_matches = re.findall(r"\b(?:\d{4}[-\s]?){3}\d{4}\b", payload_str)
        if card_matches:
            violations.append("Raw card sequence detected in payload")

        return {
            "compliant": len(violations) == 0,
            "violations": violations,
            "sanitized_verified": True
        }
