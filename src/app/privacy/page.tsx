import type { Metadata } from "next";
import { BoardShell } from "@/components/BoardPages";
import { InfoBody } from "@/components/InfoPages";

export const metadata: Metadata = {
  title: "개인정보 처리방침 · What If",
  description: "What If가 어떤 정보를 어디에 저장하고 어떻게 쓰는지 알려 드려요.",
  alternates: { canonical: "/privacy", languages: { ko: "/privacy", en: "/en/privacy" } },
};

export default function Page() {
  return (
    <BoardShell lang="ko">
      <InfoBody lang="ko" page="privacy" />
    </BoardShell>
  );
}
