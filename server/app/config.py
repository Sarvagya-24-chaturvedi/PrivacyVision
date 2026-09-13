import os
from typing import Optional
from pydantic import BaseModel

class Settings(BaseModel):
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    
    # Google Gemini Vision (Recommended for Cloud AI)
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    
    # Ollama Configuration (Local VLM)
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llava")
    
    # OpenAI / Groq Compatible Vision Model
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", None)
    OPENAI_VISION_MODEL: str = os.getenv("OPENAI_VISION_MODEL", "gpt-4o-mini")
    
    # Public Cloud Deployment URL
    PUBLIC_BACKEND_URL: Optional[str] = os.getenv("PUBLIC_BACKEND_URL", None)

settings = Settings()
