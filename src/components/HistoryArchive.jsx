import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getTournamentResult } from "@/lib/bracket";
import { Trophy, ArrowRight } from "lucide-react";

export default function HistoryArchive() {
  const [groups, setGroups] = useState(null);

  useEffect(() => {
    (async () => {
      const all = await base44.entities.Tournament.list("-order");
      const completed = all.filter((t) => t.status === "complete");
      const withResults = [];
      for (const t of completed) {
        const matches = await base44.entities.TournamentMatch.filter({ tournamentId: t.id });
        const { champion, runnerUp } = getTournamentResult(matches, t.format);
        if (champion) withResults.push({ id: t.id, name: t.name, created_date: t.created_date, champion, runnerUp });
      }
      const map = {};
      const order = [];
      for (const r of withResults) {
        if (!map[r.name]) { map[r.name] = []; order.push(r.name); }
        map[r.name].push(r);
      }
      setGroups(
        order.map((name) => ({
          name,
          seasons: map[name].sort((a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0)),
        }))
      );
    })();
  }, []);

  if (!groups) return null;
  if (groups.length === 0) return null;

  return (
    <div className="mb-16">
      <h2 className="font-heading text-2xl tracking-tight mb-6 text-zinc-500">Completed Tournaments</h2>
      <div className="space-y-5">
        {groups.map((g) => (
          <section key={g.name} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
            <h3 className="font-heading text-xl tracking-tight mb-3">{g.name}</h3>
            <div className="divide-y divide-white/5">
              {g.seasons.map((s, i) => (
                <Link
                  key={s.id}
                  to={`/events/${s.id}`}
                  className="flex items-center gap-3 py-2.5 group"
                >
                  {g.seasons.length > 1 && (
                    <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-600 w-20 shrink-0">
                      Season {i + 1}
                    </span>
                  )}
                  <span className="flex-1 text-sm flex items-center gap-2 flex-wrap">
                    <Trophy className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span className="text-red-400 font-medium">{s.champion}</span>
                    <span className="text-zinc-600 text-xs">def.</span>
                    <span className="text-zinc-300">{s.runnerUp || "—"}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] text-zinc-600 group-hover:text-red-500 shrink-0">
                    View <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}