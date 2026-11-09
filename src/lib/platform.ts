/**
 * Where this build runs: the website (Next.js on Vercel) or the 앱인토스 mini-app (a static bundle inside the Toss
 * app, built from toss/). Both are fixed at build time, so the website never carries Toss code paths and vice versa.
 *
 * NEXT_PUBLIC_PLATFORM   "toss" in the mini-app build, unset on the website.
 * NEXT_PUBLIC_API_BASE   where the /api routes live. Empty on the website (same origin); the mini-app has no server
 *                        of its own, so it calls the website's, e.g. https://whatif.host.
 */
export type Platform = "web" | "toss";

export const PLATFORM: Platform = process.env.NEXT_PUBLIC_PLATFORM === "toss" ? "toss" : "web";
export const isToss = PLATFORM === "toss";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "").trim().replace(/\/+$/, "");

/** The address of one of the site's API routes ("/api/…"), on this origin or on the website's when in the mini-app. */
export function api(path: string): string {
  return API_BASE + path;
}


/**
 * The game rating (게임물 등급) the 앱인토스 build shows on its first screen, e.g. "전체이용가" or "12세이용가".
 * Empty on the website and until the rating is issued. Set WHATIF_GAME_RATING in toss/.env.
 */
export const GAME_RATING = (process.env.NEXT_PUBLIC_GAME_RATING ?? "").trim();

/**
 * Things the host app wants to hear about. The website listens to nothing; the 앱인토스 build registers its own
 * (toss/src/toss.ts): a finished life's score goes to the Toss game center leaderboard.
 */
export type PlatformHooks = {
  /** A life just ended (once per life), with its final records. */
  lifeEnded?: (records: { finalWealth: number; avgHappiness: number; donated: number; deathAge: number; badges: number }) => void;
};

let hooks: PlatformHooks = {};

export function registerPlatformHooks(h: PlatformHooks): void {
  hooks = h;
}

export function platformHooks(): PlatformHooks {
  return hooks;
}
