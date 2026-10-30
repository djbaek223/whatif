import { z } from "zod";
import { feedbackConfigured, sendFeedback } from "@/lib/feedback";

const Body = z.object({
  message: z.string().trim().min(2).max(2000),
  contact: z.string().trim().max(100).default(""),
  where: z.string().trim().max(200).default(""),
  website: z.string().max(0).optional(), // honeypot: people never see this field, bots fill it
});

// Best effort: each server instance keeps its own count, which is enough to stop one tab from flooding the inbox.
const WINDOW_MS = 10 * 60_000;
const PER_WINDOW = 5;
const recent = new Map<string, number[]>();

function allow(ip: string) {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= PER_WINDOW) return false;
  recent.set(ip, [...hits, now]);
  if (recent.size > 5000) recent.clear();
  return true;
}

export async function POST(request: Request) {
  if (!feedbackConfigured()) return Response.json({ ok: false, reason: "no-key" });
  const raw = await request.text();
  if (raw.length > 10_000) return Response.json({ ok: false, reason: "too-large" }, { status: 413 });
  let parsed;
  try {
    parsed = Body.safeParse(JSON.parse(raw));
  } catch {
    return Response.json({ ok: false, reason: "bad-json" }, { status: 400 });
  }
  if (!parsed.success) return Response.json({ ok: false, reason: "invalid" }, { status: 400 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!allow(ip)) return Response.json({ ok: false, reason: "rate-limited" }, { status: 429 });

  try {
    await sendFeedback(parsed.data, request.signal);
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return Response.json({ ok: false, reason: "send-failed" }, { status: 502 });
  }
}
