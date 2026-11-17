import { createHash } from "node:crypto";
import { TossLoginError, tossLoginProfile } from "@/lib/tossPartner";

/**
 * 토스 로그인 for the 앱인토스 mini-app: POST { authorizationCode, referrer } (from TossAuth.login()) and get back
 * { ok: true, birthDate: "YYYY-MM-DD" | "", gender: "남" | "여" | "" }. Only the mini-app's own origins pass CORS
 * (src/proxy.ts). The exchange and the secrets it needs are in src/lib/tossPartner.ts. Nothing is stored, so the
 * 연결 끊기 callback has nothing to delete.
 */
export const runtime = "nodejs";

// A light per-IP limit: a login is a few calls per user, so 30 an hour is plenty and stops code-guessing floods.
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3600_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 30;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(ip)) return Response.json({ ok: false, reason: "rate-limited" }, { status: 429 });
  let body: { authorizationCode?: unknown; referrer?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, reason: "bad-request" }, { status: 400 });
  }
  const code = typeof body.authorizationCode === "string" ? body.authorizationCode.trim() : "";
  const referrer = body.referrer === "SANDBOX" ? "SANDBOX" : "DEFAULT";
  if (!code || code.length > 2000) return Response.json({ ok: false, reason: "bad-request" }, { status: 400 });
  try {
    const profile = await tossLoginProfile(code, referrer);
    return Response.json({ ok: true, ...profile }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const reason = e instanceof TossLoginError ? e.reason : "network";
    // Log the cause (never the code or any user field) and give the app only a short reason.
    const tag = createHash("sha256").update(code).digest("hex").slice(0, 8);
    console.error(`[toss-login] ${referrer} code=${tag} ${e instanceof Error ? e.message : String(e)}`);
    const status = reason === "not-configured" ? 503 : reason === "token" ? 401 : 502;
    return Response.json({ ok: false, reason }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
