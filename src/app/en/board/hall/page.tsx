import type { Metadata } from "next";
import { Suspense } from "react";
import { BoardIntro, BoardShell, HallOfFame } from "@/components/BoardPages";
import { RANK_CATS, type RankCat } from "@/lib/memoirs";

export const metadata: Metadata = {
  title: "Hall of fame · What If memoir board",
  description: "The top lives this week and of all time, by wealth, happiness, giving, longevity and badges.",
  alternates: { canonical: "/en/board/hall", languages: { ko: "/board/hall", en: "/en/board/hall" } },
};

async function Hall({ searchParams }: { searchParams: Promise<{ cat?: string; period?: string }> }) {
  const q = await searchParams;
  // Wealth is the first tab; the week is the default period.
  const cat: RankCat = RANK_CATS.includes(q.cat as RankCat) ? (q.cat as RankCat) : "wealth";
  return <HallOfFame lang="en" cat={cat} period={q.period === "all" ? "all" : "week"} />;
}

export default function Page(props: PageProps<"/en/board/hall">) {
  return (
    <BoardShell lang="en">
      <BoardIntro lang="en" tab="hall" />
      <Suspense fallback={<p className="py-10 text-center text-sm text-stone-500">Loading</p>}>
        <Hall searchParams={props.searchParams as Promise<{ cat?: string; period?: string }>} />
      </Suspense>
    </BoardShell>
  );
}
