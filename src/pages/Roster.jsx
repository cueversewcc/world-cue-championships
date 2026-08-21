import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { UserPlus, RefreshCw, ExternalLink } from "lucide-react";

// TODO: replace with the user's Google Form URL
const REGISTER_FORM_URL = "";

export default function Roster() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("getRoster", {});
      setPlayers(res.data.players || []);
    } catch (e) {
      setError(e?.message || "Failed to load roster");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
        <div>
          <h1 className="font-heading text-4xl sm:text-5xl tracking-tight">Player Roster</h1>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 mt-2">
            {loading ? "Loading…" : `${players.length} registered`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={load}
            variant="outline"
            className="rounded-full px-4 border-white/10 text-zinc-300 hover:text-white hover:bg-white/5"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {REGISTER_FORM_URL && (
            <a href={REGISTER_FORM_URL} target="_blank" rel="noopener noreferrer">
              <Button className="bg-red-600 hover:bg-red-700 text-white rounded-full px-6">
                <UserPlus className="w-4 h-4 mr-2" />Register
              </Button>
            </a>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-600/30 bg-red-600/[0.06] p-4 mb-8">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {loading && players.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
        </div>
      ) : players.length === 0 && !error ? (
        <p className="text-sm text-zinc-500">No players registered yet.</p>
      ) : (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="text-left text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-medium px-6 py-4 w-16">#</th>
                <th className="text-left text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-medium px-6 py-4">Name</th>
                <th className="text-left text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-medium px-6 py-4">ID / Alias</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr
                  key={i}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-zinc-600 font-mono">{i + 1}</td>
                  <td className="px-6 py-4 text-sm text-zinc-100 font-medium">{p.name}</td>
                  <td className="px-6 py-4 text-sm text-red-400 font-mono">{p.alias || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {REGISTER_FORM_URL && (
        <div className="mt-10 flex justify-center">
          <a href={REGISTER_FORM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-500 hover:text-red-500 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
            Open registration form
          </a>
        </div>
      )}
    </div>
  );
}