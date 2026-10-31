import type { MetadataRoute } from "next";

const site = "https://whatif.damoai.net";
const languages = { ko: `${site}/`, en: `${site}/en`, "x-default": `${site}/` };

// Public pages only. Play state lives in the browser and the memoir board opens inside the app, so neither has its own URL.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${site}/`, changeFrequency: "weekly", priority: 1, alternates: { languages } },
    { url: `${site}/en`, changeFrequency: "weekly", priority: 0.9, alternates: { languages } },
  ];
}
