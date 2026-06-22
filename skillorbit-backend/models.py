from pydantic import BaseModel
from typing import Optional


class Candidate(BaseModel):
    id: str
    name: str
    role: str
    company: str
    location: str
    experience: str
    technicalFit: int
    skillMatch: int
    experienceMatch: int
    recruitability: int
    careerGrowth: int
    learningVelocity: int
    successScore: int
    hiddenGem: Optional[bool] = None
    skills: list[str]
    reason: str


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
    successScore: int
    technicalFit: int
    recruitability: int
    reason: str


class DashboardStats(BaseModel):
    totalCandidatesIndexed: int
    activeJobs: int
    rankedShortlists: int
    avgSuccessScore: int
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
