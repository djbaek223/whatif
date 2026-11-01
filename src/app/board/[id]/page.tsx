import type { Metadata } from "next";
import { Suspense } from "react";
import { BoardPost, BoardShell } from "@/components/BoardPages";
import { cachedPost } from "@/lib/boardCache";
import { boardConfigured } from "@/lib/memoirs";

export async function generateMetadata(props: PageProps<"/board/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const post = boardConfigured() ? await cachedPost(id).catch(() => null) : null;
  if (!post) return { title: "회고록 게시판 · What If", robots: { index: false } };
  const description = post.epitaph || post.memoir.slice(0, 120);
  return {
    title: `${post.title} · What If 회고록`,
    description,
    alternates: { canonical: `/board/${id}` },
    openGraph: { type: "article", title: post.title, description, url: `/board/${id}` },
  };
}

async function Post({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BoardPost lang="ko" id={id} />;
}

export default function Page(props: PageProps<"/board/[id]">) {
  return (
    <BoardShell lang="ko">
      <Suspense fallback={<p className="py-10 text-center text-sm text-stone-500">불러오는 중</p>}>
        <Post params={props.params} />
      </Suspense>
    </BoardShell>
  );
}
