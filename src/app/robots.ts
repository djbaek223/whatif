import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: "https://whatif.damoai.net/sitemap.xml",
    host: "https://whatif.damoai.net",
  };
}
