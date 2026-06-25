import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api";

export default function LoginPage() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const form = event.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    setLoading(true);

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch {
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex h-screen w-full overflow-hidden bg-background text-on-background">
      {/* Left: Branding & AI Insights Panel */}
      <section className="custom-gradient relative hidden h-screen flex-col items-center justify-center overflow-hidden px-12 py-8 lg:flex lg:w-1/2">
        {/* Decorative Glow */}
        <div className="pointer-events-none absolute -left-32 top-20 h-80 w-80 rounded-full bg-primary-fixed-dim/20 blur-[120px]" />
        <div className="pointer-events-none absolute -right-24 bottom-24 h-96 w-96 rounded-full bg-tertiary-fixed/20 blur-[130px]" />

        <div className="relative z-10 w-full max-w-xl">
          {/* Brand Identity */}
          <div className="mb-5">
            <div className="mb-md flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-lg">
                <span
                  className="material-symbols-outlined text-3xl text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  auto_awesome
                </span>
              </div>

              <h1 className="font-headline-lg text-headline-lg font-bold tracking-tight text-white">
                SkillOrbit
              </h1>
            </div>

            <p className="mb-2 font-display-lg text-[38px] font-bold leading-[42px] tracking-[-0.03em] text-white">
              Beyond matching.
              <br />
              <span className="text-tertiary-fixed">
                Predict hiring success.
              </span>
            </p>

            <p className="max-w-lg text-[15px] leading-6 text-primary-fixed-dim/80">
              SkillOrbit leverages advanced neural matching to find candidates
              that don&apos;t just fit the description, but excel in your
              culture.
            </p>
          </div>

          {/* AI Dashboard Preview Card */}
          <div className="login-glass-panel ai-glow rounded-xl p-4.5 transition-all duration-500 hover:scale-[1.02]">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-label-md text-label-md text-white/90">
                Top Candidate Insights
              </span>

              <span className="rounded-full bg-tertiary px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                AI Ranked
              </span>
            </div>

            {/* Candidate Row */}
            <div className="mb-sm flex items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-md">
              <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-tertiary-fixed">
                <img
                  className="h-full w-full object-cover"
                  alt="Sarah Chen"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBiZa_gpdWf33lmNvj0_I2atbXio5XcGSCTFxgchoC1rcXj-n-SN4DIY5iNwLsxPIC9U321A382k3fOfUqebjZ078O3ChgoF8B97FaZ8KCz6G_yWGt-tCyhlgU-wVXJ7zBndk9xtjBtElmB_FhhNU4YfTRpc4-nMVdGJdA9RBWOVfLUs3QaY_kgAhFnX55uZ4n7Rc0mNQgITMfTyUNj3OKK1rzTY_ERPgPuOLxBYB-9M0Y8gflJtDRQ2D8aiiUreDZyuljsB1lHZfoz"
                />
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <h4 className="font-headline-md text-base text-white">
                    Sarah Chen
                  </h4>
                  <span className="text-lg font-bold text-emerald-400">
                    98%
                  </span>
                </div>

                <p className="text-body-sm text-white/60">
                  Senior Cloud Architect
                </p>
              </div>
            </div>

            {/* AI Insights Chips */}
            <div className="grid grid-cols-2 gap-sm">
              <div className="flex items-center gap-2 rounded-lg bg-white/10 p-sm">
                <span className="material-symbols-outlined text-sm text-tertiary-fixed">
                  trending_up
                </span>
                <span className="text-[12px] font-medium text-white/90">
                  Fast-track potential
                </span>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-white/10 p-sm">
                <span className="material-symbols-outlined text-sm text-tertiary-fixed">
                  psychology
                </span>
                <span className="text-[12px] font-medium text-white/90">
                  Culture Catalyst
                </span>
              </div>
            </div>

            <div className="mt-md border-t border-white/10 pt-md">
              <div className="flex items-center gap-2 text-xs text-white/50">
                <span className="material-symbols-outlined text-xs">info</span>
                <span>
                  Candidate matched based on 14 predictive data points.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="absolute bottom-6 left-12 flex gap-10 text-white/40">
          <div>
            <p className="text-xl font-bold text-white/80">14k+</p>
            <p className="text-xs uppercase tracking-widest">Placements</p>
          </div>

          <div>
            <p className="text-xl font-bold text-white/80">99.2%</p>
            <p className="text-xs uppercase tracking-widest">Retention Rate</p>
          </div>
        </div>
      </section>

      {/* Right: Login Form */}
      <section className="flex h-screen w-full items-center justify-center bg-surface px-6 py-6 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Mobile Branding */}
          <div className="mb-xl flex items-center justify-center gap-2 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <span className="material-symbols-outlined text-2xl text-white">
                auto_awesome
              </span>
            </div>

            <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">
              SkillOrbit
            </h1>
          </div>

          <div className="rounded-xl border border-outline-variant bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="mb-1 font-headline-lg text-[30px] font-semibold leading-9 text-on-surface">
                Welcome Back
              </h2>

              <p className="font-body-md text-body-md text-on-surface-variant">
                Access your AI recruitment dashboard.
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-error-container/10 px-4 py-3 text-sm font-medium text-error">
                {error}
              </div>
            )}

            <form className="space-y-3.5" onSubmit={handleSubmit}>
              {/* Email Field */}
              <div className="space-y-xs">
                <label
                  className="ml-1 font-label-md text-label-md text-on-surface-variant"
                  htmlFor="email"
                >
                  Email Address
                </label>

                <div className="group relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline transition-colors group-focus-within:text-primary">
                    mail
                  </span>

                  <input
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-2 pl-12 pr-4 font-body-md outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary"
                    id="email"
                    placeholder="name@company.com"
                    type="email"
                    defaultValue="recruiter@skillorbit.ai"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-xs">
                <div className="flex items-center justify-between px-1">
                  <label
                    className="font-label-md text-label-md text-on-surface-variant"
                    htmlFor="password"
                  >
                    Password
                  </label>

                  <button
                    type="button"
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="group relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline transition-colors group-focus-within:text-primary">
                    lock
                  </span>

                  <input
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-2 pl-12 pr-12 font-body-md outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary"
                    id="password"
                    placeholder="••••••••"
                    type={showPassword ? "text" : "password"}
                    defaultValue="demo123"
                    required
                  />

                  <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label="Toggle password visibility"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-md pt-sm">
                <button
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 font-label-md text-label-md text-white shadow-md transition-all hover:bg-secondary hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-sm">
                        sync
                      </span>
                      Validating Credentials...
                    </>
                  ) : (
                    <>
                      Sign In to SkillOrbit
                      <span className="material-symbols-outlined text-sm">
                        arrow_forward
                      </span>
                    </>
                  )}
                </button>

                <div className="my-3 flex items-center gap-4">
                  <div className="h-px flex-1 bg-outline-variant" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-outline-variant">
                    or
                  </span>
                  <div className="h-px flex-1 bg-outline-variant" />
                </div>

                <button
                  className="flex w-full items-center justify-center gap-3 rounded-lg border border-outline-variant bg-white py-2.5 font-label-md text-label-md text-on-surface transition-all hover:bg-surface-container-low"
                  type="button"
                  onClick={() => navigate("/dashboard")}
                >
                  <img
                    alt="Google Logo"
                    className="h-5 w-5"
                    src="https://www.svgrepo.com/show/475656/google-color.svg"
                  />
                  Continue with Google
                </button>
              </div>
            </form>

            {/* Sign Up Link */}
            <div className="mt-5 text-center">
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Don&apos;t have an account yet?
                <button
                  type="button"
                  className="ml-1 font-bold text-primary hover:underline"
                >
                  Create an account
                </button>
              </p>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-3 flex justify-center gap-md font-label-md text-xs text-outline">
            <button className="hover:text-on-surface-variant" type="button">
              Privacy Policy
            </button>
            <span>•</span>
            <button className="hover:text-on-surface-variant" type="button">
              Terms of Service
            </button>
            <span>•</span>
            <button className="hover:text-on-surface-variant" type="button">
              Security
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
