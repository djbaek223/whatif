"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { Button, Input, Spinner, Textarea } from "./ui";

const FEEDBACK_TO = "dj.baek223@gmail.com";

/** The same note as a mail draft, for when the server can't send it. Subject starts with [WhatIf] so the inbox can filter on it. */
function mailHref(message: string, where: string) {
  const body = `${message}\n\n---\n플레이 중이던 곳: ${where}`;
  return `mailto:${FEEDBACK_TO}?subject=${encodeURIComponent("[WhatIf] 의견")}&body=${encodeURIComponent(body)}`;
}

type Status = "idle" | "sending" | "sent" | "no-key" | "rate-limited" | "error";

/**
 * A modal note to the maker, sent by the server so players need no mail app.
 * The native <dialog> keeps focus inside, closes on Escape and returns focus to what opened it.
 */
export function FeedbackDialog({ open, where, onClose }: { open: boolean; where: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const tooShort = message.trim().length < 2;

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      setStatus((s) => (s === "sent" ? "idle" : s));
      d.showModal();
    } else if (!open && d.open) d.close();
  }, [open]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (tooShort || status === "sending") return;
    setStatus("sending");
    const website = (e.currentTarget as HTMLFormElement).elements.namedItem("website") as HTMLInputElement | null;
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, contact, where, website: website?.value ?? "" }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; reason?: string };
      if (data.ok) {
        setStatus("sent");
        setMessage("");
        setContact("");
      } else setStatus(data.reason === "no-key" ? "no-key" : data.reason === "rate-limited" ? "rate-limited" : "error");
    } catch {
      setStatus("error");
    }
  };

  const problem = {
    "no-key": "지금은 사이트에서 바로 보낼 수 없어요.",
    "rate-limited": "잠시 뒤에 다시 보내 주세요. 짧은 시간에 너무 많이 보냈어요.",
    error: "보내지 못했어요. 잠시 뒤 다시 시도해 주세요.",
  }[status as "no-key" | "rate-limited" | "error"];

  return (
    <dialog
      ref={dialog}
      aria-labelledby="feedback-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-stone-200 bg-white p-0 text-[var(--foreground)] shadow-xl backdrop:bg-stone-950/40 dark:border-stone-800 dark:bg-stone-900"
    >
      {status === "sent" ? (
        <div className="space-y-4 p-6 text-center">
          <p id="feedback-title" className="text-lg font-bold">
            고마워요!
          </p>
          <p className="text-sm text-stone-600 dark:text-stone-300">보내 주신 의견은 만든 사람이 직접 읽어요.</p>
          <Button type="button" className="w-full" onClick={onClose} autoFocus>
            닫기
          </Button>
        </div>
      ) : (
        <form onSubmit={send} className="space-y-4 p-6">
          <div className="space-y-1">
            <h2 id="feedback-title" className="text-lg font-bold">
              의견 보내기
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-300">불편했던 점, 이상한 이야기, 바라는 기능 무엇이든 좋아요.</p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">내용</span>
            <Textarea autoFocus rows={5} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} placeholder="예: 군대 다녀온 뒤에 대학 이야기가 갑자기 사라졌어요." />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">답장 받을 연락처</span>
            <Input type="text" inputMode="email" autoComplete="email" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={100} placeholder="이메일 (선택)" />
          </label>
          {/* Hidden from people and screen readers; a bot that fills it gets turned away. */}
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
          {problem && (
            <p role="alert" className="text-[13px] font-medium text-rose-700 dark:text-rose-400">
              {problem}{" "}
              {status === "no-key" && (
                <a href={mailHref(message, where)} className="underline underline-offset-2">
                  메일 앱으로 보내기
                </a>
              )}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" className="flex flex-[2] items-center justify-center gap-2" disabled={tooShort || status === "sending"}>
              {status === "sending" && <Spinner />}
              {status === "sending" ? "보내는 중" : "보내기"}
            </Button>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400">지금 플레이 중인 장면(별명, 나이, 날짜)이 함께 전달돼요.</p>
        </form>
      )}
    </dialog>
  );
}
