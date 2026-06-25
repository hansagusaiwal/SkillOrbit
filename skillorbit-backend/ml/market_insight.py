import numpy as np
import pandas as pd
from scipy import stats
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from sklearn.linear_model import LinearRegression
from dataclasses import dataclass, field
import warnings
warnings.filterwarnings("ignore")


@dataclass
class MarketInsight:
    skill_cluster:      str
    location:           str
    supply_count:       int
    demand_count:       int
    supply_demand_ratio: float
    density_label:      str
    density_score:      float
    avg_experience_yrs: float
    avg_salary_estimate: float
    competition_index:  float
    trend_direction:    str
    trend_pct_6mo:      float
    forecast_3mo:       int
    top_companies_hiring: list[str]  = field(default_factory=list)
    insight_text:       str          = ""


LOCATIONS = [
    "San Francisco", "New York", "Seattle", "Austin", "Boston",
    "London", "Berlin", "Bangalore", "Toronto", "Singapore",
]

SKILL_CLUSTERS = {
    "ML / AI Engineering":    ["PyTorch", "TensorFlow", "LLMs", "MLOps", "CUDA"],
    "Data Engineering":       ["Spark", "Kafka", "dbt", "Airflow", "Snowflake"],
    "Backend Engineering":    ["Go", "Rust", "Java", "gRPC", "PostgreSQL"],
    "Frontend Engineering":   ["React", "TypeScript", "Next.js", "GraphQL"],
    "Platform / DevOps":      ["Kubernetes", "Terraform", "AWS", "Prometheus"],
    "Data Science":           ["Python", "scikit-learn", "SQL", "Pandas", "R"],
    "Security Engineering":   ["pen testing", "SIEM", "zero trust", "SOC2"],
}

COMPANIES = [
    "Google", "Meta", "OpenAI", "Anthropic", "Stripe",
    "Databricks", "Snowflake", "Nvidia", "Apple", "Microsoft",
    "Amazon", "Netflix", "Uber", "Airbnb", "Figma",
]


def generate_candidate_pool(n: int = 2000, seed: int = 42) -> pd.DataFrame:
    np.random.seed(seed)
    clusters = list(SKILL_CLUSTERS.keys())

    location_weights = {
        "San Francisco": 0.20, "New York": 0.15, "Seattle": 0.12,
        "Austin": 0.08, "Boston": 0.07, "London": 0.12,
        "Berlin": 0.06, "Bangalore": 0.10, "Toronto": 0.06, "Singapore": 0.04,
    }
    cluster_weights = {
        "ML / AI Engineering":  0.22, "Data Engineering": 0.18,
        "Backend Engineering":  0.20, "Frontend Engineering": 0.15,
        "Platform / DevOps":    0.10, "Data Science": 0.10,
        "Security Engineering": 0.05,
    }

    rows = []
    for i in range(n):
        loc     = np.random.choice(list(location_weights.keys()),
                                   p=list(location_weights.values()))
        cluster = np.random.choice(list(cluster_weights.keys()),
                                   p=list(cluster_weights.values()))
        rows.append({
            "candidate_id":   f"CAND-{i:04d}",
            "location":       loc,
            "skill_cluster":  cluster,
            "years_exp":      round(np.random.uniform(1, 15), 1),
            "is_open_to_work": np.random.choice([True, False], p=[0.35, 0.65]),
            "joined_month":   np.random.randint(1, 13),
        })
    return pd.DataFrame(rows)


def generate_job_postings(n: int = 800, seed: int = 7) -> pd.DataFrame:
    np.random.seed(seed)
    clusters = list(SKILL_CLUSTERS.keys())

    demand_cluster_weights = {
        "ML / AI Engineering":  0.30,
        "Data Engineering":     0.20,
        "Backend Engineering":  0.18,
        "Frontend Engineering": 0.12,
        "Platform / DevOps":    0.09,
        "Data Science":         0.07,
        "Security Engineering": 0.04,
    }
    demand_location_weights = {
        "San Francisco": 0.25, "New York": 0.18, "Seattle": 0.14,
        "Austin": 0.10, "Boston": 0.08, "London": 0.10,
        "Berlin": 0.04, "Bangalore": 0.04, "Toronto": 0.04, "Singapore": 0.03,
    }

    rows = []
    for i in range(n):
        loc     = np.random.choice(list(demand_location_weights.keys()),
                                   p=list(demand_location_weights.values()))
        cluster = np.random.choice(list(demand_cluster_weights.keys()),
                                   p=list(demand_cluster_weights.values()))
        rows.append({
            "job_id":        f"JOB-{i:04d}",
            "location":      loc,
            "skill_cluster": cluster,
            "company":       np.random.choice(COMPANIES),
            "salary_min":    np.random.randint(80, 180) * 1000,
            "salary_max":    np.random.randint(180, 350) * 1000,
            "posted_month":  np.random.randint(1, 13),
        })
    return pd.DataFrame(rows)


def generate_historical_supply(seed: int = 42) -> pd.DataFrame:
    np.random.seed(seed)
    rows = []
    base_counts = {
        "ML / AI Engineering":  {"San Francisco": 120, "New York": 80,  "Seattle": 60},
        "Data Engineering":     {"San Francisco": 90,  "New York": 70,  "Seattle": 50},
        "Backend Engineering":  {"San Francisco": 100, "New York": 90,  "Seattle": 70},
        "Frontend Engineering": {"San Francisco": 70,  "New York": 60,  "Seattle": 40},
        "Platform / DevOps":    {"San Francisco": 50,  "New York": 40,  "Seattle": 30},
    }
    for cluster, loc_counts in base_counts.items():
        for loc, base in loc_counts.items():
            trend = np.random.uniform(0.5, 3.5)
            for month in range(1, 13):
                count = base * (1 + trend / 100) ** month
                count += np.random.normal(0, base * 0.05)
                rows.append({
                    "skill_cluster": cluster,
                    "location":      loc,
                    "month":         month,
                    "supply_count":  max(0, int(count)),
                })
    return pd.DataFrame(rows)


class MarketInsightEngine:

    DENSITY_BINS = [
        (3.0,  float("inf"), "Very High",   10),
        (2.0,  3.0,          "High",        30),
        (1.2,  2.0,          "Medium",      50),
        (0.7,  1.2,          "Medium-Low",  65),
        (0.3,  0.7,          "Low",         80),
        (0.0,  0.3,          "Very Low",    95),
    ]

    def __init__(
        self,
        candidates_df: pd.DataFrame,
        jobs_df: pd.DataFrame,
        historical_df: pd.DataFrame,
    ):
        self.candidates  = candidates_df
        self.jobs        = jobs_df
        self.historical  = historical_df
        self._agg_cache: dict = {}

    def _aggregate(self, skill_cluster: str, location: str) -> dict:
        key = (skill_cluster, location)
        if key in self._agg_cache:
            return self._agg_cache[key]

        supply_mask = (
            (self.candidates["skill_cluster"] == skill_cluster) &
            (self.candidates["location"]       == location)
        )
        demand_mask = (
            (self.jobs["skill_cluster"] == skill_cluster) &
            (self.jobs["location"]      == location)
        )

        supply_df = self.candidates[supply_mask]
        demand_df = self.jobs[demand_mask]

        supply_count = len(supply_df)
        demand_count = len(demand_df)
        ratio        = supply_count / (demand_count + 1e-9)

        avg_exp = float(supply_df["years_exp"].mean()) if len(supply_df) else 0.0

        if len(demand_df):
            avg_salary = float(
                ((demand_df["salary_min"] + demand_df["salary_max"]) / 2).mean()
            )
        else:
            avg_salary = 0.0

        top_companies = (
            demand_df["company"].value_counts().head(3).index.tolist()
            if len(demand_df) else []
        )

        result = {
            "supply_count":        supply_count,
            "demand_count":        demand_count,
            "ratio":               round(ratio, 3),
            "avg_experience_yrs":  round(avg_exp, 1),
            "avg_salary_estimate": round(avg_salary),
            "top_companies":       top_companies,
        }
        self._agg_cache[key] = result
        return result

    def _density_label(self, ratio: float) -> tuple[str, float]:
        for lo, hi, label, competition in self.DENSITY_BINS:
            if lo <= ratio < hi:
                return label, float(competition)
        return "Very Low", 95.0

    def _trend_analysis(self, skill_cluster: str, location: str) -> dict:
        mask = (
            (self.historical["skill_cluster"] == skill_cluster) &
            (self.historical["location"]      == location)
        )
        hist = self.historical[mask].sort_values("month")

        if len(hist) < 3:
            return {"direction": "stable", "pct_6mo": 0.0, "r2": 0.0}

        hist6 = hist.tail(6)
        X = hist6["month"].values.reshape(-1, 1)
        y = hist6["supply_count"].values

        reg = LinearRegression().fit(X, y)
        r2  = float(reg.score(X, y))

        start = float(y[0]) if y[0] != 0 else 1
        end   = float(y[-1])
        pct   = round((end - start) / start * 100, 1)

        if pct > 5:
            direction = "growing"
        elif pct < -5:
            direction = "declining"
        else:
            direction = "stable"

        return {"direction": direction, "pct_6mo": pct, "r2": round(r2, 3)}

    def _forecast_3mo(self, skill_cluster: str, location: str) -> int:
        mask = (
            (self.historical["skill_cluster"] == skill_cluster) &
            (self.historical["location"]      == location)
        )
        hist = self.historical[mask].sort_values("month")["supply_count"].values

        if len(hist) < 4:
            if len(hist) >= 2:
                slope = (hist[-1] - hist[0]) / len(hist)
                return max(0, int(hist[-1] + slope * 3))
            return 0

        try:
            model = ExponentialSmoothing(
                hist,
                trend="add",
                seasonal=None,
                initialization_method="estimated",
            ).fit(optimized=True, disp=False)
            forecast = model.forecast(3)
            return max(0, int(forecast[-1]))
        except Exception:
            avg_change = (hist[-1] - hist[0]) / (len(hist) - 1)
            return max(0, int(hist[-1] + avg_change * 3))

    def _generate_insight_text(self, insight: MarketInsight) -> str:
        density    = insight.density_label
        trend      = insight.trend_direction
        pct        = abs(insight.trend_pct_6mo)
        loc        = insight.location
        cluster    = insight.skill_cluster
        companies  = ", ".join(insight.top_companies_hiring) if insight.top_companies_hiring else "multiple companies"
        forecast   = insight.forecast_3mo
        comp_idx   = insight.competition_index

        trend_phrase = (
            f"Supply is {trend} ({pct:.0f}% over 6 months)."
            if pct > 2 else "Supply is broadly stable."
        )

        difficulty = (
            "extremely competitive" if comp_idx >= 80 else
            "competitive"           if comp_idx >= 65 else
            "moderately competitive" if comp_idx >= 50 else
            "favorable for hiring"
        )

        return (
            f"The {cluster} talent market in {loc} is currently {density.lower()}. "
            f"{trend_phrase} "
            f"With {insight.supply_count} candidates and {insight.demand_count} open roles, "
            f"the supply-to-demand ratio is {insight.supply_demand_ratio:.2f}. "
            f"The hiring environment is {difficulty} (competition index: {comp_idx:.0f}/100). "
            f"Top hiring companies: {companies}. "
            f"Supply is projected to reach ~{forecast} candidates in 3 months. "
            f"Average experience in this pool: {insight.avg_experience_yrs:.1f} years. "
            f"Estimated average comp: ${insight.avg_salary_estimate:,.0f}."
        )

    def get_insight(self, skill_cluster: str, location: str) -> MarketInsight:
        agg    = self._aggregate(skill_cluster, location)
        trend  = self._trend_analysis(skill_cluster, location)
        fcast  = self._forecast_3mo(skill_cluster, location)
        label, competition = self._density_label(agg["ratio"])

        density_score = round(
            float(np.clip(competition + np.random.uniform(-5, 5), 0, 100)), 1
        )

        insight = MarketInsight(
            skill_cluster=skill_cluster,
            location=location,
            supply_count=agg["supply_count"],
            demand_count=agg["demand_count"],
            supply_demand_ratio=agg["ratio"],
            density_label=label,
            density_score=density_score,
            avg_experience_yrs=agg["avg_experience_yrs"],
            avg_salary_estimate=agg["avg_salary_estimate"],
            competition_index=competition,
            trend_direction=trend["direction"],
            trend_pct_6mo=trend["pct_6mo"],
            forecast_3mo=fcast,
            top_companies_hiring=agg["top_companies"],
        )
        insight.insight_text = self._generate_insight_text(insight)
        return insight

    def full_market_report(
        self,
        skill_clusters: list[str] = None,
        locations: list[str] = None,
        sort_by: str = "competition_index",
    ) -> pd.DataFrame:
        clusters  = skill_clusters or list(SKILL_CLUSTERS.keys())
        locs      = locations      or LOCATIONS

        rows = []
        for cl in clusters:
            for loc in locs:
                ins = self.get_insight(cl, loc)
                rows.append({
                    "skill_cluster":       ins.skill_cluster,
                    "location":            ins.location,
                    "supply":              ins.supply_count,
                    "demand":              ins.demand_count,
                    "ratio":               ins.supply_demand_ratio,
                    "density":             ins.density_label,
                    "competition_index":   ins.competition_index,
                    "trend":               ins.trend_direction,
                    "trend_pct_6mo":       ins.trend_pct_6mo,
                    "forecast_3mo":        ins.forecast_3mo,
                    "avg_salary":          ins.avg_salary_estimate,
                    "avg_exp_yrs":         ins.avg_experience_yrs,
                })

        df = pd.DataFrame(rows).sort_values(sort_by, ascending=False)
        return df.reset_index(drop=True)

    def opportunity_score(self, skill_cluster: str, location: str) -> dict:
        ins = self.get_insight(skill_cluster, location)

        low_comp    = 100 - ins.competition_index
        high_demand = min(ins.demand_count / 10, 100)
        growing     = 60 if ins.trend_direction == "growing" else (40 if ins.trend_direction == "stable" else 20)
        supply_ok   = min(ins.supply_count / 5, 100)

        score = round(0.35 * low_comp + 0.25 * high_demand + 0.20 * growing + 0.20 * supply_ok, 1)
        tier  = "Prime" if score >= 70 else ("Moderate" if score >= 45 else "Tough")

        return {
            "skill_cluster":    skill_cluster,
            "location":         location,
            "opportunity_score": score,
            "tier":             tier,
            "density":          ins.density_label,
            "trend":            ins.trend_direction,
            "competition":      ins.competition_index,
        }
