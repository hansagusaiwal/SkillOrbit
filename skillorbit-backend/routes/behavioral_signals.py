from fastapi import APIRouter, HTTPException
from models import BehavioralSignalRequest, BehavioralSignalResponse, BehavioralSignalScores
from ml.behavioral_signals import BehavioralSignalAnalyzer, generate_candidate_signals

_analyzer: BehavioralSignalAnalyzer | None = None
_signals: list | None = None


def get_analyzer() -> tuple[BehavioralSignalAnalyzer, list]:
    global _analyzer, _signals
    if _analyzer is None:
        _analyzer = BehavioralSignalAnalyzer(use_transformer=False)
        _signals = generate_candidate_signals(n=20)
    return _analyzer, _signals


router = APIRouter()


@router.post("/analyze", response_model=BehavioralSignalResponse)
def analyze_behavioral_signals(req: BehavioralSignalRequest):
    analyzer, signals = get_analyzer()
    try:
        signal = next((s for s in signals if s.candidate_id == req.candidate_id), signals[0])
        profile = analyzer.analyze(signal)
        api_resp = analyzer.to_api_response(profile)
        scores = api_resp["scores"]
        return BehavioralSignalResponse(
            candidate_id=api_resp["candidate_id"],
            scores=BehavioralSignalScores(
                collaboration=scores["collaboration"],
                problem_solving=scores["problem_solving"],
                learning_velocity=scores["learning_velocity"],
                ownership=scores["ownership"],
                communication=scores["communication"],
                initiative=scores["initiative"],
                overall=scores["overall"],
            ),
            confidence=api_resp["confidence"],
            top_evidence=api_resp["top_evidence"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
