from fastapi import APIRouter, HTTPException
from models import RankRequest, RankResult, SimilarCandidate
from ml.ranker import CandidateRanker

import os

_ranker: CandidateRanker | None = None


def get_ranker() -> CandidateRanker:
    global _ranker
    if _ranker is None:
        dir_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ml", "ranker_data")
        if not os.path.exists(f"{dir_path}/faiss.index"):
            raise RuntimeError("Ranker data not found. Run `python -m ml.build_ranker` first.")
        _ranker = CandidateRanker.load(dir_path)
    return _ranker


router = APIRouter()


@router.post("/rank", response_model=list[RankResult])
def rank_candidates(req: RankRequest):
    try:
        ranker = get_ranker()
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    df = ranker.rank(req.job_description, top_k=req.top_k, min_score=req.min_score)
    return [RankResult(**row) for _, row in df.iterrows()]


@router.get("/similar/{candidate_id}", response_model=list[SimilarCandidate])
def similar_candidates(candidate_id: str, top_k: int = 5):
    try:
        ranker = get_ranker()
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    try:
        df = ranker.find_similar(candidate_id, top_k=top_k)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return [SimilarCandidate(**row) for _, row in df.iterrows()]
