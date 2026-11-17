import type { Metadata } from "next";
import { BoardShell } from "@/components/BoardPages";
import { InfoBody } from "@/components/InfoPages";

export const metadata: Metadata = {
  title: "서비스 이용약관 · What If",
  description: "What If를 이용할 때의 약속과 책임을 정리했어요.",
  alternates: { canonical: "/terms", languages: { ko: "/terms", en: "/en/terms" } },
};

export default function Page() {
  return (
    <BoardShell lang="ko">
      <InfoBody lang="ko" page="terms" />
    </BoardShell>
  );
}
