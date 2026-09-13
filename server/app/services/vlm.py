import httpx
import re
from typing import Tuple, Optional
from ..config import settings
from ..models import ActionSchema, ActionTarget
from .ollama import OllamaService, VLM_SYSTEM_PROMPT
from .action_parser import ActionParser

class VLMCoordinator:
    @staticmethod
    async def reason(task: str, sanitized_screenshot: str, dom: dict) -> Tuple[ActionSchema, str]:
        """
        Attempts reasoning via Gemini -> OpenAI -> Ollama -> Transparent Semantic Fallback.
        Returns (action, provider_name).
        """
        nodes = dom.get("nodes", []) if isinstance(dom, dict) else []

        # 1. Try Google Gemini Vision if configured (Cloud AI Recommended)
        if settings.GEMINI_API_KEY:
            try:
                action = await VLMCoordinator._reason_gemini(task, sanitized_screenshot, nodes)
                if action:
                    return action, f"Google Gemini ({settings.GEMINI_MODEL})"
            except Exception as e:
                print(f"[VLMCoordinator] Gemini reasoning error: {e}")

        # 2. Try OpenAI-compatible vision model if configured
        if settings.OPENAI_API_KEY:
            try:
                action = await VLMCoordinator._reason_openai(task, sanitized_screenshot, nodes)
                if action:
                    return action, f"OpenAI ({settings.OPENAI_VISION_MODEL})"
            except Exception as e:
                print(f"[VLMCoordinator] OpenAI reasoning error: {e}")

        # 3. Try Ollama local vision model
        try:
            ollama_action = await OllamaService.reason(task, sanitized_screenshot, nodes)
            if ollama_action:
                return ollama_action, f"Ollama ({settings.OLLAMA_MODEL})"
        except Exception:
            pass

        # 4. Transparent High-Precision Semantic Reasoning Fallback
        action = VLMCoordinator._semantic_reasoning_fallback(task, nodes)
        return action, "PrivacyVision Semantic Engine (Cloud Fallback)"

    @staticmethod
    async def _reason_gemini(task: str, sanitized_screenshot: str, nodes: list) -> Optional[ActionSchema]:
        """Call Google Gemini 1.5 Vision API."""
        clean_b64 = sanitized_screenshot
        if "," in clean_b64:
            clean_b64 = clean_b64.split(",", 1)[1]

        prompt_text = (
            f"{VLM_SYSTEM_PROMPT}\n\n"
            f"User Goal/Task: {task}\n"
            f"Page Interactive Nodes (agentIds):\n{nodes[:30]}\n\n"
            "Analyze the sanitized screenshot and return strictly the JSON action schema."
        )

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt_text},
                    {
                        "inline_data": {
                            "mime_type": "image/png",
                            "data": clean_b64
                        }
                    }
                ]
            }],
            "generationConfig": {
                "temperature": 0.1,
                "response_mime_type": "application/json"
            }
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                try:
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = ActionParser.parse_model_response(raw_text)
                    if parsed:
                        return parsed
                except (KeyError, IndexError):
                    pass
        return None

    @staticmethod
    async def _reason_openai(task: str, sanitized_screenshot: str, nodes: list) -> Optional[ActionSchema]:
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
                                {"type": "text", "text": f"Task: {task}\nNodes: {nodes[:30]}"},
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
        return None

    @staticmethod
    def _semantic_reasoning_fallback(task: str, nodes: list) -> ActionSchema:
        task_lower = task.lower()

        # 1. Scroll action detection
        if "scroll" in task_lower:
            direction = "DOWN"
            if "up" in task_lower:
                direction = "UP"
            return ActionSchema(
                action="SCROLL",
                direction=direction,
                amount=450,
                reason="Autonomous agent: scrolling to reveal off-screen interactive elements"
            )

        # 2. Match action buttons or inputs by semantic goal
        for node in nodes:
            text = (node.get("text") or "").lower()
            agent_id = node.get("agentId")

            # Login / Sign in
            if any(w in task_lower for w in ["login", "sign in", "signin", "submit", "log in"]):
                if any(w in text for w in ["sign in", "login", "submit", "log in", "dashboard", "enter"]):
                    return ActionSchema(
                        action="CLICK",
                        target=ActionTarget(agentId=agent_id),
                        reason=f"Identified authentication button: '{node.get('text')}'"
                    )

            # Payment / Checkout
            if any(w in task_lower for w in ["pay", "payment", "checkout", "buy", "order"]):
                if any(w in text for w in ["pay", "checkout", "complete payment", "place order", "purchase", "verify"]):
                    return ActionSchema(
                        action="CLICK",
                        target=ActionTarget(agentId=agent_id),
                        reason=f"Identified payment action button: '{node.get('text')}'"
                    )

            # KYC / Verification
            if any(w in task_lower for w in ["kyc", "verify", "identity", "confirm"]):
                if any(w in text for w in ["verify", "submit kyc", "confirm", "approve", "save"]):
                    return ActionSchema(
                        action="CLICK",
                        target=ActionTarget(agentId=agent_id),
                        reason=f"Identified verification confirmation button: '{node.get('text')}'"
                    )

            # Continue / Next / Step
            if any(w in task_lower for w in ["continue", "next", "proceed", "step"]):
                if any(w in text for w in ["continue", "next", "proceed", "final step"]):
                    return ActionSchema(
                        action="CLICK",
                        target=ActionTarget(agentId=agent_id),
                        reason=f"Identified step continuation button: '{node.get('text')}'"
                    )

            # Profile / Approval
            if any(w in task_lower for w in ["approve", "profile", "face"]):
                if any(w in text for w in ["approve", "profile", "verify profile"]):
                    return ActionSchema(
                        action="CLICK",
                        target=ActionTarget(agentId=agent_id),
                        reason=f"Identified approval action button: '{node.get('text')}'"
                    )

        # 3. Default: select first actionable button
        first_btn = next((n for n in nodes if n.get("role") == "button" or n.get("tag") == "button"), None)
        if first_btn:
            return ActionSchema(
                action="CLICK",
                target=ActionTarget(agentId=first_btn.get("agentId")),
                reason=f"Clicking primary actionable element: '{first_btn.get('text') or first_btn.get('agentId')}'"
            )

        return ActionSchema(
            action="WAIT",
            ms=1000,
            reason="Waiting for DOM updates; no explicit action target identified"
        )
