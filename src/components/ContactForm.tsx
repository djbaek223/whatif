"use client";

import { useState } from "react";
import { FeedbackDialog } from "./Feedback";

/** The 문의 page's button: the same note form as the game's ⋯ menu ("의견 보내기"), sent by the server to the operator. */
export function ContactForm() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500">
        문의 남기기
      </button>
      <FeedbackDialog open={open} where="문의 페이지(/contact)" onClose={() => setOpen(false)} />
    </>
  );
}
