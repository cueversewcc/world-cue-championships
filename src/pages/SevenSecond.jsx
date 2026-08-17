import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Pencil, Check } from "lucide-react";

const GROUPS = 9;
const BOXES_PER_GROUP = 25;

const emptyBoxes = () =>
  Array.from({ length: GROUPS }, () =>
    Array.from({ length: BOXES_PER_GROUP }, () => "")
  );

const normBoxes = (b) => {
  const src = Array.isArray(b) ? b : [];
  return Array.from({ length: GROUPS }, (_, g) => {
    const row = Array.isArray(src[g]) ? src[g] : [];
    return Array.from({ length: BOXES_PER_GROUP }, (_, i) => row[i] || "");
  });
};

export default function SevenSecond() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin";
  const [content, setContent] = useState(null);
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.SevenSecondContent.list().then((list) => {
      setContent(list[0] || null);
      setDraft(list[0] || null);
    });
  }, []);

  const startEdit = () => {
    setDraft(
      content
        ? { ...content, boxes: normBoxes(content.boxes) }
        : { season: "", title_top: "30 Second", title_bottom: "Shootout", subtitle: "", boxes: emptyBoxes() }
    );
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        season: draft.season,
        title_top: draft.title_top,
        title_bottom: draft.title_bottom,
        subtitle: draft.subtitle,
        boxes: normBoxes(draft.boxes),
      };
      if (content?.id) {
        const updated = await base44.entities.SevenSecondContent.update(content.id, payload);
        setContent(updated);
      } else {
        const created = await base44.entities.SevenSecondContent.create(payload);
        setContent(created);
      }
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const c = editing ? draft : content;
  const field = (k) => ({
    value: (editing ? draft[k] : content?.[k]) || "",
    onChange: (e) => setDraft((d) => ({ ...d, [k]: e.target.value })),
  });

  const boxes = editing ? normBoxes(draft?.boxes) : normBoxes(content?.boxes);
  const updateBox = (g, i, value) =>
    setDraft((d) => {
      const next = normBoxes(d.boxes);
      next[g][i] = value;
      return { ...d, boxes: next };
    });

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.18),transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
          {canEdit && (
            <div className="absolute top-6 right-6">
              {editing ? (
                <Button onClick={save} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white rounded-full px-5 h-9">
                  <Check className="w-4 h-4 mr-2" />{saving ? "Saving…" : "Save"}
                </Button>
              ) : (
                <Button onClick={startEdit} variant="outline" className="rounded-full px-5 h-9 border-white/10 bg-transparent hover:bg-white/5 text-zinc-200">
                  <Pencil className="w-4 h-4 mr-2" />Edit
                </Button>
              )}
            </div>
          )}

          {editing ? (
            <input {...field("season")} placeholder="Season label"
              className="block mx-auto mb-6 bg-transparent text-center text-[11px] uppercase tracking-[0.35em] text-red-600 border-b border-white/10 focus:border-red-600 outline-none w-full max-w-xs" />
          ) : (
            <p className="text-[11px] uppercase tracking-[0.35em] text-red-600 mb-6">{c?.season || "Special Event"}</p>
          )}

          <h1 className="font-heading text-5xl sm:text-7xl leading-[0.95] tracking-tight">
            {editing ? (
              <span className="block">
                <input {...field("title_top")} placeholder="Title line 1"
                  className="block mx-auto w-full max-w-2xl bg-transparent text-center border-b border-white/10 focus:border-red-600 outline-none" />
                <input {...field("title_bottom")} placeholder="Title line 2"
                  className="block mx-auto w-full max-w-2xl bg-transparent text-center text-red-600 border-b border-white/10 focus:border-red-600 outline-none mt-2" />
              </span>
            ) : (
              <>{c?.title_top || "30 Second"}<br /><span className="text-red-600">{c?.title_bottom || "Shootout"}</span></>
            )}
          </h1>

          {editing ? (
            <textarea {...field("subtitle")} rows={3} placeholder="Subtitle paragraph"
              className="block mx-auto mt-8 max-w-xl w-full bg-transparent text-center text-sm text-zinc-400 border border-white/10 rounded-lg p-3 focus:border-red-600 outline-none resize-none" />
          ) : (
            <p className="max-w-xl mx-auto mt-8 text-sm sm:text-base text-zinc-400 leading-relaxed">
              {c?.subtitle || "9 groups of 4 players · 25 name slots per group"}
            </p>
          )}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {boxes.map((group, g) => (
            <div key={g} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading text-lg tracking-tight">Group {g + 1}</h3>
                <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">4 players</span>
              </div>
              <div className="grid grid-cols-[2.5fr_1fr_1fr_1fr_1fr_1fr] gap-2">
                {Array.from({ length: 5 }).map((_, r) => (
                  <React.Fragment key={r}>
                    {editing ? (
                      <textarea
                        value={group[r] || ""}
                        onChange={(e) => updateBox(g, r, e.target.value)}
                        placeholder={`P${r + 1}`}
                        rows={2}
                        className="w-full min-h-[44px] resize-none bg-transparent border border-white/10 rounded-md px-2 py-1 text-xs text-zinc-100 focus:border-red-600 outline-none break-words"
                      />
                    ) : (
                      <div className="w-full min-h-[44px] px-2 py-1 text-xs text-zinc-200 border border-white/5 rounded-md break-words flex items-center">
                        {group[r] || <span className="text-zinc-700">—</span>}
                      </div>
                    )}
                    {Array.from({ length: 5 }).map((_, c) => {
                      if (c === r) {
                        return (
                          <div key={`x-${r}-${c}`} className="w-full h-8 flex items-center justify-center border border-white/5 rounded-md text-zinc-600 text-sm">
                            ✕
                          </div>
                        );
                      }
                      const sIdx = 5 + r * 4 + (c < r ? c : c - 1);
                      const val = group[sIdx] || "";
                      return editing ? (
                        <input
                          key={`s-${r}-${c}`}
                          type="text"
                          inputMode="numeric"
                          value={val}
                          onChange={(e) => updateBox(g, sIdx, e.target.value)}
                          placeholder="0"
                          className="w-full h-8 text-center bg-transparent border border-white/10 rounded-md px-1 text-sm text-zinc-100 focus:border-red-600 outline-none"
                        />
                      ) : (
                        <div key={`s-${r}-${c}`} className="w-full h-8 text-center leading-8 border border-white/5 rounded-md px-1 text-sm text-zinc-200 truncate">
                          {val || <span className="text-zinc-700">·</span>}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}