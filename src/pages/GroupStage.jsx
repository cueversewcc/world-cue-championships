import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import GroupTable from "@/components/GroupTable";
import { Button } from "@/components/ui/button";
import { Pencil, Check, Plus } from "lucide-react";
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

  const load = async () => setPlayers(await base44.entities.Player.list());
  useEffect(() => { load(); }, []);

  const handleChange = (id, field, value) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
    setDirty((d) => ({ ...d, [id]: { ...(d[id] || {}), [field]: value } }));
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

  const groupA = players.filter((p) => p.group === "A").sort(sortPlayers);
  const groupB = players.filter((p) => p.group === "B").sort(sortPlayers);

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-red-600 mb-3">Stage One</p>
          <h1 className="font-heading text-4xl sm:text-5xl tracking-tight">Group Stage</h1>
          <p className="text-sm text-zinc-500 mt-3">
            Top 8 of each group (highlighted) advance to the playoffs · {players.length}/36 players
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
              <Pencil className="w-4 h-4 mr-2" />Update results
            </Button>
          )
        )}
      </div>

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
    </div>
  );
}