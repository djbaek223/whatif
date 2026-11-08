"use client";

import { useSyncExternalStore } from "react";
import { lang } from "@/lib/region";

/**
 * Where ads go. The English edition only (the Korean edition shows none). Until an ad network is connected, a spot
 * shows a labelled placeholder box, and only when the address carries ?ads=preview (kept for the tab afterwards), so
 * visitors never see it. Connecting a network means drawing its unit inside AdBox instead of the placeholder.
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

/** Whether ad spots are drawn at all: the English edition, with the preview switch on for now. */
export function useAdsOn(): boolean {
  const preview = useSyncExternalStore(
    () => () => {},
    previewOn,
    () => false,
  );
  return preview && lang() === "en";
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
