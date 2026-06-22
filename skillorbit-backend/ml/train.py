from ml.model import CandidateSuccessModel

if __name__ == "__main__":
    print("Generating training data...")
    df = CandidateSuccessModel.generate_training_data(n=2000)

    print("Training model...")
    model = CandidateSuccessModel()
    model.fit(df)

    print("\nSample prediction:")
    test_candidate = {
        "skills_overlap": 0.92,
        "years_experience": 7.0,
        "company_prestige": 4,
        "job_hop_freq": 2.5,
        "github_activity": 0.85,
        "open_source_contribs": 34,
        "leetcode_score": 0.78,
        "education_tier": 3,
        "certifications_count": 3,
        "project_complexity": 0.80,
        "tech_stack_diversity": 0.70,
        "endorsements_count": 92,
        "career_growth_rate": 0.9,
        "response_time_score": 0.95,
    }
    result = model.predict_single(test_candidate)
    for k, v in result.items():
        print(f"  {k:20s}: {v}")

    model.save()
    print("Done.")
