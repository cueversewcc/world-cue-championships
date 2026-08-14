import React from "react";

const sections = [
  {
    title: "Format",
    items: [
      "The championship is contested by a maximum of 36 players, split evenly across Group A and Group B.",
      "Every player faces each opponent in their own group once during the group stage.",
      "The top 8 players from each group — 16 in total — advance to the playoffs.",
    ],
  },
  {
    title: "Scoring",
    items: [
      "A match win is worth 2 points. A loss is worth 0 points.",
      "Frames for (FF) and frames against (FA) are recorded for every match.",
      "Standings are ordered by points, then frame difference, then frames won.",
    ],
  },
  {
    title: "Playoffs",
    items: [
      "The playoffs are a single-elimination bracket: Round of 16, Quarter-Finals, Semi-Finals and the Final.",
      "Group winners are seeded to opposite sides of the bracket.",
      "Round of 16 and Quarter-Finals are races to 5 frames. Semi-Finals are races to 7. The Final is a race to 9.",
    ],
  },
  {
    title: "Play & Conduct",
    items: [
      "All matches are played online; players are responsible for a stable connection.",
      "A player who is more than 10 minutes late forfeits the first frame; 20 minutes forfeits the match.",
      "Unsporting conduct may result in frame penalties or removal from the championship.",
      "There is no prize pool — this is a title-only championship.",
    ],
  },
];

export default function Rules() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <p className="text-[11px] uppercase tracking-[0.3em] text-red-600 mb-4">Regulations</p>
      <h1 className="font-heading text-4xl sm:text-5xl tracking-tight mb-14">Championship Rules</h1>
      <div className="space-y-12">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-xs uppercase tracking-[0.2em] text-zinc-400 mb-5 pb-3 border-b border-white/5">{s.title}</h2>
            <ul className="space-y-4">
              {s.items.map((it, i) => (
                <li key={i} className="flex gap-4 text-sm leading-relaxed text-zinc-400">
                  <span className="text-red-600/70 tabular-nums text-xs pt-1">{String(i + 1).padStart(2, "0")}</span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}