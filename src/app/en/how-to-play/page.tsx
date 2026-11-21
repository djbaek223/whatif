import type { Metadata } from "next";
import { ContentShell } from "@/components/GuidePages";
import { HowToPlay } from "@/components/SitePages";

export const metadata: Metadata = {
  title: "How to play · What If",
  description: "How What If works, step by step: picking how to start, the basics, the moment to go back to, letting time pass, choosing at the forks, and the ending and memoir.",
  alternates: { canonical: "/en/how-to-play", languages: { ko: "/how-to-play", en: "/en/how-to-play" } },
};

export default function Page() {
  return (
    <ContentShell lang="en">
      <HowToPlay lang="en" />
    </ContentShell>
  );
}
