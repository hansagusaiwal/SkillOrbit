from pydantic import BaseModel
from typing import Optional


class Candidate(BaseModel):
    id: str
    name: str
    role: str
    company: str
    location: str
    experience: str
    technicalFit: float = 0
    skillMatch: float = 0
    experienceMatch: float = 0
    recruitability: float = 0
    careerGrowth: float = 0
    learningVelocity: float = 0
    successScore: float = 0
    hiddenGem: Optional[bool] = None
    skills: list[str] = []
    reason: str = ""


class Job(BaseModel):
    id: str
    title: str
    roleCategory: str
    location: str
    experienceRange: str
    status: str
    candidatesScanned: int
    topScore: int


class ShortlistItem(BaseModel):
    rank: int
    candidateId: str
    candidateName: str
    successScore: float
    technicalFit: float
    recruitability: float
    reason: str


class DashboardStats(BaseModel):
    totalCandidatesIndexed: int
    activeJobs: int
    rankedShortlists: int
    avgSuccessScore: float
    hiddenGemsFound: int


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    token: str
    user: dict


class JobCreate(BaseModel):
    title: str = "Untitled Role"
    roleCategory: str = "Engineering"
    location: str = "Remote"
    experienceRange: str = "3-5 years"


class RankRequest(BaseModel):
    job_description: str
    top_k: int = 20
    min_score: float = 0.0


class RankResult(BaseModel):
    rank: int
    id: str
    name: str
    role: str
    company: str
    yoe: float
    skills: str
    location: str
    semantic_sim: float
    technicalFit: float
    skillMatch: float
    experienceLevel: float
    careerGrowth: float
    cultureSignal: float
    successScore: float
    final_score: float


class SimilarCandidate(BaseModel):
    id: str
    name: str
    role: str
    company: str
    skills: str
    similarity: float
