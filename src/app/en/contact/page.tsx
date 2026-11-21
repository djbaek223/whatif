import type { Metadata } from "next";
import { ContentShell } from "@/components/GuidePages";
import { ContactPage } from "@/components/SitePages";

export const metadata: Metadata = {
  title: "Contact · What If",
  description: "Send a bug report, an idea, a request to take down a post or a business inquiry.",
  alternates: { canonical: "/en/contact", languages: { ko: "/contact", en: "/en/contact" } },
};

export default function Page() {
  return (
    <ContentShell lang="en">
      <ContactPage lang="en" />
    </ContentShell>
  );
}
