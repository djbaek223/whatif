import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import { GoogleTag } from "@/components/GoogleTag";
import { adsenseClient } from "@/lib/ads";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const title = "What If · 그때 다른 선택을 했다면";
const description = "과거의 한 순간으로 돌아가 다른 선택을 하고, 그 인생을 끝까지 살아보는 AI 인생 시뮬레이터";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  applicationName: "What If",
  openGraph: { type: "website", locale: "ko_KR", siteName: "What If", title, description, url: "/" },
  twitter: { card: "summary_large_image", title, description },
  verification: { google: "lQZdZvhIVht6gTeFwjJheeCwHDfX3Mj1tkHPcYQs_Fk" },
  // AdSense's site check looks for this tag; present only once NEXT_PUBLIC_ADSENSE_CLIENT is set.
  other: adsenseClient() ? { "google-adsense-account": adsenseClient() } : undefined,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#121110" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const adsense = adsenseClient();
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <GoogleTag />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
        {adsense && <Script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsense}`} crossOrigin="anonymous" strategy="afterInteractive" />}
      </body>
    </html>
  );
}
