import numpy as np
from ml.ranker import CandidateRanker
from data import raw_candidates

SYNTHETIC_COUNT = 100

def generate_pool() -> list[dict]:
    np.random.seed(42)

    skill_pools = [
        ["Python", "PyTorch", "TensorFlow", "CUDA", "distributed systems", "MLOps", "Kubernetes"],
        ["Python", "scikit-learn", "SQL", "data pipelines", "Spark", "Airflow", "dbt"],
        ["React", "TypeScript", "Node.js", "GraphQL", "REST APIs", "AWS", "CI/CD"],
        ["Java", "Spring Boot", "microservices", "Kafka", "PostgreSQL", "Docker"],
        ["Rust", "C++", "systems programming", "LLVM", "embedded systems", "Linux kernel"],
        ["Go", "distributed systems", "gRPC", "Kubernetes", "Prometheus", "Terraform"],
        ["Python", "LLMs", "RAG", "LangChain", "vector databases", "fine-tuning", "RLHF"],
    ]
    companies = [
        "Google DeepMind", "OpenAI", "Scale AI", "Meta AI", "Anthropic",
        "Stripe", "Databricks", "Hugging Face", "NVIDIA", "Microsoft Research",
        "Amazon", "Netflix", "Uber", "Lyft", "Airbnb", "Figma", "Notion",
    ]
    roles = [
        "Senior ML Engineer", "Staff Software Engineer", "Principal Data Scientist",
        "ML Research Engineer", "Backend Engineer", "Full Stack Engineer",
        "Platform Engineer", "AI Engineer", "Data Engineer", "Systems Engineer",
    ]
    locations = ["San Francisco", "New York", "Seattle", "Remote", "Austin", "London"]

    candidates = []
    for i in range(SYNTHETIC_COUNT):
        pool_idx = np.random.randint(len(skill_pools))
        skills = list(np.random.choice(skill_pools[pool_idx], size=4, replace=False))
        company = str(np.random.choice(companies))
        role = str(np.random.choice(roles))
        yoe = int(np.random.randint(2, 16))
        location = str(np.random.choice(locations))

        profile_text = (
            f"{role} with {yoe} years of experience. "
            f"Currently at {company}. "
            f"Core skills: {', '.join(skills)}. "
            f"Location: {location}. "
            f"Led cross-functional teams on large-scale production systems. "
        )

        candidates.append({
            "id": f"CAND-SYN-{i+1:04d}",
            "name": f"Candidate {i+1}",
            "role": role,
            "company": company,
            "yoe": yoe,
            "skills": skills,
            "location": location,
            "profile_text": profile_text,
            "technicalFit": round(float(np.random.uniform(40, 99)), 1),
            "skillMatch": round(float(np.random.uniform(40, 99)), 1),
            "experienceLevel": round(float(np.random.uniform(40, 99)), 1),
            "careerGrowth": round(float(np.random.uniform(40, 99)), 1),
            "cultureSignal": round(float(np.random.uniform(40, 99)), 1),
            "successScore": round(float(np.random.uniform(40, 99)), 1),
        })
    return candidates


if __name__ == "__main__":
    pool = generate_pool()

    # Add real candidates at the front
    for rc in raw_candidates:
        pool.insert(0, {
            "id": rc["id"],
            "name": rc["name"],
            "role": rc["role"],
            "company": rc["company"],
            "yoe": float(rc["years_experience"]),
            "skills": rc["skills"],
            "location": rc["location"],
            "profile_text": (
                f"{rc['role']} with {rc['experience']} of experience. "
                f"Currently at {rc['company']}. "
                f"Core skills: {', '.join(rc['skills'])}. "
                f"Location: {rc['location']}."
            ),
            "technicalFit": float(np.random.uniform(40, 99)),
            "skillMatch": float(np.random.uniform(40, 99)),
            "experienceLevel": float(np.random.uniform(40, 99)),
            "careerGrowth": float(np.random.uniform(40, 99)),
            "cultureSignal": float(np.random.uniform(40, 99)),
            "successScore": float(np.random.uniform(40, 99)),
        })

    print(f"Building ranker with {len(pool)} candidates...")
    ranker = CandidateRanker()
    ranker.index_candidates(pool)
    ranker.save()
    print("Done.")
