import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

export default function ImportRegistrations({ tournamentId, existingNames = [], onImported }) {
  const [regs, setRegs] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const names = new Set();
    try {
      const res = await base44.functions.invoke("getRoster", {});
      for (const p of res.data?.players || []) if (p.name) names.add(p.name);
    } catch (e) { /* roster unavailable */ }
    try {
      const regs = await base44.entities.Registration.list("created_date");
      for (const r of regs) if (r.name) names.add(r.name);
    } catch (e) { /* registrations unavailable */ }
    setRegs([...names]);
  };
  useEffect(() => { load(); }, []);

  const available = regs.filter((name) => !existingNames.includes(name));

  const importAll = async () => {
    if (!available.length || busy) return;
    setBusy(true);
    try {
      const baseOrder = existingNames.length;
      const players = available.map((name, i) => ({
        tournamentId,
        name,
        seed: baseOrder + i + 1,
        group: "",
        order: baseOrder + i,
      }));
      await base44.entities.TournamentPlayer.bulkCreate(players);
      onImported?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={importAll}
      disabled={busy || !available.length}
      variant="outline"
      className="rounded-full px-5 border-white/10 bg-transparent hover:bg-white/5 text-zinc-200"
    >
      <UserPlus className="w-4 h-4 mr-1.5" />
      {busy ? "Importing…" : `Import${available.length ? ` ${available.length}` : ""}`}
    </Button>
  );
}