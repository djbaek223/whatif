"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { ageOf } from "@/lib/events";
import { formatMi, formatWealth, payLabel, statusLabel } from "@/lib/engine";
import type { LifeState, LogEntry } from "@/lib/types";
import { Button, Card, DeltaChips, StatBars, Textarea } from "./ui";

export interface PlayHandlers {
  onStep: () => void;
  onSkip: () => void;
  onToggleAuto: () => void;
  onToggleAutoDecide: () => void;
  onChoose: (optionId: string) => void;
  onChooseFree: (text: string) => void;
  onClosePresent: () => void;
  onQuit: () => void;
}

export function PlayView({
  life,
  ai,
  auto,
  autoDecide,
  busy,
  sceneLoading,
  presentOpen,
  handlers,
}: {
  life: LifeState;
  ai: boolean;
  auto: boolean;
  autoDecide: boolean;
  busy: boolean;
  sceneLoading: boolean;
  presentOpen: boolean;
  handlers: PlayHandlers;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [free, setFree] = useState("");
  const { following, jumpToLatest } = useFollowLatest(root);
  const age = ageOf(life);

  const pending = life.pending;
  const canAdvance = !pending && !life.dead && !presentOpen && !busy;

  return (
    <div ref={root} className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 -mx-4 border-b border-stone-200 bg-[var(--background)]/95 px-4 pb-3 pt-3 backdrop-blur dark:border-stone-800">
        <div className="flex items-baseline justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">
              {life.profile.name || "나"} · {age}세
            </p>
            <p className="truncate text-xs text-stone-500">{statusLabel(life)}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold tabular-nums">{formatMi(life.mi)}</p>
            <p className="text-xs text-stone-500 tabular-nums">자산 {formatWealth(life.wealth)}</p>
            {payLabel(life) && <p className="text-xs text-stone-500 tabular-nums">{payLabel(life)}</p>}
          </div>
        </div>
        <div className="mt-3">
          <StatBars stats={life.stats} compact />
        </div>
      </header>

      <div className="flex-1 space-y-2 py-4">
        {life.log.map((entry, i) => (
          <LogLine key={i} entry={entry} showDate={i === 0 || life.log[i - 1].mi !== entry.mi} />
        ))}
        {presentOpen && <PresentCard life={life} onClose={handlers.onClosePresent} />}
      </div>

      <div className="sticky bottom-0 -mx-4 border-t border-stone-200 bg-[var(--background)]/95 px-4 pb-5 pt-3 backdrop-blur dark:border-stone-800">
        {!following && (
          <button
            onClick={jumpToLatest}
            className="absolute -top-12 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-indigo-700"
          >
            ↓ 최신 내용 보기
          </button>
        )}
        {pending && !presentOpen ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">선택의 순간</p>
              <p className="text-lg font-bold">{pending.title}</p>
              <p className="mt-1 max-h-48 overflow-y-auto whitespace-pre-line leading-relaxed text-stone-700 dark:text-stone-300">
                {sceneLoading ? "장면을 그리는 중..." : pending.scene}
              </p>
            </div>
            <div className="space-y-2">
              {pending.options.map((o) => (
                <Button key={o.id} variant="choice" disabled={busy || sceneLoading} onClick={() => handlers.onChoose(o.id)}>
                  {o.label}
                  {o.detail && <span className="mt-0.5 block text-xs font-normal text-stone-500 dark:text-stone-400">{o.detail}</span>}
                </Button>
              ))}
            </div>
            {ai && pending.freeText && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <Textarea rows={1} value={free} onChange={(e) => setFree(e.target.value)} placeholder="직접 쓰기: 나라면 이렇게 하겠다" maxLength={200} />
                </div>
                <Button
                  variant="ghost"
                  disabled={busy || free.trim().length < 2}
                  onClick={() => {
                    handlers.onChooseFree(free);
                    setFree("");
                  }}
                >
                  결정
                </Button>
              </div>
            )}
          </div>
        ) : life.dead ? (
          <p className="text-center text-stone-500">삶이 끝났습니다. 회고록을 쓰는 중...</p>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button className="flex-1" disabled={!canAdvance || auto} onClick={handlers.onStep}>
                다음 턴
              </Button>
              <Button variant="ghost" className="flex-1" disabled={!canAdvance || auto} onClick={handlers.onSkip}>
                다음 선택까지
              </Button>
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={auto} onChange={handlers.onToggleAuto} disabled={presentOpen} />
                자동 진행
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={autoDecide} onChange={handlers.onToggleAutoDecide} />
                자동 결정
              </label>
              <button className="text-stone-500 underline-offset-2 hover:underline" onClick={handlers.onQuit}>
                그만하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Keeps the page pinned to the newest content as the feed and the bottom panel grow.
 * Scrolling up pauses it; coming back near the bottom (or pressing the button) resumes it.
 */
function useFollowLatest(root: RefObject<HTMLDivElement | null>) {
  const [following, setFollowing] = useState(true);
  const followingRef = useRef(true);

  const setFollow = useCallback((v: boolean) => {
    followingRef.current = v;
    setFollowing(v);
  }, []);

  const scrollToEnd = useCallback((behavior: ScrollBehavior) => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    let lastTop = window.scrollY;
    const onScroll = () => {
      const top = window.scrollY;
      const gap = document.documentElement.scrollHeight - top - window.innerHeight;
      // Only an upward move counts as the user leaving; shrinking content can also lower scrollY.
      if (gap < 80) setFollow(true);
      else if (top < lastTop) setFollow(false);
      lastTop = top;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [setFollow]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    scrollToEnd("auto");
    // Watching size instead of log length also catches same-length updates, scene text and the choice panel.
    const ro = new ResizeObserver(() => {
      if (followingRef.current) scrollToEnd("smooth");
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [root, scrollToEnd]);

  const jumpToLatest = useCallback(() => {
    setFollow(true);
    scrollToEnd("smooth");
  }, [setFollow, scrollToEnd]);

  return { following, jumpToLatest };
}

function LogLine({ entry, showDate }: { entry: LogEntry; showDate: boolean }) {
  const date = showDate ? <p className="pt-2 text-[11px] font-semibold text-stone-400 tabular-nums">{formatMi(entry.mi)}</p> : null;
  switch (entry.kind) {
    case "era":
      return (
        <>
          {date}
          <p className="whitespace-pre-line rounded-xl bg-stone-100 px-4 py-3 text-[15px] leading-relaxed text-stone-700 dark:bg-stone-900 dark:text-stone-300">{entry.text}</p>
        </>
      );
    case "news":
      return (
        <>
          {date}
          <div className="border-l-2 border-amber-400 pl-3 dark:border-amber-600">
            {entry.tag && <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">📰 {entry.tag}</p>}
            <p className="whitespace-pre-line text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              {entry.text}
              <DeltaChips delta={entry.delta} money={entry.money} />
            </p>
          </div>
        </>
      );
    case "turn":
      return (
        <>
          {date}
          <p className="text-sm text-stone-500">{entry.text}</p>
        </>
      );
    case "event":
      return (
        <>
          {date}
          <p className="font-semibold">
            {entry.text}
            <DeltaChips delta={entry.delta} money={entry.money} />
          </p>
        </>
      );
    case "choice":
      return (
        <>
          {date}
          <p className="text-indigo-700 dark:text-indigo-300">→ {entry.text}</p>
        </>
      );
    case "outcome":
      return (
        <>
          {date}
          <p className="leading-relaxed">
            {entry.text}
            <DeltaChips delta={entry.delta} money={entry.money} />
          </p>
        </>
      );
    case "present":
    case "milestone":
      return (
        <>
          {date}
          <p className="rounded-xl border border-indigo-300 px-4 py-3 font-semibold text-indigo-800 dark:border-indigo-800 dark:text-indigo-300">{entry.text}</p>
        </>
      );
    case "death":
      return (
        <>
          {date}
          <p className="rounded-xl bg-stone-900 px-4 py-3 text-center font-semibold text-stone-50 dark:bg-stone-100 dark:text-stone-900">{entry.text}</p>
        </>
      );
  }
}

function PresentCard({ life, onClose }: { life: LifeState; onClose: () => void }) {
  return (
    <Card className="space-y-4 border-indigo-300 dark:border-indigo-800">
      <div>
        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">지금 이 순간</p>
        <p className="text-lg font-bold">현실의 나와 또 다른 나</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-stone-100 p-4 dark:bg-stone-800">
          <p className="text-xs text-stone-500">현실의 나</p>
          <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed">{life.profile.currentLife || "현실의 삶을 입력하지 않았어요."}</p>
        </div>
        <div className="rounded-xl bg-indigo-50 p-4 dark:bg-indigo-950">
          <p className="text-xs text-stone-500">이 가지의 나 · {ageOf(life)}세</p>
          <p className="mt-1 text-[15px] font-semibold">{statusLabel(life)}</p>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            자산 {formatWealth(life.wealth)}
            {payLabel(life) && ` · ${payLabel(life)}`}
          </p>
          <div className="mt-3">
            <StatBars stats={life.stats} compact />
          </div>
        </div>
      </div>
      <Button className="w-full" onClick={onClose}>
        계속 살아보기
      </Button>
    </Card>
  );
}
