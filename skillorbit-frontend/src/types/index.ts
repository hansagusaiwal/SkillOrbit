export type Candidate = {
  id: string;
  name: string;
  role: string;
  company: string;
  location: string;
  experience: string;
  technicalFit: number;
  skillMatch: number;
  experienceMatch: number;
  recruitability: number;
  careerGrowth: number;
  learningVelocity: number;
  successScore: number;
  hiddenGem?: boolean;
  skills: string[];
  reason: string;
  skills_overlap: number;
  years_experience: number;
  company_prestige: number;
  job_hop_freq: number;
  github_activity: number;
  open_source_contribs: number;
  leetcode_score: number;
  education_tier: number;
  certifications_count: number;
  project_complexity: number;
  tech_stack_diversity: number;
  endorsements_count: number;
  career_growth_rate: number;
  response_time_score: number;
};

export type Job = {
  id: string;
  title: string;
  roleCategory: string;
  location: string;
  experienceRange: string;
  description: string;
  status: "Active" | "Draft" | "Completed";
  candidatesScanned: number;
  topScore: number;
};

export type ShortlistItem = {
  rank: number;
  candidateId: string;
  candidateName: string;
  successScore: number;
  technicalFit: number;
  recruitability: number;
  reason: string;
};