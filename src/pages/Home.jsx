import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ArrowRight, Users, Trophy, ScrollText } from "lucide-react";

const sortPlayers = (a, b) =>
  (b.points ?? 0) - (a.points ?? 0) ||
  ((b.frames_for ?? 0) - (b.frames_against ?? 0)) - ((a.frames_for ?? 0) - (a.frames_against ?? 0));

export default function Home() {
  const [players, setPlayers] = useState([]);
  useEffect(() => { base44.entities.Player.list().then(setPlayers); }, []);

  const leaders = [...players].sort(sortPlayers).slice(0, 5);

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.18),transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-28 text-center">
          <p className="text-[11px] uppercase tracking-[0.35em] text-red-600 mb-6">Season 2026 · Online</p>
          <h1 className="font-heading text-5xl sm:text-7xl leading-[0.95] tracking-tight">
            World Cue<br /><span className="text-red-600">Championships</span>
          </h1>
          <p className="max-w-xl mx-auto mt-8 text-sm sm:text-base text-zinc-400 leading-relaxed">
            Thirty-six players. Two groups. Sixteen survive the group stage and enter a
            single-elimination bracket for the title.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/group-stage"
              className="group px-7 py-3 rounded-full bg-red-600 hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-2">
              View Standings
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to="/playoffs"
              className="px-7 py-3 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-sm">
              Playoff Bracket
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 grid sm:grid-cols-3 gap-4">
        {[
          { icon: Users, k: `${players.length}`, l: "Players Registered", to: "/group-stage" },
          { icon: Trophy, k: "16", l: "Playoff Places", to: "/playoffs" },
          { icon: ScrollText, k: "2", l: "Groups", to: "/rules" },
        ].map((s) => (
          <Link key={s.l} to={s.to}
            className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-red-600/30 transition-colors duration-300">
            <s.icon className="w-5 h-5 text-red-600 mb-6" />
            <p className="font-heading text-3xl tracking-tight">{s.k}</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mt-2">{s.l}</p>
          </Link>
        ))}
      </section>

      <section className="max-w-6xl mx-auto px-6 mt-20">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-heading text-2xl tracking-tight">Overall Leaders</h2>
          <Link to="/group-stage" className="text-[11px] uppercase tracking-[0.2em] text-red-600 hover:text-red-500">
            Full tables
          </Link>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] divide-y divide-white/5">
          {leaders.length === 0 && (
            <p className="p-6 text-sm text-zinc-500">No players yet — add them on the Group Stage page.</p>
          )}
          {leaders.map((p, i) => (
            <div key={p.id} className="flex items-center gap-4 px-6 py-4">
              <span className="text-xs tabular-nums text-zinc-600 w-5">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1 text-sm">{p.name}</span>
              <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">Group {p.group}</span>
              <span className="text-sm text-red-500 font-semibold tabular-nums w-10 text-right">{p.points ?? 0}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}