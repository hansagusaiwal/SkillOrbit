import os
from fastapi import APIRouter, HTTPException
from models import RecruitabilityRequest, RecruitabilityResponse, RecruitabilityTopSignal, BatchRecruitabilityRequest, BatchRecruitabilityResponse, BatchRecruitabilityResult
from ml.recruitability import RecruitabilityModel, generate_recruitability_data

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "ml", "recruitability_model.pkl")

_model: RecruitabilityModel | None = None


def get_model() -> RecruitabilityModel:
    global _model
    if _model is not None:
        return _model
    if os.path.exists(MODEL_PATH):
        _model = RecruitabilityModel.load(MODEL_PATH)
    else:
        df = generate_recruitability_data(n=3000)
        _model = RecruitabilityModel(threshold=0.40)
        _model.fit(df)
        _model.save(MODEL_PATH)
    return _model


router = APIRouter()


@router.post("/predict", response_model=RecruitabilityResponse)
def predict_recruitability(req: RecruitabilityRequest):
    try:
        model = get_model()
        result = model.predict_single(req.candidate)
        return RecruitabilityResponse(
            recruitable_prob=result["recruitable_prob"],
            recruitable_label=result["recruitable_label"],
            top_signals=[RecruitabilityTopSignal(**s) for s in result["top_signals"]],
            urgency_flag=result["urgency_flag"],
            recommended_action=result["recommended_action"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch-predict", response_model=BatchRecruitabilityResponse)
def batch_predict_recruitability(req: BatchRecruitabilityRequest):
    try:
        model = get_model()
        results = model.predict_batch([c.model_dump() for c in req.candidates])
        return BatchRecruitabilityResponse(
            results=[BatchRecruitabilityResult(**r) for r in results]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))