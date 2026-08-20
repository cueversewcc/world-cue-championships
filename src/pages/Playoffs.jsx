import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import BracketMatch from "@/components/BracketMatch";
import { Button } from "@/components/ui/button";
import { Pencil, Check, Trophy } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const ROUND_LABELS = {
  R64: "Round of 64",
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-Finals",
  SF: "Semi-Finals",
  F: "Final",
};

const roundsInOrder = (list) => {
  const counts = {};
  list.forEach((m) => { counts[m.round] = (counts[m.round] || 0) + 1; });
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .map(([r]) => r);
};

const computeAdvanceMap = (list) => {
  const rounds = roundsInOrder(list);
  const map = {};
  for (let i = 0; i < rounds.length - 1; i++) map[rounds[i]] = rounds[i + 1];
  return map;
};

export default function Playoffs() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin";
  const [matches, setMatches] = useState([]);
  const [config, setConfig] = useState(null);
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState({});
  const [nameDraft, setNameDraft] = useState({ main: "", consolation: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setMatches(await base44.entities.PlayoffMatch.list("slot"));
    const configs = await base44.entities.PlayoffConfig.list();
    const c = configs[0] || null;
    setConfig(c);
    setNameDraft({
      main: c?.mainBracketName || "Championship",
      consolation: c?.consolationName || "Consolation Cup",
    });
  };
  useEffect(() => { load(); }, []);

  const mainMatches = matches.filter((m) => (m.bracket || "main") === "main");
  const consMatches = matches.filter((m) => m.bracket === "consolation");

  const applyChange = (list, id, field, value) => {
    const dirtyIds = new Set([id]);
    let next = list.map((m) => (m.id === id ? { ...m, [field]: value } : m));
    const m = next.find((x) => x.id === id);
    const s1 = Number(m.score1) || 0;
    const s2 = Number(m.score2) || 0;
    let winner = "";
    if (s1 > s2 && m.player1) winner = m.player1;
    else if (s2 > s1 && m.player2) winner = m.player2;
    next = next.map((x) => (x.id === id ? { ...x, winner } : x));
    const advanceMap = computeAdvanceMap(list);
    const tr = advanceMap[m.round];
    if (tr) {
      const ts = Math.ceil(m.slot / 2);
      const pos = m.slot % 2 === 1 ? "player1" : "player2";
      const target = next.find((x) => x.round === tr && x.slot === ts);
      if (target && target[pos] !== winner) {
        next = next.map((x) =>
          x.id === target.id ? { ...x, [pos]: winner, winner: "", score1: 0, score2: 0 } : x
        );
        dirtyIds.add(target.id);
      }
    }
    return { next, dirtyIds: [...dirtyIds] };
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
    const payload = {
      mainBracketName: nameDraft.main,
      consolationName: nameDraft.consolation,
      hasConsolation: consMatches.length > 0,
    };
    if (config?.id) {
      await base44.entities.PlayoffConfig.update(config.id, payload);
    } else {
      await base44.entities.PlayoffConfig.create(payload);
    }
    setDirty({});
    setSaving(false);
    setEditing(false);
    load();
  };

  const mainRounds = roundsInOrder(mainMatches);
  const champion = mainRounds.length > 0
    ? mainMatches.find((m) => m.round === mainRounds[mainRounds.length - 1])?.winner
    : "";

  const renderBracket = (bracketMatches, name, bracketType) => {
    if (bracketMatches.length === 0) return null;
    const rounds = roundsInOrder(bracketMatches);
    const draftVal = bracketType === "main" ? nameDraft.main : nameDraft.consolation;
    return (
      <div>
        <div className="mb-6">
          {editing ? (
            <input
              value={draftVal}
              onChange={(e) => setNameDraft(bracketType === "main" ? { ...nameDraft, main: e.target.value } : { ...nameDraft, consolation: e.target.value })}
              className="font-heading text-3xl tracking-tight bg-transparent border-b border-white/10 focus:border-red-600 outline-none w-full max-w-md"
            />
          ) : (
            <h2 className="font-heading text-3xl tracking-tight">{name}</h2>
          )}
        </div>
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-8 min-w-max">
            {rounds.map((r) => (
              <div key={r} className="flex flex-col">
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-4">{ROUND_LABELS[r] || r}</p>
                <div className="flex-1 flex flex-col justify-around gap-4">
                  {bracketMatches.filter((m) => m.round === r).sort((a, b) => a.slot - b.slot).map((m) => (
                    <BracketMatch key={m.id} match={m} editing={editing} onChange={handleChange} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-red-600 mb-3">Stage Two</p>
          <h1 className="font-heading text-4xl sm:text-5xl tracking-tight">Playoffs</h1>
          <p className="text-sm text-zinc-500 mt-3">
            {mainMatches.length > 0 ? `${mainMatches.length} matches` : "No bracket yet"}
            {consMatches.length > 0 ? " · consolation bracket active" : ""}
          </p>
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

      {mainMatches.length === 0 && consMatches.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
          <p className="text-sm text-zinc-400">No playoff bracket yet. Advance players from the Groups tab to populate the playoffs.</p>
        </div>
      )}

      {champion && (
        <div className="mb-12 rounded-2xl border border-red-600/30 bg-gradient-to-r from-red-600/15 to-transparent p-6 flex items-center gap-4">
          <Trophy className="w-6 h-6 text-red-500" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-400">Champion</p>
            <p className="font-heading text-2xl tracking-tight">{champion}</p>
          </div>
        </div>
      )}

      <div className="space-y-16">
        {renderBracket(mainMatches, config?.mainBracketName || "Championship", "main")}
        {renderBracket(consMatches, config?.consolationName || "Consolation Cup", "consolation")}
      </div>
    </div>
  );
}