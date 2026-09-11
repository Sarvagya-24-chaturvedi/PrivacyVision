import httpx
from typing import Optional
from ..config import settings
from .action_parser import ActionParser
from ..models import ActionSchema

VLM_SYSTEM_PROMPT = """You are a browser agent reasoning strictly over privacy-sanitized visual and structural context.
Sensitive values have already been removed or redacted by the client on-device.
Never attempt to infer or reconstruct redacted information.
Return exactly one valid action from the allowed action schema: CLICK, SCROLL, FOCUS, TYPE, SELECT, PRESS_KEY, WAIT.
Do not return JavaScript.
Do not return CSS selectors unless supplied by the client.
Prefer agentId from the provided DOM representation.

Format response ONLY as raw JSON:
{
  "action": "CLICK",
  "target": { "agentId": "el-1" },
  "reason": "Clicking the targeted submit/next button"
}
"""

class OllamaService:
    @staticmethod
    async def reason(task: str, sanitized_screenshot_b64: str, dom_nodes: list) -> Optional[ActionSchema]:
        """
        Sends sanitized screenshot and DOM to Ollama VLM.
        """
        # Clean base64 header if present
        clean_b64 = sanitized_screenshot_b64
        if "base64," in clean_b64:
            clean_b64 = clean_b64.split("base64,")[1]

        prompt = f"""Task: {task}
DOM Elements:
{dom_nodes[:25]}

Reason over the sanitized screenshot and DOM elements to determine the single best next action to accomplish the task.
Output strict JSON matching the action schema.
"""

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"{settings.OLLAMA_BASE_URL}/api/generate",
                    json={
                        "model": settings.OLLAMA_MODEL,
                        "system": VLM_SYSTEM_PROMPT,
                        "prompt": prompt,
                        "images": [clean_b64],
                        "stream": False,
                        "format": "json"
                    }
                )

                if resp.status_code == 200:
                    raw_text = resp.json().get("response", "")
                    return ActionParser.parse_model_response(raw_text)
        except Exception:
            # Fallback to local semantic reasoning if Ollama is not actively running
            return None

        return None
