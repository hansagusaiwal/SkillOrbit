import { api } from "./client";
import type { Candidate, Job, ShortlistItem } from "../types";

export function fetchJobs() {
  return api.get<Job[]>("/jobs");
}

export function fetchJob(id: string) {
  return api.get<Job>(`/jobs/${id}`);
}

export type JobCreatePayload = {
  title: string;
  roleCategory: string;
  location: string;
  experienceRange: string;
  description: string;
  status: "Active" | "Draft";
};

export function createJob(job: JobCreatePayload) {
  return api.post<Job>("/jobs", job);
}

export function activateJob(jobId: string) {
  return api.patch<Job>(`/jobs/${jobId}`, { status: "Active" });
}

export function fetchCandidates() {
  return api.get<Candidate[]>("/candidates");
}

export type RankedCandidate = {
  rank: number;
  id: string;
  name: string;
  role: string;
  company: string;
  yoe: number;
  skills: string;
  location: string;
  semantic_sim: number;
  technicalFit: number;
  skillMatch: number;
  experienceLevel: number;
  careerGrowth: number;
  cultureSignal: number;
  successScore: number;
};

export function rankCandidates(jdText: string, topK: number = 50) {
  return api.post<RankedCandidate[]>("/candidates/rank", {
    job_description: jdText,
    top_k: topK,
  });
}

export function fetchCandidate(id: string) {
  return api.get<Candidate>(`/candidates/${id}`);
}

export function fetchHiddenGems() {
  return api.get<Candidate[]>("/candidates/hidden-gems");
}

export function fetchShortlist() {
  return api.get<ShortlistItem[]>("/shortlist");
}

export function fetchShortlistStats() {
  return api.get<{
    topCandidates: number;
    avgSuccessScore: number;
    hiddenGems: number;
  }>("/shortlist/stats");
}

export function fetchDashboardStats() {
  return api.get<{
    totalCandidatesIndexed: number;
    activeJobs: number;
    rankedShortlists: number;
    avgSuccessScore: number;
    hiddenGemsFound: number;
    candidateQualityDistribution: { label: string; indexed: number; benchmarked: number }[];
    talentPoolByRole: { label: string; value: number; color: string }[];
    insight: string;
  }>("/dashboard/stats");
}

export function fetchRecentJobs() {
  return api.get<
    {
      id: string;
      title: string;
      subtitle: string;
      scanned: string;
      score: string;
      status: string;
      scoreTone: "emerald" | "amber";
      statusTone: "emerald" | "amber" | "slate";
    }[]
  >("/dashboard/recent-jobs");
}

export function login(email: string, password: string) {
  return api.post<{ token: string; user: { email: string; name: string } }>(
    "/auth/login",
    { email, password }
  );
}

export function healthCheck() {
  return api.get<{ status: string; timestamp: string }>("/health");
}

// ── Feature 3: JD Skill Extraction ──────────────────────────────────

export function extractJDSkills(jdText: string) {
  return api.post<{
    role_title: string;
    role_category: string;
    experience_level: string;
    min_years: number | null;
    max_years: number | null;
    must_have_skills: {
      name: string;
      category: string;
      is_must_have: boolean;
      is_nice_to_have: boolean;
      context: string;
      confidence: number;
    }[];
    nice_to_have_skills: {
      name: string;
      category: string;
      is_must_have: boolean;
      is_nice_to_have: boolean;
      context: string;
      confidence: number;
    }[];
    negative_signals: string[];
    all_skills: string[];
    summary: {
      total_skills_found: number;
      must_have_count: number;
      nice_to_have_count: number;
      categories_covered: string[];
    };
  }>("/jd-skills/extract", { jd_text: jdText });
}

// ── Feature 4: Hidden Gem Detection ─────────────────────────────────

export function detectHiddenGems(topK: number = 20) {
  return api.post<{
    gems: {
      gem_rank: number;
      id: string;
      name: string;
      role: string;
      company: string;
      successScore: number;
      skillMatch: number;
      learningVelocity: number;
      gem_score: number;
      gem_reason: string;
    }[];
  }>("/hidden-gems/detect", { top_k: topK });
}

// ── Feature 5: Explainability ───────────────────────────────────────

export function explainCandidate(candidate: Record<string, number>, topN: number = 5) {
  return api.post<{
    score: number;
    base_value: number;
    top_drivers: {
      feature: string;
      raw_key: string;
      shap_value: number;
      candidate_value: number;
      impact: string;
    }[];
    top_detractors: {
      feature: string;
      raw_key: string;
      shap_value: number;
      candidate_value: number;
      impact: string;
    }[];
    all_shap: Record<string, number>;
  }>("/explain/candidate", { candidate, top_n: topN });
}

export function compareCandidates(
  candidateA: Record<string, number>,
  candidateB: Record<string, number>,
  nameA: string = "Candidate A",
  nameB: string = "Candidate B"
) {
  return api.post<{
    winner: string;
    score_a: number;
    score_b: number;
    score_delta: number;
    key_differences: { feature: string; delta: number; favors: string }[];
  }>("/explain/compare", {
    candidate_a: candidateA,
    candidate_b: candidateB,
    name_a: nameA,
    name_b: nameB,
  });
}

export function getGlobalImportance() {
  return api.post<{
    importance: { feature: string; mean_abs_shap: number }[];
  }>("/explain/global-importance", {});
}

export function getCopilotExplanation(candidate: Record<string, number>, name: string = "This candidate") {
  return api.post<{ explanation: string }>("/explain/copilot-text", {
    candidate,
    name,
  });
}

// ── Feature 6: Talent Twin / Benchmarking ───────────────────────────

export function classifyCandidate(candidate: Record<string, number>) {
  return api.post<{
    primary_archetype: string;
    archetype_traits: string;
    affinity_scores: Record<string, number>;
  }>("/talent-twin/classify", { candidate });
}

export function findTalentTwins(candidate: Record<string, number>, topK: number = 5) {
  return api.post<{
    twins: {
      id: string;
      name: string;
      twin_similarity: number;
      archetype: string;
    }[];
  }>("/talent-twin/find-twins", { candidate, top_k: topK });
}

export function benchmarkCandidate(candidate: Record<string, number>) {
  return api.post<{
    archetype: string;
    benchmark_score: number;
    summary: string;
    feature_deltas: Record<string, { vs_archetype: number; direction: string }>;
  }>("/talent-twin/benchmark", { candidate });
}

export function bestArchetypeForRole(roleSignals: Record<string, number>, topN: number = 3) {
  return api.post<{
    results: { archetype: string; fit_score: number; traits: string }[];
  }>("/talent-twin/best-archetype", { role_signals: roleSignals, top_n: topN });
}

export function getPoolComposition() {
  return api.get<{
    composition: { archetype: string; count: number; pct: number; traits: string }[];
  }>("/talent-twin/pool-composition");
}

// ── Feature 7: Behavioral Signals Analysis ─────────────────────────

export function analyzeBehavioralSignals(candidateId: string = "CAND-0000") {
  return api.post<{
    candidate_id: string;
    scores: {
      collaboration: number;
      problem_solving: number;
      learning_velocity: number;
      ownership: number;
      communication: number;
      initiative: number;
      overall: number;
    };
    confidence: number;
    top_evidence: Record<string, string[]>;
  }>("/behavioral-signals/analyze", { candidate_id: candidateId });
}

// ── Feature 8: AI Market Insight ───────────────────────────────────

export function getMarketOptions() {
  return api.get<{
    clusters: string[];
    locations: string[];
  }>("/market-insight/options");
}

export function getMarketInsight(skillCluster: string = "ML / AI Engineering", location: string = "San Francisco") {
  return api.post<{
    skill_cluster: string;
    location: string;
    supply_count: number;
    demand_count: number;
    supply_demand_ratio: number;
    density_label: string;
    density_score: number;
    avg_experience_yrs: number;
    avg_salary_estimate: number;
    competition_index: number;
    trend_direction: string;
    trend_pct_6mo: number;
    forecast_3mo: number;
    top_companies_hiring: string[];
    insight_text: string;
  }>("/market-insight/insight", { skill_cluster: skillCluster, location });
}

export function getMarketOpportunities() {
  return api.get<{
    results: {
      skill_cluster: string;
      location: string;
      opportunity_score: number;
      tier: string;
      density: string;
      trend: string;
      competition: number;
    }[];
  }>("/market-insight/opportunities");
}

export function getMarketReport() {
  return api.get<{
    rows: {
      skill_cluster: string;
      location: string;
      supply: number;
      demand: number;
      ratio: number;
      density: string;
      competition_index: number;
      trend: string;
      trend_pct_6mo: number;
      forecast_3mo: number;
      avg_salary: number;
      avg_exp_yrs: number;
    }[];
  }>("/market-insight/report");
}

// ── Feature 9: Recruitability Prediction ────────────────────────────

export function predictRecruitability(candidate: Record<string, number>) {
  return api.post<{
    recruitable_prob: number;
    recruitable_label: string;
    top_signals: { feature: string; value: number; direction: string; importance: number }[];
    urgency_flag: boolean;
    recommended_action: string;
  }>("/recruitability/predict", { candidate });
}

export function batchPredictRecruitability(candidates: { candidate_id: string; name: string; features: Record<string, number> }[]) {
  return api.post<{
    results: { candidate_id: string; name: string; recruitable_prob: number; recruitable_label: string; urgency_flag: boolean }[];
  }>("/recruitability/batch-predict", { candidates });
}

// ── Feature 10: Copilot / RAG Chatbot ───────────────────────────────

export function copilotQuery(query: string, topK: number = 8) {
  return api.post<{
    answer: string;
    intent: string;
    sources: string[];
    chunks_used: number;
    latency_s: number;
  }>("/copilot/query", { query, top_k: topK });
}

export function copilotReset() {
  return api.post<{ status: string }>("/copilot/reset", {});
}

export function copilotSuggestions() {
  return api.get<{ questions: string[] }>("/copilot/suggestions");
}
