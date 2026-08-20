import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { computeElo } from "@/lib/elo";
import { loadAllMatches } from "@/lib/matches";
import { Trash2 } from "lucide-react";

export default function Ratings() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin";
  const [matches, setMatches] = useState([]);

  const load = async () => setMatches(await loadAllMatches());
  useEffect(() => { load(); }, []);

  const ratings = useMemo(() => computeElo(matches), [matches]);

  const leaderboard = useMemo(() => {
    const stats = {};
    const ensure = (n) => {
      if (!stats[n]) stats[n] = { name: n, played: 0, wins: 0, losses: 0 };
      return stats[n];
    };
    for (const m of matches) {
      const a = (m.player1 || "").trim();
      const b = (m.player2 || "").trim();
      if (!a || !b || a === b) continue;
      const sa = ensure(a);
      const sb = ensure(b);
      sa.played++; sb.played++;
      if (m.winner === a) { sa.wins++; sb.losses++; }
      else if (m.winner === b) { sb.wins++; sa.losses++; }
    }
    return Object.values(stats)
      .map((s) => ({ ...s, rating: Math.round(ratings[s.name] ?? 1500) }))
      .sort((a, b) => b.rating - a.rating || b.wins - a.wins);
  }, [matches, ratings]);

  const sortedLog = useMemo(
    () => [...matches].sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0)),
    [matches]
  );

  const remove = async (m) => {
    if (m._source === "log") await base44.entities.Match.delete(m.id);
    load();
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="mb-10">
        <p className="text-[11px] uppercase tracking-[0.3em] text-red-600 mb-3">Rankings</p>
        <h1 className="font-heading text-4xl sm:text-5xl tracking-tight">Elo Ratings</h1>
        <p className="text-sm text-zinc-500 mt-3">
          {leaderboard.length} rated players · start 1500 · K-factor 32 (scaled by rating gap) · group & playoff results update automatically
        </p>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 border-b border-white/5">
              <th className="text-left font-medium px-4 py-3">#</th>
              <th className="text-left font-medium px-4 py-3">Player</th>
              <th className="text-center font-medium px-4 py-3">Rating</th>
              <th className="text-center font-medium px-4 py-3">Played</th>
              <th className="text-center font-medium px-4 py-3">W</th>
              <th className="text-center font-medium px-4 py-3">L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {leaderboard.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-500">No matches logged yet.</td></tr>
            )}
            {leaderboard.map((p, i) => (
              <tr key={p.name} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-zinc-600 tabular-nums">{String(i + 1).padStart(2, "0")}</td>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-center tabular-nums font-semibold text-red-500">{p.rating}</td>
                <td className="px-4 py-3 text-center tabular-nums text-zinc-300">{p.played}</td>
                <td className="px-4 py-3 text-center tabular-nums text-zinc-300">{p.wins}</td>
                <td className="px-4 py-3 text-center tabular-nums text-zinc-300">{p.losses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedLog.length > 0 && (
        <section className="mt-12">
          <h2 className="font-heading text-2xl tracking-tight mb-6">Match Log</h2>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] divide-y divide-white/5">
            {sortedLog.map((m) => (
              <div key={`${m._source}-${m.id}`} className="flex items-center gap-4 px-5 py-3">
                <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-600 w-20">
                  {m._source === "playoff" ? "Playoff" : `Group ${m.group || ""}`}
                </span>
                <span className="flex-1 text-sm">
                  <span className={m.winner === m.player1 ? "text-zinc-100 font-medium" : "text-zinc-400"}>{m.player1}</span>
                  <span className="text-zinc-600 mx-2">{m.score1}–{m.score2}</span>
                  <span className={m.winner === m.player2 ? "text-zinc-100 font-medium" : "text-zinc-400"}>{m.player2}</span>
                </span>
                {canEdit && m._source === "log" && (
                  <button onClick={() => remove(m)} className="text-zinc-600 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}