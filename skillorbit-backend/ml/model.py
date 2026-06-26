import numpy as np
import pandas as pd
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import pickle


class CandidateSuccessModel:
    """
    XGBoost regressor that predicts on-the-job performance (0–100)
    from 14 candidate features, then derives 6 dimension sub-scores.
    """

    FEATURE_COLS = [
        "skills_overlap", "years_experience", "company_prestige",
        "job_hop_freq", "github_activity", "open_source_contribs",
        "leetcode_score", "education_tier", "certifications_count",
        "project_complexity", "tech_stack_diversity", "endorsements_count",
        "career_growth_rate", "response_time_score",
    ]
    TARGET_COL = "performance_score"

    # Dimension definitions: model_dim -> (frontend_field, {feature: weight})
    DIMENSIONS = {
        "technicalFit": {
            "features": {"skills_overlap": 0.40, "leetcode_score": 0.30, "project_complexity": 0.30},
        },
        "skillMatch": {
            "features": {"skills_overlap": 0.50, "tech_stack_diversity": 0.30, "certifications_count": 0.20},
        },
        "experienceLevel": {
            "features": {"years_experience": 0.60, "company_prestige": 0.25, "education_tier": 0.15},
        },
        "careerGrowth": {
            "features": {"career_growth_rate": 0.60, "open_source_contribs": 0.20, "github_activity": 0.20},
        },
        "cultureSignal": {
            "features": {"job_hop_freq": 0.40, "endorsements_count": 0.35, "response_time_score": 0.25},
        },
    }

    def __init__(self):
        self.model = XGBRegressor(
            n_estimators=200,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            eval_metric="mae",
        )
        self.scaler = MinMaxScaler()
        self._dim_scalers: dict[str, MinMaxScaler] = {}
        self._trained = False

    # ── Training ──

    def fit(self, df: pd.DataFrame):
        X = df[self.FEATURE_COLS]
        y = df[self.TARGET_COL]

        X_scaled = self.scaler.fit_transform(X)
        X_tr, X_val, y_tr, y_val = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42,
        )

        self.model.fit(X_tr, y_tr, eval_set=[(X_val, y_val)], verbose=False)
        self._trained = True

        preds = self.model.predict(X_val)
        mae = mean_absolute_error(y_val, preds)
        r2 = r2_score(y_val, preds)
        print(f"  MAE: {mae:.2f}  |  R²: {r2:.3f}")

        for dim_name, dim_config in self.DIMENSIONS.items():
            raw = self._compute_dim_raw(df, dim_config["features"])
            sc = MinMaxScaler(feature_range=(40, 99))
            sc.fit(raw.values.reshape(-1, 1))
            self._dim_scalers[dim_name] = sc

        return self

    def _compute_dim_raw(self, df: pd.DataFrame, weights: dict) -> pd.Series:
        raw = pd.Series(0.0, index=df.index)
        for feat, w in weights.items():
            col = df[feat].copy()
            if feat == "job_hop_freq":
                col = col.clip(upper=5)
                col = 1 - (col / 5)
            mn, mx = col.min(), col.max()
            col = (col - mn) / (mx - mn + 1e-9)
            raw += w * col
        return raw

    # ── Prediction ──

    def predict_single(self, features: dict) -> dict:
        if not self._trained:
            raise RuntimeError("Call .fit() before prediction.")

        df_row = pd.DataFrame([features])[self.FEATURE_COLS]
        X_scaled = self.scaler.transform(df_row)

        success_raw = float(self.model.predict(X_scaled)[0])
        success_score = round(np.clip(success_raw, 0, 100), 1)

        scores: dict[str, float] = {"successScore": success_score}

        for dim_name, dim_config in self.DIMENSIONS.items():
            raw = self._compute_dim_raw(df_row, dim_config["features"])
            sc = self._dim_scalers[dim_name]
            val = float(sc.transform(raw.values.reshape(-1, 1))[0][0])
            scores[dim_name] = round(np.clip(val, 0, 100), 1)

        # Derive learningVelocity from growth + diversity signals
        lv = (
            features.get("tech_stack_diversity", 0.5) * 0.5
            + features.get("career_growth_rate", 0.5) * 0.3
            + features.get("github_activity", 0.5) * 0.2
        )
        scores["learningVelocity"] = round(np.clip(lv * 100, 0, 100), 1)

        return scores

    # ── Persistence ──

    def save(self, path: str = "ml/candidate_success_model.pkl"):
        joblib.dump(self, path)
        print(f"  Model saved to {path}")

    @staticmethod
    def load(path: str = "ml/candidate_success_model.pkl"):
        class _CustomUnpickler(pickle.Unpickler):
            def find_class(self, module, name):
                if module == "model":
                    module = "ml.model"
                return super().find_class(module, name)

        try:
            return joblib.load(path)
        except ModuleNotFoundError as e:
            if "No module named 'model'" in str(e):
                with open(path, "rb") as f:
                    return _CustomUnpickler(f).load()
            raise
