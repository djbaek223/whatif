import { revalidateTag } from "next/cache";
import { z } from "zod";
import { BOARD_TAG } from "@/lib/boardCache";
import { boardConfigured, reportMemoir } from "@/lib/memoirs";

const Report = z.object({ id: z.string().regex(/^[\w-]{6,24}$/) });

// Best effort, per server instance: one visitor can't report dozens of posts in a burst.
const WINDOW_MS = 10 * 60_000;
const PER_WINDOW = 10;
const recent = new Map<string, number[]>();
function allow(ip: string) {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= PER_WINDOW) return false;
  recent.set(ip, [...hits, now]);
  if (recent.size > 5000) recent.clear();
  return true;
}

/** A reader flags a post. Reports from three different people take it off the board (memoirs.ts reportMemoir). */
export async function POST(request: Request) {
  if (!boardConfigured()) return Response.json({ ok: false, reason: "no-store" });
  const raw = await request.text();
  let parsed;
  try {
    parsed = Report.safeParse(JSON.parse(raw.slice(0, 500)));
  } catch {
    parsed = null;
  }
  if (!parsed?.success) return Response.json({ ok: false, reason: "invalid" }, { status: 400 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!allow(ip)) return Response.json({ ok: false, reason: "rate-limited" }, { status: 429 });
  try {
    const result = await reportMemoir(parsed.data.id, ip);
    if (result === "hidden") revalidateTag(BOARD_TAG, { expire: 0 });
    return Response.json({ ok: true, result });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return Response.json({ ok: false, reason: "store-failed" }, { status: 502 });
  }
}
