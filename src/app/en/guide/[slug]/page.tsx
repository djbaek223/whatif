import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentShell, GuideArticle } from "@/components/GuidePages";
import { articleBySlug, articlesIn, pairOf } from "@/content/guide";

export function generateStaticParams() {
  return articlesIn("en").map((a) => ({ slug: a.slug }));
}

export async function generateMetadata(props: PageProps<"/en/guide/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const a = articleBySlug(slug, "en");
  if (!a) return { title: "Guide · What If" };
  const ko = pairOf(a, "en");
  return {
    title: `${a.title} · What If guide`,
    description: a.description,
    alternates: { canonical: `/en/guide/${a.slug}`, languages: { en: `/en/guide/${a.slug}`, ...(ko ? { ko: `/guide/${ko}` } : {}) } },
    openGraph: { type: "article", locale: "en_US", title: a.title, description: a.description, url: `/en/guide/${a.slug}`, publishedTime: a.date },
  };
}

export default async function Page(props: PageProps<"/en/guide/[slug]">) {
  const { slug } = await props.params;
  const a = articleBySlug(slug, "en");
  if (!a) notFound();
  return (
    <ContentShell lang="en">
      <GuideArticle a={a} lang="en" />
    </ContentShell>
  );
}
