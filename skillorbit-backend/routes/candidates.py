from fastapi import APIRouter, HTTPException
from data import candidates
from models import Candidate

router = APIRouter()


@router.get("/", response_model=list[Candidate])
def list_candidates():
    return candidates


@router.get("/hidden-gems", response_model=list[Candidate])
def hidden_gems():
    return [c for c in candidates if c.hiddenGem]


@router.get("/{candidate_id}", response_model=Candidate)
def get_candidate(candidate_id: str):
    for c in candidates:
        if c.id == candidate_id:
            return c
    raise HTTPException(status_code=404, detail="Candidate not found")
