import React from "react";

export default function MatchCard({ m, editable, onUpdate }) {
  const Side = ({ which }) => {
    const name = which === 1 ? m.player1 : m.player2;
    const score = which === 1 ? m.score1 : m.score2;
    const isWinner = !!name && m.winner === name;
    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-md border ${
          isWinner ? "border-red-600/40 bg-red-600/10" : "border-white/5 bg-white/[0.02]"
        }`}
      >
        <span className={`flex-1 text-sm truncate ${isWinner ? "text-zinc-100 font-medium" : "text-zinc-400"}`}>
          {name || <span className="text-zinc-700">—</span>}
        </span>
        {editable ? (
          <input
            type="number"
            min="0"
            value={score}
            onChange={(e) => onUpdate(m.id, which === 1 ? "score1" : "score2", e.target.value)}
            className="w-12 h-7 text-center bg-transparent border border-white/10 rounded text-sm focus:border-red-600 outline-none"
          />
        ) : (
          <span className="text-sm tabular-nums w-8 text-right">{score || ""}</span>
        )}
      </div>
    );
  };
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.01] p-1.5 space-y-1.5">
      <Side which={1} />
      <Side which={2} />
    </div>
  );
}