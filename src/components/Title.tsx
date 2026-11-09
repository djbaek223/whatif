"use client";

import { useEffect, useState, type ReactNode } from "react";
import { L } from "@/lib/i18n";
import type { Lang } from "@/lib/region";
import { reducedMotion } from "./Waiting";

/**
 * The first screen as a game's title screen: a dark VHS picture (the same tape as the rewind before a life begins),
 * a big WHAT IF, a timecode that keeps rewinding from this month into the past, one question, and two ways in:
 * 바로 되돌리기 (the basics and a year) and 내 이야기로 시작 (the moment itself, what was chosen, and more).
 * The picture stays dark in light mode too; what is below it follows the theme.
 */
export function TitleScreen({
  langs,
  lang,
  onLang,
  onPick,
  slots,
  footer,
}: {
  langs: { id: Lang; name: string }[];
  lang: Lang;
  onLang: (l: Lang) => void;
  onPick: (quick: boolean) => void;
  /** A game and/or unfinished questions to go back to, each shown like a save slot under the two buttons. */
  slots: { label: string; detail?: string; onClick: () => void }[];
  footer: ReactNode;
}) {
  return (
    <section aria-labelledby="title-q" className="title-hero relative flex min-h-[88svh] flex-col overflow-hidden px-4 pb-6 pt-4 text-[#efeaff] sm:px-8 lg:min-h-[640px]">
      <div aria-hidden className="title-band" />
      <div className="relative flex items-center justify-between gap-3">
        <span aria-hidden className="title-osd font-mono text-sm font-bold tracking-[0.14em]">
          <span className="motion-safe:animate-[vhs-blink_1s_steps(2)_infinite]">◀◀</span> REW
        </span>
        {langs.length > 1 && <div role="group" aria-label="Language · 언어" className="flex rounded-full border border-white/25 p-0.5 text-sm">
          {langs.map((l) => (
            <button
              key={l.id}
              type="button"
              lang={l.id}
              aria-pressed={lang === l.id}
              onClick={() => onLang(l.id)}
              className={`min-h-9 rounded-full px-3 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                lang === l.id ? "bg-[#efeaff] text-[#16122b]" : "text-[#cfc6ff] hover:text-white"
              }`}
            >
              {l.name}
            </button>
          ))}
        </div>}
      </div>

      <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-8 py-8 text-center lg:flex-row lg:justify-between lg:gap-16 lg:text-left">
        <div className="flex flex-col items-center gap-3 lg:items-start">
          <p aria-hidden className="title-logo text-[clamp(56px,17vw,104px)] font-black leading-[0.9] tracking-[-0.04em]">
            WHAT IF
          </p>
          <Timecode />
          <h1 id="title-q" className="mt-2 text-[clamp(22px,6.2vw,32px)] font-extrabold leading-snug">
            <span className="sr-only">What If · </span>
            {L("그때 다른 선택을 했다면?")}
          </h1>
          <p className="text-[15px] text-[#c9c1ee] sm:text-base">{L("그날로 돌아가, 끝까지 다시 살아보세요.")}</p>
        </div>

        <div className="w-full max-w-md space-y-2.5 lg:w-[400px] lg:flex-none">
          <h2 className="sr-only">{L("어떻게 시작할까요?")}</h2>
          <StartButton
            primary
            icon={<RewindIcon />}
            title={L("바로 되돌리기")}
            text={L("기본 정보만 넣고 바로 그날로 돌아가요")}
            time={L("30초")}
            onClick={() => onPick(true)}
          />
          <StartButton
            icon={<ForkIcon />}
            title={L("내 이야기로 시작")}
            text={L("내 환경과 성격까지 넣고 그때의 나로 다시 살아봐요")}
            time={L("2분")}
            onClick={() => onPick(false)}
          />
          {slots.map((slot) => (
            <button
              key={slot.label}
              type="button"
              onClick={slot.onClick}
              className="mx-auto flex min-h-11 items-center gap-2 rounded-lg px-3 text-[15px] font-medium text-[#e4defc] underline decoration-white/40 underline-offset-4 hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <span aria-hidden className="font-mono text-xs no-underline">▶</span>
              {slot.label}
              {slot.detail && <span className="text-[#c9c1ee]">· {slot.detail}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="relative space-y-2 text-center text-xs text-[#b3aadb]">{footer}</div>
    </section>
  );
}

function StartButton({ primary, icon, title, text, time, onClick }: { primary?: boolean; icon: ReactNode; title: string; text: string; time: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-16 w-full items-center gap-3.5 rounded-2xl px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#16122b] ${
        primary ? "title-start bg-white text-[#16122b] hover:bg-[#f3f1ff]" : "border border-white/30 bg-white/[0.08] text-white hover:bg-white/[0.14]"
      }`}
    >
      <span aria-hidden className={`grid size-10 flex-none place-items-center rounded-xl ${primary ? "bg-[#5b4cf0] text-white" : "bg-white/15 text-white"}`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-extrabold leading-tight">{title}</span>
        <span className={`mt-0.5 block text-[13px] ${primary ? "text-[#5b5478]" : "text-[#c9c1ee]"}`}>{text}</span>
      </span>
      <span className={`flex-none rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${primary ? "bg-[#ece9ff] text-[#3f33c4]" : "bg-white/15"}`}>{time}</span>
    </button>
  );
}

const RewindIcon = () => (
  <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor">
    <path d="M9.5 4.5v11L2 10zM18 4.5v11L10.5 10z" />
  </svg>
);

/** A road that splits in two: the fork the player names. */
const ForkIcon = () => (
  <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 18v-6M10 12 5 6M10 12l5-6M3 6.5 5 3l2.5 2.5M12.5 5.5 15 3l2 3.5" />
  </svg>
);

/** Years the timecode rewinds to, one after another. */
const STOPS = [2009 * 12 + 2, 1998 * 12 + 2, 2014 * 12 + 10, 1988 * 12 + 8];

/**
 * `2026.11 ◀◀ 2009.03`: this month, then a timecode winding back to a year in the past, resting there, and winding
 * again from this month to the next one. Purely visual; with reduced motion it rests on the first stop.
 */
function Timecode() {
  // This month is read after the first paint: the page is prerendered, and the clock there isn't the visitor's.
  const [now, setNow] = useState<number | null>(null);
  const [mi, setMi] = useState(STOPS[0]);
  useEffect(() => {
    const d = new Date();
    const here = d.getFullYear() * 12 + d.getMonth();
    setNow(here); // eslint-disable-line react-hooks/set-state-in-effect
    if (reducedMotion()) return;
    let stop = 0;
    let at = here;
    let rest = 0;
    const t = setInterval(() => {
      if (rest > 0) {
        rest--;
        if (!rest) {
          stop = (stop + 1) % STOPS.length;
          at = here;
        }
        return;
      }
      at = Math.max(STOPS[stop], at - 3);
      setMi(at);
      if (at === STOPS[stop]) rest = 30; // about two seconds on the year
    }, 60);
    return () => clearInterval(t);
  }, []);
  const ym = (m: number) => `${Math.floor(m / 12)}.${String((m % 12) + 1).padStart(2, "0")}`;
  return (
    <p aria-hidden className="flex items-center gap-2.5 font-mono text-[15px] tracking-[0.06em] text-[#cfc6ff]">
      <span className="opacity-70">{now === null ? "\u00a0".repeat(7) : ym(now)}</span>
      <span>◀◀</span>
      <span className="rounded-md bg-white/10 px-2 py-0.5 font-bold tabular-nums text-white">{ym(mi)}</span>
    </p>
  );
}
