// Bracket engines for the Events tournament system.

export const ROUND_LABELS = {
  2: "Final",
  4: "Semis",
  8: "Quarter-Finals",
  16: "Round of 16",
  32: "Round of 32",
  64: "Round of 64",
};
export const roundLabel = (remaining) => ROUND_LABELS[remaining] || `Round of ${remaining}`;

export const nextPow2 = (n) => (n < 2 ? 2 : 2 ** Math.ceil(Math.log2(n)));

// Standard single-elimination seeding order (seed positions, left to right).
export const seedOrder = (n) => {
  let order = [1, 2];
  const rounds = Math.log2(n);
  for (let r = 1; r < rounds; r++) {
    const max = 1 << (r + 1);
    const next = [];
    for (const s of order) {
      next.push(s);
      next.push(max + 1 - s);
    }
    order = next;
  }
  return order;
};

// Build a fresh single-elim bracket from a seeded player list (index 0 = seed 1).
export const buildSingleElim = (players) => {
  const list = (players || []).filter((p) => p && String(p).trim());
  const n = nextPow2(list.length);
  const order = seedOrder(n);
  const rounds = Math.log2(n);
  const matches = [];
  for (let r = 0; r < rounds; r++) {
    const inRound = n >> (r + 1);
    for (let slot = 0; slot < inRound; slot++) {
      let p1 = "", p2 = "";
      if (r === 0) {
        const sa = order[2 * slot];
        const sb = order[2 * slot + 1];
        p1 = sa <= list.length ? list[sa - 1] : "";
        p2 = sb <= list.length ? list[sb - 1] : "";
      }
      matches.push({ round: r, slot, player1: p1, player2: p2, score1: 0, score2: 0, winner: "" });
    }
  }
  applyAdvancement(matches);
  return matches;
};

// Recompute winners from scores and propagate winners into later rounds.
export const applyAdvancement = (matches) => {
  const byKey = {};
  for (const m of matches) byKey[`${m.round}:${m.slot}`] = m;
  const maxRound = matches.reduce((mx, m) => Math.max(mx, m.round), 0);
  for (let r = 0; r <= maxRound; r++) {
    for (const m of matches.filter((x) => x.round === r)) {
      if (r > 0) {
        const a = byKey[`${r - 1}:${2 * m.slot}`];
        const b = byKey[`${r - 1}:${2 * m.slot + 1}`];
        const np1 = a ? a.winner || "" : "";
        const np2 = b ? b.winner || "" : "";
        if (np1 !== m.player1 || np2 !== m.player2) {
          m.player1 = np1;
          m.player2 = np2;
          m.score1 = 0;
          m.score2 = 0;
          m.winner = "";
        }
      }
      if (m.player1 && m.player2) {
        const s1 = Number(m.score1) || 0;
        const s2 = Number(m.score2) || 0;
        m.winner = s1 > s2 ? m.player1 : s2 > s1 ? m.player2 : "";
      } else if (m.player1 && !m.player2) m.winner = m.player1;
      else if (m.player2 && !m.player1) m.winner = m.player2;
      else m.winner = "";
    }
  }
  return matches;
};

// Group stage standings from a group's players + its group matches (3 pts/win).
export const groupStandings = (players, matches) => {
  const stats = {};
  for (const p of players) {
    stats[p.name] = { name: p.name, group: p.group, played: 0, wins: 0, losses: 0, framesFor: 0, framesAgainst: 0, points: 0 };
  }
  const ensure = (name, group) => {
    if (!stats[name]) stats[name] = { name, group, played: 0, wins: 0, losses: 0, framesFor: 0, framesAgainst: 0, points: 0 };
    return stats[name];
  };
  for (const m of matches) {
    const a = (m.player1 || "").trim();
    const b = (m.player2 || "").trim();
    if (!a || !b || a === b) continue;
    const sa = ensure(a, m.group || "");
    const sb = ensure(b, m.group || "");
    sa.played++; sb.played++;
    sa.framesFor += Number(m.score1) || 0;
    sa.framesAgainst += Number(m.score2) || 0;
    sb.framesFor += Number(m.score2) || 0;
    sb.framesAgainst += Number(m.score1) || 0;
    if (m.winner === a) { sa.wins++; sb.losses++; sa.points += 3; }
    else if (m.winner === b) { sb.wins++; sa.losses++; sb.points += 3; }
  }
  return Object.values(stats).sort(
    (a, b) => b.points - a.points || (b.framesFor - b.framesAgainst) - (a.framesFor - a.framesAgainst) || b.wins - a.wins
  );
};

// Cross-seed group position lists into a flat seed list (A1, B1, A2, B2, ...).
export const crossSeed = (groupLists) => {
  const result = [];
  const maxLen = Math.max(...groupLists.map((g) => g.length), 0);
  for (let i = 0; i < maxLen; i++) {
    for (const g of groupLists) if (g[i]) result.push(g[i]);
  }
  return result;
};

// ---- Double elimination ----
export const buildWinners = (players) => buildSingleElim(players);

export const buildLosersBracket = (n) => {
  const k = Math.log2(n);
  const lbRounds = Math.max(0, 2 * k - 2);
  const matches = [];
  for (let j = 0; j < lbRounds; j++) {
    const inRound = n >> (Math.floor(j / 2) + 2);
    for (let slot = 0; slot < inRound; slot++) {
      matches.push({ round: j, slot, player1: "", player2: "", score1: 0, score2: 0, winner: "" });
    }
  }
  return matches;
};

const loserOf = (m) => (m && m.player1 && m.player2 && m.winner ? (m.winner === m.player1 ? m.player2 : m.player1) : "");

// Fill WB/LB/final slots from results and recompute winners.
export const applyDoubleElim = (wb, lb, final) => {
  applyAdvancement(wb);
  const wbByKey = {};
  for (const m of wb) wbByKey[`${m.round}:${m.slot}`] = m;
  const lbByKey = {};
  for (const m of lb) lbByKey[`${m.round}:${m.slot}`] = m;
  const lbWinner = (key) => (lbByKey[key] ? lbByKey[key].winner || "" : "");
  const lbMaxRound = lb.reduce((mx, m) => Math.max(mx, m.round), -1);

  for (let j = 0; j <= lbMaxRound; j++) {
    for (const m of lb.filter((x) => x.round === j)) {
      let np1 = "", np2 = "";
      if (j % 2 === 0) {
        if (j === 0) {
          np1 = loserOf(wbByKey[`0:${2 * m.slot}`]);
          np2 = loserOf(wbByKey[`0:${2 * m.slot + 1}`]);
        } else {
          np1 = lbWinner(`${j - 1}:${2 * m.slot}`);
          np2 = lbWinner(`${j - 1}:${2 * m.slot + 1}`);
        }
      } else {
        np1 = lbWinner(`${j - 1}:${m.slot}`);
        const wbRound = (j + 1) / 2;
        np2 = loserOf(wbByKey[`${wbRound}:${m.slot}`]);
      }
      if (np1 !== m.player1 || np2 !== m.player2) {
        m.player1 = np1;
        m.player2 = np2;
        m.score1 = 0;
        m.score2 = 0;
        m.winner = "";
      }
      if (m.player1 && m.player2) {
        const s1 = Number(m.score1) || 0;
        const s2 = Number(m.score2) || 0;
        m.winner = s1 > s2 ? m.player1 : s2 > s1 ? m.player2 : "";
      } else if (m.player1 && !m.player2) m.winner = m.player1;
      else if (m.player2 && !m.player1) m.winner = m.player2;
      else m.winner = "";
    }
  }

  const wbMaxRound = wb.reduce((mx, m) => Math.max(mx, m.round), 0);
  const wbChamp = wbByKey[`${wbMaxRound}:0`] ? wbByKey[`${wbMaxRound}:0`].winner || "" : "";
  const lbChamp = lbMaxRound >= 0 && lbByKey[`${lbMaxRound}:0`] ? lbByKey[`${lbMaxRound}:0`].winner || "" : "";
  const f0 = final.find((f) => f.slot === 0);
  const f1 = final.find((f) => f.slot === 1);

  if (f0) {
    if (f0.player1 !== wbChamp || f0.player2 !== lbChamp) {
      f0.player1 = wbChamp;
      f0.player2 = lbChamp;
      f0.score1 = 0;
      f0.score2 = 0;
      f0.winner = "";
    }
    if (f0.player1 && f0.player2) {
      const s1 = Number(f0.score1) || 0;
      const s2 = Number(f0.score2) || 0;
      f0.winner = s1 > s2 ? f0.player1 : s2 > s1 ? f0.player2 : "";
    } else f0.winner = "";
  }
  if (f1) {
    const needReset = !!(f0 && f0.winner && lbChamp && f0.winner === lbChamp);
    if (needReset) {
      if (f1.player1 !== f0.winner || f1.player2 !== wbChamp) {
        f1.player1 = f0.winner;
        f1.player2 = wbChamp;
        f1.score1 = 0;
        f1.score2 = 0;
        f1.winner = "";
      }
    } else {
      f1.player1 = "";
      f1.player2 = "";
      f1.score1 = 0;
      f1.score2 = 0;
      f1.winner = "";
    }
    if (f1.player1 && f1.player2) {
      const s1 = Number(f1.score1) || 0;
      const s2 = Number(f1.score2) || 0;
      f1.winner = s1 > s2 ? f1.player1 : s2 > s1 ? f1.player2 : "";
    } else f1.winner = "";
  }
  return { wb, lb, final };
};

export const doubleElimChamp = (wb, lb, final) => {
  const f1 = final.find((f) => f.slot === 1);
  const f0 = final.find((f) => f.slot === 0);
  const wbMaxRound = wb.reduce((mx, m) => Math.max(mx, m.round), 0);
  const wbChamp = wb.find((m) => m.round === wbMaxRound && m.slot === 0)?.winner || "";
  if (f1 && f1.winner) return f1.winner;
  if (f0 && f0.winner && f0.winner === wbChamp) return wbChamp;
  return "";
};