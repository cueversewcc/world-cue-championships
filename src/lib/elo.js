export const ELO_START = 1000;
export const ELO_K = 32;

// Replays the match log in chronological order and returns a { name: rating } map.
export function computeElo(matches) {
  const sorted = [...matches].sort(
    (a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0)
  );
  const ratings = {};
  const get = (n) => (ratings[n] == null ? ELO_START : ratings[n]);

  for (const m of sorted) {
    const a = (m.player1 || "").trim();
    const b = (m.player2 || "").trim();
    if (!a || !b || a === b) continue;

    const ra = get(a);
    const rb = get(b);
    const ea = 1 / (1 + Math.pow(10, (rb - ra) / 400));
    const eb = 1 - ea;

    let sa;
    let sb;
    if (m.winner && m.winner === a) {
      sa = 1; sb = 0;
    } else if (m.winner && m.winner === b) {
      sa = 0; sb = 1;
    } else {
      sa = 0.5; sb = 0.5;
    }

    ratings[a] = ra + ELO_K * (sa - ea);
    ratings[b] = rb + ELO_K * (sb - eb);
  }

  return ratings;
}