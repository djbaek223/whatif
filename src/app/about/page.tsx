import type { Metadata } from "next";
import { BoardShell } from "@/components/BoardPages";
import { InfoBody } from "@/components/InfoPages";

export const metadata: Metadata = {
  title: "What If 소개 · What If",
  description: "그때 다른 선택을 했다면? 과거의 한 순간으로 돌아가 다시 고르고 그 인생을 끝까지 살아보는 AI 인생 시뮬레이터 What If를 소개해요.",
  alternates: { canonical: "/about", languages: { ko: "/about", en: "/en/about" } },
};

export default function Page() {
  return (
    <BoardShell lang="ko">
      <InfoBody lang="ko" page="about" />
    </BoardShell>
  );
}
