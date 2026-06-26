import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import {
  fetchCandidates, fetchCandidate,
  compareCandidates, classifyCandidate, findTalentTwins,
} from "../api";
import type { Candidate } from "../types";

const FEATURE_KEYS: (keyof Candidate)[] = [
  "skills_overlap", "years_experience", "company_prestige",
  "job_hop_freq", "github_activity", "open_source_contribs",
  "leetcode_score", "education_tier", "certifications_count",
  "project_complexity", "tech_stack_diversity", "endorsements_count",
  "career_growth_rate", "response_time_score",
];

function buildFeatures(candidate: Candidate): Record<string, number> {
  const features: Record<string, number> = {};
  for (const key of FEATURE_KEYS) {
    features[key] = candidate[key] as number;
  }
  return features;
}

export default function TalentTwinPage() {
  const [searchParams] = useSearchParams();
  const candidateParam = searchParams.get("candidate");

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(true);

  const [candidateA, setCandidateA] = useState<Candidate | null>(null);
  const [candidateB, setCandidateB] = useState<Candidate | null>(null);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);

  const [comparison, setComparison] = useState<Awaited<ReturnType<typeof compareCandidates>> | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [archetype, setArchetype] = useState<Awaited<ReturnType<typeof classifyCandidate>> | null>(null);
  const [archetypeLoading, setArchetypeLoading] = useState(false);
  const [twins, setTwins] = useState<Awaited<ReturnType<typeof findTalentTwins>> | null>(null);
  const [twinsLoading, setTwinsLoading] = useState(false);

  useEffect(() => {
    setCandidatesLoading(true);
    fetchCandidates()
      .then((data) => {
        setCandidates(data);
        if (candidateParam) {
          const match = data.find((c) => c.id === candidateParam);
          if (match) {
            setCandidateA(match);
            setCandidateB(data.length > 1 && data[0].id !== match.id ? data[0] : data.length > 1 ? data[1] : null);
          }
        } else if (data.length >= 2) {
          setCandidateA(data[0]);
          setCandidateB(data[1]);
        }
      })
      .catch(() => setCandidates([]))
      .finally(() => setCandidatesLoading(false));
  }, []);

  useEffect(() => {
    if (!candidateA) return;
    setArchetypeLoading(true);
    classifyCandidate(buildFeatures(candidateA))
      .then(setArchetype)
      .catch(() => setArchetype(null))
      .finally(() => setArchetypeLoading(false));

    setTwinsLoading(true);
    findTalentTwins(buildFeatures(candidateA), 5)
      .then(setTwins)
      .catch(() => setTwins(null))
      .finally(() => setTwinsLoading(false));
  }, [candidateA]);

  useEffect(() => {
    if (!candidateA || !candidateB) return;
    setCompareLoading(true);
    compareCandidates(buildFeatures(candidateA), buildFeatures(candidateB), candidateA.name, candidateB.name)
      .then(setComparison)
      .catch(() => setComparison(null))
      .finally(() => setCompareLoading(false));
  }, [candidateA, candidateB]);

  const featureLabels: Record<string, string> = useMemo(() => ({
    skills_overlap: "Skills Overlap",
    years_experience: "Experience",
    company_prestige: "Company Prestige",
    job_hop_freq: "Job Stability",
    github_activity: "Open Source",
    open_source_contribs: "PR Contributions",
    leetcode_score: "Problem Solving",
    education_tier: "Education Tier",
    certifications_count: "Certifications",
    project_complexity: "Project Complexity",
    tech_stack_diversity: "Tech Diversity",
    endorsements_count: "Endorsements",
    career_growth_rate: "Career Growth",
    response_time_score: "Responsiveness",
  }), []);

  return (
    <AppLayout title="Talent Twin Comparison" searchPlaceholder="Search candidates, twins, or insights...">
      <div className="min-h-screen bg-[#f8fafc] p-lg">
        <div className="mx-auto max-w-[1400px] space-y-lg">
          {/* Page Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface">
                Talent Twin Comparison
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Modeling candidate archetypes against live talent pools.
              </p>
            </div>

            <div className="flex gap-3">
              <button className="rounded-lg border border-primary px-6 py-2 font-label-md text-primary transition-colors hover:bg-primary/5">
                Edit Job DNA
              </button>
              <button className="rounded-lg bg-primary px-6 py-2 font-label-md text-on-primary shadow-sm transition-opacity hover:opacity-90">
                Export Analysis
              </button>
            </div>
          </div>

          {/* Candidate Selectors */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <CandidateSelector
              label="Candidate A"
              candidates={candidates}
              selectedId={candidateA?.id ?? ""}
              onChange={(id) => {
                const c = candidates.find((x) => x.id === id) ?? null;
                setCandidateA(c);
              }}
              loading={candidatesLoading}
            />
            <CandidateSelector
              label="Candidate B"
              candidates={candidates}
              selectedId={candidateB?.id ?? ""}
              onChange={(id) => {
                const c = candidates.find((x) => x.id === id) ?? null;
                setCandidateB(c);
              }}
              loading={candidatesLoading}
            />
          </div>

          {/* Top Bento Grid */}
          <div className="grid grid-cols-12 gap-lg">
            {/* Ideal Twin */}
            <div className="col-span-12 overflow-hidden rounded-xl border border-outline-variant bg-white shadow-sm lg:col-span-5">
              <div className="flex items-center justify-between border-b border-outline-variant bg-secondary-container/10 p-md">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                    psychology
                  </span>
                  <h2 className="font-headline-md text-headline-md text-on-surface">
                    The Ideal Twin
                  </h2>
                </div>

                <span className="rounded-full bg-secondary/10 px-2 py-1 text-xs font-bold uppercase text-secondary">
                  {archetypeLoading ? "..." : archetype ? archetype.primary_archetype : "N/A"}
                </span>
              </div>

              <div className="space-y-md p-lg">
                <div className="ai-glow rounded-lg border border-primary/20 bg-surface-container p-4">
                  <h3 className="mb-2 font-label-md text-on-surface">
                    {candidateA ? `Archetype: ${archetype?.primary_archetype ?? "Analyzing..."}` : "Select a candidate"}
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {archetypeLoading
                      ? "Classifying candidate archetype..."
                      : archetype?.archetype_traits ?? "No archetype data available."}
                  </p>
                </div>

                {archetype && (
                  <div className="space-y-2">
                    <p className="font-label-md text-on-surface-variant">Affinity Scores</p>
                    <div className="space-y-1">
                      {Object.entries(archetype.affinity_scores).slice(0, 5).map(([name, score]) => (
                        <div key={name} className="flex items-center gap-2 text-body-sm">
                          <span className="flex-1 truncate">{name}</span>
                          <div className="h-2 w-32 overflow-hidden rounded-full bg-surface-container-high">
                            <div className="h-full rounded-full bg-secondary" style={{ width: `${score}%` }} />
                          </div>
                          <span className="w-10 text-right font-bold text-on-surface-variant">{score.toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-outline-variant pt-4">
                  <p className="mb-2 font-label-md text-on-surface-variant">Top Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {candidateA && candidateA.skills.length > 0 ? (
                      candidateA.skills.slice(0, 6).map((skill) => (
                        <span key={skill} className="rounded bg-surface-container-high px-3 py-1 text-xs font-bold">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-on-surface-variant">No skills data</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Top Matches */}
            <div className="col-span-12 flex flex-col rounded-xl border border-outline-variant bg-white shadow-sm lg:col-span-7">
              <div className="flex items-center justify-between border-b border-outline-variant bg-white p-md">
                <h2 className="font-headline-md text-headline-md text-on-surface">
                  Top Matches
                </h2>
                <div className="flex gap-2">
                  <span className="text-xs font-medium text-on-surface-variant">Sorted by Match Score</span>
                  <span className="material-symbols-outlined text-sm text-on-surface-variant">expand_more</span>
                </div>
              </div>

              <div className="custom-scrollbar max-h-[460px] space-y-4 overflow-y-auto p-lg">
                {twinsLoading ? (
                  <div className="flex items-center justify-center gap-2 py-8">
                    <span className="material-symbols-outlined animate-spin text-lg text-primary">progress_activity</span>
                    <p className="text-sm text-on-surface-variant">Finding twins...</p>
                  </div>
                ) : twins === null ? (
                  <p className="text-center text-body-sm text-on-surface-variant">No twin data available.</p>
                ) : twins.twins.length === 0 ? (
                  <p className="text-center text-body-sm text-on-surface-variant">No twins found.</p>
                ) : (
                  twins.twins.map((twin, idx) => (
                    <MatchCard
                      key={twin.id}
                      name={twin.name}
                      role={twin.archetype}
                      score={`${twin.twin_similarity.toFixed(0)}%`}
                      active={idx === 0}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Comparison Visualization */}
          <div className="grid grid-cols-12 gap-lg">
            {/* Radar Chart */}
            <div className="col-span-12 flex flex-col items-center rounded-xl border border-outline-variant bg-white p-lg shadow-sm lg:col-span-4">
              <h3 className="mb-4 w-full font-headline-md text-headline-md text-on-surface">
                Match Dimensions
              </h3>

              <div className="relative mx-auto h-[260px] w-[260px]">
                <svg className="h-full w-full" viewBox="0 0 100 100">
                  <polygon points="50,8 88,36 74,84 26,84 12,36" fill="none" stroke="#cbd5e1" strokeWidth="1" />
                  <polygon points="50,22 75,42 66,70 34,70 25,42" fill="none" stroke="#cbd5e1" strokeWidth="1" />
                  <polygon points="50,36 62,48 58,60 42,60 38,48" fill="none" stroke="#cbd5e1" strokeWidth="1" />

                  {comparison && (() => {
                    const diffs = comparison.key_differences;
                    const getOffset = (idx: number) => {
                      const d = diffs[idx];
                      if (!d) return 20;
                      const clamped = Math.max(-1, Math.min(1, d.delta));
                      return 20 - clamped * 12;
                    };
                    const o = [0, 1, 2, 3, 4].map(getOffset);
                    const pts = [
                      `50,${o[0] + 8}`,
                      `${88 - o[1] * 1.5},${36 + o[1] * 1.2}`,
                      `${74 - o[2] * 2},${84 - o[2] * 0.8}`,
                      `${26 + o[3] * 2},${84 - o[3] * 0.8}`,
                      `${12 + o[4] * 1.5},${36 + o[4] * 1.2}`,
                    ];
                    return (
                      <polygon points={pts.join(" ")} fill="rgba(73, 75, 214, 0.1)" stroke="#494bd6" strokeWidth="2" />
                    );
                  })()}

                  <polygon
                    points="50,18 80,38 68,82 32,76 20,37"
                    fill="rgba(0, 101, 119, 0.15)"
                    stroke="#006577"
                    strokeWidth="2"
                    strokeDasharray="4"
                  />
                </svg>

                <div className="absolute left-1/2 top-1 -translate-x-1/2 text-[9px] font-bold text-on-surface-variant">SKILLS</div>
                <div className="absolute right-0 top-[34%] text-[9px] font-bold text-on-surface-variant">EXPERIENCE</div>
                <div className="absolute bottom-4 right-[12%] text-[9px] font-bold text-on-surface-variant">GROWTH</div>
                <div className="absolute bottom-4 left-[8%] text-[9px] font-bold text-on-surface-variant">RECRUIT</div>
                <div className="absolute left-0 top-[34%] max-w-[72px] text-[9px] font-bold leading-tight text-on-surface-variant">PRODUCTION</div>
              </div>

              <div className="mt-5 flex gap-6">
                <Legend colorClass="bg-primary/20 border-primary" label={candidateA?.name ?? "Candidate A"} />
                <Legend colorClass="bg-tertiary/20 border-tertiary border-dashed" label={candidateB?.name ?? "Candidate B"} />
              </div>
            </div>

            {/* Recommendation + Table */}
            <div className="col-span-12 flex flex-col gap-lg lg:col-span-8">
              <div className="relative overflow-hidden rounded-xl border border-white/20 bg-gradient-to-br from-tertiary-container to-tertiary p-lg text-on-tertiary shadow-lg shadow-tertiary/20">
                <div className="relative z-10 flex flex-col items-start gap-lg md:flex-row md:items-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
                    <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>recommend</span>
                  </div>

                  <div className="flex-1 space-y-2">
                    {!candidateA || !candidateB ? (
                      <p className="font-body-md">Select two candidates to compare.</p>
                    ) : compareLoading ? (
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>
                        <span className="font-body-md">Running SHAP analysis...</span>
                      </div>
                    ) : comparison ? (
                      <>
                        <h3 className="font-headline-md text-headline-md">
                          Winner: {comparison.winner}
                        </h3>
                        <p className="text-body-sm leading-relaxed opacity-90">
                          {comparison.winner} scores {Math.max(comparison.score_a, comparison.score_b).toFixed(0)}/100 vs {Math.min(comparison.score_a, comparison.score_b).toFixed(0)}/100 — a delta of {Math.abs(comparison.score_delta).toFixed(1)} points.
                        </p>
                        <div className="flex gap-4 pt-2">
                          <button className="rounded-lg bg-white px-6 py-2 text-xs font-bold text-tertiary transition-opacity hover:bg-opacity-90">
                            Schedule Interview
                          </button>
                          <button className="rounded-lg border border-white/40 bg-transparent px-6 py-2 text-xs font-bold text-white transition-colors hover:bg-white/10">
                            See Detailed Reasoning
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="font-body-md">Unable to load comparison. Ensure the backend is running.</p>
                    )}
                  </div>
                </div>
                <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-300 opacity-20 blur-3xl" />
              </div>

              {comparison && (
                <div className="flex-1 overflow-hidden rounded-xl border border-outline-variant bg-white shadow-sm">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-outline-variant bg-surface-container-low">
                        <MetricHeader>Feature</MetricHeader>
                        <MetricHeader>Delta (SHAP)</MetricHeader>
                        <MetricHeader>Favors</MetricHeader>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {comparison.key_differences.map((diff) => (
                        <tr key={diff.feature} className="border-b border-outline-variant transition-colors hover:bg-surface-container-lowest">
                          <td className="p-4 font-medium">{featureLabels[diff.feature] ?? diff.feature}</td>
                          <td className="p-4">
                            <span className={diff.delta >= 0 ? "font-bold text-emerald-600" : "font-bold text-amber-600"}>
                              {diff.delta >= 0 ? "+" : ""}{diff.delta.toFixed(2)}
                            </span>
                          </td>
                          <td className="p-4 font-bold">{diff.favors}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Detail Panel */}
          <div className="grid grid-cols-1 gap-lg md:grid-cols-3">
            {candidateA && candidateB && comparison && (
              <>
                <DetailCard
                  icon="psychology_alt"
                  iconClass="text-primary"
                  title="Cognitive Similarity"
                  text={`${candidateA.name} and ${candidateB.name} show ${(100 - Math.abs(comparison.score_delta)).toFixed(0)}% alignment across analyzed dimensions. ${comparison.winner} leads primarily in ${comparison.key_differences[0]?.feature ?? "key"} areas.`}
                />
                <DetailCard
                  icon="group_add"
                  iconClass="text-tertiary"
                  title="Top Differentiator"
                  text={`The biggest gap is in "${featureLabels[comparison.key_differences[0]?.feature] ?? comparison.key_differences[0]?.feature}" with a delta of ${Math.abs(comparison.key_differences[0]?.delta ?? 0).toFixed(2)}, favoring ${comparison.key_differences[0]?.favors}.`}
                />
                <DetailCard
                  icon="warning"
                  iconClass="text-amber-500"
                  title="Potential Gaps"
                  text={`${comparison.winner === candidateA.name ? candidateB.name : candidateA.name} lags significantly in ${comparison.key_differences.slice(-1)[0]?.feature ?? "some areas"}. Consider supplementary evaluation.`}
                />
              </>
            )}
            {!comparison && !compareLoading && (
              <>
                <DetailCard icon="psychology_alt" iconClass="text-primary" title="Cognitive Similarity" text="Select two candidates above to compare their cognitive alignment and working style compatibility." />
                <DetailCard icon="group_add" iconClass="text-tertiary" title="Team Synergies" text="Analysis will show how each candidate's profile aligns with existing team dynamics." />
                <DetailCard icon="warning" iconClass="text-amber-500" title="Potential Gaps" text="Key differentiators and potential blind spots will appear once candidates are selected." />
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function CandidateSelector({
  label, candidates, selectedId, onChange, loading,
}: {
  label: string;
  candidates: Candidate[];
  selectedId: string;
  onChange: (id: string) => void;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-outline-variant bg-white p-4 shadow-sm">
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
        {label}
      </label>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
          Loading candidates...
        </div>
      ) : (
        <select
          value={selectedId}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2.5 text-sm font-medium outline-none transition-colors focus:border-primary"
        >
          <option value="" disabled>Select a candidate...</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.role} @ {c.company}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function MatchCard({
  name, role, score, active, badge,
}: {
  name: string;
  role: string;
  score: string;
  active: boolean;
  badge?: string;
}) {
  const initials = name.split(" ").map((s) => s[0]).join("").slice(0, 2);
  return (
    <div
      className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all ${
        active
          ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
          : "border-outline-variant bg-white hover:border-primary/50 hover:bg-surface-container-low"
      }`}
    >
      <div className="relative">
        <div
          className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white ${
            active ? "border-2 border-primary" : "border border-outline"
          }`}
        >
          <div className="flex h-full w-full items-center justify-center bg-secondary/70">
            {initials}
          </div>
        </div>
        {badge && (
          <div className="absolute -bottom-1 -right-1 rounded-sm bg-emerald-500 px-1 text-[10px] font-bold text-white">
            {badge}
          </div>
        )}
      </div>
      <div className="flex-1">
        <h3 className="font-label-md text-on-surface">{name}</h3>
        <p className="text-xs text-on-surface-variant">{role}</p>
      </div>
      <div className="text-right">
        <div className={`text-2xl font-bold ${active ? "text-primary" : "text-on-surface"}`}>{score}</div>
        <div className="text-[10px] font-bold tracking-tighter text-on-surface-variant">OVERALL MATCH</div>
      </div>
      <span className={`material-symbols-outlined ${active ? "text-primary" : "text-on-surface-variant"}`}>
        chevron_right
      </span>
    </div>
  );
}

function Legend({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-3 w-3 border ${colorClass}`} />
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}

function MetricHeader({ children }: { children: string }) {
  return (
    <th className="p-4 font-label-md text-xs uppercase text-on-surface-variant">
      {children}
    </th>
  );
}

function DetailCard({
  icon, iconClass, title, text,
}: {
  icon: string;
  iconClass: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-outline-variant bg-white p-lg shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <span className={`material-symbols-outlined ${iconClass}`}>{icon}</span>
        <h4 className="font-label-md text-on-surface">{title}</h4>
      </div>
      <p className="text-body-sm text-on-surface-variant">{text}</p>
    </div>
  );
}
