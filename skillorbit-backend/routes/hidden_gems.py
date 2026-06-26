import os
import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException
from models import HiddenGemDetectRequest, HiddenGemDetectResponse, HiddenGemResult
from ml.hidden_gem_detector import HiddenGemDetector
from ml.scorer import score_candidate
from data import raw_candidates

_detector: HiddenGemDetector | None = None


def get_detector() -> HiddenGemDetector:
    global _detector
    if _detector is None:
        _detector = HiddenGemDetector()
        df = _build_candidate_df()
        _detector.fit(df)
    return _detector


def _build_candidate_df() -> pd.DataFrame:
    scored = [score_candidate(dict(c)) for c in raw_candidates]
    rows = []
    for c in scored:
        rows.append({
            "id":               c["id"],
            "name":             c["name"],
            "role":             c["role"],
            "company":          c["company"],
            "successScore":     c.get("successScore", 50),
            "technicalFit":     c.get("technicalFit", 50),
            "skillMatch":       c.get("skillMatch", 50),
            "experienceLevel":  c.get("experienceMatch", 50),
            "careerGrowth":     c.get("careerGrowth", 50),
            "learningVelocity": c.get("learningVelocity", 0.5),
            "careerGrowthRate": c.get("career_growth_rate", 1.0),
            "githubActivity":   c.get("github_activity", 0.5),
            "openSourcePRs":    c.get("open_source_contribs", 0),
        })
    return pd.DataFrame(rows)


router = APIRouter()


@router.post("/detect", response_model=HiddenGemDetectResponse)
def detect_hidden_gems(req: HiddenGemDetectRequest):
    try:
        detector = get_detector()
        df = _build_candidate_df()
        detector.fit(df)
        gems = detector.detect(df, top_k=req.top_k)
        results = []
        for _, row in gems.iterrows():
            results.append(HiddenGemResult(
                gem_rank=int(row["gem_rank"]),
                id=row["id"],
                name=row["name"],
                role=row.get("role", ""),
                company=row.get("company", ""),
                successScore=round(row["successScore"], 1),
                skillMatch=round(row["skillMatch"], 1),
                learningVelocity=round(row["learningVelocity"], 3),
                gem_score=row["gem_score"],
                gem_reason=row["gem_reason"],
            ))
        return HiddenGemDetectResponse(gems=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
