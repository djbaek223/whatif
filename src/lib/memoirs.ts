import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { Region } from "./region";
import type { LifeRecords } from "./records";

// Published memoirs live in Redis through Upstash's REST API (https://upstash.com/docs/redis/features/restapi),
// which Vercel's Upstash for Redis integration sets up as KV_REST_API_URL / KV_REST_API_TOKEN.
// Without them, `next dev` runs the same commands against a small in-memory stand-in (memRedis below), so the board
// can be tried locally; a production build says it isn't set up.
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
  likes?: number; // filled in when read, from the likes set
}

type Stored = Omit<Memoir, "likes"> & { keyHash: string; hidden?: boolean };

/** Reports from different people that take a post off the board until the owner looks at it. */
export const HIDE_AFTER = 3;

export const PAGE = 10;

// ── Hall of fame ───────────────────────────────────────
/** The ranked categories, in the order the hall of fame shows them (wealth first, as Dongjun chose). */
export const RANK_CATS = ["wealth", "happiness", "giving", "longevity", "badges"] as const;
export type RankCat = (typeof RANK_CATS)[number];
export type Period = "week" | "all";

/** A post's number in a category; null leaves it out of that ranking (no records, or nothing given). */
export function rankValue(cat: RankCat, m: { records?: LifeRecords; deathAge: number }): number | null {
  const r = m.records;
  if (!r) return null;
  switch (cat) {
    case "wealth":
      return r.finalWealth;
    case "happiness":
      return r.avgHappiness;
    case "giving":
      return r.donated > 0 ? r.donated : null;
    case "longevity":
      return m.deathAge;
    case "badges":
      return r.badges.length;
  }
}

/** The Monday (KST) of the week a time falls in, e.g. "2026-10-26": weekly rankings start over every Monday. */
export function weekOf(iso: string | number = Date.now()): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3600_000);
  const back = (d.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - back)).toISOString().slice(0, 10);
}

const WEEK_TTL = 40 * 86400; // a weekly ranking is kept a little past its week
const listKey = (r: Region) => `memoirs:${r}`;
const itemKey = (id: string) => `memoir:${id}`;
const rankKey = (r: Region, cat: RankCat, week?: string) => (week ? `rank:${r}:${cat}:${week}` : `rank:${r}:${cat}`);
const likesKey = (r: Region) => `likes:${r}`;
const likersKey = (id: string) => `memoir:likes:${id}`;
const hash = (s: string) => createHash("sha256").update(s).digest("hex");

function strip(stored: Stored, likes?: number): Memoir {
  const m: Partial<Stored> & { likes?: number } = { ...stored };
  delete m.keyHash;
  delete m.hidden;
  if (likes) m.likes = likes;
  return m as Memoir;
}

type Arg = string | number;

async function redis<T>(commands: Arg[][]): Promise<T[]> {
  if (inMemory()) return commands.map((c) => memRedis(c)) as T[];
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

// ── Development stand-in ───────────────────────────────
// The handful of Redis commands this file uses, answered the way Upstash's REST API answers them. One process, gone
// on restart.
type Val = string | string[] | Set<string> | Map<string, number>;
const holder = globalThis as { __memRedis?: { data: Map<string, Val>; expires: Map<string, number> } };
const store = (holder.__memRedis ??= { data: new Map(), expires: new Map() });

function memRedis(cmd: Arg[]): unknown {
  const [name, ...rest] = cmd;
  const a = rest.map(String);
  const now = Date.now();
  for (const [k, t] of store.expires) {
    if (t > now) continue;
    store.data.delete(k);
    store.expires.delete(k);
  }
  const d = store.data;
  const list = (k: string) => (d.get(k) as string[] | undefined) ?? [];
  const set = (k: string) => (d.get(k) as Set<string> | undefined) ?? new Set<string>();
  const zset = (k: string) => (d.get(k) as Map<string, number> | undefined) ?? new Map<string, number>();
  const bound = (s: string, lo: boolean) => (s === "+inf" ? Infinity : s === "-inf" ? -Infinity : s.startsWith("(") ? Number(s.slice(1)) + (lo ? 1e-9 : -1e-9) : Number(s));
  const desc = (k: string) => [...zset(k)].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? 1 : -1));
  switch (String(name).toUpperCase()) {
    case "GET":
      return (d.get(a[0]) as string | undefined) ?? null;
    case "SET":
      d.set(a[0], a[1]);
      return "OK";
    case "MGET":
      return a.map((k) => (d.get(k) as string | undefined) ?? null);
    case "DEL":
      return a.filter((k) => d.delete(k)).length;
    case "INCR": {
      const n = Number(d.get(a[0]) ?? 0) + 1;
      d.set(a[0], String(n));
      return n;
    }
    case "EXPIRE":
      if (!a[2] || !store.expires.has(a[0])) store.expires.set(a[0], now + Number(a[1]) * 1000);
      return 1;
    case "LPUSH":
      d.set(a[0], [...a.slice(1).reverse(), ...list(a[0])]);
      return list(a[0]).length;
    case "LRANGE":
      return list(a[0]).slice(Number(a[1]), Number(a[2]) + 1);
    case "LREM":
      d.set(a[0], list(a[0]).filter((x) => x !== a[2]));
      return 1;
    case "SADD": {
      const s = set(a[0]);
      a.slice(1).forEach((x) => s.add(x));
      d.set(a[0], s);
      return s.size;
    }
    case "SREM": {
      const s = set(a[0]);
      a.slice(1).forEach((x) => s.delete(x));
      d.set(a[0], s);
      return 1;
    }
    case "SCARD":
      return set(a[0]).size;
    case "ZADD": {
      const z = zset(a[0]);
      for (let i = 1; i < a.length; i += 2) z.set(a[i + 1], Number(a[i]));
      d.set(a[0], z);
      return 1;
    }
    case "ZREM": {
      const z = zset(a[0]);
      a.slice(1).forEach((x) => z.delete(x));
      d.set(a[0], z);
      return 1;
    }
    case "ZCARD":
      return zset(a[0]).size;
    case "ZSCORE": {
      const v = zset(a[0]).get(a[1]);
      return v === undefined ? null : String(v);
    }
    case "ZCOUNT": {
      const lo = bound(a[1], true);
      const hi = bound(a[2], false);
      return [...zset(a[0]).values()].filter((v) => v >= lo && v <= hi).length;
    }
    case "ZREVRANGE": {
      const rows = desc(a[0]).slice(Number(a[1]), Number(a[2]) + 1);
      return a[3] === "WITHSCORES" ? rows.flatMap(([m, s]) => [m, String(s)]) : rows.map(([m]) => m);
    }
    case "ZREVRANGEBYSCORE": {
      const hi = bound(a[1], false);
      const lo = bound(a[2], true);
      const rows = desc(a[0]).filter(([, s]) => s <= hi && s >= lo);
      const at = a.indexOf("LIMIT");
      return (at >= 0 ? rows.slice(Number(a[at + 1]), Number(a[at + 1]) + Number(a[at + 2])) : rows).map(([m]) => m);
    }
    default:
      throw new Error(`[memoirs] memRedis: ${name} not supported`);
  }
}

// ── Reading ────────────────────────────────────────────

async function getStored(id: string): Promise<Stored | undefined> {
  const [s] = await redis<string | null>([["GET", itemKey(id)]]);
  if (!s) return undefined;
  try {
    return JSON.parse(s) as Stored;
  } catch {
    return undefined;
  }
}

/** Posts by id, in that order, with their likes; gone or hidden ones are left out. */
async function readPosts(ids: string[]): Promise<Memoir[]> {
  if (!ids.length) return [];
  const [raw] = await redis<(string | null)[]>([["MGET", ...ids.map(itemKey)]]);
  const posts = raw.flatMap((s) => {
    if (!s) return [];
    try {
      const p = JSON.parse(s) as Stored;
      return p.hidden ? [] : [p];
    } catch {
      return [];
    }
  });
  const likes = posts.length ? await redis<string | null>(posts.map((p) => ["ZSCORE", likesKey(p.region), p.id])) : [];
  return posts.map((p, i) => strip(p, Number(likes[i] ?? 0)));
}

/** One post, for its own page. Null when it was taken down or hidden after reports. */
export async function getMemoir(id: string): Promise<Memoir | null> {
  const [post] = await readPosts([id]);
  return post ?? null;
}

/** Newest first. `before` is how many posts the reader has already seen. */
export async function listMemoirs(region: Region, before = 0, size = PAGE): Promise<{ items: Memoir[]; more: boolean }> {
  const [ids] = await redis<string[]>([["LRANGE", listKey(region), before, before + size]]);
  return { items: await readPosts(ids.slice(0, size)), more: ids.length > size };
}

/** The most liked posts, once at least `n` of them have `min` likes or more; null before that (show the newest instead). */
export async function popularMemoirs(region: Region, n = 3, min = 3): Promise<Memoir[] | null> {
  const [ids] = await redis<string[]>([["ZREVRANGEBYSCORE", likesKey(region), "+inf", min, "LIMIT", 0, n]]);
  if (ids.length < n) return null;
  const posts = await readPosts(ids);
  return posts.length >= n ? posts : null;
}

export interface Ranked {
  rank: number;
  value: number;
  post: Memoir;
}

/**
 * Posts from before the rankings existed (memoir board step 1) go into them once, the first time a ranking is read.
 * A marker key makes it run once per board, whichever server instance gets there first.
 */
const backfilled = new Set<Region>();
async function backfillRanks(region: Region): Promise<void> {
  if (backfilled.has(region)) return;
  backfilled.add(region);
  const [first] = await redis<string | null>([["SET", `rank:backfilled:${region}`, "1", "NX"]]);
  if (first !== "OK" || inMemory()) return;
  const [ids] = await redis<string[]>([["LRANGE", listKey(region), 0, -1]]);
  for (let i = 0; i < ids.length; i += 100) {
    const [raw] = await redis<(string | null)[]>([["MGET", ...ids.slice(i, i + 100).map(itemKey)]]);
    const cmds = raw.flatMap((s) => {
      if (!s) return [];
      try {
        const p = JSON.parse(s) as Stored;
        return p.hidden ? [] : rankCommands(p, true);
      } catch {
        return [];
      }
    });
    if (cmds.length) await redis(cmds);
  }
}

/** The top of one category's ranking, this week (KST, from Monday) or of all time. */
export async function topRanks(region: Region, cat: RankCat, period: Period, n = 10): Promise<Ranked[]> {
  await backfillRanks(region);
  const key = rankKey(region, cat, period === "week" ? weekOf() : undefined);
  const [flat] = await redis<string[]>([["ZREVRANGE", key, 0, n - 1, "WITHSCORES"]]);
  const rows: { id: string; value: number }[] = [];
  for (let i = 0; i < flat.length; i += 2) rows.push({ id: flat[i], value: Number(flat[i + 1]) });
  const posts = new Map((await readPosts(rows.map((r) => r.id))).map((p) => [p.id, p]));
  // Equal numbers share a rank (1, 2, 2, 4).
  const out: Ranked[] = [];
  rows.forEach((r, i) => {
    const post = posts.get(r.id);
    if (!post) return;
    const rank = i > 0 && rows[i - 1].value === r.value && out.length ? out[out.length - 1].rank : i + 1;
    out.push({ rank, value: r.value, post });
  });
  return out;
}

export interface Standing {
  above: number; // posts with a higher number
  total: number; // posts in the ranking
}

/** Where these numbers would stand among every post on the board, for each category that has one. */
export async function standings(region: Region, values: Partial<Record<RankCat, number>>): Promise<Partial<Record<RankCat, Standing>>> {
  const cats = RANK_CATS.filter((c) => typeof values[c] === "number" && Number.isFinite(values[c]));
  if (!cats.length) return {};
  await backfillRanks(region);
  const res = await redis<number>(cats.flatMap((c) => [["ZCOUNT", rankKey(region, c), `(${values[c]}`, "+inf"], ["ZCARD", rankKey(region, c)]]));
  return Object.fromEntries(cats.map((c, i) => [c, { above: Number(res[i * 2]), total: Number(res[i * 2 + 1]) }]));
}

// ── Writing ────────────────────────────────────────────

/**
 * Counts one hit against a limit shared by every server instance: at most `limit` in `seconds` per `who`.
 * Fails open when the store can't be reached, so a Redis hiccup never blocks a post.
 */
export async function allowHit(bucket: string, who: string, limit: number, seconds: number): Promise<boolean> {
  const key = `rl:${bucket}:${hash(who).slice(0, 16)}`;
  try {
    const [n] = await redis<number>([
      ["INCR", key],
      ["EXPIRE", key, seconds, "NX"],
    ]);
    return Number(n) <= limit;
  } catch {
    return true;
  }
}

function rankCommands(p: Stored, add: boolean): Arg[][] {
  const week = weekOf(p.createdAt);
  return RANK_CATS.flatMap((cat): Arg[][] => {
    const value = rankValue(cat, p);
    const keys = [rankKey(p.region, cat), rankKey(p.region, cat, week)];
    if (!add) return keys.map((k) => ["ZREM", k, p.id]);
    if (value === null) return [];
    return [["ZADD", keys[0], value, p.id], ["ZADD", keys[1], value, p.id], ["EXPIRE", keys[1], WEEK_TTL]];
  });
}

/** Saves a post and returns it with the secret that lets this browser take it down later. */
export async function publishMemoir(m: Omit<Memoir, "id" | "createdAt" | "likes">): Promise<{ memoir: Memoir; deleteKey: string }> {
  const id = randomBytes(9).toString("base64url");
  const deleteKey = randomBytes(18).toString("base64url");
  const stored: Stored = { ...m, id, createdAt: new Date().toISOString(), keyHash: hash(deleteKey) };
  await redis([["SET", itemKey(id), JSON.stringify(stored)], ["LPUSH", listKey(m.region), id], ...rankCommands(stored, true)]);
  return { memoir: strip(stored), deleteKey };
}

/** Takes a post off the list, the rankings and the likes; `drop` deletes it, otherwise it is kept marked hidden. */
function removeCommands(p: Stored, drop: boolean): Arg[][] {
  return [
    drop ? ["DEL", itemKey(p.id)] : ["SET", itemKey(p.id), JSON.stringify({ ...p, hidden: true })],
    ["LREM", listKey(p.region), 0, p.id],
    ["ZREM", likesKey(p.region), p.id],
    ...rankCommands(p, false),
    ...(drop
      ? [
          ["DEL", `memoir:reports:${p.id}`],
          ["DEL", likersKey(p.id)],
          ["SREM", "memoirs:hidden", p.id],
        ]
      : [["SADD", "memoirs:hidden", p.id]]),
  ];
}

/**
 * Counts a report against a post, once per reporter (an IP hash). At HIDE_AFTER reports the post leaves the list,
 * the rankings and its page; it stays stored, so the owner (BOARD_ADMIN_KEY) can still look at it and delete it.
 */
export async function reportMemoir(id: string, reporter: string): Promise<"counted" | "hidden" | "missing"> {
  const who = hash(`report|${reporter}`).slice(0, 16);
  const stored = await getStored(id);
  if (!stored || stored.hidden) return "missing";
  const [, count] = await redis<number>([
    ["SADD", `memoir:reports:${id}`, who],
    ["SCARD", `memoir:reports:${id}`],
  ]);
  if (Number(count) < HIDE_AFTER) return "counted";
  await redis(removeCommands(stored, false));
  console.warn(`[memoirs] ${id} hidden after ${count} reports`);
  return "hidden";
}

/** Takes a post down with the writer's secret, or with BOARD_ADMIN_KEY for the site owner. False if neither matches. */
export async function deleteMemoir(id: string, key: string): Promise<boolean> {
  const stored = await getStored(id);
  if (!stored) return true; // already gone
  const admin = process.env.BOARD_ADMIN_KEY;
  if (hash(key) !== stored.keyHash && !(admin && key === admin)) return false;
  await redis(removeCommands(stored, true));
  return true;
}

/**
 * Adds or takes back one like. A liker is the browser's own random id, hashed; the count is kept in a sorted set per
 * board so the most liked posts can be read in one call. Null when the post is gone.
 */
export async function likeMemoir(id: string, liker: string, on: boolean): Promise<number | null> {
  const stored = await getStored(id);
  if (!stored || stored.hidden) return null;
  const who = hash(`like|${liker}`).slice(0, 16);
  const [, count] = await redis<number>([[on ? "SADD" : "SREM", likersKey(id), who], ["SCARD", likersKey(id)]]);
  await redis([["ZADD", likesKey(stored.region), Number(count), id]]);
  return Number(count);
}
