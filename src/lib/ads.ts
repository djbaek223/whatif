import type { LifeState } from "./types";
import { logEvent } from "./analytics";

/**
 * Ad hooks. No ads are served yet; these are the places they will go.
 *
 * beforeMemoir runs after the player says yes to writing the memoir and before the memoir is shown. The memoir is
 * written while it runs (Game.writeMemoir waits for both), so a fullscreen ad covers the writing time instead of
 * adding to it. When an ad network is added, show its fullscreen (interstitial) ad here on phones and resolve when
 * it is closed, fails or times out. It must never reject, or the memoir would not appear.
 */
export async function beforeMemoir(life?: LifeState): Promise<void> {
  if (!memoirAdAhead(life)) return;
  // 앱인토스 UX 원칙 2: one fullscreen ad per life. Marked before it shows, so closing the app during the ad and
  // asking for the memoir again (or writing it later from the skipped view) never shows a second one.
  if (life) markAdSeen(life);
  logEvent("ad_fullscreen_show", { spot: "memoir" });
  try {
    await provider.fullscreen!("memoir");
  } catch {
    // never block the memoir
  }
}

/**
 * Whether asking for this life's memoir will show a fullscreen ad first: a phone, an ad network with fullscreen ads
 * (the 앱인토스 build), and no ad seen yet for this life. The ending says so on the button before it is pressed.
 */
export function memoirAdAhead(life?: LifeState): boolean {
  if (!isPhone() || !provider.fullscreen) return false;
  return !life || !adSeen(life);
}

const SEEN_KEY = "whatif:memoir-ad:v1";
const SEEN_MAX = 30;

/** A finished life, told apart from others by when it began, where it turned, how it ended and its last random state. */
const lifeKey = (life: LifeState) => [life.profile.birthDate, life.turningPoint.date, life.deathAge, life.rng, life.log.length].join("|");

function seenKeys(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function adSeen(life: LifeState): boolean {
  return seenKeys().includes(lifeKey(life));
}

function markAdSeen(life: LifeState): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seenKeys().filter((k) => k !== lifeKey(life)), lifeKey(life)].slice(-SEEN_MAX)));
  } catch {
    // storage blocked: the ad may show again for this life, which is the old behaviour
  }
}

/**
 * The ad network behind the spots. The website registers none (its game screens carry no ads; AdSense runs only on content pages); the 앱인토스 build
 * registers Toss ads at start-up (toss/src/tossAds.ts). Kept as a plain registry so the website never imports Toss code.
 */
export type AdProvider = {
  /** Show a fullscreen ad and resolve once it is closed, failed or timed out. */
  fullscreen?: (spot: "memoir") => Promise<void>;
  /** The spots this network fills with a banner; the others stay empty. */
  bannerSpots?: "feed"[];
  /** Draw a banner for a spot into el; returns a cleanup. */
  banner?: (spot: "feed", el: HTMLElement) => () => void;
};

let provider: AdProvider = {};

export function registerAds(p: AdProvider): void {
  provider = p;
}

export function adProvider(): AdProvider {
  return provider;
}

/** Phone-sized screen: the same breakpoint (lg, 1024px) the play screen uses for its mobile layout. */
export function isPhone(): boolean {
  return typeof window !== "undefined" && !window.matchMedia("(min-width: 1024px)").matches;
}

/** The site's AdSense publisher id. It is public (ads.txt and the page source show it), so it lives in the code. */
const ADSENSE_CLIENT = "ca-pub-2732165732113122";

/**
 * The AdSense publisher id ("ca-pub-…"): NEXT_PUBLIC_ADSENSE_CLIENT when it is set (read at build time; set it to
 * something else to switch accounts), else the site's own id above. The layout adds AdSense's verification meta tag on
 * every page, the content pages load the ad script (ContentAds), and /ads.txt lists it.
 */
export function adsenseClient(): string {
  const id = (process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "").trim() || ADSENSE_CLIENT;
  return /^ca-pub-\d{10,20}$/.test(id) ? id : "";
}
