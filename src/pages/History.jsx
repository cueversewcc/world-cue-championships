import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Pencil, Check, Plus, Trash2 } from "lucide-react";
import HistoryArchive from "@/components/HistoryArchive";

export default function History() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin";
  const [tournaments, setTournaments] = useState([]);
  const [draft, setDraft] = useState([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.PastTournament.list("order").then((list) => {
      setTournaments(list);
      setDraft(list.map((t) => ({ ...t, results: (t.results || []).map((r) => ({ ...r })) })));
    });
  }, []);

  const startEdit = () => {
    setDraft(tournaments.map((t) => ({ ...t, results: (t.results || []).map((r) => ({ ...r })) })));
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const draftIds = new Set(draft.map((t) => t.id).filter(Boolean));
      const toDelete = tournaments.filter((t) => t.id && !draftIds.has(t.id)).map((t) => t.id);
      const next = [];
      for (const t of draft) {
        const data = {
          title: t.title,
          results: (t.results || []).map((r) => ({ season: r.season, champion: r.champion, runnerUp: r.runnerUp })),
          order: next.length
        };
        if (t.id) next.push(await base44.entities.PastTournament.update(t.id, data));
        else if (t.title) next.push(await base44.entities.PastTournament.create(data));
      }
      if (toDelete.length) await Promise.all(toDelete.map((id) => base44.entities.PastTournament.delete(id)));
      setTournaments(next);
      setDraft(next.map((t) => ({ ...t, results: (t.results || []).map((r) => ({ ...r })) })));
      setEditing(false);
    } finally { setSaving(false); }
  };

  const view = editing ? draft : tournaments;
  const updateT = (i, fields) => setDraft((d) => d.map((t, idx) => idx === i ? { ...t, ...fields } : t));
  const updateResult = (i, ri, fields) => setDraft((d) => d.map((t, idx) => idx === i ? { ...t, results: (t.results || []).map((r, ridx) => ridx === ri ? { ...r, ...fields } : r) } : t));
  const addResult = (i) => setDraft((d) => d.map((t, idx) => idx === i ? { ...t, results: [...(t.results || []), { season: "", champion: "", runnerUp: "" }] } : t));
  const removeResult = (i, ri) => setDraft((d) => d.map((t, idx) => idx === i ? { ...t, results: (t.results || []).filter((_, ridx) => ridx !== ri) } : t));

  return (
    <div className="max-w-5xl mx-auto px-6 py-20">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-14">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-red-600 mb-4">Archive</p>
          <h1 className="font-heading text-4xl sm:text-5xl tracking-tight">History</h1>
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

      <HistoryArchive />

      <div className="space-y-14">
        {view.length === 0 && !editing && (
          <p className="text-sm text-zinc-500">No custom entries.</p>
        )}
        {view.map((t, i) => (
          <section key={t.id || `new-${i}`} className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
            {editing ? (
              <div className="flex items-center gap-3 mb-5">
                <input value={t.title || ""} onChange={(e) => updateT(i, { title: e.target.value })} placeholder="Tournament title"
                  className="bg-transparent font-heading text-2xl tracking-tight border-b border-white/10 focus:border-red-600 outline-none" />
                <button onClick={() => setDraft((d) => d.filter((_, idx) => idx !== i))} className="ml-auto text-zinc-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ) : (
              <h2 className="font-heading text-2xl tracking-tight mb-5">{t.title}</h2>
            )}

            <div className="rounded-xl border border-white/5 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 border-b border-white/5">
                    <th className="text-left font-medium px-3 py-2">Season</th>
                    <th className="text-left font-medium px-3 py-2">Champion</th>
                    <th className="text-left font-medium px-3 py-2">Runner-up</th>
                    {editing && <th className="px-3 py-2 w-10"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(t.results || []).map((r, ri) => (
                    <tr key={ri}>
                      <td className="px-3 py-2">
                        {editing ? (
                          <input value={r.season || ""} onChange={(e) => updateResult(i, ri, { season: e.target.value })}
                            className="w-full bg-transparent border-b border-white/10 focus:border-red-600 outline-none" />
                        ) : <span className="text-zinc-400">{r.season}</span>}
                      </td>
                      <td className="px-3 py-2">
                        {editing ? (
                          <input value={r.champion || ""} onChange={(e) => updateResult(i, ri, { champion: e.target.value })}
                            className="w-full bg-transparent border-b border-white/10 focus:border-red-600 outline-none" />
                        ) : <span className="text-red-500 font-medium">{r.champion}</span>}
                      </td>
                      <td className="px-3 py-2">
                        {editing ? (
                          <input value={r.runnerUp || ""} onChange={(e) => updateResult(i, ri, { runnerUp: e.target.value })}
                            className="w-full bg-transparent border-b border-white/10 focus:border-red-600 outline-none" />
                        ) : <span className="text-zinc-300">{r.runnerUp}</span>}
                      </td>
                      {editing && (
                        <td className="px-3 py-2 text-center">
                          <button onClick={() => removeResult(i, ri)} className="text-zinc-500 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {(t.results || []).length === 0 && !editing && (
                    <tr><td colSpan={3} className="px-3 py-4 text-zinc-500 text-xs">No results recorded.</td></tr>
                  )}
                  {editing && (
                    <tr>
                      <td colSpan={4} className="px-3 py-2">
                        <button onClick={() => addResult(i)} className="text-xs uppercase tracking-[0.15em] text-zinc-500 hover:text-red-500 flex items-center gap-2">
                          <Plus className="w-3.5 h-3.5" />Add season
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ))}
        {editing && (
          <button onClick={() => setDraft((d) => [...d, { title: "", results: [] }])}
            className="w-full py-4 rounded-2xl border border-dashed border-white/10 text-xs uppercase tracking-[0.15em] text-zinc-500 hover:text-red-500 hover:border-red-600/40 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />Add tournament
          </button>
        )}
      </div>
    </div>
  );
}