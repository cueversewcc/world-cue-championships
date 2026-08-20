import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { applyAdvancement, roundLabel } from "@/lib/bracket";
import MatchCard from "./MatchCard";

const byRound = (list) => {
  const map = {};
  for (const m of list) (map[m.round] ||= []).push(m);
  return Object.keys(map)
    .map(Number)
    .sort((a, b) => a - b)
    .map((r) => ({ round: r, items: map[r].sort((a, b) => a.slot - b.slot) }));
};

export default function TournamentBracket({ matches, editable, onSaved, title }) {
  const [local, setLocal] = useState(() => matches.map((m) => ({ ...m })));
  const [dirty, setDirty] = useState(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocal(matches.map((m) => ({ ...m })));
    setDirty(new Set());
  }, [matches]);

  const orig = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches]);
  const rounds = useMemo(() => byRound(local), [local]);
  const r0 = rounds[0]?.items.length || 1;

  const update = (id, field, value) => {
    setLocal((prev) => {
      const next = prev.map((m) => ({ ...m }));
      const m = next.find((x) => x.id === id);
      if (m) m[field] = value;
      applyAdvancement(next);
      const d = new Set();
      for (const x of next) {
        const o = orig.get(x.id);
        if (o && ["player1", "player2", "score1", "score2", "winner"].some((f) => (x[f] ?? "") !== (o[f] ?? ""))) d.add(x.id);
      }
      setDirty(d);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const updates = local
        .filter((m) => dirty.has(m.id))
        .map((m) => ({
          id: m.id,
          player1: m.player1,
          player2: m.player2,
          score1: Number(m.score1) || 0,
          score2: Number(m.score2) || 0,
          winner: m.winner,
        }));
      if (updates.length) await base44.entities.TournamentMatch.bulkUpdate(updates);
      setDirty(new Set());
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  const champRound = rounds[rounds.length - 1];
  const champ = champRound?.items[0]?.winner || "";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-xl tracking-tight">{title}</h3>
        {editable && dirty.size > 0 && (
          <Button onClick={save} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white rounded-full px-5 h-8 text-xs">
            <Check className="w-3.5 h-3.5 mr-1.5" />
            {saving ? "Saving…" : `Save (${dirty.size})`}
          </Button>
        )}
      </div>
      {champ && (
        <div className="mb-6 rounded-xl border border-red-600/30 bg-red-600/10 px-5 py-3 text-sm">
          Winner: <span className="font-semibold text-red-300">{champ}</span>
        </div>
      )}
      <div className="flex gap-6 overflow-x-auto pb-4">
        {rounds.map((r) => (
          <div key={r.round} className="min-w-[200px]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-3">{roundLabel((r0 * 2) >> r.round)}</p>
            <div className="space-y-3">
              {r.items.map((m) => (
                <MatchCard key={m.id} m={m} editable={editable} onUpdate={update} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}