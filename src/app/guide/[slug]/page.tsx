import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentShell, GuideArticle } from "@/components/GuidePages";
import { ARTICLES, articleBySlug, pairOf } from "@/content/guide";

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata(props: PageProps<"/guide/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const a = articleBySlug(slug);
  if (!a) return { title: "가이드 · What If" };
  const en = pairOf(a, "ko");
  return {
    title: `${a.title} · What If 가이드`,
    description: a.description,
    alternates: { canonical: `/guide/${a.slug}`, languages: { ko: `/guide/${a.slug}`, ...(en ? { en: `/en/guide/${en}` } : {}) } },
    openGraph: { type: "article", title: a.title, description: a.description, url: `/guide/${a.slug}`, publishedTime: a.date },
  };
}

export default async function Page(props: PageProps<"/guide/[slug]">) {
  const { slug } = await props.params;
  const a = articleBySlug(slug);
  if (!a) notFound();
  return (
    <ContentShell>
      <GuideArticle a={a} />
    </ContentShell>
  );
}
