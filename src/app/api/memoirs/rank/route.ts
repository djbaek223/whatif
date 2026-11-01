import { connection } from "next/server";
import { z } from "zod";
import { RANK_CATS, boardConfigured, standings } from "@/lib/memoirs";

const RegionField = z.enum(["kr", "us"]).catch("kr");

/**
 * Where a finished life's numbers stand on the board (the ending screen's "상위 %"): for each category given as a
 * query value, how many posts are higher and how many are ranked. Nothing is stored.
 */
export async function GET(request: Request) {
  await connection(); // answers each query; without this the build would keep one fixed answer
  if (!boardConfigured()) return Response.json({ ok: false, reason: "no-store" });
  const q = new URL(request.url).searchParams;
  const values = Object.fromEntries(
    RANK_CATS.flatMap((c) => {
      const v = q.get(c);
      return v !== null && v !== "" && Number.isFinite(Number(v)) ? [[c, Math.round(Number(v))]] : [];
    }),
  );
  try {
    return Response.json({ ok: true, standings: await standings(RegionField.parse(q.get("region")), values) });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return Response.json({ ok: false, reason: "store-failed" }, { status: 502 });
  }
}
