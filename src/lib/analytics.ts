/** The site's Google tag (Google Tag Manager container). Public: it appears in every page's source. */
export const GOOGLE_TAG_ID = "GTM-5JDRZN3X";

/**
 * Event log for the 앱인토스 build: what players do (start, finish a life, watch an ad, share), so the console can count
 * conversions and revisits. The website registers no logger, so logEvent does nothing there and never imports Toss code;
 * the mini-app registers Toss's Analytics.log at start-up (toss/src/tossAnalytics.ts).
 *
 * Names are short snake_case. Params hold only counts and kinds, never what the player typed.
 */
export type EventParams = Record<string, string | number | boolean | undefined>;
type Logger = (name: string, params: EventParams) => void;

let logger: Logger | null = null;

export function registerLogger(l: Logger): void {
  logger = l;
}

/** Records one event. Never throws, never waits. */
export function logEvent(name: string, params: EventParams = {}): void {
  if (!logger) return;
  try {
    logger(name, params);
  } catch {
    // a log must never break the game
  }
}
