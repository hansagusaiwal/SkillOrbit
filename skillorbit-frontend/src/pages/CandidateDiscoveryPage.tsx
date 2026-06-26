import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { fetchCandidates, fetchHiddenGems, getMarketInsight, getMarketOptions, rankCandidates } from "../api";
import type { Candidate } from "../types";

type JDSkill = {
  name: string;
  category: string;
  context: string;
  confidence: number;
};

type JDResult = {
  role_title: string;
  role_category: string;
  experience_level: string;
  min_years: number | null;
  max_years: number | null;
  must_have_skills: JDSkill[];
  nice_to_have_skills: JDSkill[];
  negative_signals: string[];
  all_skills: string[];
  summary: { total_skills_found: number; must_have_count: number; nice_to_have_count: number; categories_covered: string[] };
};

export default function CandidateDiscoveryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const jdResult = (location.state as { jdResult?: JDResult; jdText?: string } | null)?.jdResult;
  const jdText = (location.state as { jdText?: string } | null)?.jdText;

  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [marketInsight, setMarketInsight] = useState<{
    salary: string;
    demandLabel: string;
    demandTone: string;
    pressure: number;
  } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;

  const [skillMatch, setSkillMatch] = useState(50);
  const [experienceMax, setExperienceMax] = useState(15);
  const [successScore, setSuccessScore] = useState(50);
  const [hiddenGemsOnly, setHiddenGemsOnly] = useState(false);
  const [remoteCandidates, setRemoteCandidates] = useState(false);
  const [highRecruitability, setHighRecruitability] = useState(false);
  const [jdSkillNames, setJdSkillNames] = useState<string[]>([]);

  useEffect(() => {
    if (jdResult) {
      if (jdResult.max_years) setExperienceMax(jdResult.max_years);
      setJdSkillNames(jdResult.must_have_skills.map((s) => s.name.toLowerCase()));
      setSkillMatch(0);
      setSuccessScore(0);
    }
  }, []);

  useEffect(() => {
    getMarketOptions().then((opts) => {
      const cluster = opts.clusters[0] ?? "ML / AI Engineering";
      const loc = opts.locations[0] ?? "San Francisco";

      getMarketInsight(cluster, loc).then((data) => {
        const salary = `$${Math.round(data.avg_salary_estimate - 27500).toLocaleString()} - $${Math.round(data.avg_salary_estimate + 27500).toLocaleString()}`;
        let demandTone = "bg-error-container text-on-error-container";
        if (data.density_label.toLowerCase().includes("moderate")) {
          demandTone = "bg-amber-100 text-amber-800";
        } else if (!data.density_label.toLowerCase().includes("high")) {
          demandTone = "bg-emerald-100 text-emerald-800";
        }
        setMarketInsight({
          salary,
          demandLabel: data.density_label,
          demandTone,
          pressure: Math.round(data.competition_index * 100),
        });
      }).catch(() => {
        setMarketInsight(null);
      });
    }).catch(() => {
      getMarketInsight("ML / AI Engineering", "San Francisco").then((data) => {
        const salary = `$${Math.round(data.avg_salary_estimate - 27500).toLocaleString()} - $${Math.round(data.avg_salary_estimate + 27500).toLocaleString()}`;
        let demandTone = "bg-error-container text-on-error-container";
        if (data.density_label.toLowerCase().includes("moderate")) {
          demandTone = "bg-amber-100 text-amber-800";
        } else if (!data.density_label.toLowerCase().includes("high")) {
          demandTone = "bg-emerald-100 text-emerald-800";
        }
        setMarketInsight({
          salary,
          demandLabel: data.density_label,
          demandTone,
          pressure: Math.round(data.competition_index * 100),
        });
      }).catch(() => {
        setMarketInsight(null);
      });
    });
  }, []);

  function toCandidate(r: import("../api").RankedCandidate): Candidate {
    const skillsList = r.skills.split(",").map((s) => s.trim());
    return {
      id: r.id,
      name: r.name,
      role: r.role,
      company: r.company,
      location: r.location,
      experience: `${r.yoe} years`,
      technicalFit: r.technicalFit,
      skillMatch: r.skillMatch,
      experienceMatch: r.experienceLevel,
      recruitability: r.cultureSignal,
      careerGrowth: r.careerGrowth,
      learningVelocity: 0,
      successScore: r.successScore,
      skills: skillsList,
      reason: "",
      skills_overlap: 0,
      years_experience: r.yoe,
      company_prestige: 0,
      job_hop_freq: 0,
      github_activity: 0,
      open_source_contribs: 0,
      leetcode_score: 0,
      education_tier: 0,
      certifications_count: 0,
      project_complexity: 0,
      tech_stack_diversity: 0,
      endorsements_count: 0,
      career_growth_rate: 0,
      response_time_score: 0,
    };
  }

  function loadCandidates() {
    setLoading(true);
    setError(false);
    if (jdText) {
      rankCandidates(jdText)
        .then((ranked) => setAllCandidates(ranked.map(toCandidate)))
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    } else {
      const fetcher = hiddenGemsOnly ? fetchHiddenGems() : fetchCandidates();
      fetcher
        .then(setAllCandidates)
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    }
  }

  useEffect(() => {
    loadCandidates();
  }, [hiddenGemsOnly, jdText]);

  function clearFilters() {
    setSkillMatch(jdResult ? 0 : 50);
    setExperienceMax(jdResult?.max_years ?? 15);
    setSuccessScore(jdResult ? 0 : 50);
    setHiddenGemsOnly(false);
    setRemoteCandidates(false);
    setHighRecruitability(false);
    setCurrentPage(1);
  }

  const filteredCandidates = allCandidates.filter((c) => {
    if (c.skillMatch < skillMatch) return false;
    if (c.successScore < successScore) return false;
    const expYears = parseFloat(c.experience);
    if (!isNaN(expYears) && expYears > experienceMax) return false;
    if (highRecruitability && (c.recruitability ?? 0) < 80) return false;
    if (remoteCandidates && !c.location.toLowerCase().includes("remote")) return false;
    if (jdSkillNames.length > 0) {
      const candidateSkills = c.skills.map((s) => s.toLowerCase());
      const hasMatch = jdSkillNames.some((js) => candidateSkills.includes(js));
      if (!hasMatch) return false;
    }
    return true;
  });

  const displayCandidates = filteredCandidates.map((c, i) => ({
    rank: i + 1,
    id: c.id,
    name: c.name,
    role: `${c.role} @ ${c.company}`,
    tech: Math.round(c.technicalFit),
    recruit: Math.round(c.recruitability),
    growth: Math.round(c.careerGrowth),
    success: Math.round(c.successScore),
  }));

  const totalPages = Math.max(1, Math.ceil(displayCandidates.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedCandidates = displayCandidates.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );
  const startRange = (safePage - 1) * PAGE_SIZE + 1;
  const endRange = Math.min(safePage * PAGE_SIZE, displayCandidates.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [skillMatch, experienceMax, successScore, hiddenGemsOnly, remoteCandidates, highRecruitability]);

  return (
    <AppLayout
      title="Candidate Discovery"
      searchPlaceholder="Search by name, skill, or role..."
    >
      <div className="min-h-[calc(100vh-64px)] bg-background p-lg pb-28">
        <div className="space-y-lg">
          {/* Job Context Bar */}
          <section className="flex w-full items-center justify-between rounded-xl border border-outline-variant bg-white p-md shadow-sm">
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-wider text-outline">
                    {jdResult ? "JD Analysis Active" : "Active Job"}
                  </span>
                  <span className="font-headline-md text-headline-md text-on-surface">
                    {jdResult?.role_title ?? (
                      allCandidates.length > 0
                        ? allCandidates
                            .map((c) => c.role)
                            .sort((a, b) =>
                              allCandidates.filter((x) => x.role === a).length -
                              allCandidates.filter((x) => x.role === b).length
                            )
                            .pop() ?? "Active Role"
                        : "Active Role"
                    )}
                  </span>
                  {jdResult && (
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <span className="text-xs text-on-surface-variant">
                        {jdResult.min_years ?? 0}–{jdResult.max_years ?? "∞"} yrs exp &nbsp;•&nbsp;
                      </span>
                      {jdResult.must_have_skills.slice(0, 4).map((s) => (
                        <span key={s.name} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          {s.name}
                        </span>
                      ))}
                      {jdResult.must_have_skills.length > 4 && (
                        <span className="text-[10px] text-on-surface-variant">+{jdResult.must_have_skills.length - 4} more</span>
                      )}
                    </div>
                  )}
                </div>

              <div className="h-10 w-px bg-outline-variant" />

              <div className="flex gap-8">
                <ContextMetric
                  label="Total Scanned"
                  value={loading ? "..." : String(allCandidates.length)}
                />
                <ContextMetric
                  label="Relevant"
                  value={loading ? "..." : String(filteredCandidates.length)}
                />

                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-outline">
                    Ranked Pool
                  </span>
                  <span className="w-fit rounded-full bg-primary-container px-2 py-0.5 text-xs font-bold text-on-primary-container">
                    Top {Math.min(filteredCandidates.length, 100)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="rounded-lg border border-primary px-4 py-2 font-label-md text-label-md text-primary transition-all hover:bg-primary/5">
                Edit Parameters
              </button>

              <button
                onClick={loadCandidates}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-secondary px-4 py-2 font-label-md text-label-md text-white shadow-md transition-all hover:opacity-90"
              >
                <span className="material-symbols-outlined text-[18px]">
                  refresh
                </span>
                Re-Rank Pool
              </button>
            </div>
          </section>

          {/* Main Layout */}
          <div className="grid grid-cols-[280px_minmax(0,1fr)] items-start gap-lg">
            {/* Left Filters */}
            <aside className="space-y-md">
              <div className="space-y-6 rounded-xl border border-outline-variant bg-white p-lg shadow-sm">
                <h3 className="flex items-center gap-2 font-label-md text-sm uppercase tracking-widest text-on-surface-variant">
                  <span className="material-symbols-outlined text-sm">
                    filter_alt
                  </span>
                  Discovery Filters
                </h3>

                <div className="space-y-4">
                  <ControlledRange
                    label="Skill Match"
                    displayValue={`${skillMatch}%+`}
                    min={50}
                    max={100}
                    currentValue={skillMatch}
                    onChange={setSkillMatch}
                  />

                  <ControlledRange
                    label="Experience Years"
                    displayValue={`5 - ${experienceMax}`}
                    min={5}
                    max={15}
                    currentValue={experienceMax}
                    onChange={setExperienceMax}
                  />
                </div>

                <div className="space-y-3 border-t border-outline-variant pt-4">
                  <CheckboxRow
                    label="Hidden Gems Only"
                    checked={hiddenGemsOnly}
                    onChange={setHiddenGemsOnly}
                    icon="auto_awesome"
                  />

                  <CheckboxRow
                    label="Remote Candidates"
                    checked={remoteCandidates}
                    onChange={setRemoteCandidates}
                  />

                  <CheckboxRow
                    label="Recruitability (High)"
                    checked={highRecruitability}
                    onChange={setHighRecruitability}
                  />
                </div>

                <div className="space-y-4 border-t border-outline-variant pt-4">
                  <ControlledRange
                    label="Min Success Score"
                    displayValue={`${successScore}`}
                    min={50}
                    max={100}
                    currentValue={successScore}
                    onChange={setSuccessScore}
                  />
                </div>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="w-full rounded-lg bg-surface-container-high py-2 font-bold text-primary transition-colors hover:bg-primary-fixed"
                >
                  Clear All Filters
                </button>
              </div>

              <div className="relative overflow-hidden rounded-xl bg-tertiary-container p-lg text-on-tertiary shadow-lg shadow-tertiary/20">
                <div className="relative z-10 space-y-2">
                  <span className="material-symbols-outlined">
                    auto_awesome
                  </span>
                  <h4 className="font-headline-md text-lg font-bold">
                    Predictive Hiring
                  </h4>
                  <p className="text-xs leading-relaxed opacity-80">
                    AI analysis indicates a 42% faster time-to-hire for this
                    pool vs traditional search.
                  </p>
                </div>
              </div>

              {/* Discovery Impact */}
              <div className="rounded-xl border border-outline-variant bg-white p-lg shadow-sm">
                <h4 className="mb-md font-label-md text-xs uppercase tracking-widest text-outline">
                  Discovery Impact
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <MiniImpactStat
                    label="Pool Reduced"
                    value={
                      allCandidates.length
                        ? `${((1 - filteredCandidates.length / allCandidates.length) * 100).toFixed(1)}%`
                        : "0%"
                    }
                  />
                  <MiniImpactStat
                    label="Hidden Gems"
                    value={String(
                      allCandidates.filter((c) => c.hiddenGem).length
                    )}
                  />
                  <MiniImpactStat
                    label="Avg Fit"
                    value={
                      filteredCandidates.length
                        ? `${Math.round(
                            filteredCandidates.reduce(
                              (s, c) => s + c.skillMatch,
                              0
                            ) / filteredCandidates.length
                          )}%`
                        : "0%"
                    }
                  />
                  <MiniImpactStat label="Time Saved" value="42%" />
                </div>
              </div>
            </aside>

            {/* Main Candidate Area */}
            <section className="min-w-0 space-y-md">
              {/* Candidate Table */}
              <div className="overflow-hidden rounded-xl border border-outline-variant bg-white shadow-sm">
                <table className="w-full table-fixed border-collapse">
                  <thead className="border-b border-outline-variant bg-surface-container-low">
                    <tr>
                      <th className="w-[72px] px-4 py-4 text-left font-label-md text-xs uppercase tracking-wider text-outline">
                        Rank
                      </th>
                      <th className="px-4 py-4 text-left font-label-md text-xs uppercase tracking-wider text-outline">
                        Candidate
                      </th>
                      <th className="w-[280px] px-4 py-4 text-center font-label-md text-xs uppercase tracking-wider text-outline">
                        AI Metrics
                      </th>
                      <th className="w-[104px] px-4 py-4 text-right font-label-md text-xs uppercase tracking-wider text-outline">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-outline-variant">
                    {loading ? (
                      <>
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                      </>
                    ) : error ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined text-3xl text-error">
                              error_outline
                            </span>
                            <p className="text-sm font-medium text-error">
                              Failed to load candidates
                            </p>
                            <button
                              onClick={loadCandidates}
                              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white"
                            >
                              Retry
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : displayCandidates.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined text-3xl text-outline">
                              search_off
                            </span>
                            <p className="text-sm font-medium text-on-surface-variant">
                              No candidates match your filters
                            </p>
                            <button
                              onClick={clearFilters}
                              className="rounded-lg bg-surface-container-high px-4 py-2 text-sm font-bold text-primary"
                            >
                              Clear Filters
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedCandidates.map((candidate) => (
                        <CandidateRow
                          key={candidate.id}
                          candidate={candidate}
                        />
                      ))
                    )}
                  </tbody>
                </table>

                <div className="flex items-center justify-between border-t border-outline-variant bg-surface-container-low p-md">
                  <span className="text-xs font-medium text-on-surface-variant">
                    Showing {startRange}–{endRange} of {displayCandidates.length.toLocaleString()} relevant matches
                  </span>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={safePage === 1}
                        className="rounded p-1 transition-colors hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => {
                          if (totalPages <= 7) return true;
                          if (p === 1 || p === totalPages) return true;
                          if (Math.abs(p - safePage) <= 1) return true;
                          return false;
                        })
                        .reduce((acc, p, idx, arr) => {
                          if (idx > 0 && p - arr[idx - 1] > 1) {
                            acc.push(
                              <span key={`ellipsis-${p}`} className="px-1 text-xs text-on-surface-variant">
                                ...
                              </span>
                            );
                          }
                          acc.push(
                            <button
                              key={p}
                              onClick={() => setCurrentPage(p)}
                              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                                p === safePage
                                  ? "border border-outline-variant bg-white font-bold shadow-sm"
                                  : "hover:bg-white"
                              }`}
                            >
                              {p}
                            </button>
                          );
                          return acc;
                        }, [] as React.ReactNode[])}

                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage === totalPages}
                        className="rounded p-1 transition-colors hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex justify-center gap-4 py-3">
                <button
                  type="button"
                  onClick={() => navigate("/talent-twin")}
                  className="flex items-center gap-2 rounded-full border border-primary bg-white px-6 py-3 font-bold text-primary shadow-sm transition-all hover:bg-primary/5 active:scale-95"
                >
                  <span className="material-symbols-outlined">
                    compare_arrows
                  </span>
                  Compare Selection
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/shortlist-export")}
                  className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-95"
                >
                  <span className="material-symbols-outlined">
                    playlist_add
                  </span>
                  Bulk Shortlist
                </button>
              </div>

              {/* Ranking Logic Full Width */}
              <div className="ai-glass ai-glow relative overflow-hidden rounded-xl p-lg">
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-tertiary/5 blur-3xl" />

                <div className="relative z-10 mb-md flex items-start justify-between gap-6">
                  <div>
                    <h3 className="flex items-center gap-2 font-headline-md text-lg text-tertiary">
                      <span className="material-symbols-outlined">
                        psychology
                      </span>
                      Ranking Logic
                    </h3>

                    <p className="mt-1 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
                      Our AI analyzed 100k+ profiles across 14 dimensions to
                      rank this pool.
                    </p>
                  </div>

                  <button className="flex shrink-0 items-center gap-2 rounded-lg border border-tertiary/20 bg-white px-4 py-2 text-xs font-bold text-tertiary transition hover:bg-tertiary/5">
                    View Full Intelligence Report
                    <span className="material-symbols-outlined text-[14px]">
                      open_in_new
                    </span>
                  </button>
                </div>

                <div className="relative z-10 grid grid-cols-1 gap-md md:grid-cols-3">
                  <RankingLogicCard
                    title="Skill Density"
                    text="Heavy weight is given to PyTorch, LLM fine-tuning, vector search, and distributed systems experience."
                  />

                  <RankingLogicCard
                    title="Career Trajectory"
                    text="Candidates showing strong ownership growth and role progression over the last 3 years are prioritized."
                  />

                  <RankingLogicCard
                    title="Recruitability Index"
                    text="The model estimates job-seeking intent using tenure, activity, engagement, and responsiveness signals."
                  />
                </div>
              </div>

              {/* Market Context Full Width */}
              <div className="rounded-xl border border-outline-variant bg-white p-lg shadow-sm">
                <div className="mb-md flex items-center justify-between">
                  <h4 className="font-label-md text-xs uppercase tracking-widest text-outline">
                    Market Context
                  </h4>

                  <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${marketInsight?.demandTone ?? "bg-surface-container text-on-surface-variant"}`}>
                    {marketInsight?.demandLabel ?? "Loading..."}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-lg md:grid-cols-3">
                  <div>
                    <span className="text-xs text-on-surface-variant">
                      Avg. Salary
                    </span>
                    <p className="mt-1 text-lg font-bold text-primary">
                      {marketInsight?.salary ?? "---"}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs text-on-surface-variant">
                      Demand Level
                    </span>
                    <p className={`mt-1 text-lg font-bold ${marketInsight ? (marketInsight.demandLabel.toLowerCase().includes("high") ? "text-error" : marketInsight.demandLabel.toLowerCase().includes("moderate") ? "text-amber-600" : "text-emerald-600") : "text-on-surface-variant"}`}>
                      {marketInsight?.demandLabel ?? "---"}
                    </p>
                  </div>

                  <div>
                    <div className="mb-2 flex justify-between text-xs text-on-surface-variant">
                      <span>Market Pressure</span>
                      <span className="font-bold text-primary">{marketInsight?.pressure ?? "---"}%</span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${marketInsight?.pressure ?? 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function ContextMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-semibold text-outline">{label}</span>
      <span className="font-bold text-primary">{value}</span>
    </div>
  );
}

function ControlledRange({
  label,
  displayValue,
  min,
  max,
  currentValue,
  onChange,
}: {
  label: string;
  displayValue: string;
  min: number;
  max: number;
  currentValue: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="mb-2 flex justify-between text-xs font-semibold text-on-surface-variant">
        {label}
        <span className="text-primary">{displayValue}</span>
      </label>

      <input
        value={currentValue}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-surface-container accent-primary"
        min={min}
        max={max}
        type="range"
      />
    </div>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
  icon,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  icon?: string;
}) {
  return (
    <label className="group flex cursor-pointer items-center gap-3">
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary/20"
        type="checkbox"
      />
      <span className="font-body-sm text-body-sm text-on-surface-variant transition-colors group-hover:text-primary">
        {label}
      </span>
      {icon && (
        <span className="material-symbols-outlined text-[16px] text-tertiary">
          {icon}
        </span>
      )}
    </label>
  );
}

function CandidateRow({
  candidate,
}: {
  candidate: {
    rank: number;
    id: string;
    name: string;
    role: string;
    tech: number;
    recruit: number;
    growth: number;
    success: number;
  };
}) {
  return (
    <tr className="group transition-colors hover:bg-surface-container-lowest">
      <td className="px-4 py-4">
        <div
          className={[
            "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
            candidate.rank === 1
              ? "bg-primary-container text-on-primary-container"
              : "bg-surface-container-high text-on-surface-variant",
          ].join(" ")}
        >
          #{candidate.rank}
        </div>
      </td>

      <td className="px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10 text-sm font-bold text-primary">
            {candidate.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>

          <div className="min-w-0">
            <Link
              to={`/candidate-profile/${candidate.id}`}
              className="block truncate text-sm font-bold text-on-surface transition-colors hover:text-primary"
            >
              {candidate.name}
            </Link>
            <span className="block truncate text-xs text-on-surface-variant">
              {candidate.role}
            </span>
          </div>
        </div>
      </td>

      <td className="px-4 py-4">
        <div className="grid grid-cols-4 gap-2 text-center">
          <Metric label="Tech" value={candidate.tech} />
          <Metric label="Recruit" value={candidate.recruit} />
          <Metric label="Growth" value={candidate.growth} />

          <div className="flex flex-col items-center justify-center">
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-700">
              {candidate.success}%
            </span>
          </div>
        </div>
      </td>

      <td className="px-4 py-4 text-right">
        <div className="flex justify-end gap-1 opacity-100">
          <Link
            to={`/candidate-profile/${candidate.id}`}
            className="rounded-lg p-2 text-primary transition-colors hover:bg-primary/10"
            title="Quick View"
          >
            <span className="material-symbols-outlined">visibility</span>
          </Link>

          <button
            className="rounded-lg p-2 text-primary transition-colors hover:bg-primary/10"
            title="Add to Shortlist"
          >
            <span className="material-symbols-outlined">playlist_add</span>
          </button>
        </div>
      </td>
    </tr>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex min-w-[48px] flex-col items-center leading-tight">
      <span className="text-[9px] font-bold uppercase text-outline">
        {label}
      </span>
      <span className="text-xs font-bold text-emerald-600">{value}%</span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="group transition-colors hover:bg-surface-container-lowest">
      <td className="px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container text-sm font-bold text-on-surface-variant/40">
          #--
        </div>
      </td>

      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
          <div className="flex flex-col gap-1">
            <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
            <div className="h-2 w-32 animate-pulse rounded bg-slate-50" />
          </div>
        </div>
      </td>

      <td className="px-4 py-4">
        <div className="grid grid-cols-4 gap-2">
          <div className="h-2 animate-pulse rounded bg-slate-100" />
          <div className="h-2 animate-pulse rounded bg-slate-100" />
          <div className="h-2 animate-pulse rounded bg-slate-100" />
          <div className="h-4 animate-pulse rounded bg-slate-100" />
        </div>
      </td>

      <td className="px-4 py-4" />
    </tr>
  );
}

function PagerIcon({ icon }: { icon: string }) {
  return (
    <button className="rounded p-1 transition-colors hover:bg-white">
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
    </button>
  );
}

function RankingLogicCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="min-h-[120px] rounded-xl border border-outline-variant/50 bg-white/70 p-md">
      <span className="font-label-md text-[11px] font-black uppercase tracking-widest text-tertiary">
        {title}
      </span>

      <p className="mt-2 text-xs leading-5 text-on-surface-variant">{text}</p>
    </div>
  );
}

function MiniImpactStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-container-low p-3">
      <p className="text-lg font-bold text-on-surface">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
        {label}
      </p>
    </div>
  );
}
