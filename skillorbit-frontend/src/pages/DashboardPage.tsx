import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { fetchDashboardStats, fetchRecentJobs } from "../api";

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

type DashStats = {
  totalCandidatesIndexed: number;
  activeJobs: number;
  rankedShortlists: number;
  avgSuccessScore: number;
  hiddenGemsFound: number;
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);

  useEffect(() => {
    fetchDashboardStats().then(setStats).catch(() => {});
    fetchRecentJobs().then(setRecentJobs).catch(() => {});
  }, []);

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
              Welcome back, Recruiter
            </h2>
            <p className="mt-1 text-on-surface-variant">
              Here&apos;s an overview of your hiring pipeline and AI-driven candidate insights.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-high px-4 py-2">
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                calendar_today
              </span>
              <span className="font-geist text-sm font-semibold tracking-wide">
                Oct 24, 2023 - Today
              </span>
            </div>
          </div>
        </div>

        {/* AI Insight Card */}
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
              “Your AI Engineering roles have high candidate quality but low
              recruitability in senior profiles.”
            </p>
          </div>

          <button className="rounded-lg bg-tertiary px-4 py-2 font-geist text-sm font-semibold tracking-wide text-on-tertiary transition-opacity hover:opacity-90">
            View Talent Strategy
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-md md:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-xl border border-outline-variant bg-white p-lg shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 flex items-start justify-between">
              <div className="rounded-lg bg-primary/5 p-2">
                <span className="material-symbols-outlined text-primary">
                  groups
                </span>
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-600">
                +4.2%
              </span>
            </div>
            <p className="mb-1 text-sm font-medium text-on-surface-variant">
              Total Candidates Indexed
            </p>
            <h3 className="font-geist text-[24px] font-semibold leading-[32px] text-on-surface">
              {stats ? stats.totalCandidatesIndexed.toLocaleString() : "—"}
            </h3>
          </div>

          <div className="rounded-xl border border-outline-variant bg-white p-lg shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 flex items-start justify-between">
              <div className="rounded-lg bg-secondary/5 p-2">
                <span className="material-symbols-outlined text-secondary">
                  work
                </span>
              </div>
            </div>
            <p className="mb-1 text-sm font-medium text-on-surface-variant">
              Active Jobs
            </p>
            <h3 className="font-geist text-[24px] font-semibold leading-[32px] text-on-surface">
              {stats ? stats.activeJobs : "—"}
            </h3>
          </div>

          <div className="rounded-xl border border-outline-variant bg-white p-lg shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 flex items-start justify-between">
              <div className="rounded-lg bg-tertiary/5 p-2">
                <span className="material-symbols-outlined text-tertiary">
                  format_list_numbered
                </span>
              </div>
            </div>
            <p className="mb-1 text-sm font-medium text-on-surface-variant">
              Ranked Shortlists
            </p>
            <h3 className="font-geist text-[24px] font-semibold leading-[32px] text-on-surface">
              {stats ? stats.rankedShortlists : "—"}
            </h3>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-outline-variant bg-white p-lg shadow-sm transition-shadow hover:shadow-md">
            <div>
              <p className="mb-1 text-sm font-medium text-on-surface-variant">
                Avg Success Score
              </p>
              <h3 className="font-geist text-[24px] font-semibold leading-[32px] text-on-surface">
                {stats ? `${stats.avgSuccessScore}%` : "—"}
              </h3>
            </div>

            <div className="relative h-14 w-14">
              <svg className="h-full w-full -rotate-90">
                <circle
                  className="text-surface-container-high"
                  cx="28"
                  cy="28"
                  fill="transparent"
                  r="24"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <circle
                  className="text-emerald-500"
                  cx="28"
                  cy="28"
                  fill="transparent"
                  r="24"
                  stroke="currentColor"
                  strokeDasharray="150.79"
                  strokeDashoffset="21.11"
                  strokeWidth="4"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-emerald-700">
                {stats ? `${stats.avgSuccessScore}%` : "—"}
              </span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-outline-variant bg-white p-lg shadow-sm transition-shadow hover:shadow-md">
            <div className="absolute right-0 top-0 h-16 w-16 bg-gradient-to-bl from-tertiary/10 to-transparent" />
            <div className="mb-4 flex items-start justify-between">
              <div className="rounded-lg bg-tertiary/10 p-2">
                <span className="material-symbols-outlined text-tertiary">
                  diamond
                </span>
              </div>
            </div>
            <p className="mb-1 text-sm font-medium text-on-surface-variant">
              Hidden Gems Found
            </p>
            <h3 className="font-geist text-[24px] font-semibold leading-[32px] text-on-surface">
              {stats ? stats.hiddenGemsFound : "—"}
            </h3>
          </div>
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

            <div className="flex h-64 items-end justify-between gap-2 px-2">
              <ChartBar height="10%" color="bg-primary/10" tooltip="12%" />
              <ChartBar height="25%" color="bg-primary/20" />
              <ChartBar height="45%" color="bg-primary/40" />
              <ChartBar height="70%" color="bg-primary/60" />
              <ChartBar height="90%" color="bg-primary/80" tooltip="84%" />
              <ChartBar height="100%" color="bg-primary" />
              <ChartBar height="65%" color="bg-primary/80" />
              <ChartBar height="30%" color="bg-primary/40" />
              <ChartBar height="15%" color="bg-primary/20" />
              <ChartBar height="5%" color="bg-primary/10" />
            </div>

            <div className="mt-4 flex justify-between px-2 text-[10px] font-bold text-on-surface-variant">
              <span>0</span>
              <span>10</span>
              <span>20</span>
              <span>30</span>
              <span>40</span>
              <span>50</span>
              <span>60</span>
              <span>70</span>
              <span>80</span>
              <span>90</span>
              <span>100</span>
            </div>
          </div>

          {/* Donut Chart */}
          <div className="flex flex-col rounded-xl border border-outline-variant bg-white p-lg shadow-sm">
            <h4 className="mb-6 font-geist text-sm font-semibold uppercase tracking-wider text-on-surface">
              Talent pool by role category
            </h4>

            <div className="flex flex-1 flex-col items-center justify-center">
              <div className="relative h-48 w-48">
                <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    fill="transparent"
                    r="15.9"
                    stroke="#4648d4"
                    strokeDasharray="35 100"
                    strokeWidth="4"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    fill="transparent"
                    r="15.9"
                    stroke="#645efb"
                    strokeDasharray="25 100"
                    strokeDashoffset="-35"
                    strokeWidth="4"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    fill="transparent"
                    r="15.9"
                    stroke="#008096"
                    strokeDasharray="25 100"
                    strokeDashoffset="-60"
                    strokeWidth="4"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    fill="transparent"
                    r="15.9"
                    stroke="#c0c1ff"
                    strokeDasharray="15 100"
                    strokeDashoffset="-85"
                    strokeWidth="4"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[24px] font-bold text-on-surface">
                    100k
                  </span>
                  <span className="text-[10px] uppercase tracking-tighter text-on-surface-variant">
                    Total Profiles
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2">
              <Legend color="bg-primary" label="AI Engineering" />
              <Legend color="bg-secondary-container" label="Backend" />
              <Legend color="bg-tertiary-container" label="Cloud/DevOps" />
              <Legend color="bg-primary-fixed" label="Frontend" />
            </div>
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
                {recentJobs.map((job, i) => (
                  <JobRow
                    key={job.id}
                    icon={["smart_toy", "layers", "terminal"][i] || "work"}
                    iconBg={["bg-primary-container/10", "bg-secondary/10", "bg-tertiary/10"][i] || "bg-surface-container"}
                    iconColor={["text-primary", "text-secondary", "text-tertiary"][i] || "text-on-surface"}
                    title={job.title}
                    subtitle={job.subtitle}
                    scanned={job.scanned}
                    score={job.score}
                    scoreTone={job.scoreTone}
                    status={job.status}
                    statusTone={job.statusTone}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Meta */}
        <footer className="flex items-center justify-between pb-12 pt-8 text-on-surface-variant opacity-60">
          <p className="font-geist text-xs">
            SkillOrbit v2.4.1 • Industrial Reliability Protocol Active
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

function ChartBar({
  height,
  color,
  tooltip,
}: {
  height: string;
  color: string;
  tooltip?: string;
}) {
  return (
    <div
      className={`group relative flex-1 rounded-t-sm ${color}`}
      style={{ height }}
    >
      {tooltip && (
        <div className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 rounded bg-on-surface px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
          {tooltip}
        </div>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-3 w-3 rounded-sm ${color}`} />
      <span className="text-xs text-on-surface-variant">{label}</span>
    </div>
  );
}

type JobRowProps = {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  scanned: string;
  scannedChange?: string;
  score: string;
  scoreTone: "emerald" | "amber";
  status: string;
  statusTone: "emerald" | "amber" | "slate";
};

function JobRow({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  scanned,
  scannedChange,
  score,
  scoreTone,
  status,
  statusTone,
}: JobRowProps) {
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
        <div className="flex items-center gap-2">
          <span className="font-medium text-on-surface">{scanned}</span>
          {scannedChange && (
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-600">
              {scannedChange}
            </span>
          )}
        </div>
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
        <button className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high">
          <span className="material-symbols-outlined">more_horiz</span>
        </button>
      </td>
    </tr>
  );
}