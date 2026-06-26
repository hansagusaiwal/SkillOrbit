import os
import pandas as pd
import numpy as np
from ml.model import CandidateSuccessModel

_model = None
_score_cache: dict[str, dict] | None = None


def get_model() -> CandidateSuccessModel:
    global _model
    if _model is None:
        path = os.path.join(os.path.dirname(__file__), "candidate_success_model.pkl")
        _model = CandidateSuccessModel.load(path)
    return _model


def precompute_batch(candidates: list[dict]) -> dict[str, dict]:
    """Pre-compute scores for all candidates in a single batch prediction."""
    model = get_model()
    global _score_cache

    df = pd.DataFrame([
        {col: c[col] for col in CandidateSuccessModel.FEATURE_COLS}
        for c in candidates
    ])

    # Batch predict
    X_scaled = model.scaler.transform(df)
    success_raw = model.model.predict(X_scaled)
    success_score = np.clip(success_raw, 0, 100).round(1)

    # Dimension sub-scores
    dim_scores: dict[str, list[float]] = {}
    for dim_name, dim_config in model.DIMENSIONS.items():
        batch_raw = pd.Series(0.0, index=df.index)
        for feat, w in dim_config["features"].items():
            col = df[feat].copy()
            if feat == "job_hop_freq":
                col = col.clip(upper=5)
                col = 1 - (col / 5)
            mn, mx = col.min(), col.max()
            col = (col - mn) / (mx - mn + 1e-9)
            batch_raw += w * col
        val = model._dim_scalers[dim_name].transform(batch_raw.values.reshape(-1, 1))
        dim_scores[dim_name] = np.clip(val.flatten(), 0, 100).round(1).tolist()

    # learningVelocity - per-row
    lv = (
        df.get("tech_stack_diversity", 0.5) * 0.5
        + df.get("career_growth_rate", 0.5) * 0.3
        + df.get("github_activity", 0.5) * 0.2
    )
    lv = np.clip(lv * 100, 0, 100).round(1)

    _score_cache = {}
    for i, c in enumerate(candidates):
        cid = c["id"]
        _score_cache[cid] = {
            "technicalFit": float(dim_scores["technicalFit"][i]),
            "skillMatch": float(dim_scores["skillMatch"][i]),
            "experienceMatch": float(dim_scores["experienceLevel"][i]),
            "recruitability": float(dim_scores["cultureSignal"][i]),
            "careerGrowth": float(dim_scores["careerGrowth"][i]),
            "learningVelocity": float(lv.iloc[i]),
            "successScore": float(success_score[i]),
        }

    return _score_cache


def score_candidate(candidate: dict) -> dict:
    """Apply cached batch-predicted scores to a candidate dict."""
    global _score_cache
    if _score_cache is None:
        raise RuntimeError("Call precompute_batch() before score_candidate().")

    scores = _score_cache.get(candidate["id"])
    if scores is None:
        # Fallback: single prediction for unknown candidate
        model = get_model()
        features = {col: candidate[col] for col in CandidateSuccessModel.FEATURE_COLS}
        scores = model.predict_single(features)
        candidate["technicalFit"] = scores.get("technicalFit", 0)
        candidate["skillMatch"] = scores.get("skillMatch", 0)
        candidate["experienceMatch"] = scores.get("experienceLevel", 0)
        candidate["recruitability"] = scores.get("cultureSignal", 0)
        candidate["careerGrowth"] = scores.get("careerGrowth", 0)
        candidate["learningVelocity"] = scores.get("learningVelocity", 0)
        candidate["successScore"] = scores.get("successScore", 0)
        return candidate

    candidate["technicalFit"] = scores["technicalFit"]
    candidate["skillMatch"] = scores["skillMatch"]
    candidate["experienceMatch"] = scores["experienceMatch"]
    candidate["recruitability"] = scores["recruitability"]
    candidate["careerGrowth"] = scores["careerGrowth"]
    candidate["learningVelocity"] = scores["learningVelocity"]
    candidate["successScore"] = scores["successScore"]
    return candidate
