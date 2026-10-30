"use client";

import { type CSSProperties, useEffect, useState } from "react";
import { BADGES, badgeById } from "@/lib/badges";
import { sfx } from "@/lib/sound";
import type { LifeState, LogEntry, StatKey } from "@/lib/types";

// Short game-like moments layered over the play screen. None of them block input, and each lasts about a second.

/** The year rising over the scene when the calendar turns. */
export function YearBanner({ year, onDone }: { year: number; onDone: () => void }) {
  useEffect(() => sfx.year(), [year]);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1 flex justify-center">
      <span
        key={year}
        onAnimationEnd={onDone}
        className="year-banner rounded-xl bg-stone-900/70 px-3 py-0.5 text-2xl font-black tracking-tight text-white tabular-nums shadow-lg sm:text-3xl"
      >
        {year}
      </span>
    </div>
  );
}

export interface Roll {
  id: number;
  face: number; // 1-6
}

const LUCK = ["", "최악의 운", "운이 없었다", "조금 아쉽다", "무난했다", "운이 좋았다", "대박!"];

/** How a choice turned out, read from the stats and money its outcome moved. */
export function rollOf(outcome: LogEntry, id: number): Roll {
  const stats = Object.values(outcome.delta ?? {}).reduce((a, b) => a + (b ?? 0), 0);
  const score = stats + Math.max(-10, Math.min(10, (outcome.money ?? 0) / 300));
  const face = score >= 12 ? 6 : score >= 4 ? 5 : score >= 0 ? 4 : score >= -4 ? 3 : score >= -12 ? 2 : 1;
  return { id, face };
}

const PIPS: Record<number, [number, number][]> = {
  1: [[12, 12]],
  2: [[7, 7], [17, 17]],
  3: [[7, 7], [12, 12], [17, 17]],
  4: [[7, 7], [17, 7], [7, 17], [17, 17]],
  5: [[7, 7], [17, 7], [12, 12], [7, 17], [17, 17]],
  6: [[7, 6], [17, 6], [7, 12], [17, 12], [7, 18], [17, 18]],
};

/** A die tumbles onto the scene and shows how lucky the choice was. Under a second. */
export function DiceRoll({ roll, onDone }: { roll: Roll; onDone: () => void }) {
  const good = roll.face >= 4;
  useEffect(() => {
    sfx.dice();
    const t = setTimeout(() => sfx.luck(good), 450);
    return () => clearTimeout(t);
  }, [roll.id, good]);
  return (
    <div key={roll.id} onAnimationEnd={(e) => e.target === e.currentTarget && onDone()} className="dice-pop pointer-events-none absolute top-1.5 right-14 flex items-center gap-1.5 sm:right-16">
      <svg viewBox="0 0 24 24" className="dice-roll h-8 w-8 drop-shadow sm:h-10 sm:w-10" aria-hidden>
        <rect x="1" y="1" width="22" height="22" rx="5" fill="#ffffff" stroke="#d6d3d1" />
        {PIPS[roll.face].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="2.1" fill={roll.face === 1 ? "#e11d48" : "#1c1917"} />
        ))}
      </svg>
      <span className={`rounded-full px-2 py-0.5 text-xs font-bold shadow ${good ? "bg-emerald-700 text-white" : "bg-rose-600 text-white"}`}>{LUCK[roll.face]}</span>
    </div>
  );
}

const CONFETTI_COLORS = ["#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#facc15"];

/** Confetti and the badge that was just earned. Several at once collapse into one toast. */
export function BadgeToast({ ids, toastKey, onDone }: { ids: string[]; toastKey: number; onDone: () => void }) {
  useEffect(() => sfx.badge(), [toastKey]);
  const first = badgeById(ids[0]);
  if (!first) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[38%] z-30 flex justify-center" role="status">
      <div className="relative">
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const r = 90 + (i % 4) * 22;
          return (
            <span
              key={`${toastKey}-${i}`}
              aria-hidden
              className="confetti h-2 w-1.5 rounded-sm"
              style={
                {
                  background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                  "--dx": `${Math.cos(a) * r}px`,
                  "--dy": `${Math.sin(a) * r * 0.7 + 40}px`,
                  "--rot": `${(i % 2 ? 1 : -1) * (200 + i * 15)}deg`,
                } as CSSProperties
              }
            />
          );
        })}
        <div
          key={toastKey}
          onAnimationEnd={(e) => e.target === e.currentTarget && onDone()}
          className="badge-toast flex items-center gap-3 rounded-2xl border border-amber-300 bg-white px-4 py-3 shadow-xl dark:border-amber-700 dark:bg-stone-900"
        >
          <span className="text-3xl" aria-hidden>
            {first.icon}
          </span>
          <span>
            <span className="block text-[11px] font-bold text-amber-700 dark:text-amber-400">배지 획득{ids.length > 1 ? ` · 외 ${ids.length - 1}개` : ""}</span>
            <span className="block font-bold">{first.name}</span>
            <span className="block text-xs text-stone-500 dark:text-stone-400">{first.desc}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/** Stats that moved by this much in one step make their gauge glow. */
export const BIG_SWING = 5;

export function bigSwings(prev: Record<StatKey, number>, next: Record<StatKey, number>): Partial<Record<StatKey, "up" | "down">> {
  const out: Partial<Record<StatKey, "up" | "down">> = {};
  for (const k of Object.keys(next) as StatKey[]) {
    const d = next[k] - prev[k];
    if (Math.abs(d) >= BIG_SWING) out[k] = d > 0 ? "up" : "down";
  }
  return out;
}

export function SoundToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      aria-label={on ? "효과음 끄기" : "효과음 켜기"}
      title={on ? "효과음 끄기" : "효과음 켜기"}
      className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-stone-400 dark:hover:bg-stone-800"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M11 5 6 9H2v6h4l5 4z" />
        {on ? <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" /> : <path d="m22 9-6 6M16 9l6 6" />}
      </svg>
    </button>
  );
}

/** Every badge, earned ones in color with the age they came at. Shown on the ending screen. */
export function BadgeCollection({ life }: { life: LifeState }) {
  const earned = new Map((life.badges ?? []).map((b) => [b.id, b]));
  const [open, setOpen] = useState(false);
  const list = open ? BADGES : BADGES.filter((b) => earned.has(b.id));
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold text-stone-500 dark:text-stone-400">배지 컬렉션</h2>
        <p className="text-sm font-bold tabular-nums">
          {earned.size} / {BADGES.length}
        </p>
      </div>
      {list.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">이번 인생에서는 배지를 얻지 못했어요.</p>
      ) : (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {list.map((b) => {
            const got = earned.get(b.id);
            return (
              <li
                key={b.id}
                className={`flex flex-col items-center rounded-xl border px-1 py-2.5 text-center ${got ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40" : "border-dashed border-stone-300 dark:border-stone-700"}`}
              >
                <span className={`text-2xl ${got ? "" : "opacity-30 grayscale"}`} aria-hidden>
                  {b.icon}
                </span>
                <span className={`mt-1 text-xs font-semibold ${got ? "" : "text-stone-500 dark:text-stone-400"}`}>{b.name}</span>
                <span className="text-[11px] text-stone-500 tabular-nums dark:text-stone-400">{got ? `${got.age}세` : "미획득"}</span>
              </li>
            );
          })}
        </ul>
      )}
      <button type="button" onClick={() => setOpen((o) => !o)} className="mt-2 w-full py-2.5 text-sm text-stone-500 underline-offset-2 hover:underline dark:text-stone-400">
        {open ? "얻은 배지만 보기" : "모든 배지 보기"}
      </button>
    </div>
  );
}
