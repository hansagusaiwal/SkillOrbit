import os
import time
from dataclasses import dataclass, field
from typing import Optional
from sentence_transformers import SentenceTransformer
import faiss
from groq import Groq


@dataclass
class CandidateDocument:
    candidate_id: str
    chunk_type: str
    content: str
    metadata: dict = field(default_factory=dict)


@dataclass
class RetrievedChunk:
    document: CandidateDocument
    score: float


def _detect_hidden_gems(n: int) -> set[str]:
    """Run ML hidden gem detector across candidates, return set of gem IDs."""
    import pandas as pd
    from ml.hidden_gem_detector import HiddenGemDetector
    from ml.scorer import score_candidate
    from data import raw_candidates

    candidates = raw_candidates[:n]
    scored_list = [score_candidate(dict(c)) for c in candidates]
    rows = [{
        "id": c["id"], "name": c["name"], "role": c["role"], "company": c["company"],
        "successScore": c.get("successScore", 50), "technicalFit": c.get("technicalFit", 50),
        "skillMatch": c.get("skillMatch", 50), "experienceLevel": c.get("experienceMatch", 50),
        "careerGrowth": c.get("careerGrowth", 50), "learningVelocity": c.get("learningVelocity", 0.5),
        "careerGrowthRate": c.get("career_growth_rate", 1.0),
        "githubActivity": c.get("github_activity", 0.5), "openSourcePRs": c.get("open_source_contribs", 0),
    } for c in scored_list]
    df = pd.DataFrame(rows)
    detector = HiddenGemDetector()
    detector.fit(df)
    gems = detector.detect(df, top_k=n)
    return set(gems[gems["gem_score"] >= 50]["id"].tolist())


def build_candidate_knowledge_base(n: int = 200) -> list[CandidateDocument]:
    from data import raw_candidates
    from ml.scorer import score_candidate

    candidates_to_use = raw_candidates[:n]
    documents = []

    gem_ids = _detect_hidden_gems(n)

    for c in candidates_to_use:
        cid = c["id"]
        name = c["name"]
        role = c["role"]
        company = c["company"]
        skills = c["skills"]
        yoe = c.get("years_experience", 0)
        loc = c["location"]
        scored = score_candidate(dict(c))

        success_score = scored.get("successScore", 50)
        technical_fit = scored.get("technicalFit", 50)
        skill_match = scored.get("skillMatch", 50)
        career_growth = scored.get("careerGrowth", 50)
        experience_level = scored.get("experienceMatch", 50)
        recruitability = scored.get("recruitability", 50)
        hidden_gem = cid in gem_ids

        documents.append(CandidateDocument(
            candidate_id=cid, chunk_type="profile",
            content=(
                f"{name} (ID: {cid}) is a {role} with {yoe} years of experience, "
                f"currently at {company}. Located in {loc}. "
                f"Core skills: {', '.join(skills)}."
            ),
            metadata={"name": name, "role": role, "company": company, "yoe": yoe, "skills": skills},
        ))

        documents.append(CandidateDocument(
            candidate_id=cid, chunk_type="scores",
            content=(
                f"{name} ({cid}) scores: successScore={success_score}, technicalFit={technical_fit}, "
                f"skillMatch={skill_match}, careerGrowth={career_growth}, "
                f"experienceLevel={experience_level}, recruitability={recruitability}."
            ),
            metadata={
                "success_score": success_score, "technical_fit": technical_fit,
                "skill_match": skill_match, "recruitability": recruitability,
            },
        ))

        documents.append(CandidateDocument(
            candidate_id=cid, chunk_type="explanation",
            content=(
                f"Why {name} ({cid}): Top signals include {', '.join(skills[:3])}. "
                f"{yoe} years of experience. "
                f"Technical fit {technical_fit}/100. Career growth {career_growth}/100. "
                f"Recruitability: {recruitability}/100."
            ),
        ))

        documents.append(CandidateDocument(
            candidate_id=cid, chunk_type="reason",
            content=f"{name} ({cid}): {c.get('reason', 'Experienced professional.')}",
        ))

        if hidden_gem:
            documents.append(CandidateDocument(
                candidate_id=cid, chunk_type="gem",
                content=(
                    f"{name} ({cid}) is a hidden gem with high potential. "
                    f"Role: {role} at {company}. Skills: {', '.join(skills[:5])}. "
                    f"Success score: {success_score}/100."
                ),
                metadata={"hidden_gem": True, "name": name, "role": role},
            ))

    return documents


_encoder: SentenceTransformer | None = None


def _get_encoder(model_name: str = "all-MiniLM-L6-v2") -> SentenceTransformer:
    global _encoder
    if _encoder is None:
        _encoder = SentenceTransformer(model_name)
    return _encoder


class VectorStore:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2", encoder: SentenceTransformer | None = None):
        self.encoder = encoder or _get_encoder(model_name)
        self.index = None
        self.documents: list[CandidateDocument] = []

    def build(self, documents: list[CandidateDocument]):
        self.documents = documents
        texts = [doc.content for doc in documents]
        embeddings = self.encoder.encode(
            texts, batch_size=64, show_progress_bar=False,
            normalize_embeddings=True, convert_to_numpy=True,
        ).astype("float32")
        dim = embeddings.shape[1]
        self.index = faiss.IndexFlatIP(dim)
        self.index.add(embeddings)

    def retrieve(self, query: str, top_k: int = 8, chunk_types: list[str] = None, keywords: list[str] | None = None) -> list[RetrievedChunk]:
        if self.index is None:
            raise RuntimeError("Call .build() first.")
        q_vec = self.encoder.encode(
            [query], normalize_embeddings=True, convert_to_numpy=True,
        ).astype("float32")
        fetch_k = top_k * 4 if chunk_types else top_k
        scores, indices = self.index.search(q_vec, min(fetch_k, len(self.documents)))

        vec_results = []
        for score, idx in zip(scores[0], indices[0]):
            doc = self.documents[idx]
            if chunk_types and doc.chunk_type not in chunk_types:
                continue
            vec_results.append(RetrievedChunk(document=doc, score=float(score)))
            if len(vec_results) >= top_k:
                break

        if not keywords:
            return vec_results

        kw_results = []
        terms = [k.lower() for k in keywords]
        for doc in self.documents:
            if chunk_types and doc.chunk_type not in chunk_types:
                continue
            text = doc.content.lower()
            if any(t in text for t in terms):
                kw_results.append(RetrievedChunk(document=doc, score=1.0))

        seen = set()
        merged = []
        for ch in kw_results + vec_results:
            key = (ch.document.candidate_id, ch.document.chunk_type)
            if key not in seen:
                seen.add(key)
                merged.append(ch)
        return merged[:top_k * 2]


class RecruiterCopilot:
    SYSTEM_PROMPT = """You are an expert AI recruiting copilot. 
You have access to a rich candidate knowledge base containing scores, rankings, 
behavioral signals, hidden gem analysis, and recruitability predictions for every candidate.

When answering:
- Be specific and cite candidate IDs and scores
- Explain your reasoning clearly
- If comparing candidates, use their actual scores
- If asked about hidden gems, focus on non-traditional fit signals
- If asked about recruitability, explain the behavioral signals driving the score
- Keep answers concise but thorough
- Always ground your answer in the retrieved context provided
- If the context doesn't contain enough info, say so honestly"""

    INTENT_ROUTING = {
        "ranking":        ["profile", "scores", "explanation"],
        "explanation":    ["explanation", "scores", "behavioral"],
        "comparison":     ["scores", "explanation", "profile"],
        "hidden_gems":    ["gem", "scores", "behavioral"],
        "recruitability": ["recruitability", "profile"],
        "behavioral":     ["behavioral", "explanation"],
        "general":        ["profile", "scores", "explanation", "recruitability"],
    }

    def __init__(self, vector_store: VectorStore, groq_api_key: str | None = None):
        self.store = vector_store
        self.groq_api_key = groq_api_key or os.environ.get("GROQ_API_KEY")
        self.groq_client: Groq | None = None
        self.history: list[dict] = []

    def _classify_intent(self, query: str) -> str:
        q = query.lower()
        if any(w in q for w in ["why", "explain", "reason", "because", "signal"]):
            return "explanation"
        if any(w in q for w in ["rank", "ranked", "top", "best", "highest"]):
            return "ranking"
        if any(w in q for w in ["compare", "versus", "vs", "difference", "between", "better"]):
            return "comparison"
        if any(w in q for w in ["gem", "hidden", "non-traditional", "overlooked", "underrated"]):
            return "hidden_gems"
        if any(w in q for w in ["recruitable", "open to work", "available", "contact", "reach"]):
            return "recruitability"
        if any(w in q for w in ["collaboration", "behavior", "problem solving", "ownership", "velocity"]):
            return "behavioral"
        return "general"

    def _build_context(self, chunks: list[RetrievedChunk]) -> str:
        lines = ["=== RETRIEVED CANDIDATE KNOWLEDGE ===\n"]
        for i, chunk in enumerate(chunks, 1):
            lines.append(
                f"[Source {i} | type={chunk.document.chunk_type} | "
                f"candidate={chunk.document.candidate_id} | "
                f"relevance={chunk.score:.2f}]\n"
                f"{chunk.document.content}\n"
            )
        return "\n".join(lines)

    def _expand_query(self, user_message: str) -> tuple[str, list[str]]:
        if not self.groq_api_key:
            return user_message, []
        try:
            if self.groq_client is None:
                self.groq_client = Groq(api_key=self.groq_api_key)
            resp = self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "Extract companies, skills and roles from the query. "
                     "Return ONLY a comma-separated list. If none found, return empty string."},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.0,
                max_tokens=128,
            )
            raw = resp.choices[0].message.content.strip()
            terms = [t.strip() for t in raw.split(",") if t.strip()] if raw else []
            expanded = f"{user_message} {raw}" if terms else user_message
            return expanded, terms
        except Exception:
            pass
        return user_message, []

    def _llm_answer(self, user_message: str, context: str, intent: str) -> str | None:
        if not self.groq_api_key:
            return None
        try:
            if self.groq_client is None:
                self.groq_client = Groq(api_key=self.groq_api_key)
            messages = [
                {"role": "system", "content": self.SYSTEM_PROMPT},
                *self.history[-6:],
                {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {user_message}"},
            ]
            resp = self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                temperature=0.3,
                max_tokens=1024,
            )
            return resp.choices[0].message.content
        except Exception:
            return None

    def query(self, user_message: str, top_k: int = 8) -> dict:
        t0 = time.time()
        intent = self._classify_intent(user_message)
        chunk_types = self.INTENT_ROUTING.get(intent, self.INTENT_ROUTING["general"])
        expanded, keywords = self._expand_query(user_message)
        chunks = self.store.retrieve(expanded, top_k=top_k, chunk_types=chunk_types, keywords=keywords)
        if len(chunks) < 3:
            chunks = self.store.retrieve(expanded, top_k=top_k, keywords=keywords)
        context = self._build_context(chunks)
        self.history.append({"role": "user", "content": user_message})
        sources = list({chunk.document.candidate_id for chunk in chunks})

        answer = self._llm_answer(user_message, context, intent) or self._generate_fallback_answer(user_message, chunks, intent)

        self.history.append({"role": "assistant", "content": answer})
        return {
            "answer": answer,
            "intent": intent,
            "sources": sources,
            "chunks_used": len(chunks),
            "latency_s": round(time.time() - t0, 3),
        }

    @staticmethod
    def _deduplicate(chunks: list[RetrievedChunk]) -> list[RetrievedChunk]:
        seen: dict[str, RetrievedChunk] = {}
        for c in chunks:
            cid = c.document.candidate_id
            if cid not in seen or (c.document.chunk_type == "profile" and seen[cid].document.chunk_type != "profile"):
                seen[cid] = c
        return sorted(seen.values(), key=lambda x: x.score, reverse=True)

    def _generate_fallback_answer(self, query: str, chunks: list[RetrievedChunk], intent: str) -> str:
        if not chunks:
            return "I don't have enough information in the knowledge base to answer that question. Please try a different query."
        top_chunks = self._deduplicate(chunks)[:5]
        lines = []
        if intent == "ranking":
            lines.append("Here are the top candidates from the knowledge base, ranked by relevance to your query:\n")
            for i, c in enumerate(top_chunks, 1):
                meta = c.document.metadata
                lines.append(f"{i}. **{meta.get('name', c.document.candidate_id)}** ({c.document.candidate_id}) — "
                             f"{meta.get('role', 'N/A')} @ {meta.get('company', 'N/A')} "
                             f"({meta.get('yoe', 'N/A')} yrs exp) — relevance: {c.score:.0%}")
        elif intent == "explanation":
            c = top_chunks[0]
            name = c.document.metadata.get('name', c.document.candidate_id)
            lines.append(f"Here's the breakdown for **{name}** ({c.document.candidate_id}):\n")
            for chunk in top_chunks[:3]:
                lines.append(f"• {chunk.document.content}")
        elif intent == "comparison":
            if len(top_chunks) >= 2:
                a, b = top_chunks[0], top_chunks[1]
                a_name = a.document.metadata.get('name', a.document.candidate_id)
                b_name = b.document.metadata.get('name', b.document.candidate_id)
                lines.append(f"Comparison: **{a_name}** vs **{b_name}**\n")
                lines.append(f"--- {a_name} ---")
                for chunk in top_chunks:
                    if chunk.document.candidate_id == a.document.candidate_id:
                        lines.append(f"• {chunk.document.content}")
                lines.append(f"\n--- {b_name} ---")
                for chunk in top_chunks:
                    if chunk.document.candidate_id == b.document.candidate_id:
                        lines.append(f"• {chunk.document.content}")
            else:
                lines.append("Not enough candidates to compare. Here are the matching candidates:\n")
                for c in top_chunks:
                    meta = c.document.metadata
                    lines.append(f"- **{meta.get('name', c.document.candidate_id)}**: {c.document.content}")
        elif intent == "hidden_gems":
            gem_chunks = [c for c in top_chunks if c.document.chunk_type == "gem"]
            if gem_chunks:
                lines.append("I found the following hidden gems in the candidate pool — candidates with high potential that may be overlooked:\n")
                for c in gem_chunks:
                    lines.append(f"• {c.document.content}")
            else:
                lines.append("No specific hidden gems identified in the current top results. Try a broader query.")
        elif intent == "recruitability":
            lines.append("Candidates sorted by recruitability — those most likely to be open and responsive:\n")
            for i, c in enumerate(top_chunks, 1):
                meta = c.document.metadata
                rec = meta.get("recruitability", c.document.content.split("recruitability=")[-1].split(".")[0] if "recruitability=" in c.document.content else "N/A")
                lines.append(f"{i}. **{meta.get('name', c.document.candidate_id)}** ({c.document.candidate_id}) — "
                             f"recruitability: {rec}")
        else:
            lines.append("Here's what I found based on the candidate knowledge base:\n")
            seen = set()
            for c in top_chunks:
                cid = c.document.candidate_id
                if cid not in seen:
                    seen.add(cid)
                    meta = c.document.metadata
                    lines.append(f"• **{meta.get('name', cid)}** ({cid}): {c.document.content[:300]}")
        return "\n".join(lines)

    def reset_history(self):
        self.history = []

    def suggested_questions(self) -> list[str]:
        names = []
        seen = set()
        for doc in self.store.documents:
            if doc.chunk_type == "profile":
                n = doc.metadata.get("name", "")
                if n and n not in seen:
                    seen.add(n)
                    names.append(n)
        name_a = names[0] if len(names) > 0 else "CAND-0000"
        name_b = names[1] if len(names) > 1 else "CAND-0001"
        name_c = names[2] if len(names) > 2 else "CAND-0002"
        return [
            "Who are the top 5 candidates for a Senior ML Engineer role?",
            f"Why is {name_a} ranked above {name_b}?",
            "Show me all hidden gems in the current pool",
            "Which candidates are most recruitable right now?",
            f"Compare {name_a} and {name_c} — who should I contact first?",
            "Which candidates have high successScore but low skillMatch?",
            f"What makes {name_a} stand out in the talent pool?",
            "Give me a briefing on the top 3 candidates I should call today",
        ]