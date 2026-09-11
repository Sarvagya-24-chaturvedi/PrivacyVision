from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class ActionTarget(BaseModel):
    agentId: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None

class ActionSchema(BaseModel):
    action: str = Field(..., description="CLICK, SCROLL, FOCUS, TYPE, SELECT, PRESS_KEY, or WAIT")
    target: Optional[ActionTarget] = None
    direction: Optional[str] = None
    amount: Optional[int] = None
    text: Optional[str] = None
    value: Optional[str] = None
    key: Optional[str] = None
    ms: Optional[int] = None
    reason: Optional[str] = None

class AgentRequest(BaseModel):
    task: str = Field(..., description="The user instructions or goal for the page")
    screenshot: str = Field(..., description="Base64 encoded SANITIZED screenshot only")
    dom: Dict[str, Any] = Field(..., description="Privacy-safe structural representation of the DOM")
    privacy: Optional[Dict[str, Any]] = None

class AgentResponse(BaseModel):
    action: ActionSchema
    status: str = "ok"
    reasoning: Optional[str] = None
    received_sanitized: bool = True

class HealthResponse(BaseModel):
    status: str
    vlm_provider: str
    model: str
    privacy_guarantee: str
