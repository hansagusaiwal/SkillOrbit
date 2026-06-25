from fastapi import APIRouter, HTTPException, Query
from models import (
    MarketInsightRequest, MarketInsightResponse,
    MarketOpportunityResponse, MarketOpportunityItem,
    MarketReportResponse, MarketReportRow,
    MarketClustersResponse,
)
from ml.market_insight import (
    MarketInsightEngine, generate_candidate_pool,
    generate_job_postings, generate_historical_supply,
    SKILL_CLUSTERS, LOCATIONS,
)

_engine: MarketInsightEngine | None = None


def get_engine() -> MarketInsightEngine:
    global _engine
    if _engine is None:
        candidates = generate_candidate_pool(n=2000)
        jobs = generate_job_postings(n=800)
        historical = generate_historical_supply()
        _engine = MarketInsightEngine(candidates, jobs, historical)
    return _engine


router = APIRouter()


@router.get("/options", response_model=MarketClustersResponse)
def get_options():
    return MarketClustersResponse(
        clusters=list(SKILL_CLUSTERS.keys()),
        locations=LOCATIONS,
    )


@router.post("/insight", response_model=MarketInsightResponse)
def get_market_insight(req: MarketInsightRequest):
    engine = get_engine()
    try:
        ins = engine.get_insight(req.skill_cluster, req.location)
        return MarketInsightResponse(
            skill_cluster=ins.skill_cluster,
            location=ins.location,
            supply_count=ins.supply_count,
            demand_count=ins.demand_count,
            supply_demand_ratio=ins.supply_demand_ratio,
            density_label=ins.density_label,
            density_score=ins.density_score,
            avg_experience_yrs=ins.avg_experience_yrs,
            avg_salary_estimate=ins.avg_salary_estimate,
            competition_index=ins.competition_index,
            trend_direction=ins.trend_direction,
            trend_pct_6mo=ins.trend_pct_6mo,
            forecast_3mo=ins.forecast_3mo,
            top_companies_hiring=ins.top_companies_hiring,
            insight_text=ins.insight_text,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/opportunities", response_model=MarketOpportunityResponse)
def get_opportunities():
    engine = get_engine()
    try:
        results = []
        for c in list(SKILL_CLUSTERS.keys()):
            for loc in LOCATIONS:
                opp = engine.opportunity_score(c, loc)
                results.append(MarketOpportunityItem(**opp))
        results.sort(key=lambda x: x.opportunity_score, reverse=True)
        return MarketOpportunityResponse(results=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/report", response_model=MarketReportResponse)
def get_report(sort_by: str = "competition_index"):
    engine = get_engine()
    try:
        df = engine.full_market_report(
            skill_clusters=list(SKILL_CLUSTERS.keys()),
            locations=LOCATIONS,
            sort_by=sort_by,
        )
        rows = [MarketReportRow(**r) for _, r in df.iterrows()]
        return MarketReportResponse(rows=rows)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
