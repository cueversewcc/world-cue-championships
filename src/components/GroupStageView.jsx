import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
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

  const [form, setForm] = useState({ group: groups[0], player1: "", player2: "", score1: 0, score2: 0 });
  const [logSaving, setLogSaving] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  const groupNames = (g) => playersByGroup[groups.indexOf(g)].map((p) => p.name).filter(Boolean);

  const submit = async (e) => {
    e.preventDefault();
    const p1 = form.player1.trim();
    const p2 = form.player2.trim();
    if (!p1 || !p2 || p1 === p2 || logSaving) return;
    const s1 = Number(form.score1) || 0;
    const s2 = Number(form.score2) || 0;
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
      });
      setForm({ group: form.group, player1: "", player2: "", score1: 0, score2: 0 });
      onChanged();
    } finally {
      setLogSaving(false);
    }
  };

  const deleteMatch = async (id) => {
    await base44.entities.TournamentMatch.delete(id);
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
      await base44.entities.Tournament.update(tournament.id, { status: "active" });
      onChanged();
    } finally {
      setAdvancing(false);
    }
  };

  const hasBrackets = mainMatches.length > 0 || consMatches.length > 0;

  return (
    <div className="space-y-10">
      {editable && (
        <form onSubmit={submit} className="rounded-2xl border border-red-600/20 bg-red-600/[0.04] p-5">
          <h3 className="font-heading text-lg tracking-tight mb-4">Log Group Match</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Player 1</label>
              <input
                list="gs-names"
                value={form.player1}
                onChange={(e) => setForm({ ...form, player1: e.target.value })}
                placeholder="Name"
                className="w-full h-10 bg-transparent border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Player 2</label>
              <input
                list="gs-names"
                value={form.player2}
                onChange={(e) => setForm({ ...form, player2: e.target.value })}
                placeholder="Name"
                className="w-full h-10 bg-transparent border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Score 1</label>
              <input type="number" min="0" value={form.score1} onChange={(e) => setForm({ ...form, score1: e.target.value })} className="w-full h-10 bg-transparent border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Score 2</label>
              <input type="number" min="0" value={form.score2} onChange={(e) => setForm({ ...form, score2: e.target.value })} className="w-full h-10 bg-transparent border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Group</label>
              <select value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value, player1: "", player2: "" })} className="w-full h-10 bg-[#0a0a0b] border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none">
                {groups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button type="submit" disabled={logSaving || !form.player1.trim() || !form.player2.trim()} className="bg-red-600 hover:bg-red-700 text-white rounded-full px-6">
              {logSaving ? "Saving…" : "Save match"}
            </Button>
          </div>
          <datalist id="gs-names">
            {groupNames(form.group).map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </form>
      )}

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

      {hasBrackets && (
        <div className="space-y-10">
          {mainMatches.length > 0 && <TournamentBracket matches={mainMatches} editable={editable} onSaved={onChanged} title={tournament.mainBracketName || "Championship"} />}
          {consMatches.length > 0 && <TournamentBracket matches={consMatches} editable={editable} onSaved={onChanged} title={tournament.consolationName || "Consolation Cup"} />}
        </div>
      )}
    </div>
  );
}