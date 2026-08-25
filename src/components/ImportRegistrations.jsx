import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

export default function ImportRegistrations({ tournamentId, existingCount, onImported }) {
  const [pending, setPending] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = async () => setPending(await base44.entities.Registration.filter({ status: "pending" }));
  useEffect(() => { load(); }, []);

  const importAll = async () => {
    if (!pending.length || busy) return;
    setBusy(true);
    try {
      const players = pending.map((r, i) => ({
        tournamentId,
        name: r.name,
        seed: existingCount + i + 1,
        group: "",
        order: existingCount + i,
      }));
      await base44.entities.TournamentPlayer.bulkCreate(players);
      await base44.entities.Registration.bulkUpdate(pending.map((r) => ({ id: r.id, status: "placed", group: "" })));
      setPending([]);
      onImported?.();
    } finally {
      setBusy(false);
    }
  };

  if (!pending.length) return null;

  return (
    <div className="flex items-center justify-between rounded-lg border border-red-600/20 bg-red-600/[0.04] px-4 py-3 mb-4">
      <p className="text-xs text-zinc-400">
        {pending.length} registered player{pending.length > 1 ? "s" : ""} ready to import
      </p>
      <Button onClick={importAll} disabled={busy} className="bg-red-600 hover:bg-red-700 text-white rounded-full px-4 h-8 text-xs">
        <UserPlus className="w-3.5 h-3.5 mr-1.5" />
        {busy ? "Importing…" : "Import all"}
      </Button>
    </div>
  );
}