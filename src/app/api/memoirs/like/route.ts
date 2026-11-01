import { z } from "zod";
import { allowHit, boardConfigured, likeMemoir } from "@/lib/memoirs";

const Like = z.object({
  id: z.string().regex(/^[\w-]{6,24}$/),
  liker: z.string().regex(/^[\w-]{12,64}$/), // the browser's own random id (Board.tsx likerId)
  on: z.boolean(),
});

/** A like, or taking one back. One per browser per post; 60 a ten minutes from one address. */
export async function POST(request: Request) {
  if (!boardConfigured()) return Response.json({ ok: false, reason: "no-store" });
  let parsed;
  try {
    parsed = Like.safeParse(JSON.parse((await request.text()).slice(0, 500)));
  } catch {
    parsed = null;
  }
  if (!parsed?.success) return Response.json({ ok: false, reason: "invalid" }, { status: 400 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!(await allowHit("like", ip, 60, 600))) return Response.json({ ok: false, reason: "rate-limited" }, { status: 429 });
  try {
    const likes = await likeMemoir(parsed.data.id, parsed.data.liker, parsed.data.on);
    return likes === null ? Response.json({ ok: false, reason: "missing" }, { status: 404 }) : Response.json({ ok: true, likes });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return Response.json({ ok: false, reason: "store-failed" }, { status: 502 });
  }
}
