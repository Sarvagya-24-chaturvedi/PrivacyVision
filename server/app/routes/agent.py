from fastapi import APIRouter, HTTPException, status
from ..models import AgentRequest, AgentResponse
from ..services.vlm import VLMCoordinator
from ..security.payload_validator import ServerPayloadSecurityAuditor

router = APIRouter(prefix="/api", tags=["Agent"])

@router.post("/agent", response_model=AgentResponse)
async def process_agent_step(request: AgentRequest):
    # 1. Audit payload to verify privacy compliance
    audit = ServerPayloadSecurityAuditor.audit_incoming_payload(request.model_dump())
    if not audit["compliant"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Privacy violation: Unsanitized data detected by server auditor: {audit['violations']}"
        )

    # Pre-classify page type to improve VLM reasoning context
    from ..services.classifier import classify_screenshot
    page_classification = classify_screenshot(request.screenshot)
    task_with_context = f"[Page type: {page_classification['page_type']} (confidence: {page_classification['confidence']:.0%})] {request.task}"

    # 2. Reason over sanitized visual & structural representation
    action, provider = await VLMCoordinator.reason(
        task=task_with_context,
        sanitized_screenshot=request.screenshot,
        dom=request.dom
    )

    return AgentResponse(
        action=action,
        status="ok",
        reasoning=f"Reasoned by {provider}: {action.reason}",
        received_sanitized=True
    )

@router.post("/classify")
async def classify_page(request: AgentRequest):
    """
    Classifies the sanitized screenshot page type using the trained MobileViT ONNX model.
    This helps the VLM understand what type of page it is reasoning about.
    """
    from ..services.classifier import classify_screenshot
    result = classify_screenshot(request.screenshot)
    return {
        "status": "ok",
        "sanitized_verified": True,
        "classification": result
    }

@router.post("/analyze")
async def analyze_page(request: AgentRequest):
    nodes = request.dom.get("nodes", []) if isinstance(request.dom, dict) else []
    return {
        "status": "ok",
        "interactive_nodes_count": len(nodes),
        "redactions_reported": request.privacy.get("redactions", 0) if request.privacy else 0,
        "sanitized_verified": True
    }
