import json
import os
import pickle
import time
import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer
import faiss


class CandidateRanker:
    """
    Ranks candidates against a job description using:
      - Semantic similarity (SentenceTransformer + FAISS)
      - Dimension score blend (from Feature 1)
    """

    DEFAULT_DIM_WEIGHTS = {
        "technicalFit": 0.30,
        "skillMatch": 0.25,
        "experienceLevel": 0.15,
        "careerGrowth": 0.15,
        "cultureSignal": 0.10,
        "successScore": 0.05,
    }

    def __init__(self, model_name: str = "all-MiniLM-L6-v2", alpha: float = 0.55, dim_weights: dict = None):
        print(f"Loading embedding model: {model_name} ...")
        self.encoder = SentenceTransformer(model_name)
        self.alpha = alpha
        self.dim_weights = dim_weights or self.DEFAULT_DIM_WEIGHTS
        self._candidates: list[dict] = []
        self._index: faiss.IndexFlatIP = None
        self._embeddings: np.ndarray = None

    def index_candidates(self, candidates: list[dict]):
        self._candidates = candidates
        texts = [c["profile_text"] for c in candidates]
        print(f"Embedding {len(texts)} profiles ...")
        t0 = time.time()
        embeddings = self.encoder.encode(
            texts, batch_size=64, show_progress_bar=True,
            normalize_embeddings=True, convert_to_numpy=True,
        )
        self._embeddings = embeddings.astype("float32")
        print(f"Embedded in {time.time()-t0:.1f}s  shape: {self._embeddings.shape}")
        dim = self._embeddings.shape[1]
        self._index = faiss.IndexFlatIP(dim)
        self._index.add(self._embeddings)
        print(f"FAISS index ready  {self._index.ntotal} vectors  dim={dim}")

    def rank(self, job_description: str, top_k: int = None, min_score: float = 0.0) -> pd.DataFrame:
        if self._index is None:
            raise RuntimeError("Call index_candidates() first.")

        jd_vec = self.encoder.encode(
            [job_description], normalize_embeddings=True, convert_to_numpy=True,
        ).astype("float32")

        k = len(self._candidates)
        cosine_scores, indices = self._index.search(jd_vec, k)
        cosine_scores = cosine_scores[0]
        indices = indices[0]

        rows = []
        for rank_idx, (cand_idx, cos_sim) in enumerate(zip(indices, cosine_scores)):
            c = self._candidates[cand_idx]
            dim_blend = sum(
                self.dim_weights[dim] * (c.get(dim, 50) / 100.0)
                for dim in self.dim_weights
            )
            final_score = (self.alpha * float(cos_sim) + (1 - self.alpha) * dim_blend) * 100
            rows.append({
                "rank": rank_idx + 1,
                "id": c["id"],
                "name": c["name"],
                "role": c["role"],
                "company": c["company"],
                "yoe": c["yoe"],
                "skills": ", ".join(c.get("skills", [])),
                "location": c.get("location", ""),
                "semantic_sim": round(float(cos_sim) * 100, 1),
                "technicalFit": c.get("technicalFit", 0),
                "skillMatch": c.get("skillMatch", 0),
                "experienceLevel": c.get("experienceLevel", 0),
                "careerGrowth": c.get("careerGrowth", 0),
                "cultureSignal": c.get("cultureSignal", 0),
                "successScore": c.get("successScore", 0),
                "final_score": round(final_score, 1),
            })

        df = pd.DataFrame(rows)
        df = df[df["final_score"] >= min_score].copy()
        df = df.sort_values("final_score", ascending=False).reset_index(drop=True)
        df["rank"] = df.index + 1
        if top_k:
            df = df.head(top_k)
        return df

    def find_similar(self, candidate_id: str, top_k: int = 5) -> pd.DataFrame:
        idx = next(
            (i for i, c in enumerate(self._candidates) if c["id"] == candidate_id), None
        )
        if idx is None:
            raise ValueError(f"Candidate {candidate_id} not found.")
        query_vec = self._embeddings[idx: idx + 1]
        scores, indices = self._index.search(query_vec, top_k + 1)
        rows = []
        for cos_sim, cand_idx in zip(scores[0], indices[0]):
            if cand_idx == idx:
                continue
            c = self._candidates[cand_idx]
            rows.append({
                "id": c["id"],
                "name": c["name"],
                "role": c["role"],
                "company": c["company"],
                "skills": ", ".join(c.get("skills", [])),
                "similarity": round(float(cos_sim) * 100, 1),
            })
        return pd.DataFrame(rows).head(top_k)

    def save(self, dir_path: str = None):
        dir_path = dir_path or os.path.join(os.path.dirname(__file__), "ranker_data")
        os.makedirs(dir_path, exist_ok=True)
        faiss.write_index(self._index, f"{dir_path}/faiss.index")
        with open(f"{dir_path}/candidates.pkl", "wb") as f:
            pickle.dump(self._candidates, f)
        with open(f"{dir_path}/embeddings.npy", "wb") as f:
            np.save(f, self._embeddings)
        config = {"alpha": self.alpha, "dim_weights": self.dim_weights}
        with open(f"{dir_path}/config.json", "w") as f:
            json.dump(config, f)
        print(f"Ranker saved to {dir_path}/")

    @classmethod
    def load(cls, dir_path: str = None):
        dir_path = dir_path or os.path.join(os.path.dirname(__file__), "ranker_data")
        with open(f"{dir_path}/config.json") as f:
            config = json.load(f)
        ranker = cls(alpha=config["alpha"], dim_weights=config["dim_weights"])
        ranker._index = faiss.read_index(f"{dir_path}/faiss.index")
        with open(f"{dir_path}/candidates.pkl", "rb") as f:
            ranker._candidates = pickle.load(f)
        ranker._embeddings = np.load(f"{dir_path}/embeddings.npy")
        print(f"Ranker loaded from {dir_path}/")
        return ranker
