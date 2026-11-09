import { loadFullScreenAd, showFullScreenAd, TossAds } from "@apps-in-toss/web-framework";
import { registerAds } from "@/lib/ads";

/**
 * Toss ads (토스애즈) in the game's existing ad spots (src/lib/ads.ts, src/components/AdSlot.tsx):
 *   feed     a list banner between the story's dates, every few choices (AdSlot "feed")
 *   memoir   a fullscreen ad while the memoir is written, after the player says yes (beforeMemoir)
 * The "wait" spot (under the scene-writing card) stays empty: it sits where the choices appear, so taps would land on
 * the ad by mistake. "side" is the desktop column and never shows on a phone.
 *
 * Ad group ids come from the 앱인토스 console via .env (VITE_TOSS_AD_BANNER, VITE_TOSS_AD_FULLSCREEN). Without them no
 * ad network is registered and the spots stay hidden, as on the website.
 */
const BANNER = (import.meta.env.VITE_TOSS_AD_BANNER ?? "").trim();
const FULLSCREEN = (import.meta.env.VITE_TOSS_AD_FULLSCREEN ?? "").trim();

/** A fullscreen ad never holds the memoir back longer than this. */
const FULLSCREEN_TIMEOUT_MS = 45_000;

export function setupTossAds(): void {
  const bannerOk = !!BANNER && safe(() => TossAds.initialize.isSupported() && TossAds.attachBanner.isSupported(), false);
  if (bannerOk) safe(() => TossAds.initialize({}), undefined);
  const fullscreenOk = !!FULLSCREEN && safe(() => loadFullScreenAd.isSupported() && showFullScreenAd.isSupported(), false);
  if (fullscreenOk) preload();

  registerAds({
    bannerSpots: bannerOk ? ["feed"] : [],
    banner: bannerOk
      ? (_spot, el) => {
          const slot = safe(() => TossAds.attachBanner(BANNER, el, { theme: "auto", variant: "card" }), null);
          return () => safe(() => slot?.destroy(), undefined);
        }
      : undefined,
    fullscreen: fullscreenOk ? () => showLoaded() : undefined,
  });
}

let loaded = false;

function preload(): void {
  safe(
    () =>
      loadFullScreenAd({
        options: { adGroupId: FULLSCREEN },
        onEvent: (e) => {
          if (e.type === "loaded") loaded = true;
        },
        onError: () => {
          loaded = false;
        },
      }),
    undefined,
  );
}

/** Shows the preloaded fullscreen ad and resolves when it is closed or fails; loads the next one after. */
function showLoaded(): Promise<void> {
  if (!loaded) {
    preload();
    return Promise.resolve();
  }
  loaded = false;
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      preload();
      resolve();
    };
    const timer = setTimeout(finish, FULLSCREEN_TIMEOUT_MS);
    try {
      showFullScreenAd({
        options: { adGroupId: FULLSCREEN },
        onEvent: (e) => {
          if (e.type === "dismissed" || e.type === "failedToShow") finish();
        },
        onError: finish,
      });
    } catch {
      finish();
    }
  });
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}
