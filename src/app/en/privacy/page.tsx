import type { Metadata } from "next";
import { BoardShell } from "@/components/BoardPages";
import { InfoBody } from "@/components/InfoPages";

export const metadata: Metadata = {
  title: "Privacy policy · What If",
  description: "What information What If keeps, where, and how it is used.",
  alternates: { canonical: "/en/privacy", languages: { ko: "/privacy", en: "/en/privacy" } },
};

export default function Page() {
  return (
    <BoardShell lang="en">
      <InfoBody lang="en" page="privacy" />
    </BoardShell>
  );
}
