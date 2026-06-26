import re
import json
import spacy
import pandas as pd
from dataclasses import dataclass, field, asdict
from typing import Optional
from transformers import pipeline as hf_pipeline

SKILL_TAXONOMY = {
    "languages": {
        "Python", "JavaScript", "TypeScript", "Java", "Go", "Rust", "C++",
        "C#", "Scala", "Kotlin", "Swift", "Ruby", "PHP", "R", "MATLAB",
        "Bash", "Shell", "SQL", "GraphQL", "Solidity",
    },
    "ml_ai": {
        "PyTorch", "TensorFlow", "Keras", "scikit-learn", "XGBoost",
        "LightGBM", "CatBoost", "Hugging Face", "LangChain", "LlamaIndex", "ONNX",
        "CUDA", "TensorRT", "MLflow", "Weights & Biases", "Ray", "Triton",
        "RLHF", "RAG", "fine-tuning", "LLMs", "diffusion models",
        "transformers", "BERT", "GPT", "LoRA", "QLoRA", "JAX", "Flax",
        "OpenAI", "Claude", "Gemini", "vector embeddings", "semantic search",
    },
    "data": {
        "Spark", "Kafka", "Airflow", "dbt", "Flink", "Hadoop",
        "Snowflake", "BigQuery", "Redshift", "Databricks", "Delta Lake",
        "Pandas", "NumPy", "Polars", "DuckDB", "Presto",
        "Tableau", "Power BI", "Looker", "Sigma", "Metabase",
    },
    "infra_devops": {
        "Kubernetes", "Docker", "Terraform", "Ansible", "Helm",
        "AWS", "GCP", "Azure", "CI/CD", "Jenkins", "GitHub Actions",
        "Prometheus", "Grafana", "Datadog", "ArgoCD", "Istio",
    },
    "databases": {
        "PostgreSQL", "MySQL", "MongoDB", "Redis", "Cassandra",
        "Elasticsearch", "Pinecone", "Weaviate", "Qdrant", "Neo4j",
        "DynamoDB", "Firestore", "CockroachDB",
    },
    "web_frontend": {
        "React", "Next.js", "Vue", "Angular", "Svelte", "Tailwind CSS",
        "Node.js", "Express", "FastAPI", "Django", "Flask", "Spring Boot",
        "REST APIs", "gRPC", "WebSockets", "Redux", "Zustand", "shadcn",
        "HTML", "CSS", "Sass", "Storybook", "Cypress", "Playwright",
    },
    "practices": {
        "microservices", "distributed systems", "system design",
        "TDD", "BDD", "agile", "scrum", "code review",
        "open source", "pair programming", "design patterns",
    },
}

_SKILL_LOWER_MAP: dict[str, str] = {}
_CATEGORY_MAP: dict[str, str] = {}
for cat, skills in SKILL_TAXONOMY.items():
    for s in skills:
        _SKILL_LOWER_MAP[s.lower()] = s
        _CATEGORY_MAP[s.lower()] = cat

LEVEL_SIGNALS = {
    "junior":    ["junior", "entry level", "entry-level", "0-2 years", "1+ year", "new grad", "graduate"],
    "mid":       ["mid-level", "mid level", "2-4 years", "3+ years", "2+ years"],
    "senior":    ["senior", "5+ years", "4+ years", "6+ years", "7+ years", "8+ years"],
    "staff":     ["staff", "principal", "9+ years", "10+ years"],
    "lead":      ["lead", "tech lead", "team lead", "engineering lead"],
    "manager":   ["manager", "engineering manager", "em ", "director"],
}

NEGATIVE_PHRASES = [
    "not required", "no experience needed", "no degree required",
    "we don't expect", "nice to have", "bonus", "a plus", "a big plus",
    "preferred but not", "ideally", "advantageous", "desirable",
    "familiarity with", "exposure to", "basic understanding",
]

MUST_HAVE_PHRASES = [
    "required", "must have", "must-have", "you must", "you will need",
    "strong experience", "proven experience", "deep expertise",
    "extensive experience", "hands-on experience", "proficiency in",
    "expert in", "3+ years", "5+ years", "solid understanding",
    "demonstrated ability",
]

MUST_HAVE_SECTION_HEADERS = [
    "requirements", "qualifications", "required skills", "must have",
    "what you'll need", "what you will need", "key requirements",
    "minimum qualifications", "basic qualifications", "what we look for",
    "about you", "who you are", "we are looking for",
]

NICE_TO_HAVE_SECTION_HEADERS = [
    "nice to have", "nice-to-have", "bonus", "bonus points",
    "good to have", "good-to-have", "preferred", "preferred qualifications",
    "plus", "a plus", "would be nice", "desirable", "additional",
    "what would make you stand out",
]


@dataclass
class ExtractedSkill:
    name: str
    category: str
    is_must_have: bool
    is_nice_to_have: bool
    context: str
    confidence: float


@dataclass
class JDExtractionResult:
    raw_text: str
    role_title: str
    role_category: str
    experience_level: str
    min_years: Optional[int]
    max_years: Optional[int]
    must_have_skills: list[ExtractedSkill] = field(default_factory=list)
    nice_to_have_skills: list[ExtractedSkill] = field(default_factory=list)
    negative_signals: list[str] = field(default_factory=list)
    all_skills: list[str] = field(default_factory=list)
    summary: dict = field(default_factory=dict)


class JDSkillExtractor:
    def __init__(self, use_zero_shot: bool = False):
        self.nlp = spacy.load("en_core_web_sm")
        self.use_zero_shot = use_zero_shot
        self._classifier = None
        if use_zero_shot:
            self._classifier = hf_pipeline(
                "zero-shot-classification",
                model="facebook/bart-large-mnli",
            )

    def _clean(self, text: str) -> str:
        # Normalize line endings
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        # Replace bullet characters with newlines
        text = re.sub(r"[•●▪▸◦‣·]", "\n", text)
        # Collapse excessive blank lines
        text = re.sub(r"\n{3,}", "\n\n", text)
        # Trim trailing spaces on each line (but preserve line structure)
        text = "\n".join(" ".join(line.split()) for line in text.split("\n"))
        return text.strip()

    def _extract_years(self, text: str) -> tuple[Optional[int], Optional[int]]:
        patterns = [
            r"(\d+)\+\s*years?",
            r"(\d+)\s*[-–]\s*(\d+)\s*years?",
            r"(\d+)\s*years?\s*(?:of\s*)?(?:professional\s*)?experience",
            r"minimum\s*(?:of\s*)?(\d+)\s*years?",
            r"at\s*least\s*(\d+)\s*years?",
        ]
        mins, maxs = [], []
        for pat in patterns:
            for m in re.finditer(pat, text, re.IGNORECASE):
                groups = [int(g) for g in m.groups() if g]
                if len(groups) == 1:
                    mins.append(groups[0])
                elif len(groups) == 2:
                    mins.append(groups[0])
                    maxs.append(groups[1])
        return (min(mins) if mins else None, max(maxs) if maxs else None)

    def _detect_level(self, text: str) -> str:
        text_lower = text.lower()
        matched_levels = [lvl for lvl, signals in LEVEL_SIGNALS.items() if any(sig in text_lower for sig in signals)]
        if not matched_levels:
            return "mid"
        level_rank = ["junior", "mid", "senior", "staff", "lead", "manager"]
        best = max(matched_levels, key=lambda lvl: level_rank.index(lvl) if lvl in level_rank else -1)
        return best

    def _detect_role_category(self, title: str, text: str) -> str:
        title_lower = title.lower()
        text_lower = text.lower()

        title_keywords = {
            "ml_ai":     ["machine learning", "ml engineer", "ai engineer", "ml", "ai", "deep learning", "llm", "nlp", "data scientist"],
            "data":      ["data engineer", "data architect", "analytics engineer", "etl", "data pipeline"],
            "frontend":  ["frontend", "front-end", "ui engineer", "ui developer", "react developer"],
            "backend":   ["backend", "back-end", "backend engineer", "back-end engineer"],
            "infra":     ["devops", "platform engineer", "sre", "infrastructure engineer", "cloud engineer"],
            "management": ["engineering manager", "director of", "vp of", "head of", "cto"],
        }

        # Score title matches heavily
        title_score = {}
        for cat, kws in title_keywords.items():
            if any(kw in title_lower for kw in kws):
                title_score[cat] = 3

        # Score text matches with lower weight, but scan full text
        text_keywords = {
            "ml_ai":     ["pytorch", "tensorflow", "machine learning", "deep learning", "llm", "nlp", "computer vision"],
            "data":      ["spark", "kafka", "etl pipeline", "data pipeline", "data warehouse", "bigquery"],
            "frontend":  ["react", "vue", "angular", "frontend", "front-end", "ui", "tailwind"],
            "backend":   ["microservice", "rest api", "grpc", "spring boot", "fastapi", "django"],
            "infra":     ["kubernetes", "docker", "terraform", "ci/cd", "aws", "gcp", "azure", "devops"],
            "management": ["stakeholder", "roadmap", "team of", "manage a team", "leadership"],
        }
        for cat, kws in text_keywords.items():
            if any(kw in text_lower for kw in kws):
                title_score[cat] = title_score.get(cat, 0) + 1

        if title_score:
            return max(title_score, key=title_score.get)
        return "engineering"

    def _extract_role_title(self, text: str) -> str:
        lines = [l.strip() for l in text.strip().split("\n") if l.strip()][:5]
        for line in lines:
            if len(line) < 80 and any(
                kw in line.lower()
                for kw in ["engineer", "scientist", "analyst", "manager",
                           "developer", "architect", "lead", "director"]
            ):
                return line
        return lines[0] if lines else "Unknown Role"

    def _detect_sections(self, text: str) -> dict[int, str]:
        lines = text.split("\n")
        section_map = {}
        current_type = "neutral"
        for i, line in enumerate(lines):
            stripped = line.strip()
            if not stripped:
                continue
            line_lower = stripped.lower().rstrip(":")
            is_bullet = stripped.startswith(("-", "•", "*", "·", "1.", "2.", "3."))
            is_short_heading = (
                len(stripped) < 70
                and not is_bullet
                and not stripped.endswith((".", "?", "!"))
                and stripped[0].isupper()
            )
            if is_short_heading:
                line_words = set(line_lower.split())
                # Check nice-to-have first (more specific, e.g. "Preferred Qualifications")
                if any(h in line_lower for h in NICE_TO_HAVE_SECTION_HEADERS):
                    current_type = "nice_to_have"
                elif any(h in line_lower for h in MUST_HAVE_SECTION_HEADERS):
                    current_type = "must_have"
                elif any(kw in line_lower for kw in ["engineer", "scientist", "developer", "analyst", "architect"]):
                    current_type = "neutral"
                else:
                    current_type = "neutral"
            elif not is_bullet and stripped[0].isupper() and len(stripped) > 70:
                current_type = "neutral"
            section_map[i] = current_type
        return section_map

    def _sentence_signal(self, sentence: str, section_type: str = "neutral") -> tuple[bool, bool]:
        sl = sentence.lower()
        must  = any(p in sl for p in MUST_HAVE_PHRASES)
        nice  = any(p in sl for p in NEGATIVE_PHRASES)

        if section_type == "must_have" and not nice:
            must = True
        if section_type == "nice_to_have" and not must:
            nice = True

        if must and nice:
            return False, True
        return must, nice

    def _get_section_for_line(self, line_no: int, section_map: dict[int, str]) -> str:
        if not section_map:
            return "neutral"
        closest = None
        best_type = "neutral"
        for ln, st in section_map.items():
            if ln <= line_no:
                if closest is None or ln > closest:
                    closest = ln
                    best_type = st
        return best_type

    def _taxonomy_lookup(self, text: str, lines: list[str], section_map: dict[int, str] | None = None) -> list[ExtractedSkill]:
        found = {}
        for line_idx, line in enumerate(lines):
            line_lower = line.lower().strip()
            if not line_lower:
                continue
            section_type = self._get_section_for_line(line_idx, section_map) if section_map else "neutral"
            for skill_lower, skill_name in _SKILL_LOWER_MAP.items():
                pattern = r'\b' + re.escape(skill_lower) + r'\b'
                if re.search(pattern, line_lower):
                    is_must, is_nice = self._sentence_signal(line, section_type)
                    if skill_lower not in found:
                        found[skill_lower] = ExtractedSkill(
                            name=skill_name,
                            category=_CATEGORY_MAP[skill_lower],
                            is_must_have=is_must,
                            is_nice_to_have=is_nice,
                            context=line.strip(),
                            confidence=0.95,
                        )
                    else:
                        if is_must:
                            found[skill_lower].is_must_have = True
        return list(found.values())

    def _spacy_ner(self, text: str, already_found: set[str], section_map: dict[int, str] | None = None) -> list[ExtractedSkill]:
        doc = self.nlp(text[:100_000])
        extras = []
        for ent in doc.ents:
            name = ent.text.strip()
            if "\n" in name or not name.isprintable():
                continue
            if ent.label_ in {"ORG", "PRODUCT", "GPE"} and len(name) > 2:
                if name.lower() not in already_found and len(name) < 40:
                    line_no = text[:ent.start_char].count("\n")
                    section_type = self._get_section_for_line(line_no, section_map) if section_map else "neutral"
                    context_line = text.split("\n")[line_no] if line_no < len(text.split("\n")) else ent.sent.text
                    is_must, is_nice = self._sentence_signal(context_line, section_type)
                    extras.append(ExtractedSkill(
                        name=name,
                        category="other",
                        is_must_have=is_must,
                        is_nice_to_have=is_nice,
                        context=context_line.strip(),
                        confidence=0.65,
                    ))
        return extras

    def extract(self, jd_text: str) -> JDExtractionResult:
        clean_text = self._clean(jd_text)
        lines = clean_text.split("\n")
        doc = self.nlp(clean_text[:100_000])
        sentences = [sent.text for sent in doc.sents]

        role_title    = self._extract_role_title(clean_text)
        role_category = self._detect_role_category(role_title, clean_text)
        exp_level     = self._detect_level(clean_text)
        min_yr, max_yr = self._extract_years(clean_text)

        section_map = self._detect_sections(clean_text)
        taxonomy_skills = self._taxonomy_lookup(clean_text, lines, section_map)
        found_lower = {s.name.lower() for s in taxonomy_skills}

        ner_extras = self._spacy_ner(clean_text, found_lower, section_map)

        all_skills = taxonomy_skills + ner_extras

        must_have   = []
        nice_to_have = []
        for skill in all_skills:
            if skill.is_nice_to_have:
                nice_to_have.append(skill)
            elif skill.is_must_have or skill.category != "other":
                must_have.append(skill)
            else:
                nice_to_have.append(skill)

        must_have.sort(key=lambda x: -x.confidence)
        nice_to_have.sort(key=lambda x: -x.confidence)

        neg_signals = []
        for sent in sentences:
            sl = sent.lower()
            if any(p in sl for p in ["no experience", "not required", "we don't require"]):
                neg_signals.append(sent.strip())

        result = JDExtractionResult(
            raw_text=jd_text,
            role_title=role_title,
            role_category=role_category,
            experience_level=exp_level,
            min_years=min_yr,
            max_years=max_yr,
            must_have_skills=must_have,
            nice_to_have_skills=nice_to_have,
            negative_signals=neg_signals,
            all_skills=[s.name for s in all_skills],
            summary={
                "total_skills_found":    len(all_skills),
                "must_have_count":       len(must_have),
                "nice_to_have_count":    len(nice_to_have),
                "categories_covered":    list({s.category for s in all_skills}),
            }
        )
        return result

    def to_dict(self, result: JDExtractionResult) -> dict:
        d = asdict(result)
        d.pop("raw_text")
        return d
