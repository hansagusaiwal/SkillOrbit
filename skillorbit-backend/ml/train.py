import numpy as np
import pandas as pd
from ml.model import CandidateSuccessModel
from data import raw_candidates


def _build_training_df() -> pd.DataFrame:
    """Build a training DataFrame from real candidate ML features,
    deriving the target performance_score from Redrob signals."""
    rows = []
    for c in raw_candidates:
        ml = {col: c[col] for col in CandidateSuccessModel.FEATURE_COLS}
        signals = {}  # We don't have signals in the flat structure anymore
        # Derive target from available signals
        perf = (
            ml["skills_overlap"] * 25
            + ml["years_experience"] * 1.5
            + ml["company_prestige"] * 3
            + ml["github_activity"] * 10
            + ml["leetcode_score"] * 8
            + ml["career_growth_rate"] * 5
            + ml["project_complexity"] * 7
            + ml["tech_stack_diversity"] * 6
            + ml["education_tier"] * 2
        )
        perf = max(0, perf)
        ml["performance_score"] = perf
        rows.append(ml)

    df = pd.DataFrame(rows)
    perf_col = df["performance_score"]
    df["performance_score"] = (
        (perf_col - perf_col.min())
        / (perf_col.max() - perf_col.min() + 1e-9)
        * 100
    )
    return df


if __name__ == "__main__":
    print(f"Building training data from {len(raw_candidates)} real candidates...")
    df = _build_training_df()

    print("Training model...")
    model = CandidateSuccessModel()
    model.fit(df)

    print("\nSample prediction:")
    sample = raw_candidates[0]
    test_candidate = {col: sample[col] for col in CandidateSuccessModel.FEATURE_COLS}
    result = model.predict_single(test_candidate)
    for k, v in result.items():
        print(f"  {k:20s}: {v}")

    model.save()
    print("Done.")
