import { NextResponse, type NextRequest } from "next/server";

/**
 * Lets the 앱인토스 mini-app call this site's API. The mini-app is a static bundle served by Toss from its own
 * address (https://<app>.apps.tossmini.com, and https://<app>.private-apps.tossmini.com while testing by QR), so its
 * requests are cross-origin. Only that app's own addresses are let in, never every *.tossmini.com: all mini-apps
 * share that domain. TOSS_APP_NAME is the app name registered in the 앱인토스 console (default "whatif-host");
 * TOSS_ORIGINS adds more exact origins, comma-separated.
 */
function allowedOrigins(): Set<string> {
  const app = (process.env.TOSS_APP_NAME || "whatif-host").trim();
  const extra = (process.env.TOSS_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean);
  return new Set([`https://${app}.apps.tossmini.com`, `https://${app}.private-apps.tossmini.com`, ...extra]);
}

// The 연결 끊기 콜백 is called by Toss's servers, but the console's "test" button may call it from the browser.
// It is guarded by Basic Auth and sets no cookies, so any origin may call it.
const DISCONNECT = "/api/toss/disconnect";
const OPEN_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === DISCONNECT) {
    if (request.method === "OPTIONS") return new NextResponse(null, { status: 204, headers: OPEN_CORS });
    const res = NextResponse.next();
    for (const [k, v] of Object.entries(OPEN_CORS)) res.headers.set(k, v);
    return res;
  }
  const origin = request.headers.get("origin");
  const allowed = !!origin && allowedOrigins().has(origin);
  const headers: Record<string, string> = allowed
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      }
    : { Vary: "Origin" };
  if (request.method === "OPTIONS") return new NextResponse(null, { status: allowed ? 204 : 403, headers });
  const res = NextResponse.next();
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}

export const config = { matcher: "/api/:path*" };
