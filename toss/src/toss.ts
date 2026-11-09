import { Game, getUserKeyForGame, SafeArea } from "@apps-in-toss/web-framework";
import { registerPlatformHooks } from "@/lib/platform";
import { setupTossAds } from "./tossAds";

/**
 * Everything the mini-app adds around the shared game. What If is registered as a game (게임) mini-app: it issues
 * the game user key (game login) and sends each finished life to the Toss game center leaderboard. Each part is
 * wrapped so the game still runs in a plain browser (vite dev outside the Toss app), where bridge calls throw.
 */
export function setupToss(): void {
  keepSafeArea();
  void issueUserKey();
  setupTossAds();
  registerPlatformHooks({
    lifeEnded: (r) => {
      void submitScore(r.finalWealth);
    },
  });
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

export const USER_KEY = "whatif.tossUser";

/**
 * The game user key from Toss (게임 로그인): an anonymous hash per Toss user and app, issued without a consent screen.
 * Kept on the device so later features (saves across devices, the board) can tell the same player apart; not sent
 * anywhere yet.
 */
async function issueUserKey(): Promise<void> {
  try {
    if (!getUserKeyForGame.isSupported()) return;
    const res = await getUserKeyForGame();
    if (res && res !== "ERROR" && res.type === "HASH") localStorage.setItem(USER_KEY, res.hash);
  } catch {
    // outside Toss or an older Toss app
  }
}

/**
 * A finished life's score on the Toss game center leaderboard: the money left at death, in 만원 (the number the hall
 * of fame's 자산 tab ranks by). Sent at death, not on entry, so it never collides with Toss's game profile screen.
 * Before the mini-app info is approved in the console Toss answers LEADERBOARD_NOT_FOUND, which is ignored.
 */
async function submitScore(finalWealth: number): Promise<void> {
  try {
    if (!Game.setLeaderboardScore.isSupported()) return;
    await Game.setLeaderboardScore({ score: String(Math.max(0, Math.round(finalWealth))) });
  } catch {
    // the leaderboard is extra
  }
}
