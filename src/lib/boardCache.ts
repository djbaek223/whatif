import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getMemoir, listMemoirs } from "./memoirs";
import type { Region } from "./region";

// The board's reads, cached for a minute and dropped at once when a post is added, deleted or hidden
// (revalidateTag(BOARD_TAG) in the memoirs routes). The board pages and the main screen's preview all read through here.
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
  cacheLife({ stale: 30, revalidate: 300, expire: 86400 });
  return getMemoir(id);
}
