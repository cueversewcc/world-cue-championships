import { base44 } from "@/api/base44Client";

// Unified match feed for Elo: manually/group-logged matches (Match entity) plus
// decided playoff bracket matches (PlayoffMatch entity). Each entry is normalized
// to the shape computeElo expects, with a _source tag for display/delete handling.
export async function loadAllMatches() {
  const [logged, playoffs] = await Promise.all([
    base44.entities.Match.list(),
    base44.entities.PlayoffMatch.list("slot"),
  ]);

  const logMatches = logged.map((m) => ({ ...m, _source: "log" }));

  const playoffMatches = playoffs
    .filter((m) => m.winner && m.player1 && m.player2)
    .map((m) => ({
      id: m.id,
      player1: m.player1,
      player2: m.player2,
      score1: m.score1,
      score2: m.score2,
      winner: m.winner,
      stage: "playoff",
      group: "",
      created_date: m.created_date,
      _source: "playoff",
    }));

  return [...logMatches, ...playoffMatches];
}