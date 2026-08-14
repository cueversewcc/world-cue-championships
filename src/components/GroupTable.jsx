import React from "react";
import { Trash2 } from "lucide-react";

const cols = ["P", "W", "L", "FF", "FA", "PTS"];
const keys = ["played", "wins", "losses", "frames_for", "frames_against", "points"];

export default function GroupTable({ title, players, editing, onChange, onDelete }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/5 flex items-baseline justify-between">
        <h3 className="font-heading text-lg tracking-tight">{title}</h3>
        <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{players.length} players</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">
              <th className="text-left font-normal pl-5 py-3 w-8">#</th>
              <th className="text-left font-normal py-3">Player</th>
              {cols.map((c) => <th key={c} className="font-normal py-3 px-2 text-center w-12">{c}</th>)}
              {editing && <th className="w-10" />}
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <tr key={p.id} className={`border-t border-white/5 ${i < 8 ? "bg-red-600/[0.06]" : ""}`}>
                <td className="pl-5 py-2.5 text-zinc-500 tabular-nums">{i + 1}</td>
                <td className="py-2.5 pr-2">
                  {editing ? (
                    <input
                      value={p.name}
                      onChange={(e) => onChange(p.id, "name", e.target.value)}
                      className="bg-transparent border-b border-white/10 focus:border-red-600 outline-none py-1 w-full min-w-[120px]"
                    />
                  ) : p.name}
                </td>
                {keys.map((k) => (
                  <td key={k} className="py-2.5 px-2 text-center tabular-nums">
                    {editing ? (
                      <input
                        type="number"
                        value={p[k] ?? 0}
                        onChange={(e) => onChange(p.id, k, Number(e.target.value))}
                        className="w-12 bg-transparent border-b border-white/10 focus:border-red-600 outline-none text-center py-1"
                      />
                    ) : (
                      <span className={k === "points" ? "text-red-500 font-semibold" : "text-zinc-400"}>{p[k] ?? 0}</span>
                    )}
                  </td>
                ))}
                {editing && (
                  <td className="pr-3">
                    <button onClick={() => onDelete(p.id)} className="text-zinc-600 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}