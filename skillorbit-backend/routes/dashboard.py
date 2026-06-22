from fastapi import APIRouter
from data import raw_candidates
from data_jobs import jobs
from models import DashboardStats
from ml.scorer import score_candidate

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
def dashboard_stats():
    scored = [score_candidate(dict(c)) for c in raw_candidates]
    avg = (
        sum(c["successScore"] for c in scored) / len(scored)
        if scored
        else 0
    )
    return DashboardStats(
        totalCandidatesIndexed=100000,
        activeJobs=sum(1 for j in jobs if j.status == "Active"),
        rankedShortlists=34,
        avgSuccessScore=round(avg, 1),
        hiddenGemsFound=sum(1 for c in raw_candidates if c.get("hiddenGem")),
    )


@router.get("/recent-jobs")
def recent_jobs():
    result = []
    for job in jobs:
        score_tone = "emerald" if job.topScore >= 90 else "amber"
        status_tone = "emerald" if job.status == "Active" else "slate"
        result.append(
            {
                "id": job.id,
                "title": job.title,
                "subtitle": f"{job.location} \u2022 {job.experienceRange}",
                "scanned": f"{job.candidatesScanned:,}",
                "score": f"{job.topScore}/100",
                "status": job.status,
                "scoreTone": score_tone,
                "statusTone": status_tone,
            }
        )
    return result
