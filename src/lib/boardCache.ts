import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getMemoir, listMemoirs, popularMemoirs, topRanks, type Period, type RankCat } from "./memoirs";
import type { Region } from "./region";

// The board's reads, cached for a minute and dropped at once when a post is added, deleted or hidden
// (revalidateTag(BOARD_TAG) in the memoirs routes). Likes don't drop the cache: a count up to a minute old is fine.
export const BOARD_TAG = "memoirs";

export async function cachedList(region: Region, before = 0, size = 10) {
  "use cache";
  cacheTag(BOARD_TAG);
  cacheLife({ stale: 30, revalidate: 60, expire: 3600 });
  return listMemoirs(region, before, size);
}

export async function cachedPost(id: string) {
  "use cache";
  cacheTag(BOARD_TAG);
  cacheLife({ stale: 30, revalidate: 60, expire: 86400 });
  return getMemoir(id);
}

export async function cachedTop(region: Region, cat: RankCat, period: Period) {
  "use cache";
  cacheTag(BOARD_TAG);
  cacheLife({ stale: 30, revalidate: 60, expire: 3600 });
  return topRanks(region, cat, period, 10);
}

/** What the start screen shows: the three most liked posts once there are enough likes, else the three newest. */
export async function cachedHome(region: Region) {
  "use cache";
  cacheTag(BOARD_TAG);
  cacheLife({ stale: 30, revalidate: 60, expire: 3600 });
  const popular = await popularMemoirs(region, 3, 3);
  return popular ? { items: popular, popular: true } : { items: (await listMemoirs(region, 0, 3)).items, popular: false };
}
