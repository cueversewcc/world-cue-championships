import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Plus, Trash2, Check } from "lucide-react";
import { groupStandings, crossSeed, buildPlayoffBracket } from "@/lib/bracket";

export default function GroupStageManager({ tournamentId, onBack, editable }) {
  const [tournament, setTournament] = useState(null);
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [newName, setNewName] = useState("");
  const [form, setForm] = useState({ group: "A", player1: "", player2: "", score: "", points1: 0, points2: 0 });
  const [logSaving, setLogSaving] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({ mainBracketName: "Championship", consolationName: "Consolation Cup" });
  const [showAdvance, setShowAdvance] = useState(false);

  const load = async () => {
    const t = await base44.entities.Tournament.get(tournamentId);
    setTournament(t);
    setAdvanceForm({ mainBracketName: t.mainBracketName || "Championship", consolationName: t.consolationName || "Consolation Cup" });
    const ps = await base44.entities.TournamentPlayer.filter({ tournamentId }, "order");
    setPlayers(ps.sort((a, b) => a.order - b.order));
    setMatches(await base44.entities.TournamentMatch.filter({ tournamentId }));
  };
  useEffect(() => { load(); }, [tournamentId]);

  if (!tournament) return <div className="max-w-5xl mx-auto px-6 py-20 text-zinc-500">Loading…</div>;

  const groupCount = tournament.groupCount || 2;
  const groups = Array.from({ length: groupCount }, (_, i) => String.fromCharCode(65 + i));
  const groupMatches = matches.filter((m) => m.bracket === "group");
  const playersByGroup = groups.map((g) => players.filter((p) => p.group === g));
  const standingsByGroup = groups.map((g, gi) => groupStandings(playersByGroup[gi], groupMatches.filter((m) => m.group === g)));
  const qualifiedSet = new Set(crossSeed(standingsByGroup.map((st) => st.map((s) => s.name))).slice(0, tournament.advancingCount || 16));

  const addPlayer = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    await base44.entities.TournamentPlayer.create({ tournamentId, name, seed: players.length + 1, group: "A", order: players.length });
    setNewName("");
    load();
  };
  const removePlayer = async (pid) => { await base44.entities.TournamentPlayer.delete(pid); load(); };
  const setGroup = async (pid, group) => { await base44.entities.TournamentPlayer.update(pid, { group }); load(); };

  const advanceToGroupStage = async () => {
    await base44.entities.Tournament.update(tournamentId, { status: "active" });
    load();
  };

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
  const submitMatch = async (e) => {
    e.preventDefault();
    const p1 = form.player1, p2 = form.player2;
    if (!p1 || !p2 || p1 === p2 || logSaving) return;
    const { s1, s2 } = parseScore(form.score);
    const winner = s1 > s2 ? p1 : s2 > s1 ? p2 : "";
    setLogSaving(true);
    try {
      await base44.entities.TournamentMatch.create({
        tournamentId, bracket: "group", round: 0, slot: 0, group: form.group,
        player1: p1, player2: p2, score1: s1, score2: s2, winner,
        points1: Number(form.points1) || 0, points2: Number(form.points2) || 0,
      });
      setForm({ group: form.group, player1: "", player2: "", score: "", points1: 0, points2: 0 });
      load();
    } finally { setLogSaving(false); }
  };
  const deleteMatch = async (id) => { await base44.entities.TournamentMatch.delete(id); load(); };

  const advanceToPlayoffs = async () => {
    setAdvancing(true);
    try {
      const lists = standingsByGroup.map((st) => st.map((s) => s.name));
      const seeded = crossSeed(lists);
      const advancingCount = tournament.advancingCount || 16;
      const qualified = seeded.slice(0, advancingCount);
      const rest = seeded.slice(advancingCount);
      const oldPlayoffs = await base44.entities.PlayoffMatch.list();
      await Promise.all(oldPlayoffs.map((m) => base44.entities.PlayoffMatch.delete(m.id)));
      const main = buildPlayoffBracket(qualified, "main");
      const cons = buildPlayoffBracket(rest, "consolation");
      if (main.length) await base44.entities.PlayoffMatch.bulkCreate(main);
      if (cons.length) await base44.entities.PlayoffMatch.bulkCreate(cons);
      const configs = await base44.entities.PlayoffConfig.list();
      const payload = { mainBracketName: advanceForm.mainBracketName, consolationName: advanceForm.consolationName, hasConsolation: cons.length > 0 };
      if (configs[0]) {
        await base44.entities.PlayoffConfig.update(configs[0].id, payload);
      } else {
        await base44.entities.PlayoffConfig.create(payload);
      }
      await base44.entities.Tournament.update(tournamentId, { status: "complete", mainBracketName: advanceForm.mainBracketName, consolationName: advanceForm.consolationName });
      setShowAdvance(false);
      load();
    } finally { setAdvancing(false); }
  };

  const groupPlayers = (g) => playersByGroup[groups.indexOf(g)] || [];
  const hasBrackets = tournament.status === "complete";

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-zinc-500 hover:text-red-500 mb-6">
        <ArrowLeft className="w-3.5 h-3.5" />All group stages
      </button>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-red-600 mb-2">Group Stage</p>
          <h1 className="font-heading text-4xl sm:text-5xl tracking-tight">{tournament.name}</h1>
          <p className="text-sm text-zinc-500 mt-2">
            {players.length} players · {groupCount} groups · status:{" "}
            <span className={tournament.status === "complete" ? "text-green-500 font-medium" : ""}>{tournament.status}</span>
          </p>
        </div>
      </div>

      {/* Players section */}
      <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 mb-8">
        <h2 className="font-heading text-xl tracking-tight mb-4">Players</h2>
        {editable && (
          <form onSubmit={addPlayer} className="flex gap-2 mb-4">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Add player" className="flex-1 h-10 bg-transparent border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none" />
            <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white rounded-full px-5">
              <Plus className="w-4 h-4 mr-1.5" />Add
            </Button>
          </form>
        )}
        <div className="divide-y divide-white/5">
          {players.length === 0 && <p className="py-4 text-sm text-zinc-500">No players yet.</p>}
          {players.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 py-2.5">
              <span className="text-xs tabular-nums text-zinc-600 w-6">{i + 1}</span>
              <span className="flex-1 text-sm">{p.name}</span>
              {editable ? (
                <select value={p.group || ""} onChange={(e) => setGroup(p.id, e.target.value)} className="h-8 bg-[#0a0a0b] border border-white/10 rounded px-2 text-xs focus:border-red-600 outline-none">
                  <option value="">—</option>
                  {groups.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              ) : (
                <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-600">Group {p.group || "—"}</span>
              )}
              {editable && (
                <button onClick={() => removePlayer(p.id)} className="text-zinc-600 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Setup phase: advance to group stage */}
      {tournament.status === "setup" && (
        <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
          <p className="text-sm text-zinc-400 mb-4">Assign players to their groups above, then advance to the group stage to start logging matches.</p>
          {editable && (
            <Button onClick={advanceToGroupStage} disabled={players.length < 2} className="bg-red-600 hover:bg-red-700 text-white rounded-full px-6">
              <ArrowRight className="w-4 h-4 mr-2" />Advance to Group Stage
            </Button>
          )}
          {players.length < 2 && <p className="text-xs text-zinc-600 mt-3">At least 2 players required.</p>}
        </div>
      )}

      {/* Active phase: standings + match form + advance to playoffs */}
      {tournament.status !== "setup" && (
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
            <form onSubmit={submitMatch} className="rounded-2xl border border-red-600/20 bg-red-600/[0.04] p-5">
              <h3 className="font-heading text-lg tracking-tight mb-4">Log Group Match</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Group</label>
                  <select value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value, player1: "", player2: "" })} className="w-full h-10 bg-[#0a0a0b] border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none">
                    {groups.map((g) => <option key={g} value={g}>Group {g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Player 1</label>
                  <select value={form.player1} onChange={(e) => setForm({ ...form, player1: e.target.value })} className="w-full h-10 bg-[#0a0a0b] border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none">
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
                  <select value={form.player2} onChange={(e) => setForm({ ...form, player2: e.target.value })} className="w-full h-10 bg-[#0a0a0b] border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none">
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
                  <input type="text" value={form.score} onChange={(e) => onScoreChange(e.target.value)} placeholder="5-3" className="w-full h-10 bg-transparent border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">P1 Points</label>
                  <input type="number" min="0" value={form.points1} onChange={(e) => setForm({ ...form, points1: e.target.value })} className="w-full h-10 bg-transparent border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">P2 Points</label>
                  <input type="number" min="0" value={form.points2} onChange={(e) => setForm({ ...form, points2: e.target.value })} className="w-full h-10 bg-transparent border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none" />
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button type="submit" disabled={logSaving || !form.player1 || !form.player2 || form.player1 === form.player2} className="bg-red-600 hover:bg-red-700 text-white rounded-full px-6">
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

          {/* Advance to playoffs */}
          {editable && !showAdvance && (
            <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] px-5 py-4">
              <div>
                <p className="text-sm font-medium">Advance to Playoffs</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Top {tournament.advancingCount || 16} qualify for the {advanceForm.mainBracketName}; the rest enter the {advanceForm.consolationName}.
                </p>
              </div>
              <Button onClick={() => setShowAdvance(true)} className="bg-red-600 hover:bg-red-700 text-white rounded-full px-6">
                <ArrowRight className="w-4 h-4 mr-2" />{hasBrackets ? "Re-advance" : "Advance"}
              </Button>
            </div>
          )}

          {editable && showAdvance && (
            <div className="rounded-2xl border border-red-600/20 bg-red-600/[0.04] p-6">
              <h3 className="font-heading text-xl tracking-tight mb-4">Name Brackets & Advance to Playoffs</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Main bracket name</label>
                  <input value={advanceForm.mainBracketName} onChange={(e) => setAdvanceForm({ ...advanceForm, mainBracketName: e.target.value })} className="w-full h-10 bg-transparent border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Consolation name</label>
                  <input value={advanceForm.consolationName} onChange={(e) => setAdvanceForm({ ...advanceForm, consolationName: e.target.value })} className="w-full h-10 bg-transparent border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <Button onClick={() => setShowAdvance(false)} variant="outline" className="rounded-full px-5 border-white/10 bg-transparent hover:bg-white/5 text-zinc-300">Cancel</Button>
                <Button onClick={advanceToPlayoffs} disabled={advancing} className="bg-red-600 hover:bg-red-700 text-white rounded-full px-6">
                  <Check className="w-4 h-4 mr-2" />{advancing ? "Advancing…" : "Confirm & Advance"}
                </Button>
              </div>
            </div>
          )}

          {hasBrackets && (
            <div className="rounded-2xl border border-green-600/20 bg-green-600/[0.04] p-5 text-center">
              <p className="text-sm text-zinc-300">Players have been advanced to the <a href="/playoffs" className="text-red-500 hover:text-red-400 underline">Playoffs tab</a>.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}