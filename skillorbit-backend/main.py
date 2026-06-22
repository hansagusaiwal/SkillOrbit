from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import auth, jobs, candidates, shortlist, dashboard

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


@app.get("/api/health")
def health():
    return {"status": "ok", "timestamp": "2026-06-22T00:00:00Z"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=3001, reload=True)
