import { revalidateTag } from "next/cache";
import { z } from "zod";
import { BOARD_TAG, cachedHome, cachedList } from "@/lib/boardCache";
import { allowHit, boardConfigured, deleteMemoir, publishMemoir } from "@/lib/memoirs";
import { plausibleRecords } from "@/lib/records";
import { moderateAll } from "@/lib/moderation";

const RegionField = z.enum(["kr", "us"]).catch("kr");

const Post = z.object({
  region: RegionField,
  penName: z.string().trim().max(20).default(""),
  title: z.string().trim().min(1).max(80),
  epitaph: z.string().trim().max(200).default(""),
  memoir: z.string().trim().min(20).max(8000),
  deathAge: z.number().int().min(0).max(130),
  status: z.string().trim().max(80).default(""),
  records: z
    .object({
      finalWealth: z.number().int(),
      peakWealth: z.number().int(),
      donated: z.number().int(),
      avgHappiness: z.number().int().min(0).max(100),
      minHappiness: z.number().int().min(0).max(100),
      badges: z.array(z.string().regex(/^[a-z0-9-]{2,24}$/)).max(40),
    })
    .optional()
    .catch(undefined),
  website: z.string().max(0).optional(), // honeypot: people never see this field, bots fill it
});

const Delete = z.object({ id: z.string().regex(/^[\w-]{6,24}$/), key: z.string().min(8).max(200) });

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
  const size = Math.max(1, Math.min(10, Number(q.get("size")) || 10));
  try {
    // The start screen: the most liked three once likes have built up, the newest three before that.
    if (q.get("home")) return Response.json({ ok: true, ...(await cachedHome(region)), more: true });
    return Response.json({ ok: true, ...(await cachedList(region, before, size)) });
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
  // Three posts per ten minutes from one address, counted across every server instance.
  if (!(await allowHit("post", ip, 3, 600))) return Response.json({ ok: false, reason: "rate-limited" }, { status: 429 });
  const { region, penName, title, epitaph, memoir, deathAge, status, records } = parsed.data;
  // The board is public: a memoir the player edited into violence or sex doesn't go up.
  if (moderateAll([penName, title, epitaph, memoir])) return Response.json({ ok: false, reason: "blocked" }, { status: 422 });
  // Numbers that can't come out of the game are left off; the memoir itself still goes up.
  const kept = records && plausibleRecords(records, deathAge) ? { records: { ...records, badges: [...new Set(records.badges)] } } : {};
  try {
    const out = await publishMemoir({ region, penName, title, epitaph, memoir, deathAge, status, ...kept });
    revalidateTag(BOARD_TAG, { expire: 0 });
    return Response.json({ ok: true, ...out });
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
    if (ok) revalidateTag(BOARD_TAG, { expire: 0 });
    return Response.json(ok ? { ok } : { ok, reason: "forbidden" }, { status: ok ? 200 : 403 });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return Response.json({ ok: false, reason: "store-failed" }, { status: 502 });
  }
}
