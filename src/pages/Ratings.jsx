import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { computeElo } from "@/lib/elo";
import { Plus, Trash2 } from "lucide-react";

const emptyForm = { player1: "", player2: "", score1: 0, score2: 0, stage: "group", group: "" };

export default function Ratings() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin";
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setMatches(await base44.entities.Match.list("-created_date"));
    setPlayers(await base44.entities.Player.list());
  };
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
      .map((s) => ({ ...s, rating: Math.round(ratings[s.name] ?? 1000) }))
      .sort((a, b) => b.rating - a.rating || b.wins - a.wins);
  }, [matches, ratings]);

  const playerNames = useMemo(
    () => Array.from(new Set(players.map((p) => p.name).filter(Boolean))).sort(),
    [players]
  );

  const s1 = Number(form.score1) || 0;
  const s2 = Number(form.score2) || 0;
  const winnerHint =
    !form.player1.trim() || !form.player2.trim()
      ? "Enter both players"
      : s1 > s2
      ? `Winner: ${form.player1}`
      : s2 > s1
      ? `Winner: ${form.player2}`
      : "Draw";

  const submit = async (e) => {
    e.preventDefault();
    const p1 = form.player1.trim();
    const p2 = form.player2.trim();
    if (!p1 || !p2 || saving) return;
    const winner = s1 > s2 ? p1 : s2 > s1 ? p2 : "";
    setSaving(true);
    try {
      await base44.entities.Match.create({
        player1: p1,
        player2: p2,
        score1: s1,
        score2: s2,
        winner,
        stage: form.stage,
        group: form.stage === "group" ? form.group : "",
      });
      setForm(emptyForm);
      setAdding(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    await base44.entities.Match.delete(id);
    load();
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-red-600 mb-3">Rankings</p>
          <h1 className="font-heading text-4xl sm:text-5xl tracking-tight">Elo Ratings</h1>
          <p className="text-sm text-zinc-500 mt-3">
            {leaderboard.length} rated players · start 1000 · K-factor 32 · derived from the match log
          </p>
        </div>
        {canEdit && !adding && (
          <Button onClick={() => setAdding(true)} className="bg-red-600 hover:bg-red-700 text-white rounded-full px-6">
            <Plus className="w-4 h-4 mr-2" />Log match
          </Button>
        )}
      </div>

      {canEdit && adding && (
        <form onSubmit={submit} className="rounded-2xl border border-red-600/20 bg-red-600/[0.04] p-6 mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl tracking-tight">Record a Match</h2>
            <button type="button" onClick={() => setAdding(false)}
              className="text-xs uppercase tracking-[0.15em] text-zinc-400 hover:text-zinc-200">Cancel</button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Player 1</label>
              <input list="player-names" value={form.player1} onChange={(e) => setForm({ ...form, player1: e.target.value })}
                placeholder="Name" className="w-full h-10 bg-transparent border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Player 2</label>
              <input list="player-names" value={form.player2} onChange={(e) => setForm({ ...form, player2: e.target.value })}
                placeholder="Name" className="w-full h-10 bg-transparent border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Score 1</label>
              <input type="number" min="0" value={form.score1} onChange={(e) => setForm({ ...form, score1: e.target.value })}
                className="w-full h-10 bg-transparent border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Score 2</label>
              <input type="number" min="0" value={form.score2} onChange={(e) => setForm({ ...form, score2: e.target.value })}
                className="w-full h-10 bg-transparent border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Stage</label>
              <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}
                className="w-full h-10 bg-[#0a0a0b] border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none">
                <option value="group">Group</option>
                <option value="playoff">Playoff</option>
              </select>
            </div>
            {form.stage === "group" && (
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Group</label>
                <select value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })}
                  className="w-full h-10 bg-[#0a0a0b] border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none">
                  <option value="">—</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                </select>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mt-5">
            <p className="text-xs text-zinc-500">{winnerHint}</p>
            <Button type="submit" disabled={saving || !form.player1.trim() || !form.player2.trim()}
              className="bg-red-600 hover:bg-red-700 text-white rounded-full px-6">
              {saving ? "Saving…" : "Save match"}
            </Button>
          </div>
          <datalist id="player-names">
            {playerNames.map((n) => <option key={n} value={n} />)}
          </datalist>
        </form>
      )}

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

      {matches.length > 0 && (
        <section className="mt-12">
          <h2 className="font-heading text-2xl tracking-tight mb-6">Match Log</h2>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] divide-y divide-white/5">
            {matches.map((m) => (
              <div key={m.id} className="flex items-center gap-4 px-5 py-3">
                <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-600 w-16">
                  {m.stage === "playoff" ? "Playoff" : `Group ${m.group || ""}`}
                </span>
                <span className="flex-1 text-sm">
                  <span className={m.winner === m.player1 ? "text-zinc-100 font-medium" : "text-zinc-400"}>{m.player1}</span>
                  <span className="text-zinc-600 mx-2">{m.score1}–{m.score2}</span>
                  <span className={m.winner === m.player2 ? "text-zinc-100 font-medium" : "text-zinc-400"}>{m.player2}</span>
                </span>
                {canEdit && (
                  <button onClick={() => remove(m.id)} className="text-zinc-600 hover:text-red-500">
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