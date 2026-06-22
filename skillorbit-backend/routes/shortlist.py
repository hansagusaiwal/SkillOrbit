from fastapi import APIRouter
from data import raw_candidates
from models import ShortlistItem
from ml.scorer import score_candidate

router = APIRouter()


@router.get("/", response_model=list[ShortlistItem])
def get_shortlist():
    scored = [score_candidate(dict(c)) for c in raw_candidates]
    scored.sort(key=lambda c: c["successScore"], reverse=True)
    return [
        ShortlistItem(
            rank=i + 1,
            candidateId=c["id"],
            candidateName=c["name"],
            successScore=c["successScore"],
            technicalFit=c["technicalFit"],
            recruitability=c["recruitability"],
            reason=c["reason"],
        )
        for i, c in enumerate(scored)
    ]


@router.get("/stats")
def shortlist_stats():
    scored = [score_candidate(dict(c)) for c in raw_candidates]
    scored.sort(key=lambda c: c["successScore"], reverse=True)
    avg = (
        sum(c["successScore"] for c in scored) / len(scored)
        if scored
        else 0
    )
    return {
        "topCandidates": len(scored),
        "avgSuccessScore": round(avg, 1),
        "hiddenGems": sum(1 for c in raw_candidates if c.get("hiddenGem")),
    }
