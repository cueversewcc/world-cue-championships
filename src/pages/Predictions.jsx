import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Pencil, Check, Plus, Trash2 } from "lucide-react";

export default function Predictions() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin";
  const [posts, setPosts] = useState([]);
  const [draft, setDraft] = useState([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Prediction.list("-created_date").then((list) => {
      setPosts(list);
      setDraft(list.map((p) => ({ ...p })));
    });
  }, []);

  const startEdit = () => { setDraft(posts.map((p) => ({ ...p }))); setEditing(true); };

  const save = async () => {
    setSaving(true);
    try {
      const draftIds = new Set(draft.map((p) => p.id).filter(Boolean));
      const toDelete = posts.filter((p) => p.id && !draftIds.has(p.id)).map((p) => p.id);
      const next = [];
      for (const p of draft) {
        const data = { title: p.title, content: p.content, order: next.length };
        if (p.id) next.push(await base44.entities.Prediction.update(p.id, data));
        else if (p.title || p.content) next.push(await base44.entities.Prediction.create(data));
      }
      if (toDelete.length) await Promise.all(toDelete.map((id) => base44.entities.Prediction.delete(id)));
      setPosts(next);
      setDraft(next.map((p) => ({ ...p })));
      setEditing(false);
    } finally { setSaving(false); }
  };

  const view = editing ? draft : posts;

  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
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

      <div className="space-y-6">
        {view.length === 0 && !editing && (
          <p className="text-sm text-zinc-500">No predictions posted yet.</p>
        )}
        {view.map((p, i) => (
          <article key={p.id || `new-${i}`} className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
            {editing ? (
              <div>
                <div className="flex items-start gap-3 mb-3">
                  <input value={p.title || ""} onChange={(e) => setDraft((d) => d.map((r, idx) => idx === i ? { ...r, title: e.target.value } : r))}
                    placeholder="Prediction title" className="flex-1 bg-transparent font-heading text-xl tracking-tight border-b border-white/10 focus:border-red-600 outline-none pb-2" />
                  <button onClick={() => setDraft((d) => d.filter((_, idx) => idx !== i))} className="text-zinc-500 hover:text-red-500 mt-1"><Trash2 className="w-4 h-4" /></button>
                </div>
                <textarea value={p.content || ""} onChange={(e) => setDraft((d) => d.map((r, idx) => idx === i ? { ...r, content: e.target.value } : r))}
                  rows={4} placeholder="Write your prediction…" className="w-full bg-transparent text-sm text-zinc-300 leading-relaxed border border-white/10 rounded-lg p-3 focus:border-red-600 outline-none resize-none" />
              </div>
            ) : (
              <div>
                <h2 className="font-heading text-xl tracking-tight mb-3">{p.title}</h2>
                <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{p.content}</p>
              </div>
            )}
          </article>
        ))}
        {editing && (
          <button onClick={() => setDraft((d) => [...d, { title: "", content: "" }])}
            className="w-full py-4 rounded-2xl border border-dashed border-white/10 text-xs uppercase tracking-[0.15em] text-zinc-500 hover:text-red-500 hover:border-red-600/40 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />Add prediction
          </button>
        )}
      </div>
    </div>
  );
}