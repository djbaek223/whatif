import type { Metadata } from "next";
import { ContentShell } from "@/components/GuidePages";
import { HowToPlay } from "@/components/SitePages";

export const metadata: Metadata = {
  title: "이용 방법 · What If",
  description: "What If를 처음 시작하는 방법부터 기본 정보 입력, 돌아갈 순간 고르기, 갈림길 선택, 엔딩과 회고록까지 순서대로 안내해요.",
  alternates: { canonical: "/how-to-play" },
};

export default function Page() {
  return (
    <ContentShell>
      <HowToPlay />
    </ContentShell>
  );
}
