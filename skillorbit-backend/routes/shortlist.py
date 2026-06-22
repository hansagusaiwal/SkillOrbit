from fastapi import APIRouter
from data import candidates
from models import ShortlistItem

router = APIRouter()


@router.get("/", response_model=list[ShortlistItem])
def get_shortlist():
    sorted_candidates = sorted(candidates, key=lambda c: c.successScore, reverse=True)
    return [
        ShortlistItem(
            rank=i + 1,
            candidateId=c.id,
            candidateName=c.name,
            successScore=c.successScore,
            technicalFit=c.technicalFit,
            recruitability=c.recruitability,
            reason=c.reason,
        )
        for i, c in enumerate(sorted_candidates)
    ]


@router.get("/stats")
def shortlist_stats():
    sorted_candidates = sorted(candidates, key=lambda c: c.successScore, reverse=True)
    avg_score = (
        sum(c.successScore for c in sorted_candidates) // len(sorted_candidates)
        if sorted_candidates
        else 0
    )
    return {
        "topCandidates": len(sorted_candidates),
        "avgSuccessScore": avg_score,
        "hiddenGems": sum(1 for c in candidates if c.hiddenGem),
    }
