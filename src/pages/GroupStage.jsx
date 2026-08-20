import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import GroupStageManager from "@/components/GroupStageManager";

export default function GroupStage() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin";
  const [tournaments, setTournaments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", groupCount: 2, advancingCount: 16, mainBracketName: "Championship", consolationName: "Consolation Cup" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const list = await base44.entities.Tournament.filter({ category: "groups" }, "-order");
    setTournaments(list);
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || saving) return;
    setSaving(true);
    try {
      await base44.entities.Tournament.create({
        name: form.name.trim(),
        format: "group_stage",
        category: "groups",
        mainBracketName: form.mainBracketName,
        consolationName: form.consolationName,
        groupCount: Number(form.groupCount) || 2,
        advancingCount: Number(form.advancingCount) || 16,
        status: "setup",
        order: tournaments.length,
      });
      setForm({ name: "", groupCount: 2, advancingCount: 16, mainBracketName: "Championship", consolationName: "Consolation Cup" });
      setAdding(false);
      load();
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    await base44.entities.Tournament.delete(id);
    const ps = await base44.entities.TournamentPlayer.filter({ tournamentId: id });
    await Promise.all(ps.map((p) => base44.entities.TournamentPlayer.delete(p.id)));
    const ms = await base44.entities.TournamentMatch.filter({ tournamentId: id });
    await Promise.all(ms.map((m) => base44.entities.TournamentMatch.delete(m.id)));
    load();
  };

  if (selected) {
    return <GroupStageManager tournamentId={selected} onBack={() => { setSelected(null); load(); }} editable={canEdit} />;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-red-600 mb-3">Stage One</p>
          <h1 className="font-heading text-4xl sm:text-5xl tracking-tight">Group Stage</h1>
          <p className="text-sm text-zinc-500 mt-3">Create group stages, log matches, and advance to the playoffs.</p>
        </div>
        {canEdit && !adding && (
          <Button onClick={() => setAdding(true)} className="bg-red-600 hover:bg-red-700 text-white rounded-full px-6">
            <Plus className="w-4 h-4 mr-2" />Add group stage
          </Button>
        )}
      </div>

      {canEdit && adding && (
        <form onSubmit={create} className="rounded-2xl border border-red-600/20 bg-red-600/[0.04] p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl tracking-tight">New Group Stage</h2>
            <button type="button" onClick={() => setAdding(false)} className="text-xs uppercase tracking-[0.15em] text-zinc-400 hover:text-zinc-200">Cancel</button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Group stage name" className="w-full h-10 bg-transparent border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Groups</label>
              <input type="number" min="1" max="12" value={form.groupCount} onChange={(e) => setForm({ ...form, groupCount: e.target.value })} className="w-full h-10 bg-transparent border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Advancing count</label>
              <input type="number" min="2" value={form.advancingCount} onChange={(e) => setForm({ ...form, advancingCount: e.target.value })} className="w-full h-10 bg-transparent border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none" />
            </div>
            <div className="hidden" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Main bracket name</label>
              <input value={form.mainBracketName} onChange={(e) => setForm({ ...form, mainBracketName: e.target.value })} className="w-full h-10 bg-transparent border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Consolation name</label>
              <input value={form.consolationName} onChange={(e) => setForm({ ...form, consolationName: e.target.value })} className="w-full h-10 bg-transparent border border-white/10 rounded-lg px-3 text-sm focus:border-red-600 outline-none" />
            </div>
          </div>
          <div className="flex justify-end mt-5">
            <Button type="submit" disabled={saving || !form.name.trim()} className="bg-red-600 hover:bg-red-700 text-white rounded-full px-6">
              {saving ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {tournaments.length === 0 && !adding && (
          <p className="text-sm text-zinc-500 col-span-full">No group stages yet. Click "Add group stage" to create one.</p>
        )}
        {tournaments.map((t) => (
          <div key={t.id} onClick={() => setSelected(t.id)} className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-red-600/30 transition-colors cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <span className="text-[10px] uppercase tracking-[0.15em] px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-400">{t.status}</span>
              {canEdit && (
                <button onClick={(e) => { e.stopPropagation(); remove(t.id); }} className="text-zinc-600 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <h3 className="font-heading text-xl tracking-tight mb-2">{t.name}</h3>
            <p className="text-xs text-zinc-500">{t.groupCount} groups · top {t.advancingCount} advance</p>
            <p className="text-xs text-zinc-600 mt-1">{t.mainBracketName || "Championship"} · {t.consolationName || "Consolation Cup"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}