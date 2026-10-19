import { aiConfigured, narrate, NarratorError } from "@/lib/narrator/deepseek";
import type { NarrateRequest } from "@/lib/narrator/schema";

const KINDS = new Set(["opening", "scene", "classify", "ending"]);
const MAX_BODY = 40_000; // characters; keeps a single request from carrying an essay-sized prompt

export async function GET() {
  return Response.json({ ai: aiConfigured() });
}

export async function POST(request: Request) {
  if (!aiConfigured()) return Response.json({ ok: false, reason: "no-key" });
  const raw = await request.text();
  if (raw.length > MAX_BODY) return Response.json({ ok: false, reason: "too-large" }, { status: 413 });
  let body: NarrateRequest;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false, reason: "bad-json" }, { status: 400 });
  }
  if (!body || !KINDS.has(body.kind)) return Response.json({ ok: false, reason: "bad-kind" }, { status: 400 });

  try {
    const data = await narrate(body);
    if (!data) return Response.json({ ok: false, reason: "empty" });
    return Response.json({ ok: true, data });
  } catch (error) {
    if (error instanceof NarratorError) {
      console.error(error.message);
      const rateLimited = error.status === 429;
      return Response.json({ ok: false, reason: rateLimited ? "rate-limited" : "api-error" }, { status: rateLimited ? 429 : 502 });
    }
    console.error("narrate failed", error);
    return Response.json({ ok: false, reason: "error" }, { status: 500 });
  }
}
