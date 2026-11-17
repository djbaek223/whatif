import { isToss } from "./platform";
import type { Gender } from "./types";

/**
 * 토스 로그인 hook for the shared game code. The 앱인토스 build registers the real login at start-up
 * (toss/src/tossLogin.ts: TossAuth.login() → /api/toss/login); the website registers nothing, so it never imports
 * Toss code and its onboarding stays as it is.
 *
 * In the mini-app the birth date and gender come from the login instead of being typed: the first screen of the
 * onboarding shows a login button in place of those two questions (Forms.tsx).
 */
export type TossIdentity = { birthDate: string; gender: Gender };

export type TossLoginProvider = {
  /** Inside the Toss app (the bridge exists). Outside it (vite dev in a browser) the usual inputs are shown. */
  available: () => boolean;
  /** Logs in and returns what Toss shared (a field the user didn't share is ""). Rejects with a TossLoginFailure. */
  login: () => Promise<TossIdentity>;
};

export class TossLoginFailure extends Error {
  constructor(readonly kind: "canceled" | "server") {
    super(kind);
  }
}

let provider: TossLoginProvider | null = null;

export function registerTossLogin(p: TossLoginProvider): void {
  provider = p;
}

/** True in the 앱인토스 build running inside Toss: birth date and gender come from 토스 로그인. */
export function usesTossLogin(): boolean {
  if (!isToss || !provider) return false;
  try {
    return provider.available();
  } catch {
    return false;
  }
}

export function tossLogin(): Promise<TossIdentity> {
  if (!provider) return Promise.reject(new TossLoginFailure("server"));
  return provider.login();
}
