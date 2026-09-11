import httpx
from typing import Tuple
from ..config import settings
from ..models import ActionSchema, ActionTarget
from .ollama import OllamaService, VLM_SYSTEM_PROMPT
from .action_parser import ActionParser

class VLMCoordinator:
    @staticmethod
    async def reason(task: str, sanitized_screenshot: str, dom: dict) -> Tuple[ActionSchema, str]:
        """
        Attempts reasoning via Ollama -> OpenAI-compatible -> Transparent Demo Fallback.
        Returns (action, provider_name).
        """
        nodes = dom.get("nodes", []) if isinstance(dom, dict) else []

        # 1. Try Ollama local vision model
        ollama_action = await OllamaService.reason(task, sanitized_screenshot, nodes)
        if ollama_action:
            return ollama_action, f"Ollama ({settings.OLLAMA_MODEL})"

        # 2. Try OpenAI-compatible vision model if configured
        if settings.OPENAI_API_KEY:
            try:
                action = await VLMCoordinator._reason_openai(task, sanitized_screenshot, nodes)
                if action:
                    return action, f"OpenAI ({settings.OPENAI_VISION_MODEL})"
            except Exception:
                pass

        # 3. Transparent Demo/Offline Reasoning Fallback
        # Reasons over sanitized structural DOM representations
        action = VLMCoordinator._semantic_reasoning_fallback(task, nodes)
        return action, "Offline-Semantic-Reasoning (Transparent Demo Fallback)"

    @staticmethod
    async def _reason_openai(task: str, sanitized_screenshot: str, nodes: list) -> ActionSchema:
        clean_b64 = sanitized_screenshot
        if not clean_b64.startswith("data:"):
            clean_b64 = f"data:image/png;base64,{clean_b64}"

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{settings.OPENAI_BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                json={
                    "model": settings.OPENAI_VISION_MODEL,
                    "messages": [
                        {"role": "system", "content": VLM_SYSTEM_PROMPT},
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": f"Task: {task}\nNodes: {nodes[:20]}"},
                                {"type": "image_url", "image_url": {"url": clean_b64}}
                            ]
                        }
                    ],
                    "response_format": {"type": "json_object"}
                }
            )
            if resp.status_code == 200:
                content = resp.json()["choices"][0]["message"]["content"]
                parsed = ActionParser.parse_model_response(content)
                if parsed:
                    return parsed
        raise Exception("OpenAI vision inference failed")

    @staticmethod
    def _semantic_reasoning_fallback(task: str, nodes: list) -> ActionSchema:
        task_lower = task.lower()

        # Check for scroll task
        if "scroll" in task_lower:
            return ActionSchema(
                action="SCROLL",
                direction="DOWN",
                amount=400,
                reason="Semantic agent: scrolling down to reveal off-screen page content"
            )

        # Look for matching button or link
        for node in nodes:
            text = (node.get("text") or "").lower()
            role = node.get("role") or node.get("tag")

            if "submit" in task_lower or "login" in task_lower or "sign in" in task_lower:
                if any(w in text for w in ["submit", "login", "sign in", "continue", "enter", "log in"]):
                    return ActionSchema(
                        action="CLICK",
                        target=ActionTarget(agentId=node.get("agentId")),
                        reason=f"Identified primary submission button: '{node.get('text')}'"
                    )

            if "pay" in task_lower or "checkout" in task_lower:
                if any(w in text for w in ["pay", "checkout", "place order", "complete payment"]):
                    return ActionSchema(
                        action="CLICK",
                        target=ActionTarget(agentId=node.get("agentId")),
                        reason=f"Identified payment execution button: '{node.get('text')}'"
                    )

            if "continue" in task_lower or "next" in task_lower:
                if any(w in text for w in ["continue", "next", "proceed", "forward"]):
                    return ActionSchema(
                        action="CLICK",
                        target=ActionTarget(agentId=node.get("agentId")),
                        reason=f"Identified continuation button: '{node.get('text')}'"
                    )

        # Default fallback: pick first visible interactive button
        first_btn = next((n for n in nodes if n.get("role") == "button" or n.get("tag") == "button"), None)
        if first_btn:
            return ActionSchema(
                action="CLICK",
                target=ActionTarget(agentId=first_btn.get("agentId")),
                reason=f"Clicking visible interactable button: '{first_btn.get('text')}'"
            )

        return ActionSchema(
            action="WAIT",
            ms=1000,
            reason="Waiting for page updates; no direct action candidate identified"
        )
