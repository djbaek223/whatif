import { TossAuth, appLogin } from "@apps-in-toss/web-framework";
import { api } from "@/lib/platform";
import { registerTossLogin, TossLoginFailure, type TossIdentity } from "@/lib/tossLogin";

/**
 * 토스 로그인: TossAuth.login() shows Toss's own consent sheet (이름·성별·생년월일, as set in the console) and returns
 * a one-time authorizationCode. The website's /api/toss/login trades it for the user's info over mTLS, decrypts it and
 * answers with only the birth date and gender. No secret lives in this bundle.
 */
export function setupTossLogin(): void {
  registerTossLogin({
    available: () => typeof window !== "undefined" && (window as { ReactNativeWebView?: unknown }).ReactNativeWebView != null,
    login,
  });
}

async function login(): Promise<TossIdentity> {
  let auth: { authorizationCode: string; referrer: string };
  try {
    auth = await (TossAuth?.login ?? appLogin)();
  } catch {
    // The user closed the consent sheet, or the bridge failed.
    throw new TossLoginFailure("canceled");
  }
  if (!auth?.authorizationCode) throw new TossLoginFailure("canceled");
  let res: Response;
  try {
    res = await fetch(api("/api/toss/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorizationCode: auth.authorizationCode, referrer: auth.referrer }),
    });
  } catch {
    throw new TossLoginFailure("server");
  }
  const data = (await res.json().catch(() => null)) as { ok?: boolean; birthDate?: string; gender?: string } | null;
  if (!res.ok || !data?.ok) throw new TossLoginFailure("server");
  const gender = data.gender === "남" || data.gender === "여" ? data.gender : "";
  const birthDate = /^\d{4}-\d{2}-\d{2}$/.test(data.birthDate ?? "") ? data.birthDate! : "";
  // A field the user didn't share comes back empty; the onboarding then asks just that one.
  return { birthDate, gender };
}
