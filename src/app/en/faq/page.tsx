import type { Metadata } from "next";
import { ContentShell } from "@/components/GuidePages";
import { FaqPage } from "@/components/SitePages";

export const metadata: Metadata = {
  title: "FAQ · What If",
  description: "Answers about What If: price and ads, where your information is kept, what the AI does, how personality counts, deleting a memoir and more.",
  alternates: { canonical: "/en/faq", languages: { ko: "/faq", en: "/en/faq" } },
};

export default function Page() {
  return (
    <ContentShell lang="en">
      <FaqPage lang="en" />
    </ContentShell>
  );
}
