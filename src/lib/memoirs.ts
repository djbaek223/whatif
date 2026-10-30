import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { Region } from "./region";

// Published memoirs live in Redis through Upstash's REST API (https://upstash.com/docs/redis/features/restapi),
// which Vercel's Upstash for Redis integration sets up as KV_REST_API_URL / KV_REST_API_TOKEN.
// Without them, `next dev` keeps posts in memory so the board can be tried locally; a production build says it isn't set up.
const URL_ = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const TOKEN = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const inMemory = () => !URL_() && process.env.NODE_ENV !== "production";

export const boardConfigured = () => Boolean(URL_() && TOKEN()) || inMemory();

/** What the board shows. No birth date, school or real name: only what the writer chose to post. */
export interface Memoir {
  id: string;
  region: Region;
  penName: string;
  title: string;
  epitaph: string;
  memoir: string;
  deathAge: number;
  status: string; // how the life ended, e.g. "은퇴 · 기혼"
  createdAt: string;
}

type Stored = Memoir & { keyHash: string };

export const PAGE = 10;
const listKey = (r: Region) => `memoirs:${r}`;
const itemKey = (id: string) => `memoir:${id}`;
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
function strip(stored: Stored): Memoir {
  const m: Partial<Stored> = { ...stored };
  delete m.keyHash;
  return m as Memoir;
}

async function redis<T>(commands: (string | number)[][]): Promise<T[]> {
  const res = await fetch(`${URL_()}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`[memoirs] Redis ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const out = (await res.json()) as { result?: T; error?: string }[];
  const failed = out.find((r) => r.error);
  if (failed) throw new Error(`[memoirs] Redis: ${failed.error}`);
  return out.map((r) => r.result as T);
}

// Development only: one process, gone on restart.
type Mem = { lists: Record<Region, string[]>; items: Map<string, Stored> };
const holder = globalThis as { __memoirs?: Mem };
const mem: Mem = (holder.__memoirs ??= { lists: { kr: [], us: [] }, items: new Map() });

/** Newest first. `before` is how many posts the reader has already seen. */
export async function listMemoirs(region: Region, before = 0): Promise<{ items: Memoir[]; more: boolean }> {
  if (inMemory()) {
    const ids = mem.lists[region].slice(before, before + PAGE + 1);
    const items = ids.slice(0, PAGE).flatMap((id) => (mem.items.has(id) ? [strip(mem.items.get(id)!)] : []));
    return { items, more: ids.length > PAGE };
  }
  const [ids] = await redis<string[]>([["LRANGE", listKey(region), before, before + PAGE]]);
  const page = ids.slice(0, PAGE);
  const raw = page.length ? (await redis<string[]>([["MGET", ...page.map(itemKey)]]))[0] : [];
  const items = raw.flatMap((s) => {
    if (!s) return [];
    try {
      return [strip(JSON.parse(s) as Stored)];
    } catch {
      return [];
    }
  });
  return { items, more: ids.length > PAGE };
}

/** Saves a post and returns it with the secret that lets this browser take it down later. */
export async function publishMemoir(m: Omit<Memoir, "id" | "createdAt">): Promise<{ memoir: Memoir; deleteKey: string }> {
  const id = randomBytes(9).toString("base64url");
  const deleteKey = randomBytes(18).toString("base64url");
  const stored: Stored = { ...m, id, createdAt: new Date().toISOString(), keyHash: hash(deleteKey) };
  if (inMemory()) {
    mem.items.set(id, stored);
    mem.lists[m.region].unshift(id);
  } else {
    await redis([
      ["SET", itemKey(id), JSON.stringify(stored)],
      ["LPUSH", listKey(m.region), id],
    ]);
  }
  return { memoir: strip(stored), deleteKey };
}

/** Takes a post down with the writer's secret, or with BOARD_ADMIN_KEY for the site owner. False if neither matches. */
export async function deleteMemoir(id: string, key: string): Promise<boolean> {
  let stored: Stored | undefined;
  if (inMemory()) stored = mem.items.get(id);
  else {
    const [s] = await redis<string | null>([["GET", itemKey(id)]]);
    stored = s ? (JSON.parse(s) as Stored) : undefined;
  }
  if (!stored) return true; // already gone
  const admin = process.env.BOARD_ADMIN_KEY;
  if (hash(key) !== stored.keyHash && !(admin && key === admin)) return false;
  if (inMemory()) {
    mem.items.delete(id);
    mem.lists[stored.region] = mem.lists[stored.region].filter((x) => x !== id);
  } else {
    await redis([
      ["DEL", itemKey(id)],
      ["LREM", listKey(stored.region), 0, id],
    ]);
  }
  return true;
}
