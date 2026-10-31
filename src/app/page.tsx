import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import Game from "@/components/Game";
import { LANG_COOKIE, langFromAcceptLanguage } from "@/lib/langPick";

// The first paint is already in the visitor's language: the language they picked before (cookie), else the
// browser's (Korean → 한국어, anything else → English). The address / itself stays the same.
// Waits for the request instead of prerendering, so no frame is ever drawn in the wrong language.
export const instant = false;

export const metadata: Metadata = {
  alternates: { canonical: "/", languages: { ko: "/", en: "/en", "x-default": "/" } },
};

export default async function Home() {
  const picked = (await cookies()).get(LANG_COOKIE)?.value;
  const lang = picked === "ko" || picked === "en" ? picked : langFromAcceptLanguage((await headers()).get("accept-language"));
  return <Game initialLang={lang} guessed />;
}
