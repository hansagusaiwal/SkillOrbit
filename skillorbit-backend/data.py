import json
import os
import random

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
_DEFAULT_DATA_PATH = os.path.join(_BACKEND_DIR, "data", "candidates.jsonl")

_RAILWAY_VOLUME_PATH = os.path.join(os.path.sep, "data", "candidates.jsonl")

RAW_CANDIDATES_PATH = os.environ.get("SKILLORBIT_CANDIDATES_PATH", "")
if not RAW_CANDIDATES_PATH or not os.path.isfile(RAW_CANDIDATES_PATH):
    if os.path.isfile(_RAILWAY_VOLUME_PATH):
        RAW_CANDIDATES_PATH = _RAILWAY_VOLUME_PATH
    else:
        RAW_CANDIDATES_PATH = _DEFAULT_DATA_PATH
MAX_CANDIDATES = int(os.environ.get("SKILLORBIT_MAX_CANDIDATES", "2000"))
random.seed(42)
print("RAW_CANDIDATES_PATH =", RAW_CANDIDATES_PATH)
print("FILE EXISTS =", os.path.exists(RAW_CANDIDATES_PATH))

def _compute_ml_features(candidate: dict) -> dict:
    p = candidate["profile"]
    ch = candidate["career_history"]
    edu = candidate["education"]
    skills = candidate["skills"]
    certs = candidate.get("certifications", [])
    signals = candidate["redrob_signals"]

    years_experience = p["years_of_experience"]

    size_map = {
        "1-10": 1, "11-50": 1, "51-200": 2, "201-500": 2,
        "501-1000": 3, "1001-5000": 3, "5001-10000": 4, "10001+": 5,
    }
    company_prestige = size_map.get(p.get("current_company_size", ""), 2)

    if ch:
        total_moves = len(ch)
        total_dur = sum(e["duration_months"] for e in ch)
        avg_tenure_yrs = total_dur / max(total_moves, 1) / 12
        job_hop_freq = max(0.5, 5 - avg_tenure_yrs)
    else:
        job_hop_freq = 3.0

    gh_raw = signals.get("github_activity_score", -1)
    github_activity = gh_raw / 100.0 if gh_raw != -1 else 0.1
    open_source_contribs = int(github_activity * 60) if github_activity > 0.2 else 0

    assessment_scores = signals.get("skill_assessment_scores", {}) or {}
    leetcode_score = (
        sum(assessment_scores.values()) / len(assessment_scores) / 100.0
        if assessment_scores
        else 0.4
    )

    tier_map = {"tier_1": 4, "tier_2": 3, "tier_3": 2, "tier_4": 1, "unknown": 1}
    education_tier = max((tier_map.get(e.get("tier", "unknown"), 1) for e in edu), default=1)

    certifications_count = len(certs)
    tech_stack_diversity = min(1.0, len(skills) / 20.0)
    endorsements_count = sum(s.get("endorsements", 0) for s in skills)
    skills_overlap = 0.5
    project_complexity = company_prestige / 5.0

    if len(ch) > 1:
        total_dur = sum(e["duration_months"] for e in ch)
        num_moves = len(ch) - 1
        moves_per_year = num_moves / (total_dur / 12) if total_dur > 0 else 0
        career_growth_rate = min(3.0, moves_per_year * 1.5)
    else:
        career_growth_rate = 0.5

    avg_resp = signals.get("avg_response_time_hours", 168)
    response_time_score = max(0, min(1, 1 - avg_resp / 240))

    return {
        "skills_overlap": round(skills_overlap, 2),
        "years_experience": years_experience,
        "company_prestige": company_prestige,
        "job_hop_freq": round(job_hop_freq, 1),
        "github_activity": round(github_activity, 2),
        "open_source_contribs": open_source_contribs,
        "leetcode_score": round(leetcode_score, 2),
        "education_tier": education_tier,
        "certifications_count": certifications_count,
        "project_complexity": round(project_complexity, 2),
        "tech_stack_diversity": round(tech_stack_diversity, 2),
        "endorsements_count": endorsements_count,
        "career_growth_rate": round(career_growth_rate, 2),
        "response_time_score": round(response_time_score, 2),
    }


def _is_hidden_gem(candidate: dict) -> bool:
    signals = candidate["redrob_signals"]
    gh = signals.get("github_activity_score", -1)
    saved = signals.get("saved_by_recruiters_30d", 0)
    assessments = signals.get("skill_assessment_scores", {}) or {}
    views = signals.get("profile_views_received_30d", 0)

    if gh > 50 and saved < 5:
        return True
    if assessments and views < 15:
        return True
    return False


def _make_reason(candidate: dict) -> str:
    p = candidate["profile"]
    signals = candidate["redrob_signals"]
    skills = [s["name"] for s in candidate["skills"]]

    parts = []
    headline = p.get("headline", "")
    if headline:
        parts.append(headline)
    if skills:
        top = skills[:4]
        parts.append(f"Skills: {', '.join(top)}")
    if signals.get("open_to_work_flag"):
        parts.append("Open to work")
    if not parts:
        parts.append("Experienced professional")
    return " | ".join(parts[:3])


def _transform_candidate(raw: dict) -> dict:
    p = raw["profile"]
    skill_names = [s["name"] for s in raw.get("skills", [])]
    ml = _compute_ml_features(raw)
    exp_str = f"{p['years_of_experience']} years"

    return {
        "id": raw["candidate_id"],
        "name": p["anonymized_name"],
        "role": p["current_title"],
        "company": p["current_company"],
        "location": p["location"],
        "experience": exp_str,
        "skills": skill_names,
        "reason": _make_reason(raw),
        "hiddenGem": _is_hidden_gem(raw),
        **ml,
    }


def load_candidates(path: str | None = None) -> list[dict]:
    path = path or RAW_CANDIDATES_PATH
    if not os.path.isfile(path):
        print(f"[data.py] WARNING: dataset not found at {path}, using empty list")
        return []

    flat_candidates = []
    skipped = 0
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                raw = json.loads(line)
            except json.JSONDecodeError:
                skipped += 1
                continue
            flat_candidates.append(_transform_candidate(raw))
            _raw_nested[raw["candidate_id"]] = raw

    if skipped:
        print(f"[data.py] WARNING: skipped {skipped} malformed JSON line(s)")

    if len(flat_candidates) > MAX_CANDIDATES:
        random.shuffle(flat_candidates)
        flat_candidates = flat_candidates[:MAX_CANDIDATES]

    return flat_candidates


_raw_nested: dict[str, dict] = {}
raw_candidates = load_candidates()


def get_nested_raw(candidate_id: str) -> dict | None:
    return _raw_nested.get(candidate_id)


# Pre-compute ML scores in batch for all loaded candidates
from ml.scorer import precompute_batch
if raw_candidates:
    precompute_batch(raw_candidates)


def get_total_candidate_count() -> int:
    """Count total lines in the dataset without loading all candidates."""
    path = RAW_CANDIDATES_PATH
    if not os.path.isfile(path):
        return len(raw_candidates)
    with open(path, "r", encoding="utf-8") as f:
        return sum(1 for line in f if line.strip())
