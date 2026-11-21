"use client";

import { useState } from "react";
import { setLang, type Lang } from "@/lib/region";
import { FeedbackDialog } from "./Feedback";

/** The 문의 page's button: the same note form as the game's ⋯ menu ("의견 보내기"), sent by the server to the operator. */
export function ContactForm({ lang = "ko" }: { lang?: Lang }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          // The form's words follow the page; set only in the browser, on click, so a server render never changes the language.
          setLang(lang);
          setOpen(true);
        }}
        className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
      >
        {lang === "en" ? "Write to us" : "문의 남기기"}
      </button>
      <FeedbackDialog open={open} where={lang === "en" ? "Contact page (/en/contact)" : "문의 페이지(/contact)"} onClose={() => setOpen(false)} />
    </>
  );
}
