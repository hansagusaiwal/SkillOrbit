import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score
from sklearn.metrics.pairwise import cosine_similarity, euclidean_distances
import joblib
import warnings
warnings.filterwarnings("ignore")


def generate_pool(n: int = 600, seed: int = 42) -> tuple[pd.DataFrame, list[str]]:
    np.random.seed(seed)

    archetypes = {
        "Startup Founder-Engineer": dict(
            skills_overlap=0.65, years_experience=8,  company_prestige=2,
            github_activity=0.90, leetcode_score=0.55, project_complexity=0.90,
            tech_stack_diversity=0.92, career_growth_rate=1.8, open_source_contribs=55,
            education_tier=2, certifications_count=1,  endorsements_count=80,
            job_hop_freq=1.2, response_time_score=0.70,
        ),
        "Big-Co ML Specialist": dict(
            skills_overlap=0.88, years_experience=6,  company_prestige=5,
            github_activity=0.55, leetcode_score=0.85, project_complexity=0.75,
            tech_stack_diversity=0.60, career_growth_rate=0.9, open_source_contribs=15,
            education_tier=4, certifications_count=5,  endorsements_count=160,
            job_hop_freq=2.5, response_time_score=0.55,
        ),
        "Research Scientist": dict(
            skills_overlap=0.70, years_experience=5,  company_prestige=4,
            github_activity=0.65, leetcode_score=0.78, project_complexity=0.85,
            tech_stack_diversity=0.50, career_growth_rate=0.7, open_source_contribs=30,
            education_tier=4, certifications_count=2,  endorsements_count=90,
            job_hop_freq=3.0, response_time_score=0.60,
        ),
        "Full-Stack Product Engineer": dict(
            skills_overlap=0.72, years_experience=4,  company_prestige=3,
            github_activity=0.75, leetcode_score=0.60, project_complexity=0.65,
            tech_stack_diversity=0.88, career_growth_rate=1.1, open_source_contribs=20,
            education_tier=2, certifications_count=3,  endorsements_count=70,
            job_hop_freq=1.8, response_time_score=0.85,
        ),
        "Platform / Infra Engineer": dict(
            skills_overlap=0.80, years_experience=7,  company_prestige=4,
            github_activity=0.70, leetcode_score=0.65, project_complexity=0.80,
            tech_stack_diversity=0.75, career_growth_rate=0.8, open_source_contribs=25,
            education_tier=3, certifications_count=7,  endorsements_count=110,
            job_hop_freq=2.8, response_time_score=0.65,
        ),
        "Early-Career High-Potential": dict(
            skills_overlap=0.55, years_experience=2,  company_prestige=2,
            github_activity=0.85, leetcode_score=0.80, project_complexity=0.50,
            tech_stack_diversity=0.70, career_growth_rate=1.6, open_source_contribs=40,
            education_tier=3, certifications_count=4,  endorsements_count=30,
            job_hop_freq=0.8, response_time_score=0.90,
        ),
    }

    FEATURE_COLS = list(list(archetypes.values())[0].keys())
    rows = []
    per_archetype = n // len(archetypes)

    for arch_name, center in archetypes.items():
        for _ in range(per_archetype):
            row = {
                k: float(np.clip(
                    v + np.random.normal(0, abs(v) * 0.18 + 0.05),
                    0, max(v * 2, 1)
                ))
                for k, v in center.items()
            }
            row["true_archetype"] = arch_name
            rows.append(row)

    df = pd.DataFrame(rows).reset_index(drop=True)
    df["id"]   = [f"CAND-{i:04d}" for i in range(len(df))]
    df["name"] = [f"Candidate {i}"  for i in range(len(df))]
    return df, FEATURE_COLS


class TalentTwinEngine:

    ARCHETYPE_NAMES = [
        "Startup Founder-Engineer",
        "Big-Co ML Specialist",
        "Research Scientist",
        "Full-Stack Product Engineer",
        "Platform / Infra Engineer",
        "Early-Career High-Potential",
    ]

    ARCHETYPE_TRAITS = {
        "Startup Founder-Engineer":      "High autonomy, broad stack, ships fast, non-traditional background",
        "Big-Co ML Specialist":          "Deep ML expertise, prestigious pedigree, strong academic credentials",
        "Research Scientist":            "PhD-level depth, publications, theory-first, lower velocity",
        "Full-Stack Product Engineer":   "Balanced frontend/backend, product-minded, fast iteration",
        "Platform / Infra Engineer":     "Cloud/K8s specialist, reliability focus, high certification count",
        "Early-Career High-Potential":   "Low experience but high velocity, competitive coder, eager builder",
    }

    def __init__(self, n_clusters: int = 6, random_state: int = 42):
        self.n_clusters    = n_clusters
        self.random_state  = random_state
        self.scaler        = StandardScaler()
        self.kmeans        = KMeans(
            n_clusters=n_clusters,
            n_init=20,
            max_iter=500,
            random_state=random_state,
        )
        self.pca           = PCA(n_components=2, random_state=random_state)
        self.feature_cols: list[str] = []
        self.cluster_labels: dict[int, str] = {}
        self.pool_df: pd.DataFrame | None = None
        self._fitted = False

    def fit(self, df: pd.DataFrame, feature_cols: list[str]) -> "TalentTwinEngine":
        self.feature_cols = feature_cols
        self.pool_df = df.copy()
        X = self.scaler.fit_transform(df[feature_cols])

        self.kmeans.fit(X)
        self.pca.fit(X)

        self._label_clusters(df, X)

        sil = silhouette_score(X, self.kmeans.labels_)
        print(f"TalentTwinEngine fitted  |  k={self.n_clusters}  |  silhouette={sil:.3f}")
        self._fitted = True
        return self

    def _label_clusters(self, df: pd.DataFrame, X_scaled: np.ndarray):
        centroids = self.kmeans.cluster_centers_

        if "true_archetype" in df.columns:
            arch_to_idx = {a: i for i, a in enumerate(self.ARCHETYPE_NAMES)}
            arch_centroids = np.zeros((len(self.ARCHETYPE_NAMES), len(self.feature_cols)))
            for arch, idx in arch_to_idx.items():
                mask = df["true_archetype"] == arch
                if mask.any():
                    arch_centroids[idx] = X_scaled[mask].mean(axis=0)

            sim = cosine_similarity(centroids, arch_centroids)
            used = set()
            self.cluster_labels = {}
            for cluster_id in range(self.n_clusters):
                ranked = np.argsort(-sim[cluster_id])
                for arch_idx in ranked:
                    if arch_idx not in used:
                        self.cluster_labels[cluster_id] = self.ARCHETYPE_NAMES[arch_idx]
                        used.add(arch_idx)
                        break
        else:
            self.cluster_labels = {i: f"Archetype {i+1}" for i in range(self.n_clusters)}

    def archetype_of(self, candidate: dict) -> dict:
        if not self._fitted:
            raise RuntimeError("Call .fit() first.")

        X = self.scaler.transform(
            pd.DataFrame([candidate])[self.feature_cols]
        )
        cluster_id     = int(self.kmeans.predict(X)[0])
        archetype_name = self.cluster_labels[cluster_id]

        dists = euclidean_distances(X, self.kmeans.cluster_centers_)[0]
        affinity_scores = {
            self.cluster_labels[i]: round(
                float(1 / (1 + dists[i])) * 100, 1
            )
            for i in range(self.n_clusters)
        }

        return {
            "primary_archetype":  archetype_name,
            "cluster_id":         cluster_id,
            "archetype_traits":   self.ARCHETYPE_TRAITS.get(archetype_name, ""),
            "affinity_scores":    dict(
                sorted(affinity_scores.items(), key=lambda x: -x[1])
            ),
        }

    def find_talent_twins(
        self,
        candidate: dict,
        top_k: int = 5,
        same_archetype_only: bool = False,
    ) -> pd.DataFrame:
        if not self._fitted:
            raise RuntimeError("Call .fit() first.")
        if self.pool_df is None:
            raise RuntimeError("No pool data available.")

        X_query = self.scaler.transform(
            pd.DataFrame([candidate])[self.feature_cols]
        )
        X_pool  = self.scaler.transform(self.pool_df[self.feature_cols])

        sims = cosine_similarity(X_query, X_pool)[0]

        result_df = self.pool_df.copy()
        result_df["twin_similarity"] = (sims * 100).round(1)

        arch_result = self.archetype_of(candidate)
        result_df["archetype"] = [
            self.cluster_labels[int(self.kmeans.predict(
                self.scaler.transform(
                    pd.DataFrame([row[self.feature_cols].to_dict()])[self.feature_cols]
                )
            )[0])]
            for _, row in result_df.iterrows()
        ]

        if same_archetype_only:
            result_df = result_df[
                result_df["archetype"] == arch_result["primary_archetype"]
            ]

        return (
            result_df.sort_values("twin_similarity", ascending=False)
            .head(top_k)
            [["id", "name", "twin_similarity", "archetype"] + self.feature_cols[:4]]
            .reset_index(drop=True)
        )

    def benchmark(self, candidate: dict) -> dict:
        if not self._fitted:
            raise RuntimeError("Call .fit() first.")

        arch = self.archetype_of(candidate)
        cluster_id = arch["cluster_id"]

        X_cand     = self.scaler.transform(
            pd.DataFrame([candidate])[self.feature_cols]
        )[0]
        centroid   = self.kmeans.cluster_centers_[cluster_id]

        deltas = {}
        for i, feat in enumerate(self.feature_cols):
            delta = float(X_cand[i] - centroid[i])
            deltas[feat] = {
                "vs_archetype": round(delta, 3),
                "direction":    "above" if delta > 0.1 else ("below" if delta < -0.1 else "on-par"),
            }

        above = sum(1 for v in deltas.values() if v["direction"] == "above")
        benchmark_pct = round(above / len(self.feature_cols) * 100, 1)

        return {
            "archetype":       arch["primary_archetype"],
            "benchmark_score": benchmark_pct,
            "summary":         f"Outperforms archetype centroid on {above}/{len(self.feature_cols)} dimensions",
            "feature_deltas":  deltas,
        }

    def best_archetype_for_role(
        self,
        role_signals: dict,
        top_n: int = 3,
    ) -> list[dict]:
        if not self._fitted:
            raise RuntimeError("Call .fit() first.")

        full_role = {f: role_signals.get(f, 0.0) for f in self.feature_cols}
        X_role = self.scaler.transform(
            pd.DataFrame([full_role])[self.feature_cols]
        )

        sims = cosine_similarity(X_role, self.kmeans.cluster_centers_)[0]
        ranked = sorted(
            [(self.cluster_labels[i], round(float(sims[i]) * 100, 1))
             for i in range(self.n_clusters)],
            key=lambda x: -x[1],
        )
        return [
            {"archetype": name, "fit_score": score,
             "traits": self.ARCHETYPE_TRAITS.get(name, "")}
            for name, score in ranked[:top_n]
        ]

    def pool_composition(self) -> pd.DataFrame:
        if not self._fitted:
            raise RuntimeError("Call .fit() first.")
        if self.pool_df is None:
            raise RuntimeError("No pool data available.")

        X = self.scaler.transform(self.pool_df[self.feature_cols])
        labels = self.kmeans.predict(X)
        pool_df = self.pool_df.copy()
        pool_df["archetype"] = [self.cluster_labels[l] for l in labels]

        counts = pool_df["archetype"].value_counts().reset_index()
        counts.columns = ["archetype", "count"]
        counts["pct"] = (counts["count"] / len(pool_df) * 100).round(1)
        counts["traits"] = counts["archetype"].map(self.ARCHETYPE_TRAITS)
        return counts
