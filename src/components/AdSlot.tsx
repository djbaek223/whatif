"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { adProvider } from "@/lib/ads";

/**
 * Ad spots inside the game. On the website these are never drawn: AdSense policy wants ads only on pages with real
 * reading content, so the game screens (title, onboarding, waiting, play, ending) carry no ads at all, and the AdSense
 * loader is loaded only by the content pages (ContentAds in src/components/ContentAds.tsx).
 *
 * The 앱인토스 build registers its own network (Toss ads, toss/src/tossAds.ts); only then does the "feed" spot draw a
 * banner, in a box of fixed size so the page never shifts when the ad arrives.
 *   feed  between the story's dates, 300x250
 */
export type AdSpot = "feed";

const SIZE: Record<AdSpot, { w: number; h: number }> = {
  feed: { w: 300, h: 250 },
};

/** Whether in-game ad spots are drawn at all: only when an in-app ad network is registered (the 앱인토스 build). */
export function useAdsOn(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => !!adProvider().banner,
    () => false,
  );
}

/** A real banner from the registered network, in a box of the spot's size so the page does not shift. */
function NetworkBanner({ spot, className }: { spot: AdSpot; className: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const banner = adProvider().banner;
    if (!el || !banner) return;
    try {
      return banner(spot, el);
    } catch {
      return undefined;
    }
  }, [spot]);
  const { w, h } = SIZE[spot];
  return <div ref={ref} aria-label="광고" className={className} style={{ width: "100%", maxWidth: w, minHeight: h, marginInline: "auto" }} />;
}

export function AdSlot({ spot, className = "" }: { spot: AdSpot; className?: string }) {
  const on = useAdsOn();
  const network = adProvider();
  if (!on || !network.banner || !network.bannerSpots?.includes(spot)) return null;
  return <NetworkBanner spot={spot} className={className} />;
}
