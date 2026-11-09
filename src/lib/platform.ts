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

