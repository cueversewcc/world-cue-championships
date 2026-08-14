import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Pencil, Check, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";

export default function Rules() {
  const [sections, setSections] = useState([]);
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const list = await base44.entities.RuleSection.list("order");
    setSections(list);
  };
  useEffect(() => { load(); }, []);

  const markDirty = (id, fields) =>
    setDirty((d) => ({ ...d, [id]: { ...(d[id] || {}), ...fields } }));

  const updateTitle = (id, title) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
    markDirty(id, { title });
  };

  const updateItem = (id, idx, value) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, items: s.items.map((it, i) => (i === idx ? value : it)) } : s))
    );
    const sec = sections.find((s) => s.id === id);
    if (sec) markDirty(id, { items: sec.items.map((it, i) => (i === idx ? value : it)) });
  };

  const addItem = (id) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, items: [...(s.items || []), "New rule"] } : s))
    );
    const sec = sections.find((s) => s.id === id);
    if (sec) markDirty(id, { items: [...(sec.items || []), "New rule"] });
  };

  const removeItem = (id, idx) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, items: s.items.filter((_, i) => i !== idx) } : s))
    );
    const sec = sections.find((s) => s.id === id);
    if (sec) markDirty(id, { items: sec.items.filter((_, i) => i !== idx) });
  };

  const moveItem = (id, idx, dir) => {
    const sec = sections.find((s) => s.id === id);
    if (!sec) return;
    const arr = [...sec.items];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, items: arr } : s)));
    markDirty(id, { items: arr });
  };

  const addSection = async () => {
    const created = await base44.entities.RuleSection.create({ title: "New Section", items: ["New rule"], order: sections.length });
    setSections((prev) => [...prev, created]);
  };

  const removeSection = async (id) => {
    await base44.entities.RuleSection.delete(id);
    setSections((prev) => prev.filter((s) => s.id !== id));
  };

  const moveSection = async (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= sections.length) return;
    const reordered = [...sections];
    [reordered[idx], reordered[j]] = [reordered[j], reordered[idx]];
    setSections(reordered);
    const updates = reordered.map((s, i) => ({ id: s.id, order: i }));
    await base44.entities.RuleSection.bulkUpdate(updates);
  };

  const save = async () => {
    setSaving(true);
    const updates = Object.entries(dirty).map(([id, fields]) => ({ id, ...fields }));
    if (updates.length) await base44.entities.RuleSection.bulkUpdate(updates);
    setDirty({});
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-14">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-red-600 mb-4">Regulations</p>
          <h1 className="font-heading text-4xl sm:text-5xl tracking-tight">Championship Rules</h1>
        </div>
        {editing ? (
          <Button onClick={save} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white rounded-full px-6">
            <Check className="w-4 h-4 mr-2" />{saving ? "Saving…" : "Save changes"}
          </Button>
        ) : (
          <Button onClick={() => setEditing(true)} variant="outline"
            className="rounded-full px-6 border-white/10 bg-transparent hover:bg-white/5 text-zinc-200">
            <Pencil className="w-4 h-4 mr-2" />Edit rules
          </Button>
        )}
      </div>

      <div className="space-y-12">
        {sections.length === 0 && !editing && (
          <p className="text-sm text-zinc-500">No rules yet — click "Edit rules" to add some.</p>
        )}
        {sections.map((s, si) => (
          <section key={s.id} className={`relative ${editing ? "rounded-2xl border border-white/5 bg-white/[0.02] p-5" : ""}`}>
            {editing && (
              <div className="absolute -top-3 right-4 flex items-center gap-1">
                <button onClick={() => moveSection(si, -1)} disabled={si === 0} className="p-1 text-zinc-600 hover:text-red-500 disabled:opacity-20"><ChevronUp className="w-4 h-4" /></button>
                <button onClick={() => moveSection(si, 1)} disabled={si === sections.length - 1} className="p-1 text-zinc-600 hover:text-red-500 disabled:opacity-20"><ChevronDown className="w-4 h-4" /></button>
                <button onClick={() => removeSection(s.id)} className="p-1 text-zinc-600 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            )}
            {editing ? (
              <input value={s.title} onChange={(e) => updateTitle(s.id, e.target.value)}
                className="w-full bg-transparent text-xs uppercase tracking-[0.2em] text-zinc-400 mb-5 pb-3 border-b border-white/10 focus:border-red-600 outline-none" />
            ) : (
              <h2 className="text-xs uppercase tracking-[0.2em] text-zinc-400 mb-5 pb-3 border-b border-white/5">{s.title}</h2>
            )}
            <ul className="space-y-4">
              {(s.items || []).map((it, i) => (
                <li key={i} className="flex gap-4 text-sm leading-relaxed text-zinc-400 group">
                  <span className="text-red-600/70 tabular-nums text-xs pt-1 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                  {editing ? (
                    <div className="flex-1 flex items-start gap-2">
                      <textarea value={it} onChange={(e) => updateItem(s.id, i, e.target.value)} rows={1}
                        className="flex-1 bg-transparent border-b border-white/10 focus:border-red-600 outline-none py-0.5 resize-none" />
                      <div className="flex flex-col">
                        <button onClick={() => moveItem(s.id, i, -1)} className="text-zinc-600 hover:text-red-500"><ChevronUp className="w-3 h-3" /></button>
                        <button onClick={() => moveItem(s.id, i, 1)} className="text-zinc-600 hover:text-red-500"><ChevronDown className="w-3 h-3" /></button>
                      </div>
                      <button onClick={() => removeItem(s.id, i)} className="text-zinc-600 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <span>{it}</span>
                  )}
                </li>
              ))}
              {editing && (
                <li>
                  <button onClick={() => addItem(s.id)}
                    className="text-xs uppercase tracking-[0.15em] text-zinc-500 hover:text-red-500 flex items-center gap-2">
                    <Plus className="w-4 h-4" />Add rule
                  </button>
                </li>
              )}
            </ul>
          </section>
        ))}
        {editing && (
          <button onClick={addSection}
            className="w-full py-4 rounded-2xl border border-dashed border-white/10 text-xs uppercase tracking-[0.15em] text-zinc-500 hover:text-red-500 hover:border-red-600/40 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />Add section
          </button>
        )}
      </div>
    </div>
  );
}