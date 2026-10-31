"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { costTotal, monthlyCosts } from "@/lib/budget";
import { ageOf } from "@/lib/events";
import { formatMi, formatWealth, payLabel, statusLabel } from "@/lib/engine";
import { degreeLine } from "@/lib/playUi";
import { STAT_LABELS, type LifeState, type StatKey } from "@/lib/types";
import { STAT_COLORS, StatBars } from "./ui";
import { L } from "@/lib/i18n";
import { ageText } from "@/lib/format";

/**
 * The Life HUD: who (name, age, what they do, 학력), when (year and month) and money on one row, the Life Scene in
 * the middle and the four gauges below. Scrolled down the timeline it turns compact: one row of who and when, the
 * scene as a slim strip and the gauges as numbers, so the story gets the room.
 */
export function LifeHud({
  life,
  compact,
  scene,
  menu,
  flash,
  flashKey,
}: {
  life: LifeState;
  compact: boolean;
  scene: ReactNode;
  menu: ReactNode;
  flash?: Partial<Record<StatKey, "up" | "down">>;
  flashKey?: number;
}) {
  const age = ageOf(life);
  const status = statusLabel(life);
  const degree = degreeLine(life);
  const name = life.profile.name || L("나");
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {/* A long nickname gives way; the age never does. */}
          <h1 className={`flex min-w-0 font-bold transition-[font-size] motion-reduce:transition-none ${compact ? "text-base" : "text-lg"}`} title={`${name} · ${ageText(age)}`}>
            <span className="truncate">{name}</span>
            <span className="shrink-0 whitespace-pre"> · {ageText(age)}</span>
          </h1>
          {/* Long job titles end in "…" on screen; the whole text stays in the page for screen readers and on hover. */}
          <p className={`truncate text-xs text-stone-600 dark:text-stone-400 ${compact ? "max-lg:sr-only" : ""}`} title={status}>
            {status}
          </p>
          {degree && <p className={`truncate text-[11px] text-stone-500 dark:text-stone-400 ${compact ? "max-lg:hidden" : ""}`}>{degree}</p>}
        </div>
        <div className="flex shrink-0 items-start gap-1">
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums">{formatMi(life.mi)}</p>
            <MoneyLine life={life} pay={payLabel(life)} compact={compact} />
          </div>
          {menu}
        </div>
      </div>
      <div className={compact ? "mt-1.5" : "mt-2"}>{scene}</div>
      <div className={compact ? "mt-1.5" : "mt-2.5"}>{compact ? <StatMini life={life} /> : <StatBars stats={life.stats} compact flash={flash} flashKey={flashKey} />}</div>
    </>
  );
}

/** The four gauges as label and number with a hairline bar, for the compact HUD. */
function StatMini({ life }: { life: LifeState }) {
  return (
    <ul className="grid grid-cols-4 gap-2 text-[11px]" aria-label={L("능력치")}>
      {(Object.keys(STAT_LABELS) as StatKey[]).map((k) => (
        <li key={k} className="min-w-0">
          <span className="flex items-baseline justify-between gap-1">
            <span className="truncate text-stone-600 dark:text-stone-400">{STAT_LABELS[k]}</span>
            <span className="font-semibold tabular-nums">{life.stats[k]}</span>
          </span>
          <span aria-hidden className="mt-0.5 block h-0.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
            <span className="block h-full" style={{ width: `${life.stats[k]}%`, background: STAT_COLORS[k] }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Wealth and pay in the HUD; a press opens this month's fixed costs, item by item, and what is left over. */
function MoneyLine({ life, pay, compact }: { life: LifeState; pay: string; compact: boolean }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const items = monthlyCosts(life);
  const total = costTotal(items);
  const left = life.income - total;
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="money-detail"
        className="-mr-1 rounded px-1 text-right text-xs text-stone-600 tabular-nums hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-stone-400 dark:hover:bg-stone-800"
      >
        {/* A negative balance is spelled with a minus, so it does not rest on colour alone. */}
        <span className={`block whitespace-nowrap ${life.wealth < 0 ? "text-amber-800 dark:text-amber-300" : ""}`}>
          {L("자산")} {formatWealth(life.wealth)}
          {pay && <span className="hidden sm:inline lg:hidden"> · {pay}</span>}
          <span aria-hidden className="ml-0.5 inline-block text-[10px]">{open ? "▴" : "▾"}</span>
        </span>
        {pay && <span className={`block whitespace-nowrap sm:hidden lg:block ${compact ? "max-lg:hidden" : ""}`}>{pay}</span>}
        {total > 0 && <span className="hidden lg:block">{L("고정지출 월")} {formatWealth(total)}</span>}
        <span className="sr-only">{L(", 월 고정지출 자세히 보기")}</span>
      </button>
      {open && (
        <div id="money-detail" className="absolute top-full right-0 z-30 mt-1 w-64 rounded-xl border border-stone-200 bg-white p-3 text-left text-xs shadow-lg dark:border-stone-800 dark:bg-stone-900">
          <p className="font-semibold text-stone-700 dark:text-stone-200">{L("매달 들어오고 나가는 돈")}</p>
          <dl className="mt-2 space-y-1 tabular-nums">
            <div className="flex justify-between gap-2">
              <dt className="text-stone-600 dark:text-stone-400">{L("수입")}</dt>
              <dd>
                {L("월")} {formatWealth(Math.max(0, life.income))}
              </dd>
            </div>
            {items.map((e) => (
              <div key={e.label} className="flex justify-between gap-2">
                <dt className="text-stone-600 dark:text-stone-400">{e.label}</dt>
                <dd>-{formatWealth(e.amount)}</dd>
              </div>
            ))}
            {!items.length && <div className="text-stone-500 dark:text-stone-400">{ageOf(life) < 20 ? L("아직은 부모님이 생활비를 대 주신다.") : L("지금은 나가는 고정지출이 없다.")}</div>}
            {items.length > 0 && (
              <div className="flex justify-between gap-2 border-t border-stone-200 pt-1 font-semibold dark:border-stone-700">
                <dt>
                  {L("매달")} {left >= 0 ? L("남는 돈") : L("모자라는 돈")}
                </dt>
                <dd className={left >= 0 ? "text-sky-700 dark:text-sky-300" : "text-amber-700 dark:text-amber-300"}>{formatWealth(Math.abs(left))}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}

/**
 * Whether the phone HUD should be compact: once the page is scrolled past `down`, until it comes back above `up`.
 * The gap between the two keeps it from flickering at the edge. Desktop keeps the full HUD in its side column.
 */
export function useCompactHud(down = 120, up = 24): boolean {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    let on = false;
    const check = () => {
      const y = window.scrollY;
      const next = wide.matches ? false : on ? y > up : y > down;
      if (next !== on) {
        on = next;
        setCompact(next);
      }
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    wide.addEventListener("change", check);
    return () => {
      window.removeEventListener("scroll", check);
      wide.removeEventListener("change", check);
    };
  }, [down, up]);
  return compact;
}
