import type { Metadata } from "next";
import { Suspense } from "react";
import { BoardIntro, BoardList, BoardShell } from "@/components/BoardPages";

export const metadata: Metadata = {
  title: "회고록 게시판 · What If",
  description: "다른 선택을 하고 끝까지 살아 본 사람들의 회고록과 인생 기록. 자산, 기부, 행복, 배지를 비교해 보세요.",
  alternates: { canonical: "/board", languages: { ko: "/board", en: "/en/board" } },
};

async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Math.min(1000, Number((await searchParams).page) || 1));
  return <BoardList lang="ko" page={page} />;
}

export default function Board(props: PageProps<"/board">) {
  return (
    <BoardShell lang="ko">
      <BoardIntro lang="ko" />
      <Suspense fallback={<p className="py-10 text-center text-sm text-stone-500">불러오는 중</p>}>
        <Page searchParams={props.searchParams as Promise<{ page?: string }>} />
      </Suspense>
    </BoardShell>
  );
}
