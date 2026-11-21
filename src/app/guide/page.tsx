import type { Metadata } from "next";
import { ContentShell, GuideIndex } from "@/components/GuidePages";

export const metadata: Metadata = {
  title: "가이드 · 시대별 한국 생활상과 인생의 갈림길 · What If",
  description: "1970~2010년대 한국의 생활상, 입시·군대·취업·결혼·집 같은 인생의 갈림길, 후회와 '만약'에 관한 칼럼, What If를 즐기는 방법을 모았어요.",
  alternates: { canonical: "/guide" },
  openGraph: { type: "website", title: "What If 가이드", url: "/guide" },
};

export default function Page() {
  return (
    <ContentShell wide>
      <GuideIndex />
    </ContentShell>
  );
}
