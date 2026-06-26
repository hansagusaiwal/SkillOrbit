import os
import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException
from models import (
    ExplainCandidateRequest, ExplainCandidateResponse,
    CompareCandidatesRequest, CompareCandidatesResponse,
    GlobalImportanceResponse, GlobalImportanceItem,
    CopilotExplanationRequest, CopilotExplanationResponse,
    ShapFeature,
)
from ml.explainability import ExplainabilityEngine, _get_engine, FEATURE_COLS
from data import raw_candidates

_engine: ExplainabilityEngine | None = None
_training_df: pd.DataFrame | None = None


def get_engine() -> tuple[ExplainabilityEngine, pd.DataFrame]:
    global _engine, _training_df
    if _engine is None:
        _engine = _get_engine()
        _training_df = pd.DataFrame([
            {col: c[col] for col in FEATURE_COLS}
            for c in raw_candidates
        ])
    return _engine, _training_df


router = APIRouter()


@router.post("/candidate", response_model=ExplainCandidateResponse)
def explain_candidate(req: ExplainCandidateRequest):
    engine, _ = get_engine()
    try:
        exp = engine.explain_candidate(req.candidate, top_n=req.top_n)
        return ExplainCandidateResponse(
            score=exp["score"],
            base_value=exp["base_value"],
            top_drivers=[ShapFeature(**d) for d in exp["top_drivers"]],
            top_detractors=[ShapFeature(**d) for d in exp["top_detractors"]],
            all_shap=exp["all_shap"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compare", response_model=CompareCandidatesResponse)
def compare_candidates(req: CompareCandidatesRequest):
    engine, _ = get_engine()
    try:
        comp = engine.compare_candidates(
            req.candidate_a, req.candidate_b,
            name_a=req.name_a, name_b=req.name_b,
        )
        return CompareCandidatesResponse(
            winner=comp["winner"],
            score_a=comp["score_a"],
            score_b=comp["score_b"],
            score_delta=comp["score_delta"],
            key_differences=[
                {"feature": d["feature"], "delta": d["delta"], "favors": d["favors"]}
                for d in comp["key_differences"]
            ],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/global-importance", response_model=GlobalImportanceResponse)
def global_importance():
    engine, df = get_engine()
    try:
        imp = engine.global_importance(df, top_n=10)
        return GlobalImportanceResponse(
            importance=[
                GlobalImportanceItem(feature=r["feature"], mean_abs_shap=r["mean_abs_shap"])
                for _, r in imp.iterrows()
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/copilot-text", response_model=CopilotExplanationResponse)
def copilot_explanation(req: CopilotExplanationRequest):
    engine, _ = get_engine()
    try:
        text = engine.to_copilot_text(req.candidate, name=req.name)
        return CopilotExplanationResponse(explanation=text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
