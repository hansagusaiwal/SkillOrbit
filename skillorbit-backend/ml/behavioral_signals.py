import numpy as np
import pandas as pd
from dataclasses import dataclass, field
import warnings
warnings.filterwarnings("ignore")


BEHAVIORAL_TAXONOMY = {
    "collaboration": {
        "keywords": [
            "collaborated", "pair programmed", "code review", "mentored", "helped",
            "team", "cross-functional", "partnered", "aligned", "synced", "together",
            "contributed to", "supported", "onboarded", "mob programming",
        ],
        "negative": ["solo", "alone", "independently without", "no team"],
        "weight": 1.0,
    },
    "problem_solving": {
        "keywords": [
            "debugged", "resolved", "fixed", "diagnosed", "root cause", "investigated",
            "optimized", "refactored", "improved performance", "reduced latency",
            "cut costs", "solved", "workaround", "bottleneck", "analyzed",
        ],
        "negative": ["couldn't fix", "unresolved", "gave up"],
        "weight": 1.0,
    },
    "learning_velocity": {
        "keywords": [
            "learned", "picked up", "self-taught", "studied", "completed course",
            "certification", "new to", "first time", "exploring", "experimenting",
            "reading", "tutorial", "side project", "hackathon", "built for fun",
        ],
        "negative": ["struggled to learn", "failed to understand"],
        "weight": 1.0,
    },
    "ownership": {
        "keywords": [
            "owned", "led", "drove", "responsible for", "my project", "launched",
            "shipped", "end-to-end", "from scratch", "architected", "designed",
            "created", "built", "initiated", "my decision",
        ],
        "negative": ["assigned to", "told to", "had to"],
        "weight": 1.0,
    },
    "communication": {
        "keywords": [
            "documented", "wrote RFC", "blog post", "presented", "demo",
            "explained", "README", "wiki", "spec", "design doc", "talked at",
            "conference", "wrote tests", "commented", "clear commit message",
        ],
        "negative": ["no documentation", "unclear", "vague"],
        "weight": 1.0,
    },
    "initiative": {
        "keywords": [
            "proactively", "without being asked", "identified opportunity",
            "proposed", "suggested", "open source", "contributed upstream",
            "filed issue", "opened PR", "started", "founded", "created from scratch",
            "volunteer", "side project",
        ],
        "negative": ["reactive", "waited for", "told by manager"],
        "weight": 1.0,
    },
}

DIMENSIONS = list(BEHAVIORAL_TAXONOMY.keys())


@dataclass
class BehavioralProfile:
    candidate_id: str
    collaboration:    float = 0.0
    problem_solving:  float = 0.0
    learning_velocity: float = 0.0
    ownership:        float = 0.0
    communication:    float = 0.0
    initiative:       float = 0.0
    overall_score:    float = 0.0
    signal_sources:   dict  = field(default_factory=dict)
    top_evidence:     dict  = field(default_factory=dict)
    confidence:       float = 0.0


@dataclass
class CandidateSignals:
    candidate_id: str
    github_commits:     list[str] = field(default_factory=list)
    github_pr_bodies:   list[str] = field(default_factory=list)
    github_repo_readmes: list[str] = field(default_factory=list)
    stackoverflow_answers: list[str] = field(default_factory=list)
    linkedin_about:     str = ""
    linkedin_endorsements: list[str] = field(default_factory=list)
    repos_contributed_to:  int = 0
    avg_pr_review_time_hrs: float = 0.0
    issues_opened:         int = 0
    issues_closed:         int = 0
    stars_received:        int = 0


def generate_candidate_signals(n: int = 5, seed: int = 42) -> list[CandidateSignals]:
    np.random.seed(seed)

    commit_pool = [
        "Fix race condition in distributed lock manager after root cause analysis",
        "Refactor auth module — reduce latency by 40ms end-to-end",
        "Add unit tests for payment service; document edge cases in README",
        "Pair programmed with @alice on new onboarding flow, cleaned up PR feedback",
        "Learned Ray for distributed training, implemented toy example",
        "Open PR to upstream repo fixing memory leak in data loader",
        "Led design discussion for new event-driven architecture",
        "Debugged prod issue: traced null pointer to stale cache, resolved in 2hrs",
        "Explored LLM fine-tuning; wrote internal blog post on findings",
        "Self-taught Rust over weekend, built CLI tool for log parsing",
        "Proposed and shipped new feature: async job queue from scratch",
        "Code review for 3 PRs; left detailed inline comments",
        "Optimized SQL query reducing runtime from 45s to 0.3s",
        "Documented API contract in OpenAPI spec, shared with team",
        "Contributed to OSS: merged PR in HuggingFace transformers repo",
        "Mentored junior engineer through their first production deployment",
        "Filed issue with repro steps on upstream library, received fix quickly",
        "Wrote ADR for migration from REST to gRPC after benchmarking",
    ]

    linkedin_pool = [
        "Passionate about building robust systems and mentoring teams.",
        "I love learning new technologies and contributing to open source.",
        "Led multiple cross-functional initiatives at scale.",
        "Driven by solving hard problems end-to-end with ownership.",
        "Strong communicator, enjoy writing design docs and RFCs.",
    ]

    signals = []
    for i in range(n):
        n_commits = np.random.randint(8, 18)
        signals.append(CandidateSignals(
            candidate_id=f"CAND-{i:04d}",
            github_commits=list(np.random.choice(commit_pool, n_commits, replace=True)),
            github_pr_bodies=list(np.random.choice(commit_pool, np.random.randint(3, 8), replace=True)),
            github_repo_readmes=[
                "This project demonstrates distributed systems concepts. "
                "Collaborated with 3 engineers. Documented setup steps thoroughly.",
                "A self-taught exploration of MLOps pipelines. Learned Kubernetes for this.",
            ],
            stackoverflow_answers=list(np.random.choice(commit_pool, np.random.randint(2, 5), replace=True)),
            linkedin_about=np.random.choice(linkedin_pool),
            linkedin_endorsements=list(np.random.choice(
                ["Python", "Machine Learning", "Leadership", "Team Building",
                 "Problem Solving", "Communication", "Mentoring"],
                np.random.randint(3, 7), replace=False
            )),
            repos_contributed_to=np.random.randint(2, 30),
            avg_pr_review_time_hrs=np.random.uniform(1, 72),
            issues_opened=np.random.randint(0, 40),
            issues_closed=np.random.randint(0, 35),
            stars_received=np.random.randint(0, 500),
        ))
    return signals


class BehavioralSignalAnalyzer:

    def __init__(self, use_transformer: bool = False):
        self.use_transformer = use_transformer
        self._classifier = None

    def _keyword_score(self, texts: list[str]) -> dict[str, float]:
        combined = " ".join(texts).lower()
        scores = {}
        for dim, config in BEHAVIORAL_TAXONOMY.items():
            pos = sum(combined.count(kw.lower()) for kw in config["keywords"])
            neg = sum(combined.count(kw.lower()) for kw in config["negative"])
            raw = max(0, pos - neg * 2)
            scores[dim] = round(float(1 / (1 + np.exp(-0.5 * (raw - 3)))), 4)
        return scores

    def _extract_evidence(self, texts: list[str], dim: str, max_snippets: int = 2) -> list[str]:
        keywords = BEHAVIORAL_TAXONOMY[dim]["keywords"]
        evidence = []
        for text in texts:
            if any(kw.lower() in text.lower() for kw in keywords):
                snippet = text[:200].strip()
                if snippet and snippet not in evidence:
                    evidence.append(snippet)
            if len(evidence) >= max_snippets:
                break
        return evidence

    def _numeric_score(self, signals: CandidateSignals) -> dict[str, float]:
        def norm(val, mn, mx):
            return float(np.clip((val - mn) / (mx - mn + 1e-9), 0, 1))

        collab = norm(signals.repos_contributed_to, 0, 30)
        responsiveness = 1 - norm(signals.avg_pr_review_time_hrs, 0, 72)
        initiative_num = norm(signals.issues_opened, 0, 40)
        communication_num = norm(signals.stars_received, 0, 200)
        problem_solving_num = norm(signals.issues_closed, 0, 35)

        endorsements = " ".join(signals.linkedin_endorsements).lower()
        collab_endorse = 0.15 if any(
            e in endorsements for e in ["team", "mentoring", "leadership"]
        ) else 0.0
        comm_endorse = 0.15 if "communication" in endorsements else 0.0

        return {
            "collaboration":    round(collab * 0.85 + collab_endorse, 4),
            "problem_solving":  round(problem_solving_num * 0.7 + responsiveness * 0.3, 4),
            "learning_velocity": 0.0,
            "ownership":        round(initiative_num * 0.6 + responsiveness * 0.4, 4),
            "communication":    round(communication_num * 0.7 + comm_endorse, 4),
            "initiative":       round(initiative_num * 0.8 + collab * 0.2, 4),
        }

    def analyze(self, signals: CandidateSignals) -> BehavioralProfile:
        all_texts = (
            signals.github_commits +
            signals.github_pr_bodies +
            signals.github_repo_readmes +
            signals.stackoverflow_answers +
            [signals.linkedin_about]
        )
        all_texts = [t for t in all_texts if t and len(t.strip()) > 5]

        kw_scores = self._keyword_score(all_texts)

        text_scores = kw_scores
        source_note = "keyword-only"

        num_scores = self._numeric_score(signals)

        fused = {
            dim: round(0.70 * text_scores[dim] + 0.30 * num_scores[dim], 4)
            for dim in DIMENSIONS
        }

        scaled = {dim: round(v * 100, 1) for dim, v in fused.items()}

        n_tokens = sum(len(t.split()) for t in all_texts)
        confidence = float(np.clip(n_tokens / 500, 0, 1))

        evidence = {
            dim: self._extract_evidence(all_texts, dim)
            for dim in DIMENSIONS
        }

        overall = round(float(np.mean(list(scaled.values()))), 1)

        return BehavioralProfile(
            candidate_id=signals.candidate_id,
            collaboration=scaled["collaboration"],
            problem_solving=scaled["problem_solving"],
            learning_velocity=scaled["learning_velocity"],
            ownership=scaled["ownership"],
            communication=scaled["communication"],
            initiative=scaled["initiative"],
            overall_score=overall,
            signal_sources={dim: source_note for dim in DIMENSIONS},
            top_evidence=evidence,
            confidence=round(confidence, 2),
        )

    def analyze_batch(self, signals_list: list[CandidateSignals]) -> pd.DataFrame:
        profiles = []
        for sig in signals_list:
            p = self.analyze(sig)
            profiles.append({
                "candidate_id":    p.candidate_id,
                "collaboration":   p.collaboration,
                "problem_solving": p.problem_solving,
                "learning_velocity": p.learning_velocity,
                "ownership":       p.ownership,
                "communication":   p.communication,
                "initiative":      p.initiative,
                "overall_score":   p.overall_score,
                "confidence":      p.confidence,
            })
        return pd.DataFrame(profiles)

    def to_api_response(self, profile: BehavioralProfile) -> dict:
        return {
            "candidate_id": profile.candidate_id,
            "scores": {
                "collaboration":    profile.collaboration,
                "problem_solving":  profile.problem_solving,
                "learning_velocity": profile.learning_velocity,
                "ownership":        profile.ownership,
                "communication":    profile.communication,
                "initiative":       profile.initiative,
                "overall":          profile.overall_score,
            },
            "confidence": profile.confidence,
            "top_evidence": {
                dim: snippets[:1]
                for dim, snippets in profile.top_evidence.items()
                if snippets
            },
        }
