/**
 * Ad hooks. No ads are served yet; these are the places they will go.
 *
 * beforeMemoir runs after the player says yes to writing the memoir and before the memoir is shown. The memoir is
 * written while it runs (Game.writeMemoir waits for both), so a fullscreen ad covers the writing time instead of
 * adding to it. When an ad network is added, show its fullscreen (interstitial) ad here on phones and resolve when
 * it is closed, fails or times out. It must never reject, or the memoir would not appear.
 */
export async function beforeMemoir(): Promise<void> {
  if (!isPhone()) return;
  // e.g. await showInterstitial("memoir")
}

/** Phone-sized screen: the same breakpoint (lg, 1024px) the play screen uses for its mobile layout. */
export function isPhone(): boolean {
  return typeof window !== "undefined" && !window.matchMedia("(min-width: 1024px)").matches;
}
