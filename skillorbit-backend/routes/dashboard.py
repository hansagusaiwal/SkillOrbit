from fastapi import APIRouter
from data import candidates, jobs
from models import DashboardStats

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
def dashboard_stats():
    avg_score = (
        sum(c.successScore for c in candidates) // len(candidates)
        if candidates
        else 0
    )
    return DashboardStats(
        totalCandidatesIndexed=100000,
        activeJobs=sum(1 for j in jobs if j.status == "Active"),
        rankedShortlists=34,
        avgSuccessScore=avg_score,
        hiddenGemsFound=sum(1 for c in candidates if c.hiddenGem),
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
