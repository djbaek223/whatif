import { aiConfigured, narrate, NarratorError } from "@/lib/narrator/llm";
import type { NarrateRequest } from "@/lib/narrator/schema";
import { moderateAll, stringsIn } from "@/lib/moderation";
import { allowHit } from "@/lib/memoirs";

/** What the player typed in a request: their own choice, or their profile and turning point. The browser checks it first. */
const typedBy = (body: NarrateRequest): string[] =>
  body.kind === "classify" ? [body.text] : body.kind === "opening" || body.kind === "ending" ? stringsIn([body.profile, body.turningPoint]) : [];

const KINDS = new Set(["opening", "scene", "moment", "classify", "ending"]);
const MAX_BODY = 40_000; // characters; keeps a single request from carrying an essay-sized prompt
// A whole life played by hand is about 81 calls, so 300 an hour from one address is several lives; past it the page
// falls back to its templates. Stops a script (on the website or through the 앱인토스 build) from running up the AI bill.
const HOURLY_CALLS = 300;

export async function GET() {
  return Response.json({ ai: aiConfigured() });
}

export async function POST(request: Request) {
  if (!aiConfigured()) return Response.json({ ok: false, reason: "no-key" });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!(await allowHit("narrate", ip, HOURLY_CALLS, 3600))) return Response.json({ ok: false, reason: "rate-limited" }, { status: 429 });
  const raw = await request.text();
  if (raw.length > MAX_BODY) return Response.json({ ok: false, reason: "too-large" }, { status: 413 });
  let body: NarrateRequest;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false, reason: "bad-json" }, { status: 400 });
  }
  if (!body || !KINDS.has(body.kind)) return Response.json({ ok: false, reason: "bad-kind" }, { status: 400 });
  // Violence or sex the player typed never reaches the narrator, even from a page that skipped the check.
  if (moderateAll(typedBy(body))) return Response.json({ ok: false, reason: "blocked" }, { status: 422 });

  try {
    const data = await narrate(body, request.signal);
    if (!data) return Response.json({ ok: false, reason: "empty" });
    return Response.json({ ok: true, data });
  } catch (error) {
    if (error instanceof NarratorError) {
      console.error(error.message);
      const rateLimited = error.status === 429;
      return Response.json({ ok: false, reason: rateLimited ? "rate-limited" : "api-error" }, { status: rateLimited ? 429 : 502 });
    }
    if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) {
      console.warn(`[narrate] ${body.kind} gave up: ${error.name === "TimeoutError" ? "over the time budget" : "the player stopped waiting"}`);
      return Response.json({ ok: false, reason: "timeout" }, { status: 504 });
    }
    console.error("narrate failed", error);
    return Response.json({ ok: false, reason: "error" }, { status: 500 });
  }
}
