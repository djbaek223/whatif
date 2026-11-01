import type { Metadata } from "next";
import { Suspense } from "react";
import { BoardIntro, BoardShell, HallOfFame } from "@/components/BoardPages";
import { RANK_CATS, type RankCat } from "@/lib/memoirs";

export const metadata: Metadata = {
  title: "명예의 전당 · What If 회고록 게시판",
  description: "자산, 행복, 기부, 장수, 배지 부문별로 이번 주와 전체 순위를 보여 줘요.",
  alternates: { canonical: "/board/hall", languages: { ko: "/board/hall", en: "/en/board/hall" } },
};

async function Hall({ searchParams }: { searchParams: Promise<{ cat?: string; period?: string }> }) {
  const q = await searchParams;
  // Wealth is the first tab; the week is the default period.
  const cat: RankCat = RANK_CATS.includes(q.cat as RankCat) ? (q.cat as RankCat) : "wealth";
  return <HallOfFame lang="ko" cat={cat} period={q.period === "all" ? "all" : "week"} />;
}

export default function Page(props: PageProps<"/board/hall">) {
  return (
    <BoardShell lang="ko">
      <BoardIntro lang="ko" tab="hall" />
      <Suspense fallback={<p className="py-10 text-center text-sm text-stone-500">불러오는 중</p>}>
        <Hall searchParams={props.searchParams as Promise<{ cat?: string; period?: string }>} />
      </Suspense>
    </BoardShell>
  );
}
