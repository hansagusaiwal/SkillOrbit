import numpy as np
import pandas as pd
import shap
import warnings
from ml.model import CandidateSuccessModel
from ml.scorer import get_model as get_success_model

warnings.filterwarnings("ignore")

FEATURE_COLS = CandidateSuccessModel.FEATURE_COLS

FEATURE_LABELS = {
    "skills_overlap":       "Skills overlap with JD",
    "years_experience":     "Years of experience",
    "company_prestige":     "Company prestige tier",
    "job_hop_freq":         "Job tenure stability",
    "github_activity":      "GitHub commit activity",
    "open_source_contribs": "Open-source contributions",
    "leetcode_score":       "Coding assessment score",
    "education_tier":       "Education level",
    "certifications_count": "Relevant certifications",
    "project_complexity":   "Project complexity",
    "tech_stack_diversity": "Tech stack breadth",
    "endorsements_count":   "LinkedIn endorsements",
    "career_growth_rate":   "Career growth rate",
    "response_time_score":  "Recruiter responsiveness",
}


def _get_engine():
    success_model = get_success_model()
    return ExplainabilityEngine(
        success_model.model,
        success_model.scaler,
        FEATURE_COLS,
    )


class ExplainabilityEngine:
    def __init__(self, model, scaler, feature_cols: list):
        self.model = model
        self.scaler = scaler
        self.feature_cols = feature_cols
        self.explainer = shap.TreeExplainer(model)

    def _scale(self, candidate: dict) -> np.ndarray:
        row = pd.DataFrame([candidate])[self.feature_cols]
        return self.scaler.transform(row)

    def explain_candidate(self, candidate: dict, top_n: int = 5) -> dict:
        X = self._scale(candidate)
        shap_vals = self.explainer.shap_values(X)[0]
        base_val = float(self.explainer.expected_value)
        score = float(self.model.predict(X)[0])

        feature_shap = {
            feat: float(shap_vals[i])
            for i, feat in enumerate(self.feature_cols)
        }

        sorted_shap = sorted(feature_shap.items(), key=lambda x: x[1], reverse=True)

        drivers = [
            {"feature": FEATURE_LABELS.get(k, k), "raw_key": k,
             "shap_value": round(v, 3), "candidate_value": candidate.get(k),
             "impact": "positive"}
            for k, v in sorted_shap if v > 0
        ][:top_n]

        detractors = [
            {"feature": FEATURE_LABELS.get(k, k), "raw_key": k,
             "shap_value": round(v, 3), "candidate_value": candidate.get(k),
             "impact": "negative"}
            for k, v in sorted_shap if v < 0
        ][:top_n]

        return {
            "score": round(score, 1),
            "base_value": round(base_val, 1),
            "top_drivers": drivers,
            "top_detractors": detractors,
            "all_shap": {k: round(v, 3) for k, v in feature_shap.items()},
        }

    def compare_candidates(
        self, cand_a: dict, cand_b: dict,
        name_a: str = "Candidate A", name_b: str = "Candidate B",
    ) -> dict:
        exp_a = self.explain_candidate(cand_a)
        exp_b = self.explain_candidate(cand_b)

        shap_a = exp_a["all_shap"]
        shap_b = exp_b["all_shap"]

        deltas = {
            feat: round(shap_a[feat] - shap_b[feat], 3)
            for feat in self.feature_cols
        }
        sorted_deltas = sorted(deltas.items(), key=lambda x: abs(x[1]), reverse=True)

        winner = name_a if exp_a["score"] >= exp_b["score"] else name_b

        return {
            "winner": winner,
            "score_a": exp_a["score"],
            "score_b": exp_b["score"],
            "score_delta": round(exp_a["score"] - exp_b["score"], 1),
            "key_differences": [
                {"feature": FEATURE_LABELS.get(k, k), "delta": v,
                 "favors": name_a if v > 0 else name_b}
                for k, v in sorted_deltas[:6]
            ],
        }

    def global_importance(self, df: pd.DataFrame, top_n: int = 10) -> pd.DataFrame:
        X = self.scaler.transform(df[self.feature_cols])
        shap_vals = self.explainer.shap_values(X)
        mean_abs = np.abs(shap_vals).mean(axis=0)
        importance_df = pd.DataFrame({
            "feature": [FEATURE_LABELS.get(f, f) for f in self.feature_cols],
            "mean_abs_shap": mean_abs.round(3),
        }).sort_values("mean_abs_shap", ascending=False).head(top_n)
        return importance_df.reset_index(drop=True)

    def to_copilot_text(self, candidate: dict, name: str = "This candidate") -> str:
        exp = self.explain_candidate(candidate, top_n=3)
        drivers = exp["top_drivers"]
        detractors = exp["top_detractors"]

        driver_text = ", ".join(
            f"{d['feature']} ({'+' if d['shap_value'] > 0 else ''}{d['shap_value']:.1f})"
            for d in drivers
        )
        detractor_text = ", ".join(
            f"{d['feature']} ({d['shap_value']:.1f})"
            for d in detractors
        ) if detractors else "no significant weaknesses detected"

        return (
            f"{name} has a predicted success score of {exp['score']:.0f}/100. "
            f"The strongest positive signals are: {driver_text}. "
            f"Areas that pulled the score down: {detractor_text}. "
            f"The model's baseline expectation for any candidate is {exp['base_value']:.0f}."
        )
