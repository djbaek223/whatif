import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { Region } from "./region";
import type { LifeRecords } from "./records";

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
  records?: LifeRecords; // the life's numbers (records.ts); missing on posts from before records, or when they didn't add up
  createdAt: string;
}

type Stored = Memoir & { keyHash: string; hidden?: boolean };

/** Reports from different people that take a post off the board until the owner looks at it. */
export const HIDE_AFTER = 3;

export const PAGE = 10;
const listKey = (r: Region) => `memoirs:${r}`;
const itemKey = (id: string) => `memoir:${id}`;
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
function strip(stored: Stored): Memoir {
  const m: Partial<Stored> = { ...stored };
  delete m.keyHash;
  delete m.hidden;
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
type Mem = { lists: Record<Region, string[]>; items: Map<string, Stored>; reports: Map<string, Set<string>> };
const holder = globalThis as { __memoirs?: Mem };
const mem: Mem = (holder.__memoirs ??= { lists: { kr: [], us: [] }, items: new Map(), reports: new Map() });
mem.reports ??= new Map(); // a dev process started before reports existed

async function getStored(id: string): Promise<Stored | undefined> {
  if (inMemory()) return mem.items.get(id);
  const [s] = await redis<string | null>([["GET", itemKey(id)]]);
  if (!s) return undefined;
  try {
    return JSON.parse(s) as Stored;
  } catch {
    return undefined;
  }
}

/** One post, for its own page. Null when it was taken down or hidden after reports. */
export async function getMemoir(id: string): Promise<Memoir | null> {
  const stored = await getStored(id);
  return stored && !stored.hidden ? strip(stored) : null;
}

/** Newest first. `before` is how many posts the reader has already seen. */
export async function listMemoirs(region: Region, before = 0, size = PAGE): Promise<{ items: Memoir[]; more: boolean }> {
  if (inMemory()) {
    const ids = mem.lists[region].slice(before, before + size + 1);
    const items = ids.slice(0, size).flatMap((id) => (mem.items.has(id) ? [strip(mem.items.get(id)!)] : []));
    return { items, more: ids.length > size };
  }
  const [ids] = await redis<string[]>([["LRANGE", listKey(region), before, before + size]]);
  const page = ids.slice(0, size);
  const raw = page.length ? (await redis<string[]>([["MGET", ...page.map(itemKey)]]))[0] : [];
  const items = raw.flatMap((s) => {
    if (!s) return [];
    try {
      return [strip(JSON.parse(s) as Stored)];
    } catch {
      return [];
    }
  });
  return { items, more: ids.length > size };
}

/**
 * Counts a report against a post, once per reporter (an IP hash). At HIDE_AFTER reports the post leaves the list and
 * its page; it stays stored, so the owner (BOARD_ADMIN_KEY) can still look at it and delete it.
 */
export async function reportMemoir(id: string, reporter: string): Promise<"counted" | "hidden" | "missing"> {
  const who = hash(`report|${reporter}`).slice(0, 16);
  const stored = await getStored(id);
  if (!stored || stored.hidden) return "missing";
  let count: number;
  if (inMemory()) {
    const set = mem.reports.get(id) ?? new Set<string>();
    set.add(who);
    mem.reports.set(id, set);
    count = set.size;
  } else {
    const [, n] = await redis<number>([
      ["SADD", `memoir:reports:${id}`, who],
      ["SCARD", `memoir:reports:${id}`],
    ]);
    count = n;
  }
  if (count < HIDE_AFTER) return "counted";
  const hidden: Stored = { ...stored, hidden: true };
  if (inMemory()) {
    mem.items.set(id, hidden);
    mem.lists[stored.region] = mem.lists[stored.region].filter((x) => x !== id);
  } else {
    await redis([
      ["SET", itemKey(id), JSON.stringify(hidden)],
      ["LREM", listKey(stored.region), 0, id],
      ["SADD", "memoirs:hidden", id],
    ]);
  }
  console.warn(`[memoirs] ${id} hidden after ${count} reports`);
  return "hidden";
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
  const stored = await getStored(id);
  if (!stored) return true; // already gone
  const admin = process.env.BOARD_ADMIN_KEY;
  if (hash(key) !== stored.keyHash && !(admin && key === admin)) return false;
  if (inMemory()) {
    mem.items.delete(id);
    mem.reports.delete(id);
    mem.lists[stored.region] = mem.lists[stored.region].filter((x) => x !== id);
  } else {
    await redis([
      ["DEL", itemKey(id)],
      ["LREM", listKey(stored.region), 0, id],
      ["DEL", `memoir:reports:${id}`],
      ["SREM", "memoirs:hidden", id],
    ]);
  }
  return true;
}
