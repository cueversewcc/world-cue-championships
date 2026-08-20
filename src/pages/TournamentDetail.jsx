import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ArrowUp, ArrowDown, ArrowLeft, Zap } from "lucide-react";
import { buildSingleElim, buildWinners, buildLosersBracket, nextPow2 } from "@/lib/bracket";
import TournamentBracket from "@/components/TournamentBracket";
import DoubleElimView from "@/components/DoubleElimView";
import GroupStageView from "@/components/GroupStageView";

const FORMAT_LABEL = { single_elim: "Single Elimination", double_elim: "Double Elimination", group_stage: "Group Stage" };

export default function TournamentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const canEdit = user?.role === "admin";
  const [tournament, setTournament] = useState(null);
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [newName, setNewName] = useState("");
  const [genLoading, setGenLoading] = useState(false);

  const load = async () => {
    const t = await base44.entities.Tournament.get(id);
    setTournament(t);
    const ps = await base44.entities.TournamentPlayer.filter({ tournamentId: id }, "order");
    setPlayers(ps.sort((a, b) => a.order - b.order));
    setMatches(await base44.entities.TournamentMatch.filter({ tournamentId: id }));
  };
  useEffect(() => {
    load();
  }, [id]);

  if (!tournament) return <div className="max-w-5xl mx-auto px-6 py-20 text-zinc-500">Loading…</div>;

  const addPlayer = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    await base44.entities.TournamentPlayer.create({
      tournamentId: id,
      name,
      seed: players.length + 1,
      group: tournament.format === "group_stage" ? "A" : "",
      order: players.length,
    });
    setNewName("");
    load();
  };
  const removePlayer = async (pid) => {
    await base44.entities.TournamentPlayer.delete(pid);
    load();
  };
  const setGroup = async (pid, group) => {
    await base44.entities.TournamentPlayer.update(pid, { group });
    load();
  };
  const movePlayer = async (pid, dir) => {
    const sorted = [...players].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((p) => p.id === pid);
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swap];
    await base44.entities.TournamentPlayer.bulkUpdate([{ id: a.id, order: b.order }, { id: b.id, order: a.order }]);
    load();
  };

  const generate = async () => {
    setGenLoading(true);
    try {
      const names = players.map((p) => p.name);
      const old = matches.filter((m) => m.bracket !== "group");
      await Promise.all(old.map((m) => base44.entities.TournamentMatch.delete(m.id)));
      if (tournament.format === "single_elim") {
        const main = buildSingleElim(names).map((m) => ({ ...m, tournamentId: id, bracket: "main" }));
        if (main.length) await base44.entities.TournamentMatch.bulkCreate(main);
      } else if (tournament.format === "double_elim") {
        const n = nextPow2(names.length || 2);
        const wb = buildWinners(names).map((m) => ({ ...m, tournamentId: id, bracket: "winners" }));
        const lb = buildLosersBracket(n).map((m) => ({ ...m, tournamentId: id, bracket: "losers" }));
        const final = [
          { round: 0, slot: 0, player1: "", player2: "", score1: 0, score2: 0, winner: "" },
          { round: 0, slot: 1, player1: "", player2: "", score1: 0, score2: 0, winner: "" },
        ].map((m) => ({ ...m, tournamentId: id, bracket: "final" }));
        await base44.entities.TournamentMatch.bulkCreate([...wb, ...lb, ...final]);
      }
      await base44.entities.Tournament.update(id, { status: "active" });
      load();
    } finally {
      setGenLoading(false);
    }
  };

  const groups = Array.from({ length: tournament.groupCount || 2 }, (_, i) => String.fromCharCode(65 + i));
  const mainMatches = matches.filter((m) => m.bracket === "main");
  const wbMatches = matches.filter((m) => m.bracket === "winners");
  const lbMatches = matches.filter((m) => m.bracket === "losers");
  const finalMatches = matches.filter((m) => m.bracket === "final");
  const hasBracket = mainMatches.length > 0 || wbMatches.length > 0;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <Link to="/events" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-zinc-500 hover:text-red-500 mb-6">
        <ArrowLeft className="w-3.5 h-3.5" />All events
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-red-600 mb-2">{FORMAT_LABEL[tournament.format]}</p>
          <h1 className="font-heading text-4xl sm:text-5xl tracking-tight">{tournament.name}</h1>
          <p className="text-sm text-zinc-500 mt-2">{players.length} players · status: {tournament.status}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 mb-8">
        <h2 className="font-heading text-xl tracking-tight mb-4">Players</h2>
        {canEdit && (
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
              {tournament.format === "group_stage" &&
                (canEdit ? (
                  <select value={p.group || ""} onChange={(e) => setGroup(p.id, e.target.value)} className="h-8 bg-[#0a0a0b] border border-white/10 rounded px-2 text-xs focus:border-red-600 outline-none">
                    <option value="">—</option>
                    {groups.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-600">Group {p.group || "—"}</span>
                ))}
              {canEdit && (
                <div className="flex items-center gap-1">
                  <button onClick={() => movePlayer(p.id, "up")} className="text-zinc-600 hover:text-zinc-200"><ArrowUp className="w-4 h-4" /></button>
                  <button onClick={() => movePlayer(p.id, "down")} className="text-zinc-600 hover:text-zinc-200"><ArrowDown className="w-4 h-4" /></button>
                  <button onClick={() => removePlayer(p.id)} className="text-zinc-600 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {tournament.format === "group_stage" ? (
        <GroupStageView tournament={tournament} players={players} matches={matches} editable={canEdit} onChanged={load} />
      ) : (
        <section>
          {!hasBracket ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
              <p className="text-sm text-zinc-400 mb-4">Add players, then generate the bracket.</p>
              {canEdit && (
                <Button onClick={generate} disabled={genLoading || players.length < 2} className="bg-red-600 hover:bg-red-700 text-white rounded-full px-6">
                  <Zap className="w-4 h-4 mr-2" />{genLoading ? "Generating…" : "Generate bracket"}
                </Button>
              )}
              {players.length < 2 && <p className="text-xs text-zinc-600 mt-3">At least 2 players required.</p>}
            </div>
          ) : tournament.format === "single_elim" ? (
            <TournamentBracket matches={mainMatches} editable={canEdit} onSaved={load} title="Bracket" />
          ) : (
            <DoubleElimView wb={wbMatches} lb={lbMatches} final={finalMatches} editable={canEdit} onSaved={load} />
          )}
          {canEdit && hasBracket && (
            <div className="mt-6">
              <Button onClick={generate} disabled={genLoading} variant="outline" className="rounded-full px-5 border-white/10 bg-transparent hover:bg-white/5 text-zinc-300">
                {genLoading ? "Regenerating…" : "Regenerate bracket"}
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}