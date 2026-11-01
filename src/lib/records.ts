// A finished life's numbers for the memoir board: what other players can compare (wealth, gifts, happiness, badges).
// Read off the life when its memoir is posted; nothing about the person (birth date, schools, name) is in here.
import type { LifeState } from "./types";

export interface LifeRecords {
  finalWealth: number; // engine units (만원, or $10 in an American life), at death
  peakWealth: number; // the most this life ever had
  donated: number; // given away over the life
  avgHappiness: number; // mean of the yearly happiness, 0-100
  minHappiness: number; // the lowest yearly happiness
  badges: string[]; // badge ids, in the order they were earned (badges.ts)
}

export function lifeRecords(life: LifeState): LifeRecords {
  const happy = [...life.history.map((h) => h.stats.happiness), life.stats.happiness];
  const avg = happy.reduce((a, b) => a + b, 0) / happy.length;
  return {
    finalWealth: Math.round(life.wealth),
    peakWealth: Math.round(Math.max(life.peakWealth ?? life.wealth, life.wealth)),
    donated: Math.round(life.donated ?? 0),
    avgHappiness: Math.round(avg),
    minHappiness: Math.round(Math.min(...happy)),
    badges: (life.badges ?? []).map((b) => b.id).slice(0, 40),
  };
}

/**
 * Whether the numbers fit together, read on the server before a post's records are kept. The life is played in the
 * browser, so this only catches numbers that can't come out of the game, not every made-up one.
 */
export function plausibleRecords(r: LifeRecords, deathAge: number): boolean {
  const BIG = 10_000_000; // 1000억원 (or $100M): far past anything the engine pays out
  return (
    r.peakWealth >= r.finalWealth &&
    r.peakWealth <= BIG &&
    r.finalWealth >= -BIG &&
    r.donated >= 0 &&
    r.donated <= Math.max(0, r.peakWealth) * 1.5 + 5000 &&
    r.minHappiness <= r.avgHappiness &&
    deathAge >= 1 &&
    deathAge <= 120
  );
}
