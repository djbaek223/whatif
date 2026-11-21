import type { Metadata } from "next";
import { ContentShell } from "@/components/GuidePages";
import { ContactPage } from "@/components/SitePages";

export const metadata: Metadata = {
  title: "문의 · What If",
  description: "버그 제보, 기능 제안, 게시물 삭제 요청, 제휴 문의를 남길 수 있어요.",
  alternates: { canonical: "/contact", languages: { ko: "/contact", en: "/en/contact" } },
};

export default function Page() {
  return (
    <ContentShell>
      <ContactPage />
    </ContentShell>
  );
}
