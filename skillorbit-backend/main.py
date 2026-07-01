import asyncio
import logging
import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import auth, jobs, candidates, shortlist, dashboard, rank, jd_skills, hidden_gems, explainability, talent_twin, behavioral_signals, market_insight, recruitability, copilot

load_dotenv()

logger = logging.getLogger("uvicorn")

_REQUIRED_ENV_VARS = {
    "GROQ_API_KEY": "Groq API key for the Copilot/RAG chatbot",
}

_MISSING_VARS = [k for k, v in _REQUIRED_ENV_VARS.items() if not os.environ.get(k)]
if _MISSING_VARS:
    logger.warning(
        "Missing required env vars: %s. Set them in .env or environment.",
        ", ".join(f"{k} ({_REQUIRED_ENV_VARS[k]})" for k in _MISSING_VARS),
    )

app = FastAPI(title="SkillOrbit API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth")
app.include_router(jobs.router, prefix="/api/jobs")
app.include_router(candidates.router, prefix="/api/candidates")
app.include_router(shortlist.router, prefix="/api/shortlist")
app.include_router(dashboard.router, prefix="/api/dashboard")
app.include_router(rank.router, prefix="/api/candidates")
app.include_router(jd_skills.router, prefix="/api/jd-skills")
app.include_router(hidden_gems.router, prefix="/api/hidden-gems")
app.include_router(explainability.router, prefix="/api/explain")
app.include_router(talent_twin.router, prefix="/api/talent-twin")
app.include_router(behavioral_signals.router, prefix="/api/behavioral-signals")
app.include_router(market_insight.router, prefix="/api/market-insight")
app.include_router(recruitability.router, prefix="/api/recruitability")
app.include_router(copilot.router, prefix="/api/copilot")


@app.on_event("startup")
async def warm_copilot():
    logger.info("Scheduling copilot warm-up in background...")
    async def _warm():
        try:
            from routes.copilot import get_copilot
            get_copilot()
            logger.info("Copilot ready.")
        except Exception as e:
            logger.warning("Copilot warm-up failed (will lazy-init on first request): %s", e)
    asyncio.ensure_future(_warm())


@app.get("/api/health")
def health():
    return {"status": "ok", "timestamp": "2026-06-22T00:00:00Z"}


if __name__ == "__main__":
    import os
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 3001)),
        reload=False
    )
