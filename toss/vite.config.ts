import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import pkg from "../package.json";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

function commit() {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
}

// The game code in ../src reads a few build-time values as process.env.NEXT_PUBLIC_* (Next.js inlines them on the
// website). Here Vite inlines the same names, so the shared code needs no Toss-only branches to read them.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, here("."), "");
  const apiBase = env.WHATIF_API_BASE ?? "https://whatif.host";
  const values: Record<string, string> = {
    NODE_ENV: mode === "production" ? "production" : "development",
    NEXT_PUBLIC_PLATFORM: "toss",
    NEXT_PUBLIC_API_BASE: apiBase,
    NEXT_PUBLIC_WHATIF_HYBRID: env.NEXT_PUBLIC_WHATIF_HYBRID ?? "",
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_APP_COMMIT: commit(),
    NEXT_PUBLIC_APP_BUILT: new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10),
    NEXT_PUBLIC_ADSENSE_CLIENT: "",
    // 게임물 등급 shown on the first screen, e.g. 전체이용가.
    NEXT_PUBLIC_GAME_RATING: env.WHATIF_GAME_RATING ?? "",
  };
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [
        { find: /^@\//, replacement: here("../src/") },
        // Pages of the website are not part of the mini-app; links in shared components become plain in-app links.
        { find: /^next\/link$/, replacement: here("./src/shims/next-link.tsx") },
      ],
      // ../src sits outside this folder; keep one React for both.
      dedupe: ["react", "react-dom"],
    },
    define: {
      ...Object.fromEntries(Object.entries(values).map(([k, v]) => [`process.env.${k}`, JSON.stringify(v)])),
    },
    server: { port: 5173, fs: { allow: [here("..")] } },
    build: { outDir: "dist", target: "es2019", sourcemap: false },
  };
});
