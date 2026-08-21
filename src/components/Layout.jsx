import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Target, LogOut } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const nav = [
  { to: "/", label: "Home" },
  { to: "/join", label: "Register" },
  { to: "/roster", label: "Roster" },
  { to: "/group-stage", label: "Groups" },
  { to: "/playoffs", label: "Playoffs" },
  { to: "/ratings", label: "Ratings" },
  { to: "/team-play", label: "Team Play" },
  { to: "/events", label: "Events" },
  { to: "/predictions", label: "Predictions" },
  { to: "/history", label: "History" },
  { to: "/rules", label: "Rules" },
];

function NavLinks({ pathname }) {
  return nav.map((n) => (
    <Link
      key={n.to}
      to={n.to}
      className={`px-2.5 py-2 text-[10px] sm:text-[11px] uppercase tracking-[0.15em] rounded-md transition-colors duration-300 whitespace-nowrap ${
        pathname === n.to ? "text-red-500 bg-red-600/10" : "text-zinc-400 hover:text-zinc-100"
      }`}
    >
      {n.label}
    </Link>
  ));
}

export default function Layout() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 font-body selection:bg-red-600/40 overflow-x-hidden">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0a0a0b]/80 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 group">
              <Target className="w-5 h-5 text-red-600 transition-transform duration-500 group-hover:rotate-90" />
              <span className="text-[13px] tracking-[0.25em] uppercase font-semibold">WCC</span>
            </Link>
            <div className="flex items-center gap-3">
              <nav className="hidden sm:flex items-center gap-2">
                <NavLinks pathname={pathname} />
              </nav>
              {user ? (
                <button
                  onClick={() => logout()}
                  className="flex items-center gap-1.5 px-3 py-2 text-[11px] uppercase tracking-[0.15em] rounded-md text-zinc-400 hover:text-red-500 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />Logout
                </button>
              ) : (
                <Link
                  to="/login"
                  className="px-3 py-2 text-[11px] uppercase tracking-[0.15em] rounded-md text-red-500 hover:text-red-400 transition-colors"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
          <nav className="flex sm:hidden items-center gap-1 overflow-x-auto no-scrollbar pb-2 -mx-6 px-6">
            <NavLinks pathname={pathname} />
          </nav>
        </div>
      </header>
      <main><Outlet /></main>
      <footer className="border-t border-white/5 mt-24">
        <div className="max-w-6xl mx-auto px-6 py-10 text-[11px] uppercase tracking-[0.2em] text-zinc-600">
          World Cue Championships
        </div>
      </footer>
    </div>
  );
}