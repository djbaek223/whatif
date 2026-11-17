import type { Metadata } from "next";
import { BoardShell } from "@/components/BoardPages";
import { InfoBody } from "@/components/InfoPages";

export const metadata: Metadata = {
  title: "Terms of service · What If",
  description: "The rules and responsibilities for using What If.",
  alternates: { canonical: "/en/terms", languages: { ko: "/terms", en: "/en/terms" } },
};

export default function Page() {
  return (
    <BoardShell lang="en">
      <InfoBody lang="en" page="terms" />
    </BoardShell>
  );
}
