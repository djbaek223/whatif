import { execSync } from "node:child_process";
import type { NextConfig } from "next";
import pkg from "./package.json";
import { OLD_HOSTS, SITE_URL } from "./src/lib/site";

// Shown in the play menu's 서비스 소개: package version, the commit it was built from, and the build day (KST).
function commit() {
  const vercel = process.env.VERCEL_GIT_COMMIT_SHA;
  if (vercel) return vercel.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
}
const builtOn = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_APP_COMMIT: commit(),
    NEXT_PUBLIC_APP_BUILT: builtOn,
  },
  // The service moved from whatif.damoai.net to whatif.host; old links keep working and search engines follow the move.
  async redirects() {
    return OLD_HOSTS.map((value) => ({ source: "/:path*", has: [{ type: "host" as const, value }], destination: `${SITE_URL}/:path*`, permanent: true }));
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
