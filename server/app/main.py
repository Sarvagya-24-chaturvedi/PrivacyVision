from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from .routes import health, agent

app = FastAPI(
    title="PrivacyVision Reasoning Server",
    description="Privacy-Preserving On-Device Visual Browser Agent Backend (SIH26171)",
    version="1.0.0"
)

# Enable CORS for Chrome Extension origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(health.router)
app.include_router(agent.router)

# A judge-friendly local frontend: the interactive scenarios are available
# from the same localhost origin as the API.
DEMO_DIR = Path(__file__).resolve().parents[2] / "demo"
if DEMO_DIR.is_dir():
    app.mount("/demo", StaticFiles(directory=str(DEMO_DIR), html=True), name="demo")

# Compatibility route: /agent -> /api/agent
@app.post("/agent")
async def compatibility_agent(req: agent.AgentRequest):
    return await agent.process_agent_step(req)

@app.get("/")
def root():
    return {
        "service": "PrivacyVision Reasoning Server",
        "problem_statement": "SIH26171",
        "status": "online",
        "docs": "/docs",
        "demo": "/demo",
        "privacy": "Only sanitized visual and structural context is processed."
    }
