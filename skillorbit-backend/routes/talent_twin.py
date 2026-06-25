from fastapi import APIRouter, HTTPException
from models import (
    TalentTwinClassifyRequest, TalentTwinClassifyResponse,
    TalentTwinTwinsRequest, TalentTwinTwinsResponse, TalentTwinTwinResult,
    TalentTwinBenchmarkResponse,
    TalentTwinBestArchetypeRequest, TalentTwinBestArchetypeResponse, BestArchetypeResult,
    TalentTwinPoolCompositionResponse, PoolCompositionItem,
)
from ml.talent_twin import TalentTwinEngine, generate_pool

_engine: TalentTwinEngine | None = None


def get_engine() -> TalentTwinEngine:
    global _engine
    if _engine is None:
        df, feature_cols = generate_pool(n=600)
        _engine = TalentTwinEngine(n_clusters=6)
        _engine.fit(df, feature_cols)
    return _engine


router = APIRouter()


@router.post("/classify", response_model=TalentTwinClassifyResponse)
def classify_candidate(req: TalentTwinClassifyRequest):
    engine = get_engine()
    try:
        result = engine.archetype_of(req.candidate)
        return TalentTwinClassifyResponse(
            primary_archetype=result["primary_archetype"],
            archetype_traits=result["archetype_traits"],
            affinity_scores=result["affinity_scores"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/find-twins", response_model=TalentTwinTwinsResponse)
def find_twins(req: TalentTwinTwinsRequest):
    engine = get_engine()
    try:
        df = engine.find_talent_twins(
            req.candidate,
            top_k=req.top_k,
            same_archetype_only=req.same_archetype_only,
        )
        twins = [
            TalentTwinTwinResult(
                id=r["id"],
                name=r["name"],
                twin_similarity=r["twin_similarity"],
                archetype=r["archetype"],
            )
            for _, r in df.iterrows()
        ]
        return TalentTwinTwinsResponse(twins=twins)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/benchmark", response_model=TalentTwinBenchmarkResponse)
def benchmark_candidate(req: TalentTwinClassifyRequest):
    engine = get_engine()
    try:
        result = engine.benchmark(req.candidate)
        return TalentTwinBenchmarkResponse(
            archetype=result["archetype"],
            benchmark_score=result["benchmark_score"],
            summary=result["summary"],
            feature_deltas=result["feature_deltas"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/best-archetype", response_model=TalentTwinBestArchetypeResponse)
def best_archetype(req: TalentTwinBestArchetypeRequest):
    engine = get_engine()
    try:
        results = engine.best_archetype_for_role(req.role_signals, top_n=req.top_n)
        return TalentTwinBestArchetypeResponse(
            results=[BestArchetypeResult(**r) for r in results]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pool-composition", response_model=TalentTwinPoolCompositionResponse)
def pool_composition():
    engine = get_engine()
    try:
        df = engine.pool_composition()
        items = [
            PoolCompositionItem(
                archetype=r["archetype"],
                count=int(r["count"]),
                pct=r["pct"],
                traits=r["traits"],
            )
            for _, r in df.iterrows()
        ]
        return TalentTwinPoolCompositionResponse(composition=items)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
