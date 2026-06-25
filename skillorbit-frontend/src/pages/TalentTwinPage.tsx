import { useState, useEffect } from "react";
import AppLayout from "../components/layout/AppLayout";
import {
  compareCandidates, classifyCandidate, findTalentTwins,
} from "../api";

const aaravFeatures = {
  skills_overlap: 0.95, years_experience: 7.0, company_prestige: 4,
  job_hop_freq: 2.5, github_activity: 0.90, open_source_contribs: 45,
  leetcode_score: 0.82, education_tier: 3, certifications_count: 3,
  project_complexity: 0.85, tech_stack_diversity: 0.75,
  endorsements_count: 110, career_growth_rate: 1.1, response_time_score: 0.95,
};

const priyaFeatures = {
  skills_overlap: 0.70, years_experience: 9.0, company_prestige: 5,
  job_hop_freq: 3.5, github_activity: 0.40, open_source_contribs: 5,
  leetcode_score: 0.60, education_tier: 4, certifications_count: 6,
  project_complexity: 0.65, tech_stack_diversity: 0.50,
  endorsements_count: 180, career_growth_rate: 0.5, response_time_score: 0.70,
};

export default function TalentTwinPage() {
  const [comparison, setComparison] = useState<Awaited<ReturnType<typeof compareCandidates>> | null>(null);
  const [compareLoading, setCompareLoading] = useState(true);
  const [archetype, setArchetype] = useState<Awaited<ReturnType<typeof classifyCandidate>> | null>(null);
  const [twins, setTwins] = useState<Awaited<ReturnType<typeof findTalentTwins>> | null>(null);

  useEffect(() => {
    compareCandidates(aaravFeatures, priyaFeatures, "Aarav Mehta", "Priya Sharma")
      .then(setComparison)
      .catch(() => setComparison(null))
      .finally(() => setCompareLoading(false));

    classifyCandidate(aaravFeatures)
      .then(setArchetype)
      .catch(() => setArchetype(null));

    findTalentTwins(aaravFeatures, 5)
      .then(setTwins)
      .catch(() => setTwins(null));
  }, []);

  return (
    <AppLayout
      title="Talent Twin Comparison"
      searchPlaceholder="Search candidates, twins, or insights..."
    >
      <div className="min-h-screen bg-[#f8fafc] p-lg">
        <div className="mx-auto max-w-[1400px] space-y-lg">
          {/* Page Header */}
          <div className="flex items-end justify-between">
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

          {/* Top Bento Grid */}
          <div className="grid grid-cols-12 gap-lg">
            {/* Ideal Twin */}
            <div className="col-span-12 overflow-hidden rounded-xl border border-outline-variant bg-white shadow-sm lg:col-span-5">
              <div className="flex items-center justify-between border-b border-outline-variant bg-secondary-container/10 p-md">
                <div className="flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-secondary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    psychology
                  </span>
                  <h2 className="font-headline-md text-headline-md text-on-surface">
                    The Ideal Twin
                  </h2>
                </div>

                <span className="rounded-full bg-secondary/10 px-2 py-1 text-xs font-bold uppercase text-secondary">
                  {archetype ? archetype.primary_archetype : "Target Persona"}
                </span>
              </div>

              <div className="space-y-md p-lg">
                <div className="ai-glow rounded-lg border border-primary/20 bg-surface-container p-4">
                  <h3 className="mb-2 font-label-md text-on-surface">
                    Archetype: {archetype?.primary_archetype ?? "Senior AI Engineer"}
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {archetype?.archetype_traits ?? "Extracted from Job Description #882-X. Optimized for Series B rapid growth."}
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
                            <div
                              className="h-full rounded-full bg-secondary"
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <span className="w-10 text-right font-bold text-on-surface-variant">{score.toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-outline-variant pt-4">
                  <p className="mb-2 font-label-md text-on-surface-variant">
                    Key Benchmark Companies
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {["OpenAI", "Anthropic", "Stripe", "Databricks"].map(
                      (company) => (
                        <span
                          key={company}
                          className="rounded bg-surface-container-high px-3 py-1 text-xs font-bold"
                        >
                          {company}
                        </span>
                      ),
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
                  <span className="text-xs font-medium text-on-surface-variant">
                    Sorted by Match Score
                  </span>
                  <span className="material-symbols-outlined text-sm text-on-surface-variant">
                    expand_more
                  </span>
                </div>
              </div>

              <div className="custom-scrollbar max-h-[460px] space-y-4 overflow-y-auto p-lg">
                {twins === null ? (
                  <p className="text-center text-body-sm text-on-surface-variant">Loading twins...</p>
                ) : twins.twins.length === 0 ? (
                  <p className="text-center text-body-sm text-on-surface-variant">No twins found.</p>
                ) : (
                  twins.twins.map((twin, idx) => (
                    <MatchCard
                      key={twin.id}
                      name={twin.name}
                      role={`${twin.archetype}`}
                      score={`${twin.twin_similarity.toFixed(0)}%`}
                      image=""
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
                  <polygon
                    points="50,8 88,36 74,84 26,84 12,36"
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="1"
                  />
                  <polygon
                    points="50,22 75,42 66,70 34,70 25,42"
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="1"
                  />
                  <polygon
                    points="50,36 62,48 58,60 42,60 38,48"
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="1"
                  />

                  <polygon
                    points="50,13 84,39 72,80 28,80 16,39"
                    fill="rgba(73, 75, 214, 0.1)"
                    stroke="#494bd6"
                    strokeWidth="2"
                  />

                  <polygon
                    points="50,18 80,38 68,82 32,76 20,37"
                    fill="rgba(0, 101, 119, 0.15)"
                    stroke="#006577"
                    strokeWidth="2"
                    strokeDasharray="4"
                  />
                </svg>

                <div className="absolute left-1/2 top-1 -translate-x-1/2 text-[9px] font-bold text-on-surface-variant">
                  SKILLS
                </div>

                <div className="absolute right-0 top-[34%] text-[9px] font-bold text-on-surface-variant">
                  EXPERIENCE
                </div>

                <div className="absolute bottom-4 right-[12%] text-[9px] font-bold text-on-surface-variant">
                  GROWTH
                </div>

                <div className="absolute bottom-4 left-[8%] text-[9px] font-bold text-on-surface-variant">
                  RECRUITABILITY
                </div>

                <div className="absolute left-0 top-[34%] max-w-[72px] text-[9px] font-bold leading-tight text-on-surface-variant">
                  PRODUCTION READINESS
                </div>
              </div>

              <div className="mt-5 flex gap-6">
                <Legend
                  colorClass="bg-primary/20 border-primary"
                  label="Ideal Twin"
                />
                <Legend
                  colorClass="bg-tertiary/20 border-tertiary border-dashed"
                  label="Aarav Mehta"
                />
              </div>
            </div>

            {/* Recommendation + Table (Feature 5 - SHAP Comparison) */}
            <div className="col-span-12 flex flex-col gap-lg lg:col-span-8">
              <div className="relative overflow-hidden rounded-xl border border-white/20 bg-gradient-to-br from-tertiary-container to-tertiary p-lg text-on-tertiary shadow-lg shadow-tertiary/20">
                <div className="relative z-10 flex flex-col items-start gap-lg md:flex-row md:items-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
                    <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>recommend</span>
                  </div>

                  <div className="flex-1 space-y-2">
                    {compareLoading ? (
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
                          <td className="p-4 font-medium">{diff.feature}</td>
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
            <DetailCard
              icon="psychology_alt"
              iconClass="text-primary"
              title="Cognitive Similarity"
              text="Candidates show 85% overlap in problem-solving styles related to technical debt management and system scaling."
            />

            <DetailCard
              icon="group_add"
              iconClass="text-tertiary"
              title="Team Synergies"
              text="Aarav previously worked with 2 current engineers at your firm, reducing cultural onboarding risk significantly."
            />

            <DetailCard
              icon="warning"
              iconClass="text-amber-500"
              title="Potential Gaps"
              text="Limited experience in direct client-facing roles. May require shadowing for the first 3 months of implementation."
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function MatchCard({
  name,
  role,
  score,
  image,
  active,
  badge,
}: {
  name: string;
  role: string;
  score: string;
  image?: string;
  active: boolean;
  badge?: string;
}) {
  const initials = name.split(" ").map(s => s[0]).join("").slice(0, 2);
  return (
    <div
      className={[
        "flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all",
        active
          ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
          : "border-outline-variant bg-white hover:border-primary/50 hover:bg-surface-container-low",
      ].join(" ")}
    >
      <div className="relative">
        <div
          className={[
            "flex h-14 w-14 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white",
            active ? "border-2 border-primary" : "border border-outline",
          ].join(" ")}
        >
          {image ? (
            <img className="h-full w-full object-cover" alt={name} src={image} />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-secondary/70">
              {initials}
            </div>
          )}
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
        <div
          className={
            active
              ? "text-2xl font-bold text-primary"
              : "text-2xl font-bold text-on-surface"
          }
        >
          {score}
        </div>
        <div className="text-[10px] font-bold tracking-tighter text-on-surface-variant">
          OVERALL MATCH
        </div>
      </div>

      <span
        className={[
          "material-symbols-outlined",
          active ? "text-primary" : "text-on-surface-variant",
        ].join(" ")}
      >
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
  icon,
  iconClass,
  title,
  text,
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
