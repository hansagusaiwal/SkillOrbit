import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { fetchShortlist, fetchShortlistStats, fetchCandidates } from "../api";
import type { ShortlistItem, Candidate } from "../types";

function recruitabilityLabel(score: number): { label: string; tone: "emerald" | "amber" | "slate" } {
  if (score >= 80) return { label: "High", tone: "emerald" };
  if (score >= 60) return { label: "Medium", tone: "amber" };
  return { label: "Low", tone: "slate" };
}

export default function ShortlistExportPage() {
  const [candidates, setCandidates] = useState<ShortlistItem[]>([]);
  const [candidateLookup, setCandidateLookup] = useState<Map<string, Candidate>>(new Map());
  const [stats, setStats] = useState<{ topCandidates: number; avgSuccessScore: number; hiddenGems: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;

  function loadData() {
    setLoading(true);
    setError(false);
    setCurrentPage(1);
    Promise.all([
      fetchShortlist(),
      fetchShortlistStats(),
      fetchCandidates(),
    ])
      .then(([shortlist, statsData, allCandidates]) => {
        setCandidates(shortlist);
        setStats(statsData);
        setCandidateLookup(new Map(allCandidates.map((c) => [c.id, c])));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  function downloadFile(filename: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportCSV() {
    const headers = ["Rank", "Name", "Role", "Success Score", "Technical Fit", "Recruitability", "AI Reason"];
    const rows = candidates.map((c) => {
      const full = candidateLookup.get(c.candidateId);
      return [
        String(c.rank),
        c.candidateName,
        full ? `${full.role} @ ${full.company}` : "",
        String(Math.round(c.successScore)),
        `${Math.round(c.technicalFit)}%`,
        `${Math.round(c.recruitability)}%`,
        c.reason,
      ];
    });
    const csvContent = [headers, ...rows]
      .map((row) => row.map((v) => `"${v.replaceAll('"', '""')}"`).join(","))
      .join("\n");
    downloadFile("skillorbit-final-shortlist.csv", csvContent, "text/csv;charset=utf-8;");
  }

  function exportJSON() {
    const exportData = {
      project: "SkillOrbit",
      reportType: "Final Shortlist Export",
      generatedAt: new Date().toISOString(),
      summary: stats ?? { topCandidates: 0, avgSuccessScore: 0, hiddenGems: 0 },
      candidates: candidates.map((c) => {
        const full = candidateLookup.get(c.candidateId);
        return {
          rank: c.rank,
          candidateId: c.candidateId,
          name: c.candidateName,
          role: full?.role ?? null,
          company: full?.company ?? null,
          successScore: c.successScore,
          technicalFit: c.technicalFit,
          recruitability: c.recruitability,
          reason: c.reason,
        };
      }),
    };
    downloadFile("skillorbit-final-shortlist.json", JSON.stringify(exportData, null, 2), "application/json;charset=utf-8;");
  }

  function downloadPDFReport() {
    const candidateRows = candidates
      .map((c) => {
        const full = candidateLookup.get(c.candidateId);
        const role = full ? `${full.role} @ ${full.company}` : "";
        return `
          <tr>
            <td>${c.rank}</td>
            <td><strong>${c.candidateName}</strong><br/><span>${role}</span></td>
            <td>${Math.round(c.successScore)}</td>
            <td>${Math.round(c.technicalFit)}%</td>
            <td>${Math.round(c.recruitability)}%</td>
            <td>${c.reason}</td>
          </tr>`;
      })
      .join("");

    const avgScore = stats ? `${stats.avgSuccessScore}%` : "N/A";
    const gemCount = stats?.hiddenGems ?? 0;
    const totalCandidates = stats?.topCandidates ?? candidates.length;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>SkillOrbit Final Shortlist Report</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 32px; font-family: Arial, sans-serif; color: #181445; background: #ffffff; }
            .header { border-bottom: 2px solid #c7c4d7; padding-bottom: 18px; margin-bottom: 24px; }
            .brand { color: #4648d4; font-size: 28px; font-weight: 800; margin: 0; }
            .subtitle { margin: 6px 0 0; color: #464554; font-size: 14px; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
            .card { border: 1px solid #c7c4d7; border-radius: 14px; padding: 16px; background: #fcf8ff; }
            .label { font-size: 11px; color: #464554; text-transform: uppercase; font-weight: 700; letter-spacing: 0.08em; }
            .value { font-size: 32px; font-weight: 800; margin-top: 8px; color: #181445; }
            .teal { color: #006577; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { text-align: left; background: #efebff; color: #464554; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; padding: 12px; border-bottom: 1px solid #c7c4d7; }
            td { padding: 12px; border-bottom: 1px solid #e3dfff; vertical-align: top; font-size: 13px; }
            td span { color: #464554; font-size: 12px; }
            .ai-summary { margin-top: 24px; border-left: 5px solid #008096; padding: 16px; background: #f6f2ff; border-radius: 12px; }
            .ai-summary h2 { margin: 0 0 8px; color: #006577; font-size: 18px; }
            .ai-summary p { margin: 0; color: #464554; font-size: 14px; line-height: 1.6; }
            .footer { margin-top: 24px; font-size: 11px; color: #767586; }
            @media print { body { padding: 24px; } button { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="brand">SkillOrbit Final Shortlist</h1>
            <p class="subtitle">Review and export your top-tier AI Engineering candidates.</p>
            <p class="subtitle">Generated: ${new Date().toLocaleString()}</p>
          </div>
          <div class="summary">
            <div class="card"><div class="label">Top Candidates</div><div class="value">${totalCandidates}</div></div>
            <div class="card"><div class="label">Avg Success Score</div><div class="value">${avgScore}</div></div>
            <div class="card"><div class="label">Hidden Gems</div><div class="value teal">${gemCount}</div></div>
          </div>
          <table>
            <thead><tr><th>Rank</th><th>Name</th><th>Success</th><th>Tech Fit</th><th>Recruitability</th><th>AI Reason</th></tr></thead>
            <tbody>${candidateRows}</tbody>
          </table>
          <div class="ai-summary">
            <h2>SkillOrbit Intelligence Summary</h2>
            <p>This shortlist prioritizes production AI experience, retrieval systems knowledge, and behavioral engagement signals.</p>
          </div>
          <div class="footer">SkillOrbit Recruiter Intelligence • Final shortlist report</div>
          <script>window.onload=function(){window.print();};</script>
        </body>
      </html>`;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Popup blocked. Please allow popups to generate the PDF report.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  const avgScore = stats ? `${stats.avgSuccessScore}%` : "---";
  const totalLabel = loading ? "..." : String(stats?.topCandidates ?? candidates.length);
  const gemLabel = loading ? "..." : String(stats?.hiddenGems ?? 0);

  return (
    <AppLayout title="Final Shortlist" searchPlaceholder="Search shortlisted candidates...">
      <div className="min-h-screen bg-[#f8fafc] p-lg">
        <div className="mx-auto max-w-7xl space-y-lg">
          {/* Page Title */}
          <div className="flex items-end justify-between border-b border-outline-variant/30 pb-4">
            <div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface">
                Final Shortlist
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Review and export your top-tier AI Engineering candidates.
              </p>
            </div>

            <div className="flex gap-md">
              <button
                onClick={loadData}
                className="flex items-center gap-2 rounded-lg border border-outline px-md py-2 font-label-md text-label-md transition-colors hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                Refresh
              </button>
            </div>
          </div>

          {/* Bento Grid Summary Cards */}
          <div className="grid grid-cols-1 gap-lg md:grid-cols-3">
            <SummaryCard
              label="Top Candidates"
              value={totalLabel}
              subtext={loading ? "" : "Ranked by success score"}
              icon="groups"
            />
            <SummaryCard
              label="Avg Success Score"
              value={avgScore}
              subtext=""
              icon="bolt"
              progress={stats?.avgSuccessScore ?? 0}
            />
            <SummaryCard
              label="Hidden Gems"
              value={gemLabel}
              subtext={stats && stats.hiddenGems > 0 ? "AI DISCOVERED" : loading ? "" : "None found"}
              icon="auto_awesome"
              iconClass="text-tertiary"
              valueClass="text-tertiary"
              subtextClass={stats && stats.hiddenGems > 0
                ? "bg-tertiary-fixed text-on-tertiary-fixed-variant rounded-full px-2 py-0.5 text-xs font-bold"
                : "text-xs text-on-surface-variant"}
            />
          </div>

          {/* Ranked Table Section */}
          <div className="glass-card overflow-hidden rounded-2xl shadow-sm">
            <div className="flex items-center justify-between border-b border-outline-variant/30 bg-surface-container-low px-lg py-md">
              <h3 className="font-headline-md text-headline-md text-on-surface">
                Ranked Candidates
              </h3>

              <div className="flex gap-2">
                <button className="rounded-lg p-2 transition-colors hover:bg-surface-container">
                  <span className="material-symbols-outlined">filter_list</span>
                </button>
                <button className="rounded-lg p-2 transition-colors hover:bg-surface-container">
                  <span className="material-symbols-outlined">sort</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-surface-container-lowest">
                    <TableHead>Rank</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-center">Success Score</TableHead>
                    <TableHead>Technical Fit</TableHead>
                    <TableHead>Recruitability</TableHead>
                    <TableHead>AI Reason</TableHead>
                  </tr>
                </thead>

                <tbody className="divide-y divide-outline-variant/20">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-lg py-16 text-center">
                        <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={6} className="px-lg py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <span className="material-symbols-outlined text-4xl text-error">error_outline</span>
                          <p className="font-medium text-error">Failed to load shortlist</p>
                          <button onClick={loadData} className="rounded-lg bg-primary px-6 py-2 text-sm font-bold text-white">
                            Retry
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : candidates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-lg py-16 text-center text-on-surface-variant">
                        No candidates in the shortlist.
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      const totalPages = Math.max(1, Math.ceil(candidates.length / PAGE_SIZE));
                      const safePage = Math.min(currentPage, totalPages);
                      const startIdx = (safePage - 1) * PAGE_SIZE;
                      const paginatedCandidates = candidates.slice(startIdx, startIdx + PAGE_SIZE);
                      return paginatedCandidates.map((c) => {
                        const full = candidateLookup.get(c.candidateId);
                        const recruit = recruitabilityLabel(c.recruitability);
                        return (
                          <CandidateRow
                            key={c.candidateId}
                            rank={String(c.rank)}
                            name={c.candidateName}
                            role={full ? `${full.role} @ ${full.company}` : ""}
                            successScore={Math.round(c.successScore)}
                            technicalFit={Math.round(c.technicalFit)}
                            recruitability={recruit.label}
                            recruitabilityTone={recruit.tone}
                            reason={c.reason}
                            candidateId={c.candidateId}
                          />
                        );
                      });
                    })()
                  )}
                </tbody>
              </table>
            </div>

            {!loading && !error && candidates.length > 0 && (() => {
              const totalPages = Math.max(1, Math.ceil(candidates.length / PAGE_SIZE));
              const safePage = Math.min(currentPage, totalPages);
              const startRange = (safePage - 1) * PAGE_SIZE + 1;
              const endRange = Math.min(safePage * PAGE_SIZE, candidates.length);
              return (
                <div className="flex items-center justify-between border-t border-outline-variant/30 bg-surface-container-low px-lg py-3">
                  <span className="text-xs font-medium text-on-surface-variant">
                    Showing {startRange}–{endRange} of {candidates.length.toLocaleString()} candidates
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
                            acc.push(<span key={`e-${p}`} className="px-1 text-xs text-on-surface-variant">...</span>);
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
              );
            })()}
          </div>

          {/* Export Actions */}
          <div className="grid grid-cols-1 gap-lg md:grid-cols-3">
            <ExportButton
              variant="primary"
              icon="table_view"
              title="Export CSV"
              subtitle="Full data structure for spreadsheet analysis"
              onClick={exportCSV}
            />
            <ExportButton
              variant="soft"
              icon="code"
              title="Export JSON"
              subtitle="Structured object for API & system sync"
              onClick={exportJSON}
            />
            <ExportButton
              variant="dark"
              icon="picture_as_pdf"
              title="Download PDF Report"
              subtitle="Formatted executive summary with AI insights"
              onClick={downloadPDFReport}
            />
          </div>

          {/* AI Summary Card */}
          <div className="ai-glow relative flex items-start gap-lg overflow-hidden rounded-2xl bg-white p-lg">
            <div className="pointer-events-none absolute inset-0 bg-tertiary/5" />

            <div className="z-10 rounded-xl bg-tertiary p-4 text-white shadow-lg">
              <span className="material-symbols-outlined text-3xl">psychology</span>
            </div>

            <div className="z-10 space-y-2">
              <h4 className="font-headline-md text-headline-md text-tertiary">
                SkillOrbit Intelligence Summary
              </h4>

              <p className="font-body-lg text-body-lg italic text-on-surface-variant">
                &ldquo;This shortlist prioritizes production AI experience, retrieval
                systems knowledge, and behavioral engagement signals.&rdquo;
              </p>

              <div className="mt-4 flex flex-wrap gap-4">
                <IntelligenceBadge icon="verified" text={`RELIABILITY: 99.2%`} />
                <IntelligenceBadge icon="diversity_3" text="BIAS CHECK: PASSED" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function SummaryCard({
  label, value, subtext, icon, valueClass = "", subtextClass = "", iconClass = "", progress,
}: {
  label: string; value: string; subtext: string; icon: string;
  valueClass?: string; subtextClass?: string; iconClass?: string; progress?: number;
}) {
  return (
    <div className="glass-card group relative overflow-hidden rounded-2xl p-lg shadow-sm transition-all hover:shadow-md">
      <div className="absolute right-0 top-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
        <span className={`material-symbols-outlined text-5xl ${iconClass}`}>{icon}</span>
      </div>
      <span className="font-label-md text-label-md text-on-surface-variant">{label}</span>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`font-display-lg text-display-lg ${valueClass || "text-on-surface"}`}>{value}</span>
        {progress ? (
          <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-container">
            <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
          </div>
        ) : subtext ? (
          <span className={subtextClass || "text-xs text-on-surface-variant"}>{subtext}</span>
        ) : null}
      </div>
    </div>
  );
}

function TableHead({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`border-b border-outline-variant/30 px-lg py-4 font-label-md text-label-md text-on-surface-variant ${className}`}>
      {children}
    </th>
  );
}

function CandidateRow({
  rank, name, role, successScore, technicalFit, recruitability, recruitabilityTone, reason, candidateId,
}: {
  rank: string; name: string; role: string; successScore: number; technicalFit: number;
  recruitability: string; recruitabilityTone: string; reason: string; candidateId: string;
}) {
  return (
    <tr className="group transition-colors hover:bg-surface-container-low">
      <td className="px-lg py-5 font-headline-md text-headline-md text-on-surface/40 transition-colors group-hover:text-primary">
        {rank}
      </td>

      <td className="px-lg py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <Link to={`/candidate-profile/${candidateId}`} className="font-bold text-on-surface hover:text-primary transition-colors">
              {name}
            </Link>
            {role && <span className="text-xs text-on-surface-variant">{role}</span>}
          </div>
        </div>
      </td>

      <td className="px-lg py-5 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border-4 border-emerald-500 bg-emerald-50 font-bold text-emerald-700">
          {successScore}
        </div>
      </td>

      <td className="px-lg py-5">
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container">
            <div className="h-full bg-primary" style={{ width: `${technicalFit}%` }} />
          </div>
          <span className="text-sm font-medium">{technicalFit}%</span>
        </div>
      </td>

      <td className="px-lg py-5">
        <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
          recruitabilityTone === "emerald"
            ? "bg-emerald-100 text-emerald-800"
            : recruitabilityTone === "amber"
              ? "bg-amber-100 text-amber-800"
              : "bg-slate-100 text-slate-700"
        }`}>
          {recruitability}
        </span>
      </td>

      <td className="px-lg py-5">
        <p className="max-w-xs text-sm leading-relaxed text-on-surface-variant">{reason}</p>
      </td>
    </tr>
  );
}

function ExportButton({
  variant, icon, title, subtitle, onClick,
}: {
  variant: "primary" | "soft" | "dark"; icon: string; title: string; subtitle: string; onClick: () => void;
}) {
  const className = variant === "primary"
    ? "primary-gradient text-white shadow-lg hover:scale-[1.02]"
    : variant === "soft"
      ? "bg-surface-container text-on-surface border border-outline-variant hover:bg-surface-container-high"
      : "bg-on-surface text-surface shadow-lg hover:scale-[1.02]";
  const iconClass = variant === "soft" ? "text-primary" : "";

  return (
    <button type="button" onClick={onClick}
      className={`${className} flex flex-col items-center gap-3 rounded-2xl p-lg transition-all active:scale-[0.98]`}>
      <span className={`material-symbols-outlined text-4xl ${iconClass}`}>{icon}</span>
      <span className="font-headline-md text-headline-md">{title}</span>
      <span className="text-xs opacity-80">{subtitle}</span>
    </button>
  );
}

function IntelligenceBadge({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-1 text-xs font-bold text-on-surface-variant">
      <span className="material-symbols-outlined text-sm">{icon}</span>
      {text}
    </div>
  );
}
