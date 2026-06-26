from collections import Counter
from fastapi import APIRouter
from data import raw_candidates, get_total_candidate_count
from data_jobs import jobs
from models import DashboardStats, QualityDistributionItem, DonutSegment
from ml.scorer import score_candidate

router = APIRouter()

DONUT_COLORS = ["#4648d4", "#645efb", "#008096", "#c0c1ff", "#e07080", "#a0a0a0"]


def _categorize_role(role: str) -> str:
    role_lower = role.lower()
    if any(kw in role_lower for kw in ["ai", "machine learning", "deep learning", "nlp", "computer vision", "llm", "gen ai", "data scientist", "data science"]):
        return "AI/ML"
    if any(kw in role_lower for kw in ["backend", "back end", "server", "api", "microservice"]):
        return "Backend"
    if any(kw in role_lower for kw in ["cloud", "devops", "infrastructure", "sre", "platform engineer"]):
        return "Cloud/DevOps"
    if any(kw in role_lower for kw in ["frontend", "front end", "ui", "ux", "web"]):
        return "Frontend"
    if any(kw in role_lower for kw in ["data engineer", "data analyst", "analytics", "data"]):
        return "Data"
    return "Other"


def _compute_quality_distribution(scored: list[dict]) -> list[QualityDistributionItem]:
    buckets = list(range(0, 101, 10))
    labels = [f"{b}-{b+10}" for b in range(0, 100, 10)]
    counts = [0] * 10
    bench_counts = [0] * 10
    for c in scored:
        score = c.get("successScore", 0)
        idx = min(int(score // 10), 9)
        counts[idx] += 1
        if c.get("recruitability", 0) > 70:
            bench_counts[idx] += 1
    return [
        QualityDistributionItem(label=labels[i], indexed=counts[i], benchmarked=bench_counts[i])
        for i in range(10)
    ]


def _compute_talent_pool(scored: list[dict]) -> list[DonutSegment]:
    categories = Counter()
    for c in scored:
        categories[_categorize_role(c.get("role", ""))] += 1
    total = sum(categories.values()) or 1
    return [
        DonutSegment(label=label, value=round(count / total * 100, 1), color=DONUT_COLORS[i % len(DONUT_COLORS)])
        for i, (label, count) in enumerate(categories.most_common())
    ]


def _compute_insight(scored: list[dict]) -> str:
    by_cat: dict[str, list[float]] = {}
    for c in scored:
        cat = _categorize_role(c.get("role", ""))
        by_cat.setdefault(cat, []).append(c.get("successScore", 0))
    if not by_cat:
        return "No candidate data available for insights."
    best_cat = max(by_cat, key=lambda k: sum(by_cat[k]) / len(by_cat[k]))
    best_score = round(sum(by_cat[best_cat]) / len(by_cat[best_cat]), 1)

    recruit_by_cat: dict[str, list[float]] = {}
    for c in scored:
        cat = _categorize_role(c.get("role", ""))
        recruit_by_cat.setdefault(cat, []).append(c.get("recruitability", 0))
    worst_cat = min(recruit_by_cat, key=lambda k: sum(recruit_by_cat[k]) / len(recruit_by_cat[k]))
    worst_recruit = round(sum(recruit_by_cat[worst_cat]) / len(recruit_by_cat[worst_cat]), 1)
    return (
        f"Your {best_cat} roles show the strongest candidate quality ({best_score}% avg success), "
        f"while {worst_cat} profiles have lower recruitability ({worst_recruit}%). "
        "Consider adjusting sourcing strategies for better pipeline balance."
    )


@router.get("/stats", response_model=DashboardStats)
def dashboard_stats():
    scored = [score_candidate(dict(c)) for c in raw_candidates]
    total = len(scored)
    avg = sum(c["successScore"] for c in scored) / total if scored else 0
    active_jobs = sum(1 for j in jobs if j.status == "Active")
    return DashboardStats(
        totalCandidatesIndexed=get_total_candidate_count(),
        activeJobs=active_jobs,
        rankedShortlists=max(active_jobs, 1),
        avgSuccessScore=round(avg, 1),
        hiddenGemsFound=sum(1 for c in raw_candidates if c.get("hiddenGem")),
        candidateQualityDistribution=_compute_quality_distribution(scored),
        talentPoolByRole=_compute_talent_pool(scored),
        insight=_compute_insight(scored),
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
