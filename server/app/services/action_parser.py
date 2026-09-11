import json
import re
from typing import Optional
from ..models import ActionSchema, ActionTarget

class ActionParser:
    ALLOWED_ACTIONS = {"CLICK", "SCROLL", "FOCUS", "TYPE", "SELECT", "PRESS_KEY", "WAIT"}

    @staticmethod
    def parse_model_response(raw_text: str) -> Optional[ActionSchema]:
        """
        Extracts and parses structured action JSON from VLM output text.
        """
        try:
            # Try direct JSON parsing
            data = json.loads(raw_text.strip())
        except Exception:
            # Try finding JSON block in markdown ```json ... ``` or { ... }
            match = re.search(r"\{.*\}", raw_text, re.DOTALL)
            if match:
                try:
                    data = json.loads(match.group(0))
                except Exception:
                    return None
            else:
                return None

        action_type = str(data.get("action", "")).upper()
        if action_type not in ActionParser.ALLOWED_ACTIONS:
            return None

        target_data = data.get("target")
        target = None
        if isinstance(target_data, dict):
            target = ActionTarget(
                agentId=str(target_data.get("agentId")) if target_data.get("agentId") else None,
                x=float(target_data["x"]) if "x" in target_data else None,
                y=float(target_data["y"]) if "y" in target_data else None,
            )

        return ActionSchema(
            action=action_type,
            target=target,
            direction=data.get("direction"),
            amount=data.get("amount"),
            text=data.get("text"),
            value=data.get("value"),
            key=data.get("key"),
            ms=data.get("ms"),
            reason=data.get("reason", "Action reasoned by VLM over sanitized page representation")
        )
