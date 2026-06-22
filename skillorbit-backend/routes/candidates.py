from fastapi import APIRouter, HTTPException
from data import raw_candidates
from models import Candidate
from ml.scorer import score_candidate

router = APIRouter()


@router.get("/", response_model=list[Candidate])
def list_candidates():
    scored = [score_candidate(dict(c)) for c in raw_candidates]
    return [Candidate(**c) for c in scored]


@router.get("/hidden-gems", response_model=list[Candidate])
def hidden_gems():
    gems = [c for c in raw_candidates if c.get("hiddenGem")]
    scored = [score_candidate(dict(c)) for c in gems]
    return [Candidate(**c) for c in scored]


@router.get("/{candidate_id}", response_model=Candidate)
def get_candidate(candidate_id: str):
    for c in raw_candidates:
        if c["id"] == candidate_id:
            return Candidate(**score_candidate(dict(c)))
    raise HTTPException(status_code=404, detail="Candidate not found")
