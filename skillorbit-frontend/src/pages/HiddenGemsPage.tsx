import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { detectHiddenGems } from "../api";

type Gem = Awaited<ReturnType<typeof detectHiddenGems>>["gems"][number];

export default function HiddenGemsPage() {
  const navigate = useNavigate();
  const [gems, setGems] = useState<Gem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");

  function loadGems() {
    setLoading(true);
    setError(false);
    detectHiddenGems(50)
      .then((data) => setGems(data.gems))
      .catch(() => {
        setGems([]);
        setError(true);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadGems();
  }, []);

  const filteredGems = gems.filter((g) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      g.role.toLowerCase().includes(q) ||
      g.company.toLowerCase().includes(q)
    );
  });

  return (
    <AppLayout title="Hidden Gem Discovery" searchPlaceholder="Search hidden gems by name, role, or company...">
      <div className="space-y-lg p-lg pb-28">
        {/* Header */}
        <section className="flex flex-col justify-between gap-md md:flex-row md:items-end">
          <div className="space-y-1">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">
              Hidden Gem Discovery
            </h2>
            <p className="font-body-md text-on-surface-variant">
              AI-surfaced candidates with high growth trajectory and non-traditional skill overlap.
            </p>
          </div>

          <div className="flex items-end gap-lg">
            <div className="flex flex-col">
              <span className="font-label-md text-on-surface-variant">Hidden Gems Found</span>
              <span className="font-headline-md text-headline-md text-primary">
                {loading ? "..." : gems.length}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-on-surface-variant">Avg Potential</span>
              <span className="font-headline-md text-headline-md text-tertiary">
                {loading
                  ? "..."
                  : gems.length > 0
                    ? `${Math.round(gems.reduce((s, g) => s + g.gem_score, 0) / gems.length)}%`
                    : "N/A"}
              </span>
            </div>
            <button
              onClick={loadGems}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-tertiary to-primary px-4 py-2 font-label-md text-white shadow-md transition-all hover:opacity-90 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">
                refresh
              </span>
              Re-Detect
            </button>
          </div>
        </section>

        {/* Search */}
        <div className="relative max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-outline">
            search
          </span>
          <input
            type="text"
            placeholder="Filter by name, role, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-outline-variant bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <span className="material-symbols-outlined animate-spin text-4xl text-tertiary">progress_activity</span>
              <p className="text-sm font-medium text-on-surface-variant">Analyzing candidate pool for hidden gems...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-outline-variant bg-white p-xl text-center">
            <span className="material-symbols-outlined text-5xl text-error">error_outline</span>
            <p className="font-body-md font-medium text-error">
              Failed to detect hidden gems
            </p>
            <button
              onClick={loadGems}
              className="rounded-lg bg-primary px-6 py-2 font-label-md text-white"
            >
              Retry Detection
            </button>
          </div>
        ) : gems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-variant bg-white p-xl text-center">
            <span className="material-symbols-outlined text-4xl text-outline">auto_awesome</span>
            <p className="mt-2 font-body-md text-on-surface-variant">
              No hidden gems detected. Make sure the backend is running with sufficient candidate data.
            </p>
          </div>
        ) : filteredGems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-variant bg-white p-xl text-center">
            <span className="material-symbols-outlined text-4xl text-outline">search_off</span>
            <p className="mt-2 font-body-md text-on-surface-variant">
              No hidden gems match your search.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-lg md:grid-cols-2 xl:grid-cols-3">
              {filteredGems.map((gem) => (
                <HiddenGemCard
                  key={gem.id}
                  gem={gem}
                  onViewProfile={() => navigate(`/candidate-profile/${gem.id}`)}
                  onCompare={() => navigate(`/talent-twin?candidate=${gem.id}`)}
                />
              ))}

              {/* Methodology card */}
              <div className="flex flex-col items-center justify-center space-y-md rounded-xl border-2 border-dashed border-tertiary/20 bg-surface-container-high p-lg text-center xl:col-span-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-primary shadow-md">
                  <span className="material-symbols-outlined text-4xl">psychology_alt</span>
                </div>
                <div className="max-w-md">
                  <h4 className="font-headline-md text-on-surface">Detection Methodology</h4>
                  <p className="font-body-sm text-on-surface-variant">
                    Our AI uses three complementary detection strategies — rule-based score gap analysis,
                    Isolation Forest anomaly detection, and DBSCAN clustering — to identify candidates
                    whose potential outpaces their current title.
                  </p>
                </div>
                <button
                  onClick={loadGems}
                  className="rounded-full bg-primary px-6 py-2 font-label-md text-white transition-all hover:shadow-lg hover:shadow-primary/20"
                >
                  Re-Run Detection
                </button>
              </div>
            </div>

            {/* Footer stats */}
            <div className="flex items-center justify-between text-xs text-on-surface-variant">
              <span>
                Showing {filteredGems.length} of {gems.length} hidden gems
              </span>
              <span className="rounded-full bg-tertiary-container px-3 py-1 font-bold text-on-tertiary-container">
                Updated in real-time
              </span>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function HiddenGemCard({ gem, onViewProfile, onCompare }: {
  gem: Gem;
  onViewProfile: () => void;
  onCompare: () => void;
}) {
  return (
    <div className="glass-card ai-glow flex flex-col gap-md rounded-xl border-l-4 border-tertiary p-md transition-all hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-md">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-tertiary to-primary text-lg font-bold text-white shadow-sm">
            #{gem.gem_rank}
          </div>
          <div>
            <h3 className="font-headline-md text-on-surface">{gem.name}</h3>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-tertiary-container px-2 py-0.5 text-[10px] font-bold uppercase text-on-tertiary-container">
                Gem Score: {gem.gem_score}
              </span>
              <span className="font-label-md text-xs text-on-surface-variant">{gem.role}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 border-y border-outline-variant/30 py-2">
        <MetricBlock label="Success" value={`${Math.round(gem.successScore)}%`} />
        <MetricBlock label="Skill Match" value={`${Math.round(gem.skillMatch)}%`} />
        <MetricBlock label="Learning Velocity" value={`${Math.round(gem.learningVelocity)}%`} />
      </div>

      <div className="rounded-lg border border-tertiary/20 bg-tertiary-container/5 p-3">
        <div className="mb-1 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-tertiary">auto_awesome</span>
          <span className="font-label-md text-xs uppercase tracking-tight text-tertiary">AI Insight</span>
        </div>
        <p className="text-body-sm leading-relaxed text-on-surface-variant">{gem.gem_reason}</p>
      </div>

      <div className="mt-auto flex gap-2 pt-2">
        <button
          onClick={onViewProfile}
          className="flex-1 rounded-lg bg-primary px-4 py-2 font-label-md text-white transition-opacity hover:opacity-90"
        >
          View Profile
        </button>
        <button
          onClick={onCompare}
          className="rounded-lg border border-outline px-3 py-2 text-on-surface-variant transition-colors hover:bg-surface-container"
          title="Compare with others"
        >
          <span className="material-symbols-outlined">compare_arrows</span>
        </button>
      </div>
    </div>
  );
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-label-md text-xs text-on-surface-variant">{label}</span>
      <span className="font-bold text-on-surface">{value}</span>
    </div>
  );
}
