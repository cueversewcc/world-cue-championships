import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import GroupTable from "@/components/GroupTable";
import { Button } from "@/components/ui/button";
import { Pencil, Check, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const sortPlayers = (a, b) =>
  (b.points ?? 0) - (a.points ?? 0) ||
  ((b.frames_for ?? 0) - (b.frames_against ?? 0)) - ((a.frames_for ?? 0) - (a.frames_against ?? 0)) ||
  (b.frames_for ?? 0) - (a.frames_for ?? 0);

export default function GroupStage() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin";
  const [players, setPlayers] = useState([]);
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState({});
  const [saving, setSaving] = useState(false);
  const [logging, setLogging] = useState(false);
  const [logSaving, setLogSaving] = useState(false);
  const [matchForm, setMatchForm] = useState({ group: "A", player1: "", player2: "", score1: 0, score2: 0 });
  const [groupMatches, setGroupMatches] = useState([]);

  const load = async () => {
    setPlayers(await base44.entities.Player.list());
    setGroupMatches(await base44.entities.Match.filter({ stage: "group" }, "-created_date"));
  };
  useEffect(() => { load(); }, []);

  const handleChange = (id, field, value) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value, ...(field === "wins" ? { points: value * 3 } : {}) } : p))
    );
    setDirty((d) => ({
      ...d,
      [id]: { ...(d[id] || {}), [field]: value, ...(field === "wins" ? { points: value * 3 } : {}) },
    }));
  };

  const save = async () => {
    setSaving(true);
    const updates = Object.entries(dirty).map(([id, fields]) => ({ id, ...fields }));
    if (updates.length) await base44.entities.Player.bulkUpdate(updates);
    setDirty({});
    setSaving(false);
    setEditing(false);
    load();
  };

  const addPlayer = async (group) => {
    await base44.entities.Player.create({ name: "New Player", group });
    load();
  };

  const remove = async (id) => {
    await base44.entities.Player.delete(id);
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  const submitMatch = async (e) => {
    e.preventDefault();
    const p1 = matchForm.player1.trim();
    const p2 = matchForm.player2.trim();
    if (!p1 || !p2 || logSaving) return;
    const s1 = Number(matchForm.score1) || 0;
    const s2 = Number(matchForm.score2) || 0;
    const winner = s1 > s2 ? p1 : s2 > s1 ? p2 : "";
    setLogSaving(true);
    try {
      await base44.entities.Match.create({
        player1: p1, player2: p2, score1: s1, score2: s2, winner,
        stage: "group", group: matchForm.group,
      });
      setMatchForm({ group: matchForm.group, player1: "", player2: "", score1: 0, score2: 0 });
      setLogging(false);
      load();
    } finally { setLogSaving(false); }
  };

  const deleteMatch = async (id) => {
    await base44.entities.Match.delete(id);
    load();
  };

  const groupA = players.filter((p) => p.group === "A").sort(sortPlayers);
  const groupB = players.filter((p) => p.group === "B").sort(sortPlayers);
  const groupPlayerNames = players.filter((p) => p.group === matchForm.group).map((p) => p.name).filter(Boolean);

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-red-600 mb-3">Stage One</p>
          <h1 className="font-heading text-4xl sm:text-5xl tracking-tight">Groups</h1>
          <p className="text-sm text-zinc-500 mt-3">
            Top 8 of each group (highlighted) advance to the playoffs · {players.length}/36 players
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            {editing ? (
              <Button onClick={save} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white rounded-full px-6">
                <Check className="w-4 h-4 mr-2" />{saving ? "Saving…" : "Save changes"}
              </Button>
            ) : (
              <>
                <Button onClick={() => setLogging((v) => !v)} variant="outline"
                  className="rounded-full px-6 border-white/10 bg-transparent hover:bg-white/5 text-zinc-200">
                  <Plus className="w-4 h-4 mr-2" />Log match
                </Button>
                <Button onClick={() => setEditing(true)} variant="outline"
                  className="rounded-full px-6 border-white/10 bg-transparent hover:bg-white/5 text-zinc-200">
                  <Pencil className="w-4 h-4 mr-2" />Update results
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {canEdit && logging && (
        <form onSubmit={submitMatch} className="rounded-2xl border border-red-600/20 bg-red-600/[0.04] p-6 mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl tracking-tight">Log a Group Match</h2>
            <button type="button" onClick={() => setLogging(false)}
              className="text-xs uppercase tracking-[0.15em] text-zinc-400 hover:text-zinc-200">Cancel</button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Player 1</label>
              <input list="gs-names" value={matchForm.player1}
                onChange={(e) => setMatchForm({ ...matchForm, player1: e.target.value })}
                placeholder="Name" className="w-full h-10 bg-transparent border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Player 2</label>
              <input list="gs-names" value={matchForm.player2}
                onChange={(e) => setMatchForm({ ...matchForm, player2: e.target.value })}
                placeholder="Name" className="w-full h-10 bg-transparent border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Score 1</label>
              <input type="number" min="0" value={matchForm.score1}
                onChange={(e) => setMatchForm({ ...matchForm, score1: e.target.value })}
                className="w-full h-10 bg-transparent border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Score 2</label>
              <input type="number" min="0" value={matchForm.score2}
                onChange={(e) => setMatchForm({ ...matchForm, score2: e.target.value })}
                className="w-full h-10 bg-transparent border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Group</label>
              <select value={matchForm.group}
                onChange={(e) => setMatchForm({ ...matchForm, group: e.target.value, player1: "", player2: "" })}
                className="w-full h-10 bg-[#0a0a0b] border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none">
                <option value="A">A</option>
                <option value="B">B</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-5">
            <Button type="submit" disabled={logSaving || !matchForm.player1.trim() || !matchForm.player2.trim()}
              className="bg-red-600 hover:bg-red-700 text-white rounded-full px-6">
              {logSaving ? "Saving…" : "Save match"}
            </Button>
          </div>
          <datalist id="gs-names">
            {groupPlayerNames.map((n) => <option key={n} value={n} />)}
          </datalist>
        </form>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {[{ t: "Group A", g: "A", list: groupA }, { t: "Group B", g: "B", list: groupB }].map((x) => (
          <div key={x.g} className="space-y-3">
            <GroupTable title={x.t} players={x.list} editing={editing} onChange={handleChange} onDelete={remove} />
            {editing && x.list.length < 18 && (
              <button onClick={() => addPlayer(x.g)}
                className="w-full py-3 rounded-xl border border-dashed border-white/10 text-xs uppercase tracking-[0.15em] text-zinc-500 hover:text-red-500 hover:border-red-600/40 transition-colors flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />Add player to {x.t}
              </button>
            )}
          </div>
        ))}
      </div>

      {canEdit && groupMatches.length > 0 && (
        <section className="mt-12">
          <h2 className="font-heading text-2xl tracking-tight mb-6">Logged Group Matches</h2>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] divide-y divide-white/5">
            {groupMatches.map((m) => (
              <div key={m.id} className="flex items-center gap-4 px-5 py-3">
                <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-600 w-16">Group {m.group || ""}</span>
                <span className="flex-1 text-sm">
                  <span className={m.winner === m.player1 ? "text-zinc-100 font-medium" : "text-zinc-400"}>{m.player1}</span>
                  <span className="text-zinc-600 mx-2">{m.score1}–{m.score2}</span>
                  <span className={m.winner === m.player2 ? "text-zinc-100 font-medium" : "text-zinc-400"}>{m.player2}</span>
                </span>
                <button onClick={() => deleteMatch(m.id)} className="text-zinc-600 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}