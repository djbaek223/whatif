import Script from "next/script";
import { adsenseClient } from "@/lib/ads";

/**
 * The AdSense loader, placed only on pages with reading content (the guide, about, how to play, FAQ). Game screens
 * never load it, so Google's ads (including Auto ads) cannot appear on screens without publisher content. Links from
 * these pages into the game are plain <a> links, so the script does not ride along into the game by client navigation.
 */
export function ContentAds() {
  const client = adsenseClient();
  if (!client) return null;
  return <Script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`} crossOrigin="anonymous" strategy="afterInteractive" />;
}
