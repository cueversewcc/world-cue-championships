import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Trophy, ScrollText, Pencil, Check, Plus, Trash2 } from "lucide-react";

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
  const [allTime, setAllTime] = useState([]);
  const [allTimeDraft, setAllTimeDraft] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Player.list().then(setPlayers);
    base44.entities.HomeContent.list().then((list) => {
      setContent(list[0] || null);
      setDraft(list[0] || null);
    });
    base44.entities.AllTimeLeader.list("order").then((list) => {
      setAllTime(list);
      setAllTimeDraft(list);
    });
  }, []);

  const startEdit = () => {
    setDraft(content ? { ...content } : { season: "", title_top: "", title_bottom: "", subtitle: "", stat_players: "", stat_playoffs: "", stat_groups: "" });
    setAllTimeDraft(allTime.map((r) => ({ ...r, _key: r.id || `n${Math.random().toString(36).slice(2)}` })));
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        season: draft.season, title_top: draft.title_top, title_bottom: draft.title_bottom, subtitle: draft.subtitle,
        stat_players: draft.stat_players, stat_playoffs: draft.stat_playoffs, stat_groups: draft.stat_groups,
      };
      if (content?.id) {
        const updated = await base44.entities.HomeContent.update(content.id, payload);
        setContent(updated);
      } else {
        const created = await base44.entities.HomeContent.create(payload);
        setContent(created);
      }

      const draftIds = new Set(allTimeDraft.map((r) => r.id).filter(Boolean));
      const toDelete = allTime.filter((r) => r.id && !draftIds.has(r.id)).map((r) => r.id);
      const sorted = [...allTimeDraft].sort((a, b) => computePoints(b) - computePoints(a));
      const next = [];
      for (const item of sorted) {
        const data = { name: item.name, championships: Number(item.championships) || 0, finals: Number(item.finals) || 0, semis: Number(item.semis) || 0, qf: Number(item.qf) || 0, points: computePoints(item), wins: Number(item.wins) || 0, losses: Number(item.losses) || 0, ties: Number(item.ties) || 0, order: next.length };
        if (item.id) {
          next.push(await base44.entities.AllTimeLeader.update(item.id, data));
        } else if (item.name) {
          next.push(await base44.entities.AllTimeLeader.create(data));
        }
      }
      if (toDelete.length) {
        await Promise.all(toDelete.map((id) => base44.entities.AllTimeLeader.delete(id)));
      }
      setAllTime(next);
      setAllTimeDraft(next);

      setEditing(false);
    } finally { setSaving(false); }
  };

  const leaders = [...players].sort(sortPlayers).slice(0, 5);

  const PTS = { championships: 100, finals: 50, semis: 25, qf: 10 };
  const computePoints = (p) =>
    (Number(p.championships) || 0) * PTS.championships +
    (Number(p.finals) || 0) * PTS.finals +
    (Number(p.semis) || 0) * PTS.semis +
    (Number(p.qf) || 0) * PTS.qf;

  const sortedAll = [...(editing ? allTimeDraft : allTime)].sort(
    (a, b) => computePoints(b) - computePoints(a)
  );
  // Public only ever sees the top 10; admins editing see all entries.
  const atView = editing ? sortedAll : sortedAll.slice(0, 10);

  const updateField = (key, field, value) =>
    setAllTimeDraft((d) => d.map((r) => (r._key === key ? { ...r, [field]: value } : r)));

  // Current-season W/L by player name, to add on top of stored historical totals
  const currentByName = players.reduce((acc, p) => {
    if (p.name) acc[p.name.trim().toLowerCase()] = p;
    return acc;
  }, {});
  const liveStats = (name) => {
    const cp = currentByName[(name || "").trim().toLowerCase()];
    if (!cp) return { w: 0, l: 0 };
    return { w: cp.wins ?? 0, l: cp.losses ?? 0 };
  };
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
          { icon: Users, key: "stat_players", fallback: `${players.length}`, l: "Players Registered", to: "/group-stage" },
          { icon: Trophy, key: "stat_playoffs", fallback: "16", l: "Playoff Places", to: "/playoffs" },
          { icon: ScrollText, key: "stat_groups", fallback: "2", l: "Groups", to: "/rules" },
        ].map((s) => {
          const val = editing ? (draft[s.key] ?? s.fallback) : (content?.[s.key] || s.fallback);
          const Card = editing ? "div" : Link;
          const cardProps = editing ? {} : { to: s.to };
          return (
            <Card key={s.l} {...cardProps}
              className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-red-600/30 transition-colors duration-300">
              <s.icon className="w-5 h-5 text-red-600 mb-6" />
              {editing ? (
                <input value={val} onChange={(e) => setDraft((d) => ({ ...d, [s.key]: e.target.value }))}
                  className="font-heading text-3xl tracking-tight bg-transparent border-b border-white/10 focus:border-red-600 outline-none w-full" />
              ) : (
                <p className="font-heading text-3xl tracking-tight">{val}</p>
              )}
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mt-2">{s.l}</p>
            </Card>
          );
        })}
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

      <section className="max-w-6xl mx-auto px-6 mt-20">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-heading text-2xl tracking-tight">Top 10 Overall</h2>
          <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-600">All-time</span>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 border-b border-white/5">
                <th className="text-left font-medium px-4 py-3">#</th>
                <th className="text-left font-medium px-4 py-3">Player</th>
                <th className="text-center font-medium px-4 py-3">Championships</th>
                <th className="text-center font-medium px-4 py-3">Finals</th>
                <th className="text-center font-medium px-4 py-3">SF</th>
                <th className="text-center font-medium px-4 py-3">QF</th>
                <th className="text-center font-medium px-4 py-3">Points</th>
                <th className="text-center font-medium px-4 py-3">W</th>
                <th className="text-center font-medium px-4 py-3">L</th>
                <th className="text-center font-medium px-4 py-3">T</th>
                {editing && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {atView.length === 0 && !editing && (
                <tr><td colSpan={10} className="px-4 py-6 text-zinc-500">No all-time entries yet.</td></tr>
              )}
              {atView.map((p, i) => (
                <tr key={p._key || p.id || `row-${i}`} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-zinc-600 tabular-nums">{String(i + 1).padStart(2, "0")}</td>
                  <td className="px-4 py-3 font-medium">
                    {editing ? (
                      <input value={p.name || ""} onChange={(e) => updateField(p._key, "name", e.target.value)}
                        className="w-full bg-transparent border-b border-white/10 focus:border-red-600 outline-none" />
                    ) : p.name}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums font-semibold text-red-500">
                    {editing ? (
                      <input type="number" value={p.championships ?? 0} onChange={(e) => updateField(p._key, "championships", e.target.value)}
                        className="w-20 text-center bg-transparent border-b border-white/10 focus:border-red-600 outline-none" />
                    ) : (p.championships ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-zinc-300">
                    {editing ? (
                      <input type="number" value={p.finals ?? 0} onChange={(e) => updateField(p._key, "finals", e.target.value)}
                        className="w-20 text-center bg-transparent border-b border-white/10 focus:border-red-600 outline-none" />
                    ) : (p.finals ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-zinc-300">
                    {editing ? (
                      <input type="number" value={p.semis ?? 0} onChange={(e) => updateField(p._key, "semis", e.target.value)}
                        className="w-16 text-center bg-transparent border-b border-white/10 focus:border-red-600 outline-none" />
                    ) : (p.semis ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-zinc-300">
                    {editing ? (
                      <input type="number" value={p.qf ?? 0} onChange={(e) => updateField(p._key, "qf", e.target.value)}
                        className="w-16 text-center bg-transparent border-b border-white/10 focus:border-red-600 outline-none" />
                    ) : (p.qf ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums font-semibold text-red-500">
                    {computePoints(p)}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums font-semibold">
                    {editing ? (
                      <input type="number" value={p.wins ?? 0} onChange={(e) => updateField(p._key, "wins", e.target.value)}
                        className="w-16 text-center bg-transparent border-b border-white/10 focus:border-red-600 outline-none" />
                    ) : (Number(p.wins) || 0) + liveStats(p.name).w}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-zinc-300">
                    {editing ? (
                      <input type="number" value={p.losses ?? 0} onChange={(e) => updateField(p._key, "losses", e.target.value)}
                        className="w-16 text-center bg-transparent border-b border-white/10 focus:border-red-600 outline-none" />
                    ) : (Number(p.losses) || 0) + liveStats(p.name).l}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-zinc-400">
                    {editing ? (
                      <input type="number" value={p.ties ?? 0} onChange={(e) => updateField(p._key, "ties", e.target.value)}
                        className="w-16 text-center bg-transparent border-b border-white/10 focus:border-red-600 outline-none" />
                    ) : (Number(p.ties) || 0)}
                  </td>
                  {editing && (
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setAllTimeDraft((d) => d.filter((r) => r._key !== p._key))}
                        className="text-zinc-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  )}
                </tr>
              ))}
              {editing && (
                <tr>
                  <td colSpan={11} className="px-4 py-3">
                    <button onClick={() => setAllTimeDraft((d) => [...d, { _key: `n${Math.random().toString(36).slice(2)}`, name: "", championships: 0, finals: 0, semis: 0, qf: 0, wins: 0, losses: 0, ties: 0 }])}
                      className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-red-600 hover:text-red-500">
                      <Plus className="w-4 h-4" />Add player
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}