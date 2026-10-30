import { z } from "zod";
import { boardConfigured, deleteMemoir, listMemoirs, publishMemoir } from "@/lib/memoirs";

const RegionField = z.enum(["kr", "us"]).catch("kr");

const Post = z.object({
  region: RegionField,
  penName: z.string().trim().max(20).default(""),
  title: z.string().trim().min(1).max(80),
  epitaph: z.string().trim().max(200).default(""),
  memoir: z.string().trim().min(20).max(8000),
  deathAge: z.number().int().min(0).max(130),
  status: z.string().trim().max(80).default(""),
  website: z.string().max(0).optional(), // honeypot: people never see this field, bots fill it
});

const Delete = z.object({ id: z.string().regex(/^[\w-]{6,24}$/), key: z.string().min(8).max(200) });

// Best effort, per server instance: enough to stop one tab from flooding the board.
const WINDOW_MS = 10 * 60_000;
const PER_WINDOW = 3;
const recent = new Map<string, number[]>();
function allow(ip: string) {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= PER_WINDOW) return false;
  recent.set(ip, [...hits, now]);
  if (recent.size > 5000) recent.clear();
  return true;
}

async function body(request: Request) {
  const raw = await request.text();
  if (raw.length > 20_000) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  if (!boardConfigured()) return Response.json({ ok: false, reason: "no-store" });
  const q = new URL(request.url).searchParams;
  const region = RegionField.parse(q.get("region"));
  const before = Math.max(0, Math.min(10_000, Number(q.get("before")) || 0));
  try {
    return Response.json({ ok: true, ...(await listMemoirs(region, before)) });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return Response.json({ ok: false, reason: "store-failed" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!boardConfigured()) return Response.json({ ok: false, reason: "no-store" });
  const parsed = Post.safeParse(await body(request));
  if (!parsed.success) return Response.json({ ok: false, reason: "invalid" }, { status: 400 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!allow(ip)) return Response.json({ ok: false, reason: "rate-limited" }, { status: 429 });
  const { region, penName, title, epitaph, memoir, deathAge, status } = parsed.data;
  try {
    return Response.json({ ok: true, ...(await publishMemoir({ region, penName, title, epitaph, memoir, deathAge, status })) });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return Response.json({ ok: false, reason: "store-failed" }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  if (!boardConfigured()) return Response.json({ ok: false, reason: "no-store" });
  const parsed = Delete.safeParse(await body(request));
  if (!parsed.success) return Response.json({ ok: false, reason: "invalid" }, { status: 400 });
  try {
    const ok = await deleteMemoir(parsed.data.id, parsed.data.key);
    return Response.json(ok ? { ok } : { ok, reason: "forbidden" }, { status: ok ? 200 : 403 });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return Response.json({ ok: false, reason: "store-failed" }, { status: 502 });
  }
}
