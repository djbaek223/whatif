import type { Metadata } from "next";
import { ContentShell } from "@/components/GuidePages";
import { FaqPage } from "@/components/SitePages";

export const metadata: Metadata = {
  title: "자주 묻는 질문 · What If",
  description: "What If의 요금, 개인정보 저장, AI의 역할, MBTI 반영, 회고록 삭제 등 자주 묻는 질문에 답했어요.",
  alternates: { canonical: "/faq" },
};

export default function Page() {
  return (
    <ContentShell>
      <FaqPage />
    </ContentShell>
  );
}
