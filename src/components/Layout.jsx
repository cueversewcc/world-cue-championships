import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Target } from "lucide-react";

const nav = [
  { to: "/", label: "Home" },
  { to: "/group-stage", label: "Group Stage" },
  { to: "/playoffs", label: "Playoffs" },
  { to: "/rules", label: "Rules" },
];

export default function Layout() {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 font-body selection:bg-red-600/40">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0a0a0b]/80 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <Target className="w-5 h-5 text-red-600 transition-transform duration-500 group-hover:rotate-90" />
            <span className="text-[13px] tracking-[0.25em] uppercase font-semibold">World Cue</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={`px-3 py-2 text-[11px] sm:text-xs uppercase tracking-[0.15em] rounded-md transition-colors duration-300 ${
                  pathname === n.to ? "text-red-500 bg-red-600/10" : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                {n.label}
              </Link>
            ))}
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