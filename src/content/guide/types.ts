/**
 * A guide article. The body is a list of blocks; a plain string is a paragraph. Paragraphs and list items understand
 * two marks: **bold** and [text](/path) links (internal links stay inside the site).
 */
export type Block = string | { h2: string } | { h3: string } | { ul: string[] } | { ol: string[] } | { note: string } | { quote: string; by?: string };

export type GuideCategory = "era" | "turning" | "whatif" | "play";

export type Article = {
  slug: string;
  category: GuideCategory;
  title: string;
  /** One or two sentences for search results and the list. */
  description: string;
  /** First published, YYYY-MM-DD. */
  date: string;
  body: Block[];
  /** Slugs of related articles, shown at the end. */
  related: string[];
};
