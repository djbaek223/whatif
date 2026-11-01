import type { Metadata } from "next";
import { Suspense } from "react";
import { BoardPost, BoardShell } from "@/components/BoardPages";
import { cachedPost } from "@/lib/boardCache";
import { boardConfigured } from "@/lib/memoirs";

export async function generateMetadata(props: PageProps<"/en/board/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const post = boardConfigured() ? await cachedPost(id).catch(() => null) : null;
  if (!post) return { title: "Memoir board · What If", robots: { index: false } };
  const description = post.epitaph || post.memoir.slice(0, 160);
  return {
    title: `${post.title} · What If memoir`,
    description,
    alternates: { canonical: `/en/board/${id}` },
    openGraph: { type: "article", locale: "en_US", title: post.title, description, url: `/en/board/${id}` },
  };
}

async function Post({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BoardPost lang="en" id={id} />;
}

export default function Page(props: PageProps<"/en/board/[id]">) {
  return (
    <BoardShell lang="en">
      <Suspense fallback={<p className="py-10 text-center text-sm text-stone-500">Loading</p>}>
        <Post params={props.params} />
      </Suspense>
    </BoardShell>
  );
}
