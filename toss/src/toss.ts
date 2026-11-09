import { SafeArea } from "@apps-in-toss/web-framework";
import { setupTossAds } from "./tossAds";

/**
 * Everything the mini-app adds around the shared game. What If is registered as a non-game (비게임) mini-app, so it
 * needs no game login, leaderboard or game rating. Each part is wrapped so the game still runs in a plain browser
 * (vite dev outside the Toss app), where the bridge calls are missing or throw.
 */
export function setupToss(): void {
  keepSafeArea();
  setupTossAds();
}

/** Keeps the bottom of the page clear of the home indicator, also after rotation. */
function keepSafeArea(): void {
  const apply = (bottom: number) => document.documentElement.style.setProperty("--toss-safe-bottom", `${Math.max(0, bottom)}px`);
  try {
    apply(SafeArea.get().bottom);
    SafeArea.subscribe({ onEvent: (insets) => apply(insets.bottom) });
  } catch {
    // outside Toss: the CSS falls back to env(safe-area-inset-bottom)
  }
}
