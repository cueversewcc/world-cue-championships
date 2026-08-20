import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trash2 } from "lucide-react";
import { groupStandings, crossSeed, buildSingleElim } from "@/lib/bracket";
import TournamentBracket from "./TournamentBracket";

export default function GroupStageView({ tournament, players, matches, editable, onChanged }) {
  const groupCount = tournament.groupCount || 2;
  const groups = Array.from({ length: groupCount }, (_, i) => String.fromCharCode(65 + i));
  const groupMatches = matches.filter((m) => m.bracket === "group");
  const mainMatches = matches.filter((m) => m.bracket === "main");
  const consMatches = matches.filter((m) => m.bracket === "consolation");

  const playersByGroup = groups.map((g) => players.filter((p) => p.group === g));
  const standingsByGroup = groups.map((g, gi) =>
    groupStandings(playersByGroup[gi], groupMatches.filter((m) => m.group === g))
  );
  const qualifiedSet = new Set(
    crossSeed(standingsByGroup.map((st) => st.map((s) => s.name))).slice(0, tournament.advancingCount || 16)
  );

  const [form, setForm] = useState({ group: groups[0], player1: "", player2: "", score: "", points1: 0, points2: 0 });
  const [logSaving, setLogSaving] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  const groupPlayers = (g) => playersByGroup[groups.indexOf(g)] || [];

  const parseScore = (str) => {
    const parts = (str || "").split(/\s*[-–]\s*/).map((s) => s.trim());
    return { s1: Number(parts[0]) || 0, s2: Number(parts[1]) || 0 };
  };

  const onScoreChange = (val) => {
    const { s1, s2 } = parseScore(val);
    let points1 = 0, points2 = 0;
    if (s1 > s2) { points1 = 3; points2 = 0; }
    else if (s2 > s1) { points1 = 0; points2 = 3; }
    setForm((f) => ({ ...f, score: val, points1, points2 }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const p1 = form.player1;
    const p2 = form.player2;
    if (!p1 || !p2 || p1 === p2 || logSaving) return;
    const { s1, s2 } = parseScore(form.score);
    const winner = s1 > s2 ? p1 : s2 > s1 ? p2 : "";
    setLogSaving(true);
    try {
      await base44.entities.TournamentMatch.create({
        tournamentId: tournament.id,
        bracket: "group",
        round: 0,
        slot: 0,
        group: form.group,
        player1: p1,
        player2: p2,
        score1: s1,
        score2: s2,
        winner,
        points1: Number(form.points1) || 0,
        points2: Number(form.points2) || 0,
      });
      setForm({ group: form.group, player1: "", player2: "", score: "", points1: 0, points2: 0 });
      onChanged();
    } finally {
      setLogSaving(false);
    }
  };

  const deleteMatch = async (mid) => {
    await base44.entities.TournamentMatch.delete(mid);
    onChanged();
  };

  const advance = async () => {
    setAdvancing(true);
    try {
      const lists = standingsByGroup.map((st) => st.map((s) => s.name));
      const seeded = crossSeed(lists);
      const advancingCount = tournament.advancingCount || 16;
      const qualified = seeded.slice(0, advancingCount);
      const rest = seeded.slice(advancingCount);
      const old = [...mainMatches, ...consMatches];
      await Promise.all(old.map((m) => base44.entities.TournamentMatch.delete(m.id)));
      if (qualified.length >= 2) {
        const main = buildSingleElim(qualified).map((m) => ({ ...m, tournamentId: tournament.id, bracket: "main" }));
        await base44.entities.TournamentMatch.bulkCreate(main);
      }
      if (rest.length >= 2) {
        const cons = buildSingleElim(rest).map((m) => ({ ...m, tournamentId: tournament.id, bracket: "consolation" }));
        await base44.entities.TournamentMatch.bulkCreate(cons);
      }
      onChanged();
    } finally {
      setAdvancing(false);
    }
  };

  const hasBrackets = mainMatches.length > 0 || consMatches.length > 0;

  return (
    <div className="space-y-10">
      {/* Group standings */}
      <div className="grid lg:grid-cols-2 gap-6">
        {groups.map((g, gi) => (
          <div key={g} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
            <h3 className="font-heading text-lg tracking-tight mb-4">Group {g}</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 border-b border-white/5">
                  <th className="text-left px-2 py-2">#</th>
                  <th className="text-left px-2 py-2">Player</th>
                  <th className="text-center px-2 py-2">P</th>
                  <th className="text-center px-2 py-2">W</th>
                  <th className="text-center px-2 py-2">L</th>
                  <th className="text-center px-2 py-2">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {standingsByGroup[gi].length === 0 && (
                  <tr><td colSpan={6} className="px-2 py-4 text-zinc-600">No players</td></tr>
                )}
                {standingsByGroup[gi].map((s, i) => (
                  <tr key={s.name} className={qualifiedSet.has(s.name) ? "text-zinc-100" : "text-zinc-500"}>
                    <td className="px-2 py-2 text-zinc-600 tabular-nums">{i + 1}</td>
                    <td className="px-2 py-2">{s.name}</td>
                    <td className="px-2 py-2 text-center tabular-nums">{s.played}</td>
                    <td className="px-2 py-2 text-center tabular-nums">{s.wins}</td>
                    <td className="px-2 py-2 text-center tabular-nums">{s.losses}</td>
                    <td className="px-2 py-2 text-center tabular-nums font-semibold text-red-500">{s.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Match form */}
      {editable && (
        <form onSubmit={submit} className="rounded-2xl border border-red-600/20 bg-red-600/[0.04] p-5">
          <h3 className="font-heading text-lg tracking-tight mb-4">Log Group Match</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Group</label>
              <select
                value={form.group}
                onChange={(e) => setForm({ ...form, group: e.target.value, player1: "", player2: "" })}
                className="w-full h-10 bg-[#0a0a0b] border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none"
              >
                {groups.map((g) => (
                  <option key={g} value={g}>Group {g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Player 1</label>
              <select
                value={form.player1}
                onChange={(e) => setForm({ ...form, player1: e.target.value })}
                className="w-full h-10 bg-[#0a0a0b] border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none"
              >
                <option value="">Select player</option>
                {groupPlayers(form.group).map((p) => (
                  <option key={p.id} value={p.name} disabled={p.name === form.player2}>
                    {p.name === form.player2 ? `${p.name} — playing` : p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Player 2</label>
              <select
                value={form.player2}
                onChange={(e) => setForm({ ...form, player2: e.target.value })}
                className="w-full h-10 bg-[#0a0a0b] border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none"
              >
                <option value="">Select player</option>
                {groupPlayers(form.group).map((p) => (
                  <option key={p.id} value={p.name} disabled={p.name === form.player1}>
                    {p.name === form.player1 ? `${p.name} — can't play yourself` : p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Score (race, e.g. 5-3)</label>
              <input
                type="text"
                value={form.score}
                onChange={(e) => onScoreChange(e.target.value)}
                placeholder="5-3"
                className="w-full h-10 bg-transparent border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">P1 Points</label>
              <input
                type="number"
                min="0"
                value={form.points1}
                onChange={(e) => setForm({ ...form, points1: e.target.value })}
                className="w-full h-10 bg-transparent border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">P2 Points</label>
              <input
                type="number"
                min="0"
                value={form.points2}
                onChange={(e) => setForm({ ...form, points2: e.target.value })}
                className="w-full h-10 bg-transparent border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button
              type="submit"
              disabled={logSaving || !form.player1 || !form.player2 || form.player1 === form.player2}
              className="bg-red-600 hover:bg-red-700 text-white rounded-full px-6"
            >
              {logSaving ? "Saving…" : "Save match"}
            </Button>
          </div>
        </form>
      )}

      {/* Logged matches */}
      {groupMatches.length > 0 && (
        <section>
          <h3 className="font-heading text-xl tracking-tight mb-4">Logged Group Matches</h3>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] divide-y divide-white/5">
            {groupMatches.map((m) => (
              <div key={m.id} className="flex items-center gap-4 px-5 py-3">
                <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-600 w-16">Group {m.group || ""}</span>
                <span className="flex-1 text-sm">
                  <span className={m.winner === m.player1 ? "text-zinc-100 font-medium" : "text-zinc-400"}>{m.player1}</span>
                  <span className="text-zinc-600 mx-2">{m.score1}–{m.score2}</span>
                  <span className={m.winner === m.player2 ? "text-zinc-100 font-medium" : "text-zinc-400"}>{m.player2}</span>
                </span>
                {editable && (
                  <button onClick={() => deleteMatch(m.id)} className="text-zinc-600 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Advance to brackets */}
      {editable && (
        <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] px-5 py-4">
          <div>
            <p className="text-sm font-medium">Advance to brackets</p>
            <p className="text-xs text-zinc-500 mt-1">
              Top {tournament.advancingCount || 16} qualify for the {tournament.mainBracketName || "Championship"}; the rest enter the {tournament.consolationName || "Consolation Cup"}.
            </p>
          </div>
          <Button onClick={advance} disabled={advancing} className="bg-red-600 hover:bg-red-700 text-white rounded-full px-6">
            <ArrowRight className="w-4 h-4 mr-2" />
            {advancing ? "Advancing…" : hasBrackets ? "Re-advance" : "Advance"}
          </Button>
        </div>
      )}

      {/* Brackets */}
      {hasBrackets && (
        <div className="space-y-10">
          {mainMatches.length > 0 && <TournamentBracket matches={mainMatches} editable={editable} onSaved={onChanged} title={tournament.mainBracketName || "Championship"} />}
          {consMatches.length > 0 && <TournamentBracket matches={consMatches} editable={editable} onSaved={onChanged} title={tournament.consolationName || "Consolation Cup"} />}
        </div>
      )}
    </div>
  );
}