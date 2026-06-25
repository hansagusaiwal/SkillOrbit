import {
  BrainCircuit,
  Briefcase,
  FileDown,
  Gem,
  LayoutDashboard,
  LogOut,
  Network,
  PlusCircle,
  Search,
  UserRound,
  BarChart3,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Create Job", path: "/create-job", icon: PlusCircle },
  { label: "Job Intelligence", path: "/job-intelligence", icon: BrainCircuit },
  { label: "Candidate Discovery", path: "/candidate-discovery", icon: Search },
  { label: "Candidate Profile", path: "/candidate-profile", icon: UserRound },
  { label: "Hidden Gems", path: "/hidden-gems", icon: Gem },
  { label: "Talent Twin / Compare", path: "/talent-twin", icon: Network },
  { label: "Shortlist Export", path: "/shortlist-export", icon: FileDown },
  { label: "Market Insight", path: "/market-insight", icon: BarChart3 },
];

export default function Sidebar() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("skillorbit-auth");
    navigate("/");
  }

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-[260px] flex-col bg-[#645efb] text-white shadow-sm">
      {/* Logo */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <Briefcase className="h-5 w-5 text-white" />
          </div>

          <div>
            <h1 className="text-lg font-extrabold leading-none tracking-tight text-white">
              SkillOrbit
            </h1>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-white/70">
              AI Hiring Intelligence
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-2 flex flex-1 flex-col">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 border-l-4 px-5 py-2.5 text-[13px] font-bold transition",
                  isActive
                    ? "border-[#acedff] bg-white/12 text-white"
                    : "border-transparent text-white/72 hover:bg-white/8 hover:text-white",
                ].join(" ")
              }
            >
              <Icon className="h-4.5 w-4.5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="mt-auto border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/8 p-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-xs font-extrabold">
            AC
          </div>

          <div>
            <p className="text-xs font-extrabold text-white">Alex Chen</p>
            <p className="text-[10px] text-white/60">Senior Lead Recruiter</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-white/20 active:scale-[0.98]"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}