import type { Metadata } from "next";
import { ContentShell, GuideIndex } from "@/components/GuidePages";

export const metadata: Metadata = {
  title: "Guide · American life by decade and life's turning points · What If",
  description: "Everyday American life from the 1970s to the 2010s, the forks most people meet (college, the military, a first job, marriage, a house), columns on regret and 'what if', and how to play What If.",
  alternates: { canonical: "/en/guide", languages: { ko: "/guide", en: "/en/guide" } },
  openGraph: { type: "website", locale: "en_US", title: "The What If guide", url: "/en/guide" },
};

export default function Page() {
  return (
    <ContentShell wide lang="en">
      <GuideIndex lang="en" />
    </ContentShell>
  );
}
