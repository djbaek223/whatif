import type { Metadata } from "next";
import Game from "@/components/Game";

const title = "What If · Live the life you didn't choose";
const description = "Go back to a moment in your past, make a different choice, and live that life to the very end. An AI life simulator.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/en", languages: { ko: "/", en: "/en" } },
  openGraph: { type: "website", locale: "en_US", siteName: "What If", title, description, url: "/en" },
  twitter: { card: "summary_large_image", title, description },
};

export default function English() {
  return <Game initialRegion="us" />;
}
