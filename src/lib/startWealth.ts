// Starting net worth for someone who goes back to an adult age: the country's average for that age, give or take.
// Engine money is 2026 money (만원 in Korea, $10 units in the US), like everything else in the game.
import type { Region } from "./region";
import { Rng } from "./rng";

/**
 * Average household net worth by age of the household head, in engine units (2026 money).
 * Korea: 통계청·한국은행·금감원 「가계금융복지조사」 2024, 순자산 평균 by 가구주 연령
 *   (39세 이하 약 2.4억, 40대 약 4.8억, 50대 약 5.2억, 60세 이상 약 5.1억), smoothed between the bands,
 *   with the early twenties brought down because most people that age are not yet household heads.
 * US: Federal Reserve Survey of Consumer Finances 2022, mean net worth by age of head
 *   (<35 $183.5k, 35-44 $549.6k, 45-54 $975.8k, 55-64 $1.57M, 65-74 $1.79M, 75+ $1.62M), smoothed the same way.
 */
const AVERAGE: Record<Region, [age: number, units: number][]> = {
  kr: [[20, 300], [25, 3000], [30, 12000], [35, 24000], [40, 40000], [45, 48000], [50, 52000], [55, 53000], [60, 51000], [70, 47000], [80, 40000]],
  us: [[20, 800], [25, 5000], [30, 13000], [35, 30000], [40, 55000], [45, 80000], [50, 98000], [55, 130000], [60, 157000], [70, 179000], [80, 162000]],
};

/**
 * How much of today's real net worth a household of that year held, roughly. Assumption, not a statistic:
 * Korean household wealth grew several times over since the 1970s (real estate above all); American wealth grew more slowly
 * and dipped after 2008.
 */
const ERA: Record<Region, [year: number, share: number][]> = {
  kr: [[1960, 0.1], [1970, 0.15], [1980, 0.25], [1990, 0.4], [2000, 0.55], [2010, 0.75], [2020, 0.95], [2026, 1]],
  us: [[1960, 0.35], [1970, 0.45], [1980, 0.5], [1990, 0.6], [2000, 0.75], [2010, 0.7], [2020, 0.95], [2026, 1]],
};

function lerp(points: [number, number][], x: number): number {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i];
    if (x <= x1) {
      const [x0, y0] = points[i - 1];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return points[points.length - 1][1];
}

/** The average net worth for this age in this country and year, in engine units. */
export function averageWealth(region: Region, age: number, year: number): number {
  return lerp(AVERAGE[region], age) * lerp(ERA[region], year);
}

/** The average, moved up or down by up to half at random (fixed by the seed), rounded to 10 units. */
export function startingWealth(region: Region, age: number, year: number, seed: number): number {
  const rng = new Rng(seed ^ 0x5eed);
  const swing = (rng.next() + rng.next()) / 2; // 0..1, most often near the middle
  return Math.round((averageWealth(region, age, year) * (0.5 + swing)) / 10) * 10;
}
