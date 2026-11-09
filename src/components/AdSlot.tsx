"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { adProvider } from "@/lib/ads";

/**
 * Where ads go, in both the Korean and the English edition. Until an ad network is connected, a spot shows a
 * labelled placeholder box, and only when the address carries ?ads=preview (kept for the tab afterwards), so visitors
 * never see it. Connecting a network means drawing its unit inside AdSlot instead of the placeholder; nothing here
 * depends on the language, so the same spots serve both editions.
 *
 * Sizes are fixed per spot so the page never shifts when an ad arrives:
 *   side  the desktop column under the choice panel, 300x250
 *   feed  between the story's dates on a phone or desktop, 300x250
 *   wait  under the "writing the scene" card while the next scene loads, 320x100
 */
export type AdSpot = "side" | "feed" | "wait";

const SIZE: Record<AdSpot, { w: number; h: number }> = {
  side: { w: 300, h: 250 },
  feed: { w: 300, h: 250 },
  wait: { w: 320, h: 100 },
};

const KEY = "whatif.adsPreview";

function previewOn(): boolean {
  try {
    if (new URLSearchParams(window.location.search).get("ads") === "preview")
      sessionStorage.setItem(KEY, "1");
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Whether ad spots are drawn at all: when an ad network is registered (the 앱인토스 build), else only with the preview switch on. */
export function useAdsOn(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => !!adProvider().banner || previewOn(),
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

export function AdSlot({
  spot,
  className = "",
}: {
  spot: AdSpot;
  className?: string;
}) {
  const on = useAdsOn();
  if (!on) return null;
  const network = adProvider();
  if (network.banner) return network.bannerSpots?.includes(spot) ? <NetworkBanner spot={spot} className={className} /> : null;
  const { w, h } = SIZE[spot];
  return (
    <aside
      aria-label="Advertisement"
      className={`flex flex-col items-center gap-1 ${className}`}
    >
      <span className="text-[10px] font-medium tracking-wider text-stone-500 uppercase dark:text-stone-400">
        Advertisement
      </span>
      <div
        style={{ width: w, height: h, maxWidth: "100%" }}
        className="flex items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-100 text-xs text-stone-500 dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-400"
      >
        {spot} · {w}×{h}
      </div>
    </aside>
  );
}
