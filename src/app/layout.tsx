import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "What If · 그때 다른 선택을 했다면",
  description: "과거의 한 순간으로 돌아가 다른 선택을 하고, 그 인생을 끝까지 살아보는 AI 인생 시뮬레이터",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
