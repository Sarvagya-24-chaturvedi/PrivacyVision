from fastapi import APIRouter
from ..models import HealthResponse
from ..config import settings

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        vlm_provider="Ollama / Semantic Coordinator",
        model=settings.OLLAMA_MODEL,
        privacy_guarantee="The server accepts ONLY sanitized visual context and privacy-safe metadata. Raw screenshots and plaintext sensitive credentials never reach the server."
    )
