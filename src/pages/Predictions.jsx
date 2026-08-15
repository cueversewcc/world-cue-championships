import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Pencil, Check, Plus, Trash2 } from "lucide-react";

export default function Predictions() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin";
  const [picks, setPicks] = useState([]);
  const [draft, setDraft] = useState([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Prediction.list("order").then((list) => {
      setPicks(list);
      setDraft(list.map((p) => ({ ...p })));
    });
  }, []);

  const startEdit = () => { setDraft(picks.map((p) => ({ ...p }))); setEditing(true); };

  const save = async () => {
    setSaving(true);
    try {
      const draftIds = new Set(draft.map((p) => p.id).filter(Boolean));
      const toDelete = picks.filter((p) => p.id && !draftIds.has(p.id)).map((p) => p.id);
      const next = [];
      for (const p of draft) {
        const data = { category: p.category, pick: p.pick, notes: p.notes, order: next.length };
        if (p.id) next.push(await base44.entities.Prediction.update(p.id, data));
        else if (p.category || p.pick) next.push(await base44.entities.Prediction.create(data));
      }
      if (toDelete.length) await Promise.all(toDelete.map((id) => base44.entities.Prediction.delete(id)));
      setPicks(next);
      setDraft(next.map((p) => ({ ...p })));
      setEditing(false);
    } finally { setSaving(false); }
  };

  const view = editing ? draft : picks;

  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-14">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-red-600 mb-4">Forecast</p>
          <h1 className="font-heading text-4xl sm:text-5xl tracking-tight">Predictions</h1>
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

      <div className="grid sm:grid-cols-2 gap-4">
        {view.length === 0 && !editing && (
          <p className="text-sm text-zinc-500 col-span-2">No predictions yet.</p>
        )}
        {view.map((p, i) => (
          <div key={p.id || `new-${i}`} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
            {editing ? (
              <>
                <input value={p.category || ""} onChange={(e) => setDraft((d) => d.map((r, idx) => idx === i ? { ...r, category: e.target.value } : r))}
                  placeholder="Category (e.g. Champion)" className="w-full bg-transparent text-[10px] uppercase tracking-[0.2em] text-red-600 mb-3 pb-2 border-b border-white/10 focus:border-red-600 outline-none" />
                <input value={p.pick || ""} onChange={(e) => setDraft((d) => d.map((r, idx) => idx === i ? { ...r, pick: e.target.value } : r))}
                  placeholder="Pick" className="w-full bg-transparent font-heading text-xl tracking-tight mb-3 border-b border-white/10 focus:border-red-600 outline-none" />
                <textarea value={p.notes || ""} onChange={(e) => setDraft((d) => d.map((r, idx) => idx === i ? { ...r, notes: e.target.value } : r))}
                  rows={2} placeholder="Notes" className="w-full bg-transparent text-sm text-zinc-400 border-b border-white/10 focus:border-red-600 outline-none resize-none" />
                <div className="mt-3 flex justify-end">
                  <button onClick={() => setDraft((d) => d.filter((_, idx) => idx !== i))} className="text-zinc-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[10px] uppercase tracking-[0.2em] text-red-600 mb-3">{p.category}</p>
                <p className="font-heading text-xl tracking-tight mb-3">{p.pick}</p>
                {p.notes && <p className="text-sm text-zinc-400">{p.notes}</p>}
              </>
            )}
          </div>
        ))}
        {editing && (
          <button onClick={() => setDraft((d) => [...d, { category: "", pick: "", notes: "" }])}
            className="rounded-2xl border border-dashed border-white/10 text-xs uppercase tracking-[0.15em] text-zinc-500 hover:text-red-500 hover:border-red-600/40 transition-colors flex items-center justify-center gap-2 py-8">
            <Plus className="w-4 h-4" />Add prediction
          </button>
        )}
      </div>
    </div>
  );
}