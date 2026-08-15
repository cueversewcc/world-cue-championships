import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Pencil, Check, Plus, Trash2 } from "lucide-react";

export default function TeamPlay() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin";
  const [teams, setTeams] = useState([]);
  const [draft, setDraft] = useState([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Team.list("order").then((list) => {
      setTeams(list);
      setDraft(list.map((t) => ({ ...t })));
    });
  }, []);

  const startEdit = () => { setDraft(teams.map((t) => ({ ...t }))); setEditing(true); };

  const save = async () => {
    setSaving(true);
    try {
      const draftIds = new Set(draft.map((t) => t.id).filter(Boolean));
      const toDelete = teams.filter((t) => t.id && !draftIds.has(t.id)).map((t) => t.id);
      const next = [];
      for (const t of draft) {
        const data = {
          name: t.name, players: t.players || [],
          played: Number(t.played) || 0, wins: Number(t.wins) || 0, losses: Number(t.losses) || 0,
          points: Number(t.points) || 0, order: next.length
        };
        if (t.id) next.push(await base44.entities.Team.update(t.id, data));
        else if (t.name) next.push(await base44.entities.Team.create(data));
      }
      if (toDelete.length) await Promise.all(toDelete.map((id) => base44.entities.Team.delete(id)));
      setTeams(next);
      setDraft(next.map((t) => ({ ...t })));
      setEditing(false);
    } finally { setSaving(false); }
  };

  const view = editing ? draft : teams;

  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-14">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-red-600 mb-4">Teams</p>
          <h1 className="font-heading text-4xl sm:text-5xl tracking-tight">Team Play</h1>
        </div>
        {canEdit && (
          editing ? (
            <Button onClick={save} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white rounded-full px-6">
              <Check className="w-4 h-4 mr-2" />{saving ? "Saving…" : "Save changes"}
            </Button>
          ) : (
            <Button onClick={startEdit} variant="outline" className="rounded-full px-6 border-white/10 bg-transparent hover:bg-white/5 text-zinc-200">
              <Pencil className="w-4 h-4 mr-2" />Edit
            </Button>
          )
        )}
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 border-b border-white/5">
              <th className="text-left font-medium px-4 py-3">Team</th>
              <th className="text-left font-medium px-4 py-3">Players</th>
              <th className="text-center font-medium px-4 py-3">P</th>
              <th className="text-center font-medium px-4 py-3">W</th>
              <th className="text-center font-medium px-4 py-3">L</th>
              <th className="text-center font-medium px-4 py-3 text-red-500">Pts</th>
              {editing && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {view.length === 0 && !editing && (
              <tr><td colSpan={7} className="px-4 py-6 text-zinc-500">No teams yet.</td></tr>
            )}
            {view.map((t, i) => (
              <tr key={t.id || `new-${i}`} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-medium">
                  {editing ? (
                    <input value={t.name || ""} onChange={(e) => setDraft((d) => d.map((r, idx) => idx === i ? { ...r, name: e.target.value } : r))}
                      className="w-full bg-transparent border-b border-white/10 focus:border-red-600 outline-none" />
                  ) : t.name}
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {editing ? (
                    <input value={Array.isArray(t.players) ? t.players.join(", ") : ""} onChange={(e) => setDraft((d) => d.map((r, idx) => idx === i ? { ...r, players: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } : r))}
                      className="w-full bg-transparent border-b border-white/10 focus:border-red-600 outline-none" placeholder="Comma separated" />
                  ) : (Array.isArray(t.players) && t.players.length ? t.players.join(", ") : "—")}
                </td>
                <td className="px-4 py-3 text-center tabular-nums text-zinc-400">
                  {editing ? (
                    <input type="number" value={t.played ?? 0} onChange={(e) => setDraft((d) => d.map((r, idx) => idx === i ? { ...r, played: e.target.value } : r))}
                      className="w-14 text-center bg-transparent border-b border-white/10 focus:border-red-600 outline-none" />
                  ) : (t.played ?? 0)}
                </td>
                <td className="px-4 py-3 text-center tabular-nums">
                  {editing ? (
                    <input type="number" value={t.wins ?? 0} onChange={(e) => setDraft((d) => d.map((r, idx) => idx === i ? { ...r, wins: e.target.value } : r))}
                      className="w-14 text-center bg-transparent border-b border-white/10 focus:border-red-600 outline-none" />
                  ) : (t.wins ?? 0)}
                </td>
                <td className="px-4 py-3 text-center tabular-nums text-zinc-400">
                  {editing ? (
                    <input type="number" value={t.losses ?? 0} onChange={(e) => setDraft((d) => d.map((r, idx) => idx === i ? { ...r, losses: e.target.value } : r))}
                      className="w-14 text-center bg-transparent border-b border-white/10 focus:border-red-600 outline-none" />
                  ) : (t.losses ?? 0)}
                </td>
                <td className="px-4 py-3 text-center tabular-nums font-semibold text-red-500">
                  {editing ? (
                    <input type="number" value={t.points ?? 0} onChange={(e) => setDraft((d) => d.map((r, idx) => idx === i ? { ...r, points: e.target.value } : r))}
                      className="w-14 text-center bg-transparent border-b border-white/10 focus:border-red-600 outline-none" />
                  ) : (t.points ?? 0)}
                </td>
                {editing && (
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => setDraft((d) => d.filter((_, idx) => idx !== i))} className="text-zinc-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </td>
                )}
              </tr>
            ))}
            {editing && (
              <tr>
                <td colSpan={7} className="px-4 py-3">
                  <button onClick={() => setDraft((d) => [...d, { name: "", players: [], played: 0, wins: 0, losses: 0, points: 0 }])}
                    className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-red-600 hover:text-red-500">
                    <Plus className="w-4 h-4" />Add team
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}