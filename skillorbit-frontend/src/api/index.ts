import { api } from "./client";
import type { Candidate, DashboardStats, Job, ShortlistItem } from "../types";

export function fetchJobs() {
  return api.get<Job[]>("/jobs");
}

export function fetchJob(id: string) {
  return api.get<Job>(`/jobs/${id}`);
}

export function createJob(job: Partial<Job>) {
  return api.post<Job>("/jobs", job);
}

export function fetchCandidates() {
  return api.get<Candidate[]>("/candidates");
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
  return api.get<DashboardStats>("/dashboard/stats");
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
