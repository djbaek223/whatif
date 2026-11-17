import { createDecipheriv } from "node:crypto";
import https from "node:https";

/**
 * Server side of 토스 로그인 for the 앱인토스 mini-app (used only by /api/toss/login; the website never calls it).
 *
 * The mini-app gets a one-time authorizationCode from TossAuth.login() and posts it here. With it we
 *   1. POST /api-partner/v1/apps-in-toss/user/oauth2/generate-token  { authorizationCode, referrer } → accessToken
 *   2. GET  /api-partner/v1/apps-in-toss/user/oauth2/login-me        Authorization: Bearer accessToken → user info
 *   3. decrypt the fields we use (birthday, gender): AES-256-GCM, base64 of IV(12) + ciphertext + tag(16), with the
 *      key and AAD that Toss e-mails when 토스 로그인 is registered in the console.
 * The partner API needs mutual TLS: every call carries the client certificate issued in the console (mTLS 인증서).
 *
 * Secrets, all on the server (Vercel env), never in the bundle:
 *   TOSS_MTLS_CERT          the certificate (.crt) text, PEM; or that text base64-encoded on one line
 *   TOSS_MTLS_KEY           the private key (.key) text, PEM; or base64 of it
 *   TOSS_LOGIN_DECRYPT_KEY  the base64 AES-256 key from the e-mail (복호화 키)
 *   TOSS_LOGIN_AAD          the AAD text from the same e-mail
 *   TOSS_API_BASE           optional, default https://apps-in-toss-api.toss.im
 */

export type TossGender = "남" | "여" | "";
/** What the mini-app gets back: only the two fields the game uses. Name, phone, CI and userKey stay here. */
export type TossProfile = { birthDate: string; gender: TossGender };

export class TossLoginError extends Error {
  constructor(
    readonly reason: "not-configured" | "bad-request" | "token" | "user" | "decrypt" | "network",
    detail?: string,
  ) {
    super(detail ? `${reason}: ${detail}` : reason);
  }
}

const pem = (raw: string | undefined): string => {
  const v = (raw ?? "").trim().replace(/\\n/g, "\n");
  if (!v || v.includes("-----BEGIN")) return v;
  return Buffer.from(v, "base64").toString("utf8");
};

type Config = { base: string; agent: https.Agent; key: Buffer; aad: Buffer };
let cached: { sig: string; config: Config } | null = null;

export function tossConfig(): Config {
  const cert = pem(process.env.TOSS_MTLS_CERT);
  const key = pem(process.env.TOSS_MTLS_KEY);
  const aesKey = (process.env.TOSS_LOGIN_DECRYPT_KEY ?? "").trim();
  const aad = process.env.TOSS_LOGIN_AAD ?? "";
  const missing = [!cert && "TOSS_MTLS_CERT", !key && "TOSS_MTLS_KEY", !aesKey && "TOSS_LOGIN_DECRYPT_KEY", !aad.trim() && "TOSS_LOGIN_AAD"].filter(Boolean);
  if (missing.length) throw new TossLoginError("not-configured", missing.join(", "));
  const base = (process.env.TOSS_API_BASE || "https://apps-in-toss-api.toss.im").trim().replace(/\/+$/, "");
  const sig = [cert, key, aesKey, aad, base].join("\0");
  if (cached?.sig === sig) return cached.config;
  const keyBytes = Buffer.from(aesKey, "base64");
  if (keyBytes.length !== 32) throw new TossLoginError("not-configured", "TOSS_LOGIN_DECRYPT_KEY must be a base64 256-bit key");
  const config = { base, agent: new https.Agent({ cert, key, keepAlive: true }), key: keyBytes, aad: Buffer.from(aad.trim(), "utf8") };
  cached = { sig, config };
  return config;
}

/** One partner API call over mTLS. Global fetch can't carry a client certificate, so this uses node:https. */
function call(config: Config, method: "GET" | "POST", path: string, opts: { body?: unknown; token?: string } = {}): Promise<{ status: number; json: unknown }> {
  const url = new URL(config.base + path);
  const data = opts.body === undefined ? undefined : JSON.stringify(opts.body);
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method,
        agent: config.agent,
        timeout: 10_000,
        headers: {
          Accept: "application/json",
          ...(data ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } : {}),
          ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let json: unknown = null;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {
            json = null;
          }
          resolve({ status: res.statusCode ?? 0, json });
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", (e) => reject(new TossLoginError("network", e.message)));
    if (data) req.write(data);
    req.end();
  });
}

type Envelope = { resultType?: unknown; success?: unknown; error?: unknown };

/**
 * The partner API answers HTTP 200 with resultType "FAIL" on errors, and an expired or reused code comes back as an
 * OAuth-style {"error":"invalid_grant"} with no envelope. Only resultType SUCCESS with a success object counts.
 */
export function successOf(status: number, json: unknown): Record<string, unknown> | null {
  if (status < 200 || status >= 300 || !json || typeof json !== "object") return null;
  const e = json as Envelope;
  if (e.resultType !== "SUCCESS" || typeof e.error === "string") return null;
  return e.success && typeof e.success === "object" ? (e.success as Record<string, unknown>) : null;
}

const why = (json: unknown) => {
  if (!json || typeof json !== "object") return "no body";
  const e = json as { error?: unknown; resultType?: unknown };
  if (typeof e.error === "string") return e.error;
  const err = e.error as { errorCode?: unknown; reason?: unknown } | undefined;
  return [e.resultType, err?.errorCode, err?.reason].filter((x) => x != null).join(" ");
};

/** Decrypts one encrypted login-me field. Returns "" for a missing field (the user didn't agree to share it). */
export function decryptField(value: unknown, key: Buffer, aad: Buffer): string {
  if (typeof value !== "string" || !value) return "";
  const raw = Buffer.from(value, "base64");
  if (raw.length < 12 + 16 + 1) throw new TossLoginError("decrypt", "too short");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(raw.length - 16);
  const data = raw.subarray(12, raw.length - 16);
  try {
    const d = createDecipheriv("aes-256-gcm", key, iv);
    d.setAAD(aad);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(data), d.final()]).toString("utf8");
  } catch {
    throw new TossLoginError("decrypt", "key, AAD or format mismatch");
  }
}

/** "19900131" (Toss's form), "1990-01-31" or "1990.01.31" → "1990-01-31"; anything else → "". */
export function birthDateOf(v: string): string {
  const d = v.replace(/\D/g, "");
  if (d.length !== 8) return "";
  const y = +d.slice(0, 4), m = +d.slice(4, 6), day = +d.slice(6, 8);
  const t = new Date(Date.UTC(y, m - 1, day));
  if (y < 1900 || t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== day) return "";
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

/** Toss sends MALE / FEMALE. */
export function genderOf(v: string): TossGender {
  const g = v.trim().toUpperCase();
  return g === "MALE" || g === "M" ? "남" : g === "FEMALE" || g === "F" ? "여" : "";
}

/** authorizationCode → access token → login-me → { birthDate, gender }. Nothing is stored. */
export async function tossLoginProfile(authorizationCode: string, referrer: string): Promise<TossProfile> {
  const config = tossConfig();
  const t = await call(config, "POST", "/api-partner/v1/apps-in-toss/user/oauth2/generate-token", { body: { authorizationCode, referrer } });
  const token = successOf(t.status, t.json)?.accessToken;
  if (typeof token !== "string" || !token) throw new TossLoginError("token", `${t.status} ${why(t.json)}`);
  const me = await call(config, "GET", "/api-partner/v1/apps-in-toss/user/oauth2/login-me", { token });
  const user = successOf(me.status, me.json);
  if (!user) throw new TossLoginError("user", `${me.status} ${why(me.json)}`);
  return {
    birthDate: birthDateOf(decryptField(user.birthday, config.key, config.aad)),
    gender: genderOf(decryptField(user.gender, config.key, config.aad)),
  };
}
