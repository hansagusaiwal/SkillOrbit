import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { fetchCandidate, explainCandidate, analyzeBehavioralSignals } from "../api";
import type { Candidate } from "../types";

const BEHAVIORAL_LABELS: Record<string, string> = {
  collaboration: "Collaboration",
  problem_solving: "Problem Solving",
  learning_velocity: "Learning Velocity",
  ownership: "Ownership",
  communication: "Communication",
  initiative: "Initiative",
};

const SCORE_CARD_CONFIG: { key: keyof Candidate; label: string; icon: string; iconClass: string }[] = [
  { key: "technicalFit", label: "Technical Fit", icon: "trending_up", iconClass: "text-emerald-500" },
  { key: "skillMatch", label: "Skill Match", icon: "verified", iconClass: "text-emerald-500" },
  { key: "experienceMatch", label: "Experience", icon: "check_circle", iconClass: "text-amber-500" },
  { key: "recruitability", label: "Recruitability", icon: "bolt", iconClass: "text-emerald-500" },
  { key: "careerGrowth", label: "Career Growth", icon: "auto_graph", iconClass: "text-emerald-500" },
];

const SKILL_CLASSES = [
  "bg-primary/10 text-primary border-primary/20",
  "bg-secondary-container/10 text-secondary border-secondary/20",
  "bg-surface-container text-on-surface-variant border-outline-variant",
];

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

function successTone(score: number): string {
  if (score >= 90) return "Ultra-High Potential";
  if (score >= 75) return "High Potential";
  if (score >= 60) return "Moderate Potential";
  return "Developing";
}

function successColor(score: number): string {
  if (score >= 90) return "text-emerald-600";
  if (score >= 75) return "text-blue-600";
  if (score >= 60) return "text-amber-600";
  return "text-slate-600";
}

export default function CandidateProfilePage() {
  const navigate = useNavigate();
  const { candidateId } = useParams();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [explanation, setExplanation] = useState<Awaited<ReturnType<typeof explainCandidate>> | null>(null);
  const [explainLoading, setExplainLoading] = useState(true);
  const [behavioral, setBehavioral] = useState<Awaited<ReturnType<typeof analyzeBehavioralSignals>> | null>(null);

  useEffect(() => {
    if (!candidateId) {
      setLoading(false);
      setError(true);
      return;
    }

    setLoading(true);
    setError(false);
    setExplanation(null);
    setBehavioral(null);
    setExplainLoading(true);

    fetchCandidate(candidateId)
      .then((data) => {
        setCandidate(data);

        const features = buildFeatures(data);
        explainCandidate(features, 5)
          .then(setExplanation)
          .catch(() => setExplanation(null))
          .finally(() => setExplainLoading(false));

        analyzeBehavioralSignals(candidateId)
          .then(setBehavioral)
          .catch(() => setBehavioral(null));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [candidateId]);

  if (loading) {
    return (
      <AppLayout title="Candidate Profile" searchPlaceholder="Search candidates, skills, or insights...">
        <div className="flex items-center justify-center min-h-[60vh]">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
        </div>
      </AppLayout>
    );
  }

  if (error || !candidate) {
    return (
      <AppLayout title="Candidate Profile" searchPlaceholder="Search candidates, skills, or insights...">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <span className="material-symbols-outlined text-5xl text-error">error_outline</span>
          <p className="text-lg font-medium text-error">
            {candidateId ? "Failed to load candidate" : "No candidate ID provided"}
          </p>
          <button
            onClick={() => navigate("/candidate-discovery")}
            className="rounded-lg bg-primary px-6 py-2 font-bold text-white"
          >
            Back to Discovery
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Candidate Profile"
      searchPlaceholder="Search candidates, skills, or insights..."
    >
      <div className="bg-[#f8fafc] px-lg pb-lg pt-[24px]">
        {/* Hero Profile Section */}
        <section className="relative mb-lg flex flex-col items-start justify-between gap-lg overflow-hidden rounded-2xl border border-outline-variant bg-white p-xl shadow-sm md:flex-row md:items-center">
          <div className="relative z-10 flex items-center gap-xl">
            <div className="relative">
              <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-4xl font-bold text-white ring-4 ring-primary-fixed">
                {candidate.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>

              <div className="absolute -bottom-2 -right-2 flex items-center justify-center rounded-lg border-2 border-white bg-emerald-500 p-1 text-white">
                <span
                  className="material-symbols-outlined text-sm"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  verified
                </span>
              </div>
            </div>

            <div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface">
                {candidate.name}
              </h2>

              <div className="mt-1 flex items-center gap-3 flex-wrap">
                <span className="font-semibold text-primary">
                  {candidate.role}
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-outline-variant" />
                <span className="text-on-surface-variant">{candidate.experience} exp</span>
                <span className="h-1.5 w-1.5 rounded-full bg-outline-variant" />
                <span className="text-on-surface-variant">
                  {candidate.location}
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => navigate("/shortlist-export")}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-lg py-2.5 font-label-md text-white shadow-md transition-all hover:opacity-90"
                >
                  <span className="material-symbols-outlined text-md">
                    add_task
                  </span>
                  Add to Shortlist
                </button>

                <button
                  onClick={() => navigate("/talent-twin")}
                  className="flex items-center gap-2 rounded-xl border border-primary px-lg py-2.5 font-label-md text-primary transition-all hover:bg-primary/5"
                >
                  <span className="material-symbols-outlined text-md">
                    compare_arrows
                  </span>
                  Compare
                </button>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex min-w-[200px] flex-col items-center rounded-2xl border border-primary/20 bg-primary-container/10 p-lg">
            <span className="mb-2 font-label-md uppercase tracking-wider text-on-surface-variant">
              Success Probability
            </span>

            <div className="relative mb-1 flex items-center justify-center">
              <svg className="h-24 w-24">
                <circle
                  className="text-white/20"
                  cx="48"
                  cy="48"
                  fill="transparent"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                />
                <circle
                  className="text-primary"
                  cx="48"
                  cy="48"
                  fill="transparent"
                  r="40"
                  stroke="currentColor"
                  strokeDasharray="251.2"
                  strokeDashoffset={String(251.2 - (251.2 * candidate.successScore) / 100)}
                  strokeLinecap="round"
                  strokeWidth="8"
                  style={{
                    transform: "rotate(-90deg)",
                    transformOrigin: "50% 50%",
                  }}
                />
              </svg>

              <span className="absolute text-2xl font-bold text-on-surface">
                {Math.round(candidate.successScore)}%
              </span>
            </div>

            <span className={`text-sm font-bold ${successColor(candidate.successScore)}`}>
              {successTone(candidate.successScore)}
            </span>
          </div>
        </section>

        {/* Grid Layout */}
        <div className="grid grid-cols-12 gap-lg">
          {/* Left Column */}
          <div className="col-span-12 flex flex-col gap-lg lg:col-span-8">
            {/* Score Cards */}
            <div className="grid grid-cols-2 gap-md md:grid-cols-3 xl:grid-cols-5">
              {SCORE_CARD_CONFIG.map((card) => (
                <ScoreCard
                  key={card.key}
                  label={card.label}
                  value={`${Math.round(candidate[card.key] as number)}%`}
                  icon={card.icon}
                  iconClass={card.iconClass}
                />
              ))}
            </div>

            {/* Skills & Behavior */}
            <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
              <div className="flex flex-col gap-md rounded-2xl border border-outline-variant bg-white p-lg">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline-md text-headline-md">
                    Skill DNA
                  </h3>
                  <span className="material-symbols-outlined text-primary">
                    psychology
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {candidate.skills.length > 0 ? (
                    candidate.skills.map((skill, i) => (
                      <span
                        key={skill}
                        className={`rounded-lg border px-3 py-1.5 font-label-md ${SKILL_CLASSES[i % SKILL_CLASSES.length]}`}
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-on-surface-variant">No skills listed</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-md rounded-2xl border border-outline-variant bg-white p-lg">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline-md text-headline-md">
                    Behavioral Signals
                  </h3>
                  <span className="material-symbols-outlined text-primary">
                    analytics
                  </span>
                </div>

                <div className="flex flex-col gap-4">
                  {behavioral ? (
                    Object.entries(behavioral.scores).filter(([k]) => k !== "overall").map(([key, value]) => (
                      <BehaviorSignal key={key} label={BEHAVIORAL_LABELS[key] ?? key} value={Math.round(value)} />
                    ))
                  ) : (
                    <p className="text-sm text-on-surface-variant">Loading behavioral signals...</p>
                  )}
                </div>
              </div>
            </div>

            {/* Experience Timeline */}
            <div className="rounded-2xl border border-outline-variant bg-white p-lg">
              <h3 className="mb-xl font-headline-md text-headline-md">
                Experience Timeline
              </h3>

              <div className="relative space-y-8 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-[2px] before:bg-outline-variant">
                <TimelineItem
                  borderClass="border-primary"
                  title={candidate.role}
                  company={candidate.company}
                  date="—"
                  description={candidate.reason || "Experienced professional with a strong track record."}
                />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-12 flex flex-col gap-lg lg:col-span-4">
            {/* AI Explanation (Feature 5 - SHAP) */}
            <div className="ai-glow relative flex flex-col gap-md overflow-hidden rounded-2xl border-t-4 bg-white p-lg">
              <div className="absolute right-0 top-0 p-2 opacity-10">
                <span className="material-symbols-outlined text-6xl text-tertiary">auto_awesome</span>
              </div>

              <div className="flex items-center gap-2 text-tertiary">
                <span className="material-symbols-outlined text-xl">auto_awesome</span>
                <h3 className="text-xs font-bold uppercase tracking-widest">AI Explanation (SHAP)</h3>
              </div>

              {explainLoading ? (
                <div className="flex items-center justify-center py-8">
                  <span className="material-symbols-outlined animate-spin text-2xl text-tertiary">progress_activity</span>
                </div>
              ) : explanation ? (
                <>
                  <h4 className="font-headline-md text-headline-md text-on-surface">
                    Score: {explanation.score}/100 (baseline: {explanation.base_value})
                  </h4>

                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Top Drivers</p>
                    {explanation.top_drivers.map((d) => (
                      <div key={d.raw_key} className="flex items-center justify-between rounded-lg bg-emerald-50 p-2">
                        <span className="text-sm text-on-surface">{d.feature}</span>
                        <span className="text-sm font-bold text-emerald-600">+{d.shap_value.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {explanation.top_detractors.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-error">Top Detractors</p>
                      {explanation.top_detractors.map((d) => (
                        <div key={d.raw_key} className="flex items-center justify-between rounded-lg bg-red-50 p-2">
                          <span className="text-sm text-on-surface">{d.feature}</span>
                          <span className="text-sm font-bold text-error">{d.shap_value.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-on-surface-variant">
                  Unable to load SHAP explanation.
                </p>
              )}
            </div>

            {/* Interview Preparation */}
            <div className="flex flex-col gap-md rounded-2xl border border-outline-variant bg-white p-lg">
              <h3 className="font-bold text-on-surface">
                Suggested Interview Focus
              </h3>

              <div className="flex flex-col gap-3 rounded-xl bg-surface-container p-4">
                <p className="text-xs italic text-on-surface-variant">
                  &quot;{candidate.name}&apos;s profile shows strong alignment with the role. Focus on {candidate.skills.slice(0, 3).join(", ")} experience during the interview.&quot;
                </p>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                    <span className="material-symbols-outlined text-lg text-primary">
                      question_answer
                    </span>
                    Primary Question
                  </div>

                  <p className="text-body-sm text-on-surface-variant">
                    Can you walk us through a challenging project where you applied your {candidate.skills[0] || "technical"} skills to solve a complex problem?
                  </p>
                </div>
              </div>
            </div>

            {/* Market Presence */}
            <div className="flex flex-col gap-md rounded-2xl border border-outline-variant bg-white p-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-on-surface">Market Presence</h3>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                  High Density
                </span>
              </div>

              <div className="relative overflow-hidden rounded-xl border border-primary/10 bg-gradient-to-br from-primary-fixed via-surface-container-low to-tertiary-fixed/40 p-4">
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-tertiary/10 blur-2xl" />
                <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />

                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                      Location Signal
                    </p>
                    <p className="mt-1 text-lg font-bold text-on-surface">
                      {candidate.location}
                    </p>
                  </div>

                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/70 shadow-sm">
                    <span className="absolute h-10 w-10 animate-ping rounded-full bg-primary/20" />
                    <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
                      <span className="material-symbols-outlined text-[18px]">
                        location_on
                      </span>
                    </span>
                  </div>
                </div>

                <div className="relative z-10 mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white/75 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                      Candidate Density
                    </p>
                    <p className="mt-1 text-sm font-bold text-emerald-600">
                      High
                    </p>
                  </div>

                  <div className="rounded-lg bg-white/75 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                      Relocation
                    </p>
                    <p className="mt-1 text-sm font-bold text-primary">Open</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-surface-container-low p-3">
                  <p className="font-semibold text-on-surface-variant">
                    Current Location
                  </p>
                  <p className="mt-1 font-bold text-on-surface">
                    {candidate.location}
                  </p>
                </div>

                <div className="rounded-lg bg-surface-container-low p-3">
                  <p className="font-semibold text-on-surface-variant">
                    Market Fit
                  </p>
                  <p className="mt-1 font-bold text-primary">Strong Match</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function ScoreCard({
  label,
  value,
  icon,
  iconClass,
}: {
  label: string;
  value: string;
  icon: string;
  iconClass: string;
}) {
  return (
    <div className="flex min-h-[96px] flex-col justify-between rounded-xl border border-outline-variant bg-white p-md transition-shadow hover:shadow-md">
      <span className="text-[11px] font-bold uppercase leading-4 tracking-wide text-on-surface-variant">
        {label}
      </span>

      <div className="flex items-end justify-between gap-2">
        <span className="text-[26px] font-bold leading-none text-on-surface">
          {value}
        </span>

        <span
          className={`material-symbols-outlined shrink-0 text-xl ${iconClass}`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
      </div>
    </div>
  );
}

function BehaviorSignal({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-bold">
        <span>{label}</span>
        <span>{value}%</span>
      </div>

      <div className="h-1.5 w-full rounded-full bg-surface-container">
        <div
          className="h-1.5 rounded-full bg-primary"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function TimelineItem({
  borderClass,
  title,
  company,
  date,
  description,
}: {
  borderClass: string;
  title: string;
  company: string;
  date: string;
  description: string;
}) {
  return (
    <div className="relative pl-10">
      <div
        className={`absolute left-0 top-1 z-10 h-6 w-6 rounded-full border-4 bg-white ${borderClass}`}
      />

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-on-surface">{title}</h4>
          <span className="rounded bg-surface-container px-2 py-1 text-xs font-bold">
            {date}
          </span>
        </div>

        <p className="text-sm font-semibold text-primary">{company}</p>

        <p className="mt-2 text-body-sm leading-relaxed text-on-surface-variant">
          {description}
        </p>
      </div>
    </div>
  );
}
