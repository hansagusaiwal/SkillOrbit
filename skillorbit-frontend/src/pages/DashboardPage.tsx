import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { fetchDashboardStats, fetchRecentJobs, activateJob } from "../api";

const POLL_INTERVAL = 30000;

type RecentJob = {
  id: string;
  title: string;
  subtitle: string;
  scanned: string;
  score: string;
  status: string;
  scoreTone: "emerald" | "amber";
  statusTone: "emerald" | "amber" | "slate";
};

type QualityDistItem = {
  label: string;
  indexed: number;
  benchmarked: number;
};

type DonutSegment = {
  label: string;
  value: number;
  color: string;
};

type DashStats = {
  totalCandidatesIndexed: number;
  activeJobs: number;
  rankedShortlists: number;
  avgSuccessScore: number;
  hiddenGemsFound: number;
  candidateQualityDistribution: QualityDistItem[];
  talentPoolByRole: DonutSegment[];
  insight: string;
};

const JOB_ICONS = ["smart_toy", "layers", "terminal", "dataset", "web", "analytics"];
const JOB_ICON_BG = [
  "bg-primary-container/10", "bg-secondary/10", "bg-tertiary/10",
  "bg-primary/10", "bg-secondary-container/10", "bg-tertiary-container/10",
];
const JOB_ICON_COLOR = [
  "text-primary", "text-secondary", "text-tertiary",
  "text-primary", "text-secondary", "text-tertiary",
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatToday(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  return now.toLocaleDateString("en-US", options);
}

function maxValue(items: { indexed: number; benchmarked: number }[]): number {
  let max = 0;
  for (const item of items) {
    if (item.indexed > max) max = item.indexed;
    if (item.benchmarked > max) max = item.benchmarked;
  }
  return max || 1;
}

function donutCircumference(radius: number): number {
  return 2 * Math.PI * radius;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAll = useCallback(async () => {
    try {
      const [s, j] = await Promise.all([
        fetchDashboardStats(),
        fetchRecentJobs(),
      ]);
      setStats(s);
      setRecentJobs(j);
      setError("");
    } catch {
      setError("Failed to load dashboard data. Retrying...");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchAll]);

  const greeting = getGreeting();
  const todayStr = formatToday();

  return (
    <AppLayout
      title="Dashboard"
      actionLabel="Create New Job"
      onAction={() => navigate("/create-job")}
    >
      <div className="mx-auto max-w-[1600px] space-y-lg">
        {/* Welcome Header */}
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-geist text-[32px] font-semibold leading-[40px] tracking-[-0.01em] text-on-surface">
              {greeting}, Recruiter
            </h2>
            <p className="mt-1 text-on-surface-variant">
              Here&apos;s an overview of your hiring pipeline and AI-driven candidate insights.
            </p>
          </div>

          {!loading && (
            <div className="flex gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-high px-4 py-2">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  calendar_today
                </span>
                <span className="font-geist text-sm font-semibold tracking-wide">
                  {todayStr}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-md text-red-700">
            <span className="material-symbols-outlined text-red-500">error_outline</span>
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* AI Insight Card */}
        {loading ? (
          <div className="h-20 animate-pulse rounded-xl bg-surface-container-high" />
        ) : (
          <div className="ai-glow flex items-center gap-lg rounded-xl border-l-4 border-tertiary bg-white/60 p-md backdrop-blur-xl">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-tertiary/10">
              <span
                className="material-symbols-outlined text-tertiary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_awesome
              </span>
            </div>

            <div className="flex-1">
              <p className="mb-1 font-geist text-sm font-semibold uppercase tracking-wider text-tertiary">
                AI Strategic Insight
              </p>
              <p className="text-lg font-medium text-on-surface">
                &ldquo;{stats?.insight ?? "Analyzing candidate data..."}&rdquo;
              </p>
            </div>

            <button onClick={() => navigate("/market-insight")} className="rounded-lg bg-tertiary px-4 py-2 font-geist text-sm font-semibold tracking-wide text-on-tertiary transition-opacity hover:opacity-90">
              View Talent Strategy
            </button>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-md md:grid-cols-3 lg:grid-cols-5">
          <KPICard
            icon="groups"
            iconBg="bg-primary/5"
            iconColor="text-primary"
            label="Total Candidates Indexed"
            value={stats ? stats.totalCandidatesIndexed.toLocaleString() : null}
            loading={loading}
          />
          <KPICard
            icon="work"
            iconBg="bg-secondary/5"
            iconColor="text-secondary"
            label="Active Jobs"
            value={stats ? String(stats.activeJobs) : null}
            loading={loading}
          />
          <KPICard
            icon="format_list_numbered"
            iconBg="bg-tertiary/5"
            iconColor="text-tertiary"
            label="Ranked Shortlists"
            value={stats ? String(stats.rankedShortlists) : null}
            loading={loading}
          />
          <div className="flex items-center justify-between rounded-xl border border-outline-variant bg-white p-lg shadow-sm transition-shadow hover:shadow-md">
            <div>
              <p className="mb-1 text-sm font-medium text-on-surface-variant">
                Avg Success Score
              </p>
              {loading ? (
                <div className="h-8 w-16 animate-pulse rounded bg-surface-container-high" />
              ) : (
                <h3 className="font-geist text-[24px] font-semibold leading-[32px] text-on-surface">
                  {stats ? `${stats.avgSuccessScore}%` : "—"}
                </h3>
              )}
            </div>

            {!loading && stats && (
              <RingChart percentage={stats.avgSuccessScore} />
            )}
          </div>
          <KPICard
            icon="diamond"
            iconBg="bg-tertiary/10"
            iconColor="text-tertiary"
            label="Hidden Gems Found"
            value={stats ? String(stats.hiddenGemsFound) : null}
            loading={loading}
            glow
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 gap-lg lg:grid-cols-3">
          {/* Bar Chart */}
          <div className="rounded-xl border border-outline-variant bg-white p-lg shadow-sm lg:col-span-2">
            <div className="mb-6 flex items-center justify-between">
              <h4 className="font-geist text-sm font-semibold uppercase tracking-wider text-on-surface">
                Candidate quality distribution
              </h4>

              <div className="flex gap-2">
                <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Indexed
                </span>
                <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                  <span className="h-2 w-2 rounded-full bg-tertiary-fixed-dim" />
                  Benchmarked
                </span>
              </div>
            </div>

            {loading ? (
              <div className="h-64 animate-pulse rounded bg-surface-container-high" />
            ) : !stats?.candidateQualityDistribution?.length ? (
              <div className="flex h-64 items-center justify-center text-sm text-on-surface-variant">
                No distribution data available
              </div>
            ) : (
              <>
                <div className="flex h-64 items-end gap-1 px-2">
                  {stats.candidateQualityDistribution.map((item) => {
                    const max = maxValue(stats.candidateQualityDistribution);
                    const indexedPct = (item.indexed / max) * 100;
                    const benchPct = (item.benchmarked / max) * 100;
                    return (
                      <div key={item.label} className="relative flex-1 h-full">
                        <div
                          className="absolute bottom-0 left-0 w-1/2 rounded-t-sm bg-primary transition-all duration-300"
                          style={{ height: `${Math.max(indexedPct, 1)}%` }}
                          title={`Indexed: ${item.indexed}`}
                        />
                        <div
                          className="absolute bottom-0 left-1/2 w-1/2 rounded-t-sm bg-tertiary-fixed-dim transition-all duration-300"
                          style={{ height: `${Math.max(benchPct, 1)}%` }}
                          title={`Benchmarked: ${item.benchmarked}`}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex justify-between px-2 text-[10px] font-bold text-on-surface-variant">
                  {stats.candidateQualityDistribution.map((item) => (
                    <span key={item.label}>{item.label.split("-")[0]}</span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Donut Chart */}
          <div className="flex flex-col rounded-xl border border-outline-variant bg-white p-lg shadow-sm">
            <h4 className="mb-6 font-geist text-sm font-semibold uppercase tracking-wider text-on-surface">
              Talent pool by role category
            </h4>

            {loading ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="h-48 w-48 animate-pulse rounded-full bg-surface-container-high" />
              </div>
            ) : (
              <>
                <div className="flex flex-1 flex-col items-center justify-center">
                  <div className="relative h-48 w-48">
                    <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 36 36">
                      {(stats?.talentPoolByRole ?? []).reduce(
                        (acc, seg) => {
                          const prevOffset = acc.offset;
                          const circ = donutCircumference(15.9);
                          const dashLen = (seg.value / 100) * circ;
                          acc.offset += dashLen;
                          acc.elements.push(
                            <circle
                              key={seg.label}
                              cx="18"
                              cy="18"
                              fill="transparent"
                              r="15.9"
                              stroke={seg.color}
                              strokeDasharray={`${dashLen} ${circ - dashLen}`}
                              strokeDashoffset={-prevOffset}
                              strokeWidth="4"
                            />
                          );
                          return acc;
                        },
                        { offset: 0, elements: [] as JSX.Element[] }
                      ).elements}
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[24px] font-bold text-on-surface">
                        {stats
                          ? stats.totalCandidatesIndexed >= 1000
                            ? `${(stats.totalCandidatesIndexed / 1000).toFixed(1)}k`
                            : String(stats.totalCandidatesIndexed)
                          : "—"}
                      </span>
                      <span className="text-[10px] uppercase tracking-tighter text-on-surface-variant">
                        Total Profiles
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2">
                  {(stats?.talentPoolByRole ?? []).map((seg) => (
                    <div key={seg.label} className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-sm"
                        style={{ backgroundColor: seg.color }}
                      />
                      <span className="text-xs text-on-surface-variant">
                        {seg.label} ({seg.value}%)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Recent Jobs Table */}
        <div className="overflow-hidden rounded-xl border border-outline-variant bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-lg py-md">
            <h4 className="font-geist text-sm font-semibold uppercase tracking-wider text-on-surface">
              Recent Active Jobs
            </h4>

            <button className="font-geist text-sm font-semibold tracking-wide text-primary hover:underline">
              View All Jobs
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-lg py-4 font-geist text-sm font-semibold tracking-wide text-on-surface-variant">
                    Job Title
                  </th>
                  <th className="px-lg py-4 font-geist text-sm font-semibold tracking-wide text-on-surface-variant">
                    Candidates Scanned
                  </th>
                  <th className="px-lg py-4 font-geist text-sm font-semibold tracking-wide text-on-surface-variant">
                    Top Score
                  </th>
                  <th className="px-lg py-4 font-geist text-sm font-semibold tracking-wide text-on-surface-variant">
                    Status
                  </th>
                  <th className="px-lg py-4 text-right font-geist text-sm font-semibold tracking-wide text-on-surface-variant">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-outline-variant">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-lg py-4" colSpan={5}>
                        <div className="h-10 animate-pulse rounded bg-surface-container-high" />
                      </td>
                    </tr>
                  ))
                ) : (
                  recentJobs.map((job, i) => (
                    <JobRow
                      key={job.id}
                      jobId={job.id}
                      icon={JOB_ICONS[i % JOB_ICONS.length]}
                      iconBg={JOB_ICON_BG[i % JOB_ICON_BG.length]}
                      iconColor={JOB_ICON_COLOR[i % JOB_ICON_COLOR.length]}
                      title={job.title}
                      subtitle={job.subtitle}
                      scanned={job.scanned}
                      score={job.score}
                      scoreTone={job.scoreTone}
                      status={job.status}
                      statusTone={job.statusTone}
                      onActivate={fetchAll}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Meta */}
        <footer className="flex items-center justify-between pb-12 pt-8 text-on-surface-variant opacity-60">
          <p className="font-geist text-xs">
            SkillOrbit v2.4.1 &bull; Industrial Reliability Protocol Active
          </p>

          <div className="flex gap-4">
            <a className="text-xs transition-colors hover:text-primary" href="#">
              Privacy Policy
            </a>
            <a className="text-xs transition-colors hover:text-primary" href="#">
              Terms of Service
            </a>
          </div>
        </footer>
      </div>
    </AppLayout>
  );
}

function KPICard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  loading,
  glow,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | null;
  loading: boolean;
  glow?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-outline-variant bg-white p-lg shadow-sm transition-shadow hover:shadow-md ${glow ? "relative overflow-hidden" : ""}`}
    >
      {glow && <div className="absolute right-0 top-0 h-16 w-16 bg-gradient-to-bl from-tertiary/10 to-transparent" />}
      <div className="mb-4 flex items-start justify-between">
        <div className={`rounded-lg ${iconBg} p-2`}>
          <span className={`material-symbols-outlined ${iconColor}`}>
            {icon}
          </span>
        </div>
      </div>
      <p className="mb-1 text-sm font-medium text-on-surface-variant">
        {label}
      </p>
      {loading ? (
        <div className="h-8 w-20 animate-pulse rounded bg-surface-container-high" />
      ) : (
        <h3 className="font-geist text-[24px] font-semibold leading-[32px] text-on-surface">
          {value ?? "—"}
        </h3>
      )}
    </div>
  );
}

function RingChart({ percentage }: { percentage: number }) {
  const radius = 24;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (circ * percentage) / 100;
  return (
    <div className="relative h-14 w-14">
      <svg className="h-full w-full -rotate-90">
        <circle
          className="text-surface-container-high"
          cx="28"
          cy="28"
          fill="transparent"
          r={radius}
          stroke="currentColor"
          strokeWidth="4"
        />
        <circle
          className="text-emerald-500"
          cx="28"
          cy="28"
          fill="transparent"
          r={radius}
          stroke="currentColor"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-emerald-700">
        {percentage}%
      </span>
    </div>
  );
}

type JobRowProps = {
  jobId: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  scanned: string;
  score: string;
  scoreTone: "emerald" | "amber";
  status: string;
  statusTone: "emerald" | "amber" | "slate";
  onActivate?: () => void;
};

function JobRow({
  jobId,
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  scanned,
  score,
  scoreTone,
  status,
  statusTone,
  onActivate,
}: JobRowProps) {
  const [activating, setActivating] = useState(false);
  const [activateError, setActivateError] = useState("");
  const scoreClass =
    scoreTone === "emerald"
      ? "border-emerald-200 bg-emerald-100 text-emerald-700"
      : "border-amber-200 bg-amber-100 text-amber-700";

  const statusClass =
    statusTone === "emerald"
      ? "text-emerald-600"
      : statusTone === "amber"
        ? "text-amber-600"
        : "text-on-surface-variant";

  const statusDot =
    statusTone === "emerald"
      ? "bg-emerald-500 animate-pulse"
      : statusTone === "amber"
        ? "bg-amber-500"
        : "bg-outline";

  return (
    <tr className="group transition-colors hover:bg-surface-container-low">
      <td className="px-lg py-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}>
            <span className="material-symbols-outlined text-[20px]">
              {icon}
            </span>
          </div>

          <div>
            <p className="font-medium text-on-surface">{title}</p>
            <p className="text-xs text-on-surface-variant">{subtitle}</p>
          </div>
        </div>
      </td>

      <td className="px-lg py-4">
        <span className="font-medium text-on-surface">{scanned}</span>
      </td>

      <td className="px-lg py-4">
        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${scoreClass}`}>
          {score}
        </span>
      </td>

      <td className="px-lg py-4">
        <span className={`flex items-center gap-2 text-sm font-medium ${statusClass}`}>
          <span className={`h-2 w-2 rounded-full ${statusDot}`} />
          {status}
        </span>
      </td>

      <td className="px-lg py-4 text-right">
        {status === "Draft" ? (
          <div className="flex flex-col items-end gap-1">
            <button
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              disabled={activating}
              onClick={async () => {
                setActivating(true);
                setActivateError("");
                try {
                  await activateJob(jobId);
                  onActivate?.();
                } catch {
                  setActivateError("Failed. Restart backend?");
                } finally {
                  setActivating(false);
                }
              }}
            >
              {activating ? "..." : "Activate"}
            </button>
            {activateError && (
              <span className="text-[10px] text-red-500">{activateError}</span>
            )}
          </div>
        ) : (
          <button className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high">
            <span className="material-symbols-outlined">more_horiz</span>
          </button>
        )}
      </td>
    </tr>
  );
}

