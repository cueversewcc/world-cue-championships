import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Trophy, ScrollText, Pencil, Check } from "lucide-react";

const sortPlayers = (a, b) =>
  (b.points ?? 0) - (a.points ?? 0) ||
  ((b.frames_for ?? 0) - (b.frames_against ?? 0)) - ((a.frames_for ?? 0) - (a.frames_against ?? 0));

export default function Home() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin";
  const [players, setPlayers] = useState([]);
  const [content, setContent] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Player.list().then(setPlayers);
    base44.entities.HomeContent.list().then((list) => {
      setContent(list[0] || null);
      setDraft(list[0] || null);
    });
  }, []);

  const startEdit = () => { setDraft(content ? { ...content } : { season: "", title_top: "", title_bottom: "", subtitle: "" }); setEditing(true); };

  const save = async () => {
    setSaving(true);
    try {
      if (content?.id) {
        const updated = await base44.entities.HomeContent.update(content.id, {
          season: draft.season, title_top: draft.title_top, title_bottom: draft.title_bottom, subtitle: draft.subtitle,
        });
        setContent(updated);
      } else {
        const created = await base44.entities.HomeContent.create({
          season: draft.season, title_top: draft.title_top, title_bottom: draft.title_bottom, subtitle: draft.subtitle,
        });
        setContent(created);
      }
      setEditing(false);
    } finally { setSaving(false); }
  };

  const leaders = [...players].sort(sortPlayers).slice(0, 5);
  const c = editing ? draft : content;
  const field = (k) => ({
    value: (editing ? draft[k] : content?.[k]) || "",
    onChange: (e) => setDraft((d) => ({ ...d, [k]: e.target.value })),
  });

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.18),transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-28 text-center">
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
            <p className="text-[11px] uppercase tracking-[0.35em] text-red-600 mb-6">{c?.season || "Season 2026 · Online"}</p>
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
              <>{c?.title_top || "World Cue"}<br /><span className="text-red-600">{c?.title_bottom || "Championships"}</span></>
            )}
          </h1>

          {editing ? (
            <textarea {...field("subtitle")} rows={3} placeholder="Subtitle paragraph"
              className="block mx-auto mt-8 max-w-xl w-full bg-transparent text-center text-sm text-zinc-400 border border-white/10 rounded-lg p-3 focus:border-red-600 outline-none resize-none" />
          ) : (
            <p className="max-w-xl mx-auto mt-8 text-sm sm:text-base text-zinc-400 leading-relaxed">
              {c?.subtitle || "Thirty-six players. Two groups. Sixteen survive the group stage and enter a single-elimination bracket for the title."}
            </p>
          )}

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/group-stage"
              className="group px-7 py-3 rounded-full bg-red-600 hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-2">
              View Standings
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to="/playoffs"
              className="px-7 py-3 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-sm">
              Playoff Bracket
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 grid sm:grid-cols-3 gap-4">
        {[
          { icon: Users, k: `${players.length}`, l: "Players Registered", to: "/group-stage" },
          { icon: Trophy, k: "16", l: "Playoff Places", to: "/playoffs" },
          { icon: ScrollText, k: "2", l: "Groups", to: "/rules" },
        ].map((s) => (
          <Link key={s.l} to={s.to}
            className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-red-600/30 transition-colors duration-300">
            <s.icon className="w-5 h-5 text-red-600 mb-6" />
            <p className="font-heading text-3xl tracking-tight">{s.k}</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mt-2">{s.l}</p>
          </Link>
        ))}
      </section>

      <section className="max-w-6xl mx-auto px-6 mt-20">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-heading text-2xl tracking-tight">Overall Leaders</h2>
          <Link to="/group-stage" className="text-[11px] uppercase tracking-[0.2em] text-red-600 hover:text-red-500">
            Full tables
          </Link>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] divide-y divide-white/5">
          {leaders.length === 0 && (
            <p className="p-6 text-sm text-zinc-500">No players yet — add them on the Group Stage page.</p>
          )}
          {leaders.map((p, i) => (
            <div key={p.id} className="flex items-center gap-4 px-6 py-4">
              <span className="text-xs tabular-nums text-zinc-600 w-5">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1 text-sm">{p.name}</span>
              <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">Group {p.group}</span>
              <span className="text-sm text-red-500 font-semibold tabular-nums w-10 text-right">{p.points ?? 0}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}