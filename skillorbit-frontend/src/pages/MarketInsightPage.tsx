import { useState, useEffect } from "react";
import AppLayout from "../components/layout/AppLayout";
import { getMarketOptions, getMarketInsight, getMarketOpportunities } from "../api";

export default function MarketInsightPage() {
  const [options, setOptions] = useState<{ clusters: string[]; locations: string[] } | null>(null);
  const [selectedCluster, setSelectedCluster] = useState("ML / AI Engineering");
  const [selectedLocation, setSelectedLocation] = useState("San Francisco");
  const [insight, setInsight] = useState<Awaited<ReturnType<typeof getMarketInsight>> | null>(null);
  const [opportunities, setOpportunities] = useState<Awaited<ReturnType<typeof getMarketOpportunities>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMarketOptions()
      .then((opts) => {
        setOptions(opts);
        if (opts.clusters.length) setSelectedCluster(opts.clusters[0]);
        if (opts.locations.length) setSelectedLocation(opts.locations[0]);
      })
      .catch(() => setOptions(null));
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getMarketInsight(selectedCluster, selectedLocation),
      getMarketOpportunities(),
    ])
      .then(([ins, opp]) => {
        setInsight(ins);
        setOpportunities(opp);
      })
      .catch(() => {
        setInsight(null);
        setOpportunities(null);
      })
      .finally(() => setLoading(false));
  }, [selectedCluster, selectedLocation]);

  const trendIcon = (t: string) =>
    t === "growing" ? "trending_up" : t === "declining" ? "trending_down" : "remove";

  const trendColor = (t: string) =>
    t === "growing" ? "text-emerald-600" : t === "declining" ? "text-red-500" : "text-amber-500";

  const densityColor = (d: string) => {
    if (d.includes("Very High") || d.includes("High")) return "text-red-500";
    if (d.includes("Medium")) return "text-amber-500";
    return "text-emerald-600";
  };

  const tierBadge = (t: string) => {
    if (t === "Prime") return "bg-emerald-100 text-emerald-700";
    if (t === "Moderate") return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
  };

  return (
    <AppLayout
      title="Market Insight"
      searchPlaceholder="Search skills, locations, or market data..."
    >
      <div className="min-h-screen bg-[#f8fafc] p-lg">
        <div className="mx-auto max-w-[1400px] space-y-lg">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface">
                AI Market Insight
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Supply/demand analysis, trend forecasting, and hiring intelligence.
              </p>
            </div>
          </div>

          {options && (
            <div className="flex flex-wrap gap-md">
              <select
                value={selectedCluster}
                onChange={(e) => setSelectedCluster(e.target.value)}
                className="rounded-lg border border-outline-variant bg-white px-4 py-2 text-sm font-medium outline-none focus:border-primary"
              >
                {options.clusters.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="rounded-lg border border-outline-variant bg-white px-4 py-2 text-sm font-medium outline-none focus:border-primary"
              >
                {options.locations.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-xl">
              <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
            </div>
          ) : insight ? (
            <>
              <div className="grid grid-cols-12 gap-lg">
                <div className="col-span-12 lg:col-span-8">
                  <div className="rounded-xl border border-outline-variant bg-white p-lg shadow-sm">
                    <h2 className="mb-lg font-headline-md text-headline-md">
                      {insight.skill_cluster} — {insight.location}
                    </h2>
                    <div className="grid grid-cols-2 gap-md md:grid-cols-4">
                      <MetricBox label="Supply" value={insight.supply_count.toString()} icon="people" />
                      <MetricBox label="Demand" value={insight.demand_count.toString()} icon="work" />
                      <MetricBox label="S/D Ratio" value={insight.supply_demand_ratio.toFixed(2)} icon="compare_arrows" />
                      <MetricBox label="Avg Salary" value={`$${(insight.avg_salary_estimate / 1000).toFixed(0)}k`} icon="payments" />
                      <MetricBox label="Competition" value={`${insight.competition_index.toFixed(0)}/100`} icon="speed" />
                      <MetricBox label="Avg Experience" value={`${insight.avg_experience_yrs.toFixed(1)} yrs`} icon="badge" />
                      <MetricBox label="Forecast (3mo)" value={insight.forecast_3mo.toString()} icon="trending_up" />
                      <MetricBox label="Density" value={insight.density_label} icon="density_small" />
                    </div>

                    <div className="mt-lg flex items-center gap-4">
                      <span className={`material-symbols-outlined text-2xl ${trendColor(insight.trend_direction)}`}>
                        {trendIcon(insight.trend_direction)}
                      </span>
                      <span className="text-sm">
                        Supply trend: <strong className={trendColor(insight.trend_direction)}>{insight.trend_direction}</strong> ({insight.trend_pct_6mo > 0 ? "+" : ""}{insight.trend_pct_6mo}% over 6 months)
                      </span>
                    </div>

                    {insight.top_companies_hiring.length > 0 && (
                      <div className="mt-lg border-t border-outline-variant pt-4">
                        <p className="mb-2 font-label-md text-on-surface-variant">Top Hiring Companies</p>
                        <div className="flex flex-wrap gap-2">
                          {insight.top_companies_hiring.map((c) => (
                            <span key={c} className="rounded-lg bg-surface-container-high px-3 py-1 text-xs font-bold">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-span-12 lg:col-span-4">
                  <div className="flex h-full flex-col rounded-xl border border-outline-variant bg-white p-lg shadow-sm">
                    <h3 className="mb-md font-headline-md text-headline-md">AI Summary</h3>
                    <div className="flex-1 rounded-xl bg-gradient-to-br from-inverse-surface to-surface-container-highest p-lg text-white">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-tertiary-fixed">insights</span>
                        <span className="text-xs font-bold uppercase tracking-widest text-tertiary-fixed">Market Intelligence</span>
                      </div>
                      <p className="text-body-sm leading-relaxed">{insight.insight_text}</p>
                    </div>
                  </div>
                </div>
              </div>

              {opportunities && opportunities.results.length > 0 && (
                <div className="rounded-xl border border-outline-variant bg-white p-lg shadow-sm">
                  <h2 className="mb-lg font-headline-md text-headline-md">Opportunity Scores</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-outline-variant text-xs uppercase text-on-surface-variant">
                          <th className="p-3 font-bold">Skill Cluster</th>
                          <th className="p-3 font-bold">Location</th>
                          <th className="p-3 font-bold">Score</th>
                          <th className="p-3 font-bold">Tier</th>
                          <th className="p-3 font-bold">Density</th>
                          <th className="p-3 font-bold">Trend</th>
                          <th className="p-3 font-bold">Competition</th>
                        </tr>
                      </thead>
                      <tbody>
                        {opportunities.results.map((r) => (
                          <tr key={`${r.skill_cluster}-${r.location}`} className="border-b border-outline-variant hover:bg-surface-container-lowest">
                            <td className="p-3 font-medium">{r.skill_cluster}</td>
                            <td className="p-3">{r.location}</td>
                            <td className="p-3 font-bold">{r.opportunity_score}</td>
                            <td className="p-3">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${tierBadge(r.tier)}`}>{r.tier}</span>
                            </td>
                            <td className={`p-3 font-medium ${densityColor(r.density)}`}>{r.density}</td>
                            <td className="p-3">
                              <span className={`material-symbols-outlined align-middle text-lg ${trendColor(r.trend)}`}>
                                {trendIcon(r.trend)}
                              </span>
                            </td>
                            <td className="p-3">{r.competition.toFixed(0)}/100</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-on-surface-variant">Unable to load market data. Ensure the backend is running.</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function MetricBox({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
      <div className="mb-1 flex items-center gap-1 text-xs text-on-surface-variant">
        <span className="material-symbols-outlined text-sm">{icon}</span>
        <span className="font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold text-on-surface">{value}</p>
    </div>
  );
}
