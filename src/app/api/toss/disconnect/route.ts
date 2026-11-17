import { createHash, timingSafeEqual } from "node:crypto";

/**
 * 토스 로그인 연결 끊기 콜백. 앱인토스 console → 토스 로그인 → 연결 끊기 콜백 URL is https://whatif.host/api/toss/disconnect.
 * Toss calls it (GET with ?userKey=&referrer=, or POST with a JSON body, as chosen in the console) when a user
 * disconnects in the Toss app (UNLINK), withdraws the login terms (WITHDRAWAL_TERMS) or leaves Toss (WITHDRAWAL_TOSS).
 * It is not called when we call the disconnect API ourselves.
 *
 * Toss sends `Authorization: Basic <value>`, the value being the base64 of what was typed in the console. The secret
 * is TOSS_DISCONNECT_AUTH = "username:password" (the same text typed in the console); never hard-code it here.
 *
 * Nothing is stored per Toss user yet, so there is nothing to delete. When Toss login stores anything keyed by
 * userKey, delete it in handle() (all three referrers end the sign-in; WITHDRAWAL_TOSS must delete the user).
 */

const REFERRERS = new Set(["UNLINK", "WITHDRAWAL_TERMS", "WITHDRAWAL_TOSS"]);

const digest = (s: string) => createHash("sha256").update(s).digest();
const same = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

function authorized(request: Request): "ok" | "unauthorized" | "unconfigured" {
  const secret = process.env.TOSS_DISCONNECT_AUTH?.trim();
  if (!secret) return "unconfigured";
  const header = request.headers.get("authorization")?.trim() ?? "";
  const m = /^Basic\s+(.+)$/i.exec(header);
  if (!m) return "unauthorized";
  const token = m[1].trim();
  // The documented form is base64(secret); a console that sends the typed text as is still matches.
  const encoded = Buffer.from(secret, "utf8").toString("base64");
  return same(token, encoded) || same(token, secret) ? "ok" : "unauthorized";
}

async function handle(userKey: string | null, referrer: string | null) {
  const kind = referrer && REFERRERS.has(referrer) ? referrer : "UNKNOWN";
  // userKey is Toss's per-service pseudonymous id; log only a short hash.
  const who = userKey ? createHash("sha256").update(userKey).digest("hex").slice(0, 12) : "none";
  console.info(`[toss-disconnect] ${kind} user=${who}`);
}

function deny(state: "unauthorized" | "unconfigured") {
  return state === "unconfigured"
    ? Response.json({ ok: false, reason: "not-configured" }, { status: 503 })
    : Response.json({ ok: false, reason: "unauthorized" }, { status: 401, headers: { "WWW-Authenticate": 'Basic realm="toss-disconnect"' } });
}

export async function GET(request: Request) {
  const state = authorized(request);
  if (state !== "ok") return deny(state);
  const q = new URL(request.url).searchParams;
  await handle(q.get("userKey"), q.get("referrer"));
  return Response.json({ ok: true });
}

export async function POST(request: Request) {
  const state = authorized(request);
  if (state !== "ok") return deny(state);
  const q = new URL(request.url).searchParams;
  let userKey = q.get("userKey");
  let referrer = q.get("referrer");
  const raw = await request.text();
  if (raw.length > 10_000) return Response.json({ ok: false, reason: "too-large" }, { status: 413 });
  if (raw) {
    try {
      const body = JSON.parse(raw) as { userKey?: unknown; referrer?: unknown };
      if (body.userKey != null) userKey = String(body.userKey);
      if (typeof body.referrer === "string") referrer = body.referrer;
    } catch {
      // A test call from the console may send no JSON; acknowledging it is fine once the auth matched.
    }
  }
  await handle(userKey, referrer);
  return Response.json({ ok: true });
}
