import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import AppLayout from "../components/layout/AppLayout";
import { createJob, extractJDSkills, getMarketInsight } from "../api";

const ROLE_CATEGORIES = [
  "Engineering",
  "Product Management",
  "Design",
  "Data Science",
  "Sales & Marketing",
];

const CATEGORY_TO_CLUSTER: Record<string, string | null> = {
  Engineering: "Backend Engineering",
  "Data Science": "Data Science",
  "Product Management": null,
  Design: null,
  "Sales & Marketing": null,
};

const KNOWN_LOCATIONS = [
  "San Francisco", "New York", "Seattle", "Austin", "Boston",
  "London", "Berlin", "Bangalore", "Toronto", "Singapore",
];

function matchLocation(input: string): string | null {
  const lower = input.toLowerCase();
  for (const loc of KNOWN_LOCATIONS) {
    if (lower.includes(loc.toLowerCase())) return loc;
  }
  if (/bangalore|bengaluru|pune|hyderabad|chennai|mumbai|delhi|gurgaon|noida/i.test(lower)) return "Bangalore";
  if (/san francisco|bay area/i.test(lower)) return "San Francisco";
  if (/new york|nyc/i.test(lower)) return "New York";
  return null;
}

export default function CreateJobPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [roleCategory, setRoleCategory] = useState(ROLE_CATEGORIES[0]);
  const [location, setLocation] = useState("");
  const [experienceYears, setExperienceYears] = useState(6);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const extractTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [marketData, setMarketData] = useState<{
    densityLabel: string;
    densityScore: number;
    salaryEstimate: number;
    competitionIndex: number;
    supplyCount: number;
    demandCount: number;
    insightText: string;
  } | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const marketTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (description.trim().length < 20) {
      setExtractedSkills([]);
      return;
    }
    clearTimeout(extractTimer.current);
    extractTimer.current = setTimeout(() => {
      setSkillsLoading(true);
      extractJDSkills(description.trim())
        .then((res) => setExtractedSkills(res.all_skills ?? []))
        .catch(() => setExtractedSkills([]))
        .finally(() => setSkillsLoading(false));
    }, 1500);
    return () => clearTimeout(extractTimer.current);
  }, [description]);

  useEffect(() => {
    clearTimeout(marketTimer.current);
    const matchedLoc = matchLocation(location);
    const cluster = CATEGORY_TO_CLUSTER[roleCategory];
    if (!location.trim() || !cluster || !matchedLoc) {
      setMarketData(null);
      return;
    }
    marketTimer.current = setTimeout(() => {
      setMarketLoading(true);
      getMarketInsight(cluster, matchedLoc)
        .then((data) => {
          setMarketData({
            densityLabel: data.density_label,
            densityScore: data.density_score,
            salaryEstimate: data.avg_salary_estimate,
            competitionIndex: data.competition_index,
            supplyCount: data.supply_count,
            demandCount: data.demand_count,
            insightText: data.insight_text,
          });
        })
        .catch(() => setMarketData(null))
        .finally(() => setMarketLoading(false));
    }, 800);
    return () => clearTimeout(marketTimer.current);
  }, [roleCategory, location]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Job title is required";
    if (!location.trim()) errs.location = "Location is required";
    if (!description.trim()) errs.description = "Job description is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(status: "Active" | "Draft") {
    if (!validate()) return;
    setLoading(true);
    setError("");
    try {
      await createJob({
        title: title.trim(),
        roleCategory,
        location: location.trim(),
        experienceRange: `${experienceYears}+ years`,
        description: description.trim(),
        status,
      });
      navigate("/dashboard");
    } catch {
      setError("Failed to create job. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleAnalyzeJD() {
    if (!description.trim()) {
      setErrors((prev) => ({ ...prev, description: "Paste a job description first" }));
      return;
    }
    navigate("/job-intelligence", { state: { jdText: description.trim() } });
  }

  return (
    <AppLayout
      title="Create Job"
      actionLabel="Create New Job"
      searchPlaceholder="Search talent, jobs, or insights..."
      onAction={() => navigate("/create-job")}
    >
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-col gap-lg md:flex-row">
          {/* Left: Form Area */}
          <section className="flex-1 space-y-lg">
            <div className="mb-md flex items-end justify-between">
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">
                  Create Job
                </h2>
                <p className="text-sm text-on-surface-variant">
                  Define the role and let AI optimize your reach.
                </p>
              </div>

              <div className="flex gap-sm">
                <button
                  className="rounded-lg border border-outline px-4 py-2 font-label-md text-sm text-on-surface transition-colors hover:bg-surface-container disabled:opacity-50"
                  disabled={loading}
                  onClick={() => handleSubmit("Draft")}
                >
                  {loading ? "Saving..." : "Save Draft"}
                </button>

                <button
                  className="rounded-lg bg-gradient-to-r from-primary to-secondary px-6 py-2 font-label-md text-sm text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
                  disabled={loading}
                  onClick={() => handleSubmit("Active")}
                >
                  {loading ? "Posting..." : "Post Job"}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-md text-red-700">
                <span className="material-symbols-outlined text-red-500">error_outline</span>
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            {/* Main Form Card */}
            <div className="rounded-xl border border-outline-variant bg-white p-lg shadow-sm">
              <form
                className="space-y-xl"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit("Active");
                }}
              >
                {/* Basic Info */}
                <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
                  <div className="space-y-xs">
                    <label className="block font-label-md text-sm text-on-surface-variant">
                      Job Title <span className="text-red-500">*</span>
                    </label>

                    <input
                      className={`w-full rounded-lg border px-4 py-2 text-on-surface focus:border-primary focus:ring-primary ${errors.title ? "border-red-400" : "border-outline-variant"}`}
                      placeholder="e.g. Senior Full Stack Engineer"
                      type="text"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        if (errors.title) setErrors((prev) => ({ ...prev, title: "" }));
                      }}
                    />
                    {errors.title && (
                      <p className="text-xs text-red-500">{errors.title}</p>
                    )}
                  </div>

                  <div className="space-y-xs">
                    <label className="block font-label-md text-sm text-on-surface-variant">
                      Role Category
                    </label>

                    <select
                      className="w-full rounded-lg border border-outline-variant px-4 py-2 text-on-surface focus:border-primary focus:ring-primary"
                      value={roleCategory}
                      onChange={(e) => setRoleCategory(e.target.value)}
                    >
                      {ROLE_CATEGORIES.map((cat) => (
                        <option key={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
                  <div className="space-y-xs">
                    <label className="block font-label-md text-sm text-on-surface-variant">
                      Location <span className="text-red-500">*</span>
                    </label>

                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant">
                        location_on
                      </span>

                      <input
                        className={`w-full rounded-lg border py-2 pl-10 pr-4 text-on-surface focus:border-primary focus:ring-primary ${errors.location ? "border-red-400" : "border-outline-variant"}`}
                        placeholder="New York, NY / Remote"
                        type="text"
                        value={location}
                        onChange={(e) => {
                          setLocation(e.target.value);
                          if (errors.location) setErrors((prev) => ({ ...prev, location: "" }));
                        }}
                      />
                    </div>
                    {errors.location && (
                      <p className="text-xs text-red-500">{errors.location}</p>
                    )}
                  </div>

                  <div className="space-y-xs">
                    <div className="flex items-center justify-between">
                      <label className="block font-label-md text-sm text-on-surface-variant">
                        Experience Range
                      </label>

                      <span className="rounded-full bg-primary-fixed px-3 py-1 text-xs font-bold text-on-primary-fixed-variant">
                        {experienceYears}+ years
                      </span>
                    </div>

                    <div className="flex items-center gap-4 py-2">
                      <span className="font-mono text-xs text-on-surface-variant">
                        0yr
                      </span>

                      <input
                        value={experienceYears}
                        onChange={(event) =>
                          setExperienceYears(Number(event.target.value))
                        }
                        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-surface-container-high accent-primary"
                        max="15"
                        min="0"
                        step="1"
                        type="range"
                      />

                      <span className="font-mono text-xs text-on-surface-variant">
                        15yr+
                      </span>
                    </div>

                    <div className="flex justify-center">
                      <span className="font-label-md text-xs text-primary">
                        Preferred experience: {experienceYears}+ years
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description Area */}
                <div className="relative space-y-xs">
                  <div className="flex items-center justify-between">
                    <label className="block font-label-md text-sm text-on-surface-variant">
                      Job Description <span className="text-red-500">*</span>
                    </label>

                    <button
                      className="flex items-center gap-2 text-xs font-bold text-primary hover:underline"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        upload
                      </span>
                      Upload JD (PDF/DOCX)
                    </button>
                  </div>

                  <div className="group relative">
                    <textarea
                      className={`custom-scrollbar w-full resize-none rounded-xl border px-4 py-4 text-on-surface focus:border-primary focus:ring-primary ${errors.description ? "border-red-400" : "border-outline-variant"}`}
                      id="jd_textarea"
                      placeholder="Paste or type the job description here..."
                      rows={12}
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        if (errors.description) setErrors((prev) => ({ ...prev, description: "" }));
                      }}
                    />
                    {errors.description && (
                      <p className="mt-1 text-xs text-red-500">{errors.description}</p>
                    )}

                    <div className="absolute bottom-4 right-4">
                      <button
                        className="ai-glow flex items-center gap-2 rounded-full bg-tertiary px-4 py-2 font-label-md text-sm text-on-tertiary transition-transform hover:scale-105"
                        type="button"
                        onClick={handleAnalyzeJD}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          auto_awesome
                        </span>
                        Analyze Job Description
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Extracted Skills Preview */}
            <div className="rounded-xl border border-outline-variant bg-white p-lg shadow-sm">
              <div className="mb-md flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary">
                  psychology
                </span>
                <h3 className="text-sm font-bold text-on-surface">
                  Extracted Skills Preview
                </h3>
                {skillsLoading && (
                  <span className="ml-auto h-4 w-4 animate-spin rounded-full border-2 border-tertiary border-t-transparent" />
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {extractedSkills.length > 0 ? (
                  extractedSkills.map((skill) => (
                    <span
                      key={skill}
                      className="flex items-center gap-1 rounded-full bg-primary-fixed px-3 py-1 text-xs font-semibold text-on-primary-fixed-variant"
                    >
                      {skill}
                      <span className="material-symbols-outlined text-[14px]">
                        close
                      </span>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-on-surface-variant">
                    {description.trim().length < 20 ? "Type a job description to auto-extract skills" : "No skills extracted yet"}
                  </span>
                )}

                <button
                  type="button"
                  className="rounded-full border border-dashed border-outline-variant px-3 py-1 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-surface-container"
                >
                  + Add Skill
                </button>
              </div>
            </div>
          </section>

          {/* Right: AI Assistance Panel */}
          <aside className="w-full space-y-lg md:w-[320px]">
            {/* AI Recruiter Tips */}
            <div className="ai-glow space-y-md rounded-xl bg-white p-lg">
              <div className="flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-tertiary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  bolt
                </span>
                <h3 className="text-sm font-bold text-on-surface">
                  AI Recruiter Tips
                </h3>
              </div>

              <div className="space-y-md">
                <TipCard
                  icon="check_circle"
                  text={
                    <>
                      <strong>Add must-have skills:</strong> Your description is
                      missing explicit mention of &quot;PostgreSQL&quot;. Adding
                      this will filter better candidates.
                    </>
                  }
                />

                <TipCard
                  icon="tips_and_updates"
                  text={
                    <>
                      <strong>Mention seniority clearly:</strong> Specify if
                      &quot;Senior&quot; refers to 5+ or 8+ years to align with
                      talent market expectations.
                    </>
                  }
                />

                <TipCard
                  icon="info"
                  text={
                    <>
                      <strong>Include production requirements:</strong>{" "}
                      Candidates often look for &quot;On-call&quot; or
                      &quot;SLA&quot; expectations in high-level engineering
                      roles.
                    </>
                  }
                />
              </div>
            </div>

            {/* Talent Market Summary */}
            <div className="relative overflow-hidden rounded-xl border border-outline-variant bg-white p-lg">
              <h3 className="relative z-10 text-sm font-bold text-on-surface">
                Talent Market Summary
              </h3>

              {marketLoading ? (
                <div className="relative z-10 mt-md flex items-center justify-center py-6">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : marketData ? (
                <>
                  <div className="relative z-10 mt-md space-y-4">
                    <ProgressItem
                      label="Candidate Density"
                      value={marketData.densityLabel}
                      valueClass={
                        marketData.densityLabel.toLowerCase().includes("high")
                          ? "text-tertiary"
                          : marketData.densityLabel.toLowerCase().includes("low")
                            ? "text-error"
                            : "text-secondary"
                      }
                      barClass={
                        marketData.densityLabel.toLowerCase().includes("high")
                          ? "bg-tertiary"
                          : marketData.densityLabel.toLowerCase().includes("low")
                            ? "bg-error"
                            : "bg-secondary"
                      }
                      widthPercent={Math.min(marketData.densityScore, 100)}
                    />

                    <ProgressItem
                      label="Salary Competitiveness"
                      value={
                        marketData.salaryEstimate > 120000
                          ? "Above Market"
                          : marketData.salaryEstimate > 90000
                            ? "At Market"
                            : "Below Market"
                      }
                      valueClass="text-secondary"
                      barClass="bg-secondary"
                      widthPercent={
                        marketData.salaryEstimate > 120000
                          ? 80
                          : marketData.salaryEstimate > 90000
                            ? 60
                            : 40
                      }
                    />
                  </div>

                  <div className="relative z-10 mt-md rounded-lg bg-surface-container p-3">
                    <p className="text-[11px] italic text-on-surface-variant">
                      &quot;{marketData.insightText}&quot;
                    </p>
                  </div>
                </>
              ) : (
                <div className="relative z-10 mt-md py-6 text-center text-xs text-on-surface-variant">
                  {!location.trim() || !CATEGORY_TO_CLUSTER[roleCategory]
                    ? "Enter a location and select a role category to see market data"
                    : !matchLocation(location)
                      ? "Location not recognized. Try a major city like New York or San Francisco"
                      : "Unable to load market data"}
                </div>
              )}
            </div>

            {/* Hiring Score Badge */}
            <div className="flex items-center justify-between rounded-xl border border-outline-variant bg-white p-lg">
              <div>
                <p className="text-xs font-bold uppercase text-on-surface-variant">
                  Success Predictor
                </p>
                {marketData ? (
                  <p className="text-2xl font-bold text-on-surface">
                    {Math.round(100 - marketData.competitionIndex)}
                    <span className="text-sm text-on-surface-variant">%</span>
                  </p>
                ) : (
                  <p className="text-2xl font-bold text-on-surface-variant">
                    --
                  </p>
                )}
              </div>

              <div className="relative h-16 w-16">
                <svg className="h-full w-full -rotate-90">
                  <circle
                    className="text-surface-container-high"
                    cx="32"
                    cy="32"
                    fill="transparent"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  {marketData && (
                    <circle
                      className="text-emerald-500"
                      cx="32"
                      cy="32"
                      fill="transparent"
                      r="28"
                      stroke="currentColor"
                      strokeDasharray="175.9"
                      strokeDashoffset={175.9 - (175.9 * Math.round(100 - marketData.competitionIndex)) / 100}
                      strokeWidth="4"
                    />
                  )}
                </svg>

                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl text-emerald-500">
                    trending_up
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}

function TipCard({
  icon,
  text,
}: {
  icon: string;
  text: ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-tertiary-container/20 bg-tertiary-container/10 p-3">
      <span className="material-symbols-outlined text-lg text-tertiary-container">
        {icon}
      </span>
      <p className="text-xs leading-relaxed text-on-surface-variant">{text}</p>
    </div>
  );
}

function ProgressItem({
  label,
  value,
  valueClass,
  barClass,
  widthPercent,
}: {
  label: string;
  value: string;
  valueClass: string;
  barClass: string;
  widthPercent: number;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-on-surface-variant">{label}</span>
        <span className={`font-bold ${valueClass}`}>{value}</span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${widthPercent}%` }} />
      </div>
    </div>
  );
}
