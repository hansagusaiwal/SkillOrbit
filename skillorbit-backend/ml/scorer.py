from ml.model import CandidateSuccessModel
import os

_model = None


def get_model() -> CandidateSuccessModel:
    global _model
    if _model is None:
        path = os.path.join(os.path.dirname(__file__), "candidate_success_model.pkl")
        _model = CandidateSuccessModel.load(path)
    return _model


def score_candidate(candidate: dict) -> dict:
    """
    Takes a candidate dict that includes the 14 ML feature fields,
    runs the model, and returns the candidate dict with scores populated.
    """
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
