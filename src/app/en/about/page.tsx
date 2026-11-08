import type { Metadata } from "next";
import { BoardShell } from "@/components/BoardPages";
import { InfoBody } from "@/components/InfoPages";

export const metadata: Metadata = {
  title: "About What If · What If",
  description: "What If is an AI life simulator: go back to a turning point, choose again, and live that life to the end.",
  alternates: { canonical: "/en/about", languages: { ko: "/about", en: "/en/about" } },
};

export default function Page() {
  return (
    <BoardShell lang="en">
      <InfoBody lang="en" page="about" />
    </BoardShell>
  );
}
