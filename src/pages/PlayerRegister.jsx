import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Users, ArrowRight, Sparkles } from "lucide-react";

export default function PlayerRegister() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin";
  const [name, setName] = useState("");
  const [regs, setRegs] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const load = async () => setRegs(await base44.entities.Registration.list("created_date"));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await base44.entities.Registration.create({ name: trimmed, status: "pending", group: "" });
      setName("");
      setDone(true);
      load();
      setTimeout(() => setDone(false), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const pending = regs.filter((r) => r.status !== "placed");
  const placed = regs.filter((r) => r.status === "placed");

  const autoAssign = async () => {
    if (!pending.length || assigning) return;
    setAssigning(true);
    try {
      const players = pending.map((r, i) => ({
        name: r.name,
        group: i % 2 === 0 ? "A" : "B",
      }));
      await base44.entities.Player.bulkCreate(players);
      const updates = pending.map((r, i) => ({
        id: r.id,
        status: "placed",
        group: i % 2 === 0 ? "A" : "B",
      }));
      await base44.entities.Registration.bulkUpdate(updates);
      load();
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.18),transparent_60%)]" />
        <div className="relative max-w-2xl mx-auto px-6 pt-24 pb-16 text-center">
          <p className="text-[11px] uppercase tracking-[0.35em] text-red-600 mb-6">Sign Up</p>
          <h1 className="font-heading text-5xl sm:text-7xl leading-[0.95] tracking-tight">
            Register to <span className="text-red-600">Compete</span>
          </h1>
          <p className="max-w-md mx-auto mt-8 text-sm sm:text-base text-zinc-400 leading-relaxed">
            Enter your name to join the field. The tournament organizer will place registered players into the group and playoff brackets.
          </p>
        </div>
      </section>

      <section className="max-w-xl mx-auto px-6">
        <form onSubmit={submit} className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-3">Player name</label>
          <div className="flex gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="flex-1 h-12 bg-transparent border border-white/10 rounded-lg px-4 text-base text-zinc-100 focus:border-red-600 outline-none"
            />
            <Button type="submit" disabled={submitting || !name.trim()}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-6 h-12">
              {submitting ? "Adding…" : "Register"}
            </Button>
          </div>
          {done && (
            <div className="mt-4 flex items-center gap-2 text-sm text-green-500">
              <Check className="w-4 h-4" /> You're registered — see you at the table.
            </div>
          )}
        </form>

        <div className="mt-6 flex items-center justify-between text-xs text-zinc-500">
          <span className="flex items-center gap-2"><Users className="w-4 h-4 text-red-600" />{regs.length} registered</span>
          <Link to="/group-stage" className="text-[11px] uppercase tracking-[0.2em] text-red-600 hover:text-red-500 flex items-center gap-1">
            View standings <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </section>

      {regs.length > 0 && (
        <section className="max-w-4xl mx-auto px-6 mt-16">
          <h2 className="font-heading text-2xl tracking-tight mb-6">Registered Players</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {regs.map((r, i) => (
              <div key={r.id} className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 flex items-center gap-3">
                <span className="text-xs tabular-nums text-zinc-600 w-6">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex-1 text-sm truncate">{r.name}</span>
                {r.status === "placed" ? (
                  <span className="text-[10px] uppercase tracking-[0.15em] text-red-500">Group {r.group}</span>
                ) : (
                  <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-600">Pending</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {canEdit && (
        <section className="max-w-4xl mx-auto px-6 mt-16">
          <div className="rounded-2xl border border-red-600/20 bg-red-600/[0.04] p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-red-500 mb-1">Organizer</p>
                <h2 className="font-heading text-2xl tracking-tight">Place Registrations</h2>
                <p className="text-sm text-zinc-500 mt-1">
                  {pending.length} pending · {placed.length} placed. Auto-assign splits pending players evenly into Group A and Group B.
                </p>
              </div>
              <Button onClick={autoAssign} disabled={!pending.length || assigning}
                className="bg-red-600 hover:bg-red-700 text-white rounded-full px-6">
                <Sparkles className="w-4 h-4 mr-2" />{assigning ? "Assigning…" : "Auto-assign to groups"}
              </Button>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-500 border-t border-white/5 pt-4">
              <span>Fine-tune placements on the Group Stage page.</span>
              <Link to="/group-stage" className="text-[11px] uppercase tracking-[0.2em] text-red-600 hover:text-red-500 flex items-center gap-1">
                Open Group Stage <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}