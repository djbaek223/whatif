import type { Metadata } from "next";
import { Suspense } from "react";
import { BoardIntro, BoardList, BoardShell } from "@/components/BoardPages";

export const metadata: Metadata = {
  title: "Memoir board · What If",
  description: "Memoirs and life records from people who made a different choice and lived it to the end. Compare wealth, giving, happiness and badges.",
  alternates: { canonical: "/en/board", languages: { ko: "/board", en: "/en/board" } },
};

async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Math.min(1000, Number((await searchParams).page) || 1));
  return <BoardList lang="en" page={page} />;
}

export default function Board(props: PageProps<"/en/board">) {
  return (
    <BoardShell lang="en">
      <BoardIntro lang="en" tab="latest" />
      <Suspense fallback={<p className="py-10 text-center text-sm text-stone-500">Loading</p>}>
        <Page searchParams={props.searchParams as Promise<{ page?: string }>} />
      </Suspense>
    </BoardShell>
  );
}
