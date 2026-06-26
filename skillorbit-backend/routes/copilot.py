import os
import joblib
from fastapi import APIRouter, HTTPException
from models import CopilotQueryRequest, CopilotQueryResponse, CopilotResetResponse, CopilotSuggestionsResponse
from ml.copilot import RecruiterCopilot, VectorStore, build_candidate_knowledge_base

CACHE_PATH = os.path.join(os.path.dirname(__file__), "..", "ml", "copilot_cache.pkl")

_store: VectorStore | None = None
_copilot: RecruiterCopilot | None = None


def _build_and_cache() -> RecruiterCopilot:
    global _store, _copilot
    documents = build_candidate_knowledge_base(n=2000)
    _store = VectorStore()
    _store.build(documents)
    _copilot = RecruiterCopilot(vector_store=_store)
    joblib.dump({"documents": documents, "index": _store.index}, CACHE_PATH)
    return _copilot


def get_copilot() -> RecruiterCopilot:
    global _store, _copilot
    if _copilot is not None:
        return _copilot
    if os.path.isfile(CACHE_PATH):
        cached = joblib.load(CACHE_PATH)
        _store = VectorStore()
        _store.documents = cached["documents"]
        _store.index = cached["index"]
        _copilot = RecruiterCopilot(vector_store=_store)
        return _copilot
    return _build_and_cache()


router = APIRouter()


@router.post("/query", response_model=CopilotQueryResponse)
def copilot_query(req: CopilotQueryRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="query cannot be empty")
    try:
        copilot = get_copilot()
        result = copilot.query(req.query, top_k=req.top_k)
        return CopilotQueryResponse(
            answer=result["answer"],
            intent=result["intent"],
            sources=result["sources"],
            chunks_used=result["chunks_used"],
            latency_s=result["latency_s"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reset", response_model=CopilotResetResponse)
def copilot_reset():
    copilot = get_copilot()
    copilot.reset_history()
    return CopilotResetResponse(status="Conversation history cleared")


@router.get("/suggestions", response_model=CopilotSuggestionsResponse)
def copilot_suggestions():
    copilot = get_copilot()
    return CopilotSuggestionsResponse(questions=copilot.suggested_questions())