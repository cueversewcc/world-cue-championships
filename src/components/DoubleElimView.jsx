import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { applyDoubleElim, roundLabel, doubleElimChamp } from "@/lib/bracket";
import MatchCard from "./MatchCard";

const byRound = (list) => {
  const map = {};
  for (const m of list) (map[m.round] ||= []).push(m);
  return Object.keys(map)
    .map(Number)
    .sort((a, b) => a - b)
    .map((r) => ({ round: r, items: map[r].sort((a, b) => a.slot - b.slot) }));
};

export default function DoubleElimView({ wb, lb, final, editable, onSaved }) {
  const [state, setState] = useState({
    wb: wb.map((m) => ({ ...m })),
    lb: lb.map((m) => ({ ...m })),
    final: final.map((m) => ({ ...m })),
  });
  const [dirty, setDirty] = useState(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setState({ wb: wb.map((m) => ({ ...m })), lb: lb.map((m) => ({ ...m })), final: final.map((m) => ({ ...m })) });
    setDirty(new Set());
  }, [wb, lb, final]);

  const orig = useMemo(() => new Map([...wb, ...lb, ...final].map((m) => [m.id, m])), [wb, lb, final]);

  const update = (id, field, value) => {
    setState((prev) => {
      const nw = prev.wb.map((m) => ({ ...m }));
      const nl = prev.lb.map((m) => ({ ...m }));
      const nf = prev.final.map((m) => ({ ...m }));
      const all = [...nw, ...nl, ...nf];
      const m = all.find((x) => x.id === id);
      if (m) m[field] = value;
      applyDoubleElim(nw, nl, nf);
      const d = new Set();
      for (const x of all) {
        const o = orig.get(x.id);
        if (o && ["player1", "player2", "score1", "score2", "winner"].some((f) => (x[f] ?? "") !== (o[f] ?? ""))) d.add(x.id);
      }
      setDirty(d);
      return { wb: nw, lb: nl, final: nf };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const all = [...state.wb, ...state.lb, ...state.final];
      const updates = all
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

  const wbRounds = byRound(state.wb);
  const lbRounds = byRound(state.lb);
  const wbR0 = wbRounds[0]?.items.length || 1;
  const champ = doubleElimChamp(state.wb, state.lb, state.final);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-xl tracking-tight">Double Elimination</h3>
        {editable && dirty.size > 0 && (
          <Button onClick={save} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white rounded-full px-5 h-8 text-xs">
            <Check className="w-3.5 h-3.5 mr-1.5" />
            {saving ? "Saving…" : `Save (${dirty.size})`}
          </Button>
        )}
      </div>
      {champ && (
        <div className="mb-6 rounded-xl border border-red-600/30 bg-red-600/10 px-5 py-3 text-sm">
          Champion: <span className="font-semibold text-red-300">{champ}</span>
        </div>
      )}

      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-3">Winners Bracket</p>
      <div className="flex gap-6 overflow-x-auto pb-4 mb-8">
        {wbRounds.map((r) => (
          <div key={r.round} className="min-w-[200px]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-3">{roundLabel((wbR0 * 2) >> r.round)}</p>
            <div className="space-y-3">
              {r.items.map((m) => (
                <MatchCard key={m.id} m={m} editable={editable} onUpdate={update} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-3">Losers Bracket</p>
      <div className="flex gap-6 overflow-x-auto pb-4 mb-8">
        {lbRounds.map((r) => (
          <div key={r.round} className="min-w-[200px]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-3">Losers {r.round + 1}</p>
            <div className="space-y-3">
              {r.items.map((m) => (
                <MatchCard key={m.id} m={m} editable={editable} onUpdate={update} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-3">Grand Final</p>
      <div className="flex gap-6">
        {state.final.map((m) => (
          <div key={m.id} className="min-w-[200px]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-3">{m.slot === 0 ? "Final" : "Reset (if needed)"}</p>
            <MatchCard m={m} editable={editable} onUpdate={update} />
          </div>
        ))}
      </div>
    </div>
  );
}