import React from "react";

function Side({ name, score, isWinner, editing, onName, onScore }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 ${isWinner ? "text-red-500" : "text-zinc-300"}`}>
      {editing ? (
        <input value={name || ""} onChange={(e) => onName(e.target.value)} placeholder="Player"
          className="flex-1 min-w-0 bg-transparent border-b border-white/10 focus:border-red-600 outline-none text-xs py-0.5" />
      ) : (
        <span className="flex-1 truncate text-xs">{name || "—"}</span>
      )}
      {editing ? (
        <input type="number" value={score ?? 0} onChange={(e) => onScore(Number(e.target.value))}
          className="w-9 bg-transparent border-b border-white/10 focus:border-red-600 outline-none text-center text-xs" />
      ) : (
        <span className="text-xs tabular-nums w-4 text-right">{score ?? 0}</span>
      )}
    </div>
  );
}

export default function BracketMatch({ match, editing, onChange }) {
  const w1 = match.winner && match.winner === match.player1;
  const w2 = match.winner && match.winner === match.player2;
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] divide-y divide-white/5 hover:border-red-600/30 transition-colors duration-300 w-56">
      <Side name={match.player1} score={match.score1} isWinner={w1} editing={editing}
        onName={(v) => onChange(match.id, "player1", v)} onScore={(v) => onChange(match.id, "score1", v)} />
      <Side name={match.player2} score={match.score2} isWinner={w2} editing={editing}
        onName={(v) => onChange(match.id, "player2", v)} onScore={(v) => onChange(match.id, "score2", v)} />
      {match.winner && (
        <div className="px-3 py-2 flex items-center gap-1.5">
          <span className="text-[9px] uppercase tracking-[0.15em] text-zinc-500">Winner</span>
          <span className="text-xs font-medium text-red-500 truncate">{match.winner}</span>
        </div>
      )}
    </div>
  );
}