import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import BracketMatch from "@/components/BracketMatch";
import { Button } from "@/components/ui/button";
import { Pencil, Check, Trophy } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const rounds = [
  { key: "R16", label: "Round of 16" },
  { key: "QF", label: "Quarter-Finals" },
  { key: "SF", label: "Semi-Finals" },
  { key: "F", label: "Final" },
];

export default function Playoffs() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin";
  const [matches, setMatches] = useState([]);
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => setMatches(await base44.entities.PlayoffMatch.list("slot"));
  useEffect(() => { load(); }, []);

  const advanceMap = { R16: "QF", QF: "SF", SF: "F" };

  const applyChange = (list, id, field, value) => {
    const dirty = new Set([id]);
    let next = list.map((m) => (m.id === id ? { ...m, [field]: value } : m));
    const m = next.find((x) => x.id === id);
    const s1 = Number(m.score1) || 0;
    const s2 = Number(m.score2) || 0;
    let winner = "";
    if (s1 > s2 && m.player1) winner = m.player1;
    else if (s2 > s1 && m.player2) winner = m.player2;
    next = next.map((x) => (x.id === id ? { ...x, winner } : x));
    const tr = advanceMap[m.round];
    if (tr) {
      const ts = Math.ceil(m.slot / 2);
      const pos = m.slot % 2 === 1 ? "player1" : "player2";
      const target = next.find((x) => x.round === tr && x.slot === ts);
      if (target && target[pos] !== winner) {
        next = next.map((x) =>
          x.id === target.id ? { ...x, [pos]: winner, winner: "", score1: 0, score2: 0 } : x
        );
        dirty.add(target.id);
      }
    }
    return { next, dirtyIds: [...dirty] };
  };

  const handleChange = (id, field, value) => {
    const { next, dirtyIds } = applyChange(matches, id, field, value);
    setMatches(next);
    setDirty((d) => {
      const copy = { ...d };
      for (const did of dirtyIds) {
        const m = next.find((x) => x.id === did);
        copy[did] = {
          ...(copy[did] || {}),
          player1: m.player1, player2: m.player2,
          score1: m.score1, score2: m.score2, winner: m.winner,
        };
      }
      return copy;
    });
  };

  const save = async () => {
    setSaving(true);
    const updates = Object.entries(dirty).map(([id, fields]) => ({ id, ...fields }));
    if (updates.length) await base44.entities.PlayoffMatch.bulkUpdate(updates);
    setDirty({});
    setSaving(false);
    setEditing(false);
    load();
  };

  const champion = matches.find((m) => m.round === "F")?.winner;

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-red-600 mb-3">Stage Two</p>
          <h1 className="font-heading text-4xl sm:text-5xl tracking-tight">Playoffs</h1>
          <p className="text-sm text-zinc-500 mt-3">Single elimination · 16 players</p>
        </div>
        {canEdit && (
          editing ? (
            <Button onClick={save} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white rounded-full px-6">
              <Check className="w-4 h-4 mr-2" />{saving ? "Saving…" : "Save changes"}
            </Button>
          ) : (
            <Button onClick={() => setEditing(true)} variant="outline"
              className="rounded-full px-6 border-white/10 bg-transparent hover:bg-white/5 text-zinc-200">
              <Pencil className="w-4 h-4 mr-2" />Update bracket
            </Button>
          )
        )}
      </div>

      {champion && (
        <div className="mb-12 rounded-2xl border border-red-600/30 bg-gradient-to-r from-red-600/15 to-transparent p-6 flex items-center gap-4">
          <Trophy className="w-6 h-6 text-red-500" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-400">Champion</p>
            <p className="font-heading text-2xl tracking-tight">{champion}</p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-8 min-w-max">
          {rounds.map((r) => (
            <div key={r.key} className="flex flex-col">
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-4">{r.label}</p>
              <div className="flex-1 flex flex-col justify-around gap-4">
                {matches.filter((m) => m.round === r.key).map((m) => (
                  <BracketMatch key={m.id} match={m} editing={editing} onChange={handleChange} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}