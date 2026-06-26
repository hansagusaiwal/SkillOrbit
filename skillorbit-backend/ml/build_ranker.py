import numpy as np
from ml.ranker import CandidateRanker
from ml.scorer import score_candidate
from data import raw_candidates


def build_pool() -> list[dict]:
    """Build candidate pool from real data, scored via the success model."""
    pool = []
    for rc in raw_candidates:
        scored = score_candidate(dict(rc))
        profile_text = (
            f"{scored['role']} with {scored['experience']} of experience. "
            f"Currently at {scored['company']}. "
            f"Core skills: {', '.join(scored['skills'])}. "
            f"Location: {scored['location']}."
        )
        pool.append({
            "id": scored["id"],
            "name": scored["name"],
            "role": scored["role"],
            "company": scored["company"],
            "yoe": float(scored.get("years_experience", 0)),
            "skills": scored["skills"],
            "location": scored["location"],
            "profile_text": profile_text,
            "technicalFit": scored.get("technicalFit", 50),
            "skillMatch": scored.get("skillMatch", 50),
            "experienceLevel": scored.get("experienceMatch", 50),
            "careerGrowth": scored.get("careerGrowth", 50),
            "cultureSignal": scored.get("recruitability", 50),
            "successScore": scored.get("successScore", 50),
        })
    return pool


if __name__ == "__main__":
    pool = build_pool()
    print(f"Building ranker with {len(pool)} candidates...")
    ranker = CandidateRanker()
    ranker.index_candidates(pool)
    ranker.save()
    print("Done.")
