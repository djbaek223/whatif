"use client";

import { type ReactNode, type RefObject, useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { ageOf } from "@/lib/events";
import { formatMi, formatWealth, isBigChoice, pendingKeyOf, payLabel, statusLabel, turnLength } from "@/lib/engine";
import { sceneOf, type SceneState } from "@/lib/scene";
import { loadSoundPref, setSound, sfx } from "@/lib/sound";
import type { LifeState, LogEntry, PendingChoice, StatKey } from "@/lib/types";
import { BadgeToast, bigSwings, DiceRoll, rollOf, type Roll, YearBanner } from "./GameFx";
import { LifeScene } from "./LifeScene";
import { Button, Card, DeltaChips, Segmented, Spinner, StatBars, Switch, Textarea } from "./ui";

export type Speed = 1 | 2 | 4;

export interface PlayHandlers {
  onStep: () => void;
  onSkip: () => void;
  onToggleAuto: () => void;
  onToggleAutoDecide: () => void;
  onSpeed: (s: Speed) => void;
  onChoose: (optionId: string) => void;
  onChooseFree: (text: string) => void;
  onClosePresent: () => void;
  onQuit: () => void;
}

/**
 * Phones: a slim header on top, the story, and a dock at the bottom that turns into a sheet for each choice (it can be pulled down to read).
 * Desktop: the story on the left, and a sticky side column with the scene, stats, the choice and the controls.
 * The header and dock live in one <aside> that is display:contents on phones, so the same elements serve both layouts.
 */
export function PlayView({
  life,
  ai,
  auto,
  autoDecide,
  speed,
  busy,
  sceneLoading,
  presentOpen,
  handlers,
}: {
  life: LifeState;
  ai: boolean;
  auto: boolean;
  autoDecide: boolean;
  speed: Speed;
  busy: boolean;
  sceneLoading: boolean;
  presentOpen: boolean;
  handlers: PlayHandlers;
}) {
  const root = useRef<HTMLDivElement>(null);
  const { following, jumpToLatest } = useFollowLatest(root);
  const age = ageOf(life);
  const fx = usePlayFx(life);
  const [sound, setSoundOn] = useState(loadSoundPref);
  const [news, setNews] = useState(loadNewsPref);
  const pendingKey = pendingKeyOf(life);
  // Each new choice card rises in with a whoosh.
  useEffect(() => {
    if (pendingKey) sfx.flip();
  }, [pendingKey]);

  const pending = life.pending;
  const choosing = !!pending && !presentOpen;
  const big = !!pending && isBigChoice(pending);
  const canAdvance = !pending && !life.dead && !presentOpen && !busy;
  // The engine logs a choice event's title as it stops; the choice panel already shows it, so drop that line from the feed.
  const last = life.log.at(-1);
  const hideLast = !!pending && last?.kind === "event" && last.mi === life.mi && last.text === pending.title;
  const feed = hideLast ? life.log.slice(0, -1) : life.log;
  const latest = feed.at(-1);

  // Per choice: whether the sheet is pulled down, and whether its big-moment card has been shown.
  const [collapsedKey, setCollapsedKey] = useState<string | null>(null);
  const collapsed = choosing && collapsedKey === pendingKey;
  const [introSeen, setIntroSeen] = useState<string | null>(null);
  const showIntro = choosing && big && introSeen !== pendingKey;
  useEffect(() => {
    if (!showIntro) return;
    const t = setTimeout(() => setIntroSeen(pendingKey), 1500);
    return () => clearTimeout(t);
  }, [showIntro, pendingKey]);

  // "선택까지" remembers where it started, so the sheet can say how much time went by.
  const [skipFrom, setSkipFrom] = useState<number | null>(null);
  const skipped = choosing && skipFrom !== null && life.mi > skipFrom ? life.mi - skipFrom : 0;
  const act = {
    step: () => {
      setSkipFrom(null);
      handlers.onStep();
    },
    skip: () => {
      setSkipFrom(life.mi);
      handlers.onSkip();
    },
    choose: (id: string) => {
      setSkipFrom(null);
      handlers.onChoose(id);
    },
    chooseFree: (text: string) => {
      setSkipFrom(null);
      handlers.onChooseFree(text);
    },
  };

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    const t = e.target as HTMLElement | null;
    if (t?.closest("input, textarea, select, [contenteditable=true]")) return;
    // A focused button already answers Space and Enter itself.
    if ((e.key === " " || e.key === "Enter") && t?.closest("button, a")) return;
    if (e.key === "Escape" && showIntro) return setIntroSeen(pendingKey);
    if (choosing) {
      const n = Number(e.key);
      if (n >= 1 && n <= pending.options.length && !busy && !sceneLoading) {
        e.preventDefault();
        setIntroSeen(pendingKey);
        act.choose(pending.options[n - 1].id);
      }
    } else if (e.key === " " && canAdvance && !auto) {
      e.preventDefault();
      act.step();
    } else if (e.key === "Enter" && canAdvance && !auto) {
      e.preventDefault();
      act.skip();
    }
    if ((e.key === "a" || e.key === "A") && !presentOpen && !life.dead) handlers.onToggleAuto();
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const pay = payLabel(life);

  return (
    <div ref={root} className="flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-10">
      <aside className="contents lg:sticky lg:top-0 lg:col-start-2 lg:row-start-1 lg:flex lg:max-h-dvh lg:flex-col lg:gap-4 lg:overflow-y-auto lg:overscroll-contain lg:-mx-2 lg:px-2 lg:py-6">
        <header className="sticky top-0 z-10 order-1 -mx-4 border-b border-stone-200 bg-[var(--background)]/95 px-4 pt-3 pb-3 backdrop-blur dark:border-stone-800 lg:static lg:order-none lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold">
                {life.profile.name || "나"} · {age}세
              </h1>
              <p className="truncate text-xs text-stone-500 dark:text-stone-400">{statusLabel(life)}</p>
            </div>
            <div className="flex shrink-0 items-start gap-1">
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums">{formatMi(life.mi)}</p>
                <p className="text-xs text-stone-500 tabular-nums dark:text-stone-400">
                  자산 {formatWealth(life.wealth)}
                  {pay && <span className="hidden sm:inline lg:hidden"> · {pay}</span>}
                </p>
                {pay && <p className="text-xs text-stone-500 tabular-nums sm:hidden lg:block dark:text-stone-400">{pay}</p>}
              </div>
              <PlayMenu
                sound={sound}
                onSound={() => {
                  setSound(!sound);
                  setSoundOn(!sound);
                }}
                news={news}
                onNews={(m) => {
                  saveNewsPref(m);
                  setNews(m);
                }}
                onQuit={handlers.onQuit}
              />
            </div>
          </div>
          <div className="mt-2">
            <LifeScene scene={fx.scene} slim={choosing && !collapsed} paused={!(auto || fx.walking) || !!pending || life.dead || presentOpen}>
              {fx.banner && <YearBanner year={fx.banner} onDone={fx.clearBanner} />}
              {fx.roll && <DiceRoll roll={fx.roll} onDone={fx.clearRoll} />}
            </LifeScene>
          </div>
          <div className="mt-2.5">
            <StatBars stats={life.stats} compact flash={fx.swing} flashKey={fx.swingKey} />
          </div>
        </header>

        {choosing ? (
          <>
            {collapsed && (
              <div className="sticky bottom-0 z-10 order-3 -mx-4 px-4 pt-2 pb-5 lg:hidden">
                <button
                  type="button"
                  onClick={() => setCollapsedKey(null)}
                  aria-expanded={false}
                  className="flex w-full items-center justify-between gap-3 rounded-full bg-indigo-600 px-5 py-3.5 text-left text-[15px] font-semibold text-white shadow-lg hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 dark:bg-indigo-500"
                >
                  <span className="min-w-0 truncate">선택 대기 · {pending.title}</span>
                  <span className="flex shrink-0 items-center gap-1 text-sm">
                    펼치기
                    <Chevron up />
                  </span>
                </button>
              </div>
            )}
            <section
              aria-label="선택의 순간"
              className={`sheet-up sticky bottom-0 z-10 order-3 -mx-4 max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-3xl bg-white px-4 pt-1 pb-5 shadow-[0_-10px_30px_rgb(0_0_0/0.10)] dark:bg-stone-900 dark:shadow-[0_-10px_30px_rgb(0_0_0/0.5)] lg:static lg:order-none lg:mx-0 lg:max-h-none lg:overflow-visible lg:rounded-2xl lg:border lg:p-5 lg:shadow-none ${
                pending.rare ? "border-2 border-b-0 border-amber-400 dark:border-amber-500 lg:border-b-2" : "lg:border-stone-200 dark:lg:border-stone-800"
              } ${collapsed ? "max-lg:hidden" : ""}`}
            >
              <button
                type="button"
                onClick={() => setCollapsedKey(pendingKey)}
                aria-label="선택 창 내리고 이야기 읽기"
                aria-expanded
                className="mx-auto flex h-6 w-16 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:hidden"
              >
                <span aria-hidden className="h-1.5 w-10 rounded-full bg-stone-300 dark:bg-stone-600" />
              </button>
              <ChoicePanel
                key={pendingKey}
                pending={pending}
                when={formatMi(life.mi)}
                big={big}
                skipped={skipped}
                ai={ai}
                auto={auto}
                busy={busy}
                sceneLoading={sceneLoading}
                onChoose={act.choose}
                onChooseFree={act.chooseFree}
                onStopAuto={handlers.onToggleAuto}
                onCollapse={() => setCollapsedKey(pendingKey)}
              />
            </section>
          </>
        ) : (
          <div className="sticky bottom-0 z-10 order-3 -mx-4 border-t border-stone-200 bg-[var(--background)]/95 px-4 pt-3 pb-5 backdrop-blur dark:border-stone-800 lg:static lg:order-none lg:mx-0 lg:rounded-2xl lg:border lg:bg-white lg:p-4 lg:backdrop-blur-none dark:lg:bg-stone-900">
            {!following && <JumpButton onClick={jumpToLatest} className="absolute -top-14 left-1/2 -translate-x-1/2 lg:hidden" />}
            {life.dead ? (
              <p className="flex items-center justify-center gap-2 text-center text-stone-500 dark:text-stone-400" role="status">
                <Spinner />
                삶이 끝났습니다. 회고록을 쓰는 중...
              </p>
            ) : (
              <ControlBar
                months={turnLength(life)}
                auto={auto}
                autoDecide={autoDecide}
                speed={speed}
                canAdvance={canAdvance}
                presentOpen={presentOpen}
                handlers={handlers}
                onStep={act.step}
                onSkip={act.skip}
              />
            )}
          </div>
        )}
      </aside>

      <div className="order-2 flex-1 py-4 lg:col-start-1 lg:row-start-1 lg:min-h-dvh lg:py-8">
        <Feed feed={feed} news={news} />
        <p aria-live="polite" className="sr-only">
          {choosing ? `선택의 순간: ${pending.title}` : latest?.text}
        </p>
        {presentOpen && <PresentCard life={life} onClose={handlers.onClosePresent} />}
        {!following && (
          <div className="sticky bottom-6 hidden justify-center pt-4 lg:flex">
            <JumpButton onClick={jumpToLatest} />
          </div>
        )}
      </div>

      {showIntro && <BigMomentIntro pending={pending} onDone={() => setIntroSeen(pendingKey)} />}
      {fx.toast && <BadgeToast ids={fx.toast.ids} toastKey={fx.toast.key} onDone={fx.clearToast} />}
    </div>
  );
}

function turnName(months: number): string {
  if (months === 1) return "다음 달";
  if (months === 12) return "1년 뒤";
  return `${months}개월 뒤`;
}

function spanName(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y && `${y}년`, m && `${m}개월`].filter(Boolean).join(" ");
}

/** The controls between choices, laid out like a player: step, skip, and play/pause with its speed and delegation. */
function ControlBar({
  months,
  auto,
  autoDecide,
  speed,
  canAdvance,
  presentOpen,
  handlers,
  onStep,
  onSkip,
}: {
  months: number;
  auto: boolean;
  autoDecide: boolean;
  speed: Speed;
  canAdvance: boolean;
  presentOpen: boolean;
  handlers: PlayHandlers;
  onStep: () => void;
  onSkip: () => void;
}) {
  if (auto)
    return (
      <div className="space-y-2">
        <Button className="flex w-full items-center justify-center gap-2" onClick={handlers.onToggleAuto} aria-keyshortcuts="A">
          <PauseIcon />
          멈추기
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <Segmented
            label="재생 속도"
            value={speed}
            onChange={handlers.onSpeed}
            options={[
              { value: 1, label: "1×" },
              { value: 2, label: "2×" },
              { value: 4, label: "4×" },
            ]}
          />
          <Switch checked={autoDecide} onChange={handlers.onToggleAutoDecide}>
            선택도 맡기기
          </Switch>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          {autoDecide ? "작은 선택은 성격대로 대신 골라요. 큰 결정은 멈춰서 물어봐요." : "선택이 오면 멈추고 기다려요."}
        </p>
      </div>
    );
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button className="flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap" disabled={!canAdvance} onClick={onStep} aria-keyshortcuts="Space">
          {turnName(months)}
          <span aria-hidden>→</span>
        </Button>
        {/* The icons give way on the narrowest phones so all three fit on one row. */}
        <Button variant="ghost" className="flex shrink-0 items-center gap-1.5 px-3 whitespace-nowrap sm:px-3.5" disabled={!canAdvance} onClick={onSkip} aria-keyshortcuts="Enter">
          <span className="flex max-[359px]:hidden">
            <SkipIcon />
          </span>
          선택까지
        </Button>
        <Button variant="ghost" className="flex shrink-0 items-center gap-1.5 px-3 whitespace-nowrap sm:px-3.5" disabled={presentOpen} onClick={handlers.onToggleAuto} aria-keyshortcuts="A" aria-label="자동 재생">
          <span className="flex max-[359px]:hidden">
            <PlayIcon />
          </span>
          자동
        </Button>
      </div>
      <p className="hidden text-xs text-stone-500 lg:block dark:text-stone-400">
        <Kbd>Space</Kbd> {turnName(months)} · <Kbd>Enter</Kbd> 선택까지 · <Kbd>A</Kbd> 자동 · <Kbd>1</Kbd>~<Kbd>4</Kbd> 선택
      </p>
    </div>
  );
}

function ChoicePanel({
  pending,
  when,
  big,
  skipped,
  ai,
  auto,
  busy,
  sceneLoading,
  onChoose,
  onChooseFree,
  onStopAuto,
  onCollapse,
}: {
  pending: PendingChoice;
  when: string;
  big: boolean;
  skipped: number;
  ai: boolean;
  auto: boolean;
  busy: boolean;
  sceneLoading: boolean;
  onChoose: (id: string) => void;
  onChooseFree: (text: string) => void;
  onStopAuto: () => void;
  onCollapse: () => void;
}) {
  const [free, setFree] = useState("");
  const [writing, setWriting] = useState(false);
  const [more, setMore] = useState(false);
  const long = pending.scene.length > 110;
  const kind = pending.rare ? "✦ 희귀한 순간" : pending.small ? "작은 선택" : big ? "인생의 갈림길" : "선택의 순간";

  return (
    <div className="rise-in space-y-3">
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className={`text-xs font-semibold tracking-wide ${pending.rare ? "text-amber-700 dark:text-amber-300" : "text-indigo-600 dark:text-indigo-400"}`}>
            {kind} <span className="font-normal text-stone-500 tabular-nums dark:text-stone-400">· {when}</span>
          </p>
          <div className="flex shrink-0 items-center gap-1">
            {auto && (
              <button
                type="button"
                onClick={onStopAuto}
                className="-my-1 flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-indigo-950 dark:text-indigo-300"
                aria-label="자동 재생 중, 눌러서 멈추기"
              >
                <PlayIcon small />
                자동 재생 중 · 멈추기
              </button>
            )}
            <button
              type="button"
              onClick={onCollapse}
              className="-my-2 -mr-2 flex items-center gap-0.5 px-2 py-2 text-xs text-stone-500 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:hidden dark:text-stone-400 dark:hover:text-stone-200"
            >
              내리기
              <Chevron />
            </button>
          </div>
        </div>
        {skipped > 0 && <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{spanName(skipped)}을 건너뛰었어요.</p>}
        <h2 className="mt-1 text-lg font-bold text-balance">{pending.title}</h2>
        {sceneLoading ? (
          <div className="mt-2 space-y-2" aria-label="장면을 그리는 중이에요">
            <div className="h-3 rounded-full bg-stone-200 motion-safe:animate-pulse dark:bg-stone-800" />
            <div className="h-3 w-11/12 rounded-full bg-stone-200 motion-safe:animate-pulse dark:bg-stone-800" />
            <div className="h-3 w-3/5 rounded-full bg-stone-200 motion-safe:animate-pulse dark:bg-stone-800" />
            <p className="pt-0.5 text-xs text-stone-500 dark:text-stone-400">장면을 그리는 중이에요</p>
          </div>
        ) : (
          <>
            <p className={`mt-1 leading-relaxed whitespace-pre-line text-stone-700 dark:text-stone-300 ${long && !more ? "line-clamp-3 lg:line-clamp-none" : ""}`}>{pending.scene}</p>
            {long && (
              <button
                type="button"
                onClick={() => setMore(!more)}
                className="-my-1 py-1 text-sm font-semibold text-indigo-700 underline-offset-2 hover:underline lg:hidden dark:text-indigo-300"
              >
                {more ? "접기" : "더 보기"}
              </button>
            )}
          </>
        )}
      </div>
      <div className="space-y-2">
        {pending.options.map((o, i) => (
          <Button key={o.id} variant="choice" disabled={busy || sceneLoading} onClick={() => onChoose(o.id)} aria-keyshortcuts={i < 9 ? String(i + 1) : undefined} className="flex items-start gap-3">
            <Kbd className="mt-0.5 hidden lg:inline-flex">{i + 1}</Kbd>
            <span className="min-w-0">
              {o.label}
              {o.detail && <span className="mt-0.5 block text-xs font-normal text-stone-500 dark:text-stone-400">{o.detail}</span>}
            </span>
          </Button>
        ))}
      </div>
      {ai &&
        pending.freeText &&
        (writing ? (
          <div className="flex gap-2">
            <div className="flex-1">
              <Textarea
                rows={1}
                value={free}
                onChange={(e) => setFree(e.target.value)}
                placeholder="나라면 이렇게 하겠다"
                aria-label="직접 쓰기"
                maxLength={200}
                autoFocus
              />
            </div>
            <Button
              variant="ghost"
              disabled={busy || free.trim().length < 2}
              onClick={() => {
                onChooseFree(free);
                setFree("");
              }}
              className="flex items-center gap-2"
            >
              {busy && <Spinner />}
              {busy ? "읽는 중" : "결정"}
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setWriting(true)}
            disabled={busy || sceneLoading}
            className="-my-1 flex items-center gap-1.5 py-2 text-sm font-semibold text-indigo-700 underline-offset-2 hover:underline disabled:opacity-40 dark:text-indigo-300"
          >
            <PencilIcon />
            직접 쓰기
          </button>
        ))}
    </div>
  );
}

/** A big fork rises into the middle of the screen for a moment, then settles into the sheet below. */
function BigMomentIntro({ pending, onDone }: { pending: PendingChoice; onDone: () => void }) {
  return (
    <div aria-hidden onClick={onDone} className="fixed inset-0 z-40 flex items-center justify-center bg-stone-950/45 p-6 [animation:fadein_.2s_ease-out]">
      <div className="rise-in w-full max-w-sm">
        <div
          className={`rounded-3xl px-6 py-8 text-center shadow-2xl ${pending.rare ? "border-2 border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-950" : "bg-white dark:bg-stone-900"}`}
        >
          <p className={`text-xs font-semibold tracking-widest ${pending.rare ? "text-amber-700 dark:text-amber-300" : "text-indigo-600 dark:text-indigo-400"}`}>
            {pending.rare ? "✦ 희귀한 순간" : "인생의 갈림길"}
          </p>
          <p className="mt-2 text-2xl font-bold text-balance">{pending.title}</p>
          <p className="mt-4 text-xs text-stone-500 dark:text-stone-400">탭하면 바로 고를 수 있어요</p>
        </div>
      </div>
    </div>
  );
}

/** Sound and leaving live behind ⋯ so the control row holds only what moves time. */
function PlayMenu({
  sound,
  onSound,
  news,
  onNews,
  onQuit,
}: {
  sound: boolean;
  onSound: () => void;
  news: NewsMode;
  onNews: (m: NewsMode) => void;
  onQuit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
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
  const item = "flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm hover:bg-stone-100 focus-visible:bg-stone-100 focus-visible:outline-none dark:hover:bg-stone-800 dark:focus-visible:bg-stone-800";
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="메뉴"
        className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-stone-400 dark:hover:bg-stone-800"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute top-11 right-0 z-30 w-48 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-800 dark:bg-stone-900">
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={sound}
            className={item}
            onClick={() => {
              onSound();
              setOpen(false);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M11 5 6 9H2v6h4l5 4z" />
              {sound ? <path d="m22 9-6 6M16 9l6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />}
            </svg>
            {sound ? "효과음 끄기" : "효과음 켜기"}
          </button>
          <div role="group" aria-label="세상 뉴스" className="border-y border-stone-100 py-1 dark:border-stone-800">
            <p className="px-4 pt-1.5 pb-0.5 text-xs font-semibold text-stone-500 dark:text-stone-400">세상 뉴스</p>
            {NEWS_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                role="menuitemradio"
                aria-checked={news === m.value}
                className={`${item} py-2.5`}
                onClick={() => {
                  onNews(m.value);
                  setOpen(false);
                }}
              >
                <span aria-hidden className={`w-[18px] text-center text-indigo-600 dark:text-indigo-400 ${news === m.value ? "" : "invisible"}`}>
                  ✓
                </span>
                {m.label}
              </button>
            ))}
          </div>
          <button type="button" role="menuitem" className={item} onClick={onQuit}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            저장하고 나가기
          </button>
        </div>
      )}
    </div>
  );
}

function JumpButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold whitespace-nowrap text-white shadow-lg hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 ${className}`}
    >
      ↓ 최신 내용 보기
    </button>
  );
}

// Pass a display class (inline-flex, or hidden lg:inline-flex) in className, so it can't fight a built-in one.
function Kbd({ children, className = "inline-flex" }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={`min-w-5 items-center justify-center rounded border border-stone-300 bg-stone-50 px-1 font-sans text-[11px] leading-4 font-semibold text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 ${className}`}
    >
      {children}
    </kbd>
  );
}

const icon = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Chevron({ up = false }: { up?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...icon} aria-hidden>
      <path d={up ? "m18 15-6-6-6 6" : "m6 9 6 6 6-6"} />
    </svg>
  );
}

function PlayIcon({ small = false }: { small?: boolean }) {
  const s = small ? 12 : 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 4.5v15l12.5-7.5z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="4.5" width="4" height="15" rx="1" />
      <rect x="14" y="4.5" width="4" height="15" rx="1" />
    </svg>
  );
}

function SkipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4 5v14l9-7zM13 5v14l7-7z" />
      <rect x="19" y="5" width="2.2" height="14" rx="1" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" {...icon} aria-hidden>
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

/**
 * Watches the life for moments worth a little show: a new year, a choice's outcome, a badge, a big swing in a stat.
 * Each is derived while rendering by comparing with what was last seen, so no effect has to set state.
 */
function usePlayFx(life: LifeState) {
  const year = Math.floor(life.mi / 12);
  const sceneKey = JSON.stringify(sceneOf(life));
  const scene = useMemo(() => JSON.parse(sceneKey) as SceneState, [sceneKey]);

  const [seen, setSeen] = useState({ mi: life.mi, year, log: life.log.length, badges: life.badges?.length ?? 0, stats: life.stats });
  const [stepping, setStepping] = useState(0); // counts up each time the calendar moves, so the street walks for that step
  const [banner, setBanner] = useState<number | null>(null);
  const [roll, setRoll] = useState<Roll | null>(null);
  const [toast, setToast] = useState<{ ids: string[]; key: number } | null>(null);
  const [swing, setSwing] = useState<Partial<Record<StatKey, "up" | "down">>>({});
  const [swingKey, setSwingKey] = useState(0);

  const badgeCount = life.badges?.length ?? 0;
  if (seen.mi !== life.mi || seen.year !== year || seen.log !== life.log.length || seen.badges !== badgeCount || seen.stats !== life.stats) {
    if (year > seen.year) setBanner(year);
    if (life.mi > seen.mi) setStepping((n) => n + 1);
    // A choice just resolved: it logs the choice and then its outcome.
    const added = life.log.slice(seen.log);
    const outcome = added.findLast((e) => e.kind === "outcome");
    if (outcome && added.some((e) => e.kind === "choice")) setRoll(rollOf(outcome, life.log.length));
    if (badgeCount > seen.badges) setToast({ ids: life.badges!.slice(seen.badges).map((b) => b.id), key: badgeCount });
    const sw = bigSwings(seen.stats, life.stats);
    if (Object.keys(sw).length) {
      setSwing(sw);
      setSwingKey((k) => k + 1);
    }
    setSeen({ mi: life.mi, year, log: life.log.length, badges: badgeCount, stats: life.stats });
  }

  // One step of time walks the street for a moment; auto play keeps it walking because steps keep coming.
  const [walking, setWalking] = useState(false);
  const [walkedFor, setWalkedFor] = useState(0);
  if (walkedFor !== stepping) {
    setWalkedFor(stepping);
    setWalking(stepping > 0);
  }
  useEffect(() => {
    if (!stepping) return;
    const t = setTimeout(() => setWalking(false), 900);
    return () => clearTimeout(t);
  }, [stepping]);

  return {
    scene,
    walking,
    banner,
    clearBanner: useCallback(() => setBanner(null), []),
    roll,
    clearRoll: useCallback(() => setRoll(null), []),
    toast,
    clearToast: useCallback(() => setToast(null), []),
    swing,
    swingKey,
  };
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

export type NewsMode = "full" | "headline" | "hidden";
const NEWS_MODES: { value: NewsMode; label: string }[] = [
  { value: "full", label: "펼쳐 보기" },
  { value: "headline", label: "헤드라인만" },
  { value: "hidden", label: "숨기기" },
];
const NEWS_KEY = "whatif.news";

function loadNewsPref(): NewsMode {
  try {
    const v = localStorage.getItem(NEWS_KEY);
    return v === "full" || v === "hidden" ? v : "headline";
  } catch {
    return "headline";
  }
}

function saveNewsPref(m: NewsMode) {
  try {
    localStorage.setItem(NEWS_KEY, m);
  } catch {
    // Private mode or blocked storage: the choice lasts for this visit only.
  }
}

type FeedItem =
  | { type: "date"; mi: number }
  | { type: "world"; items: LogEntry[] }
  | { type: "reaction"; entry: LogEntry; headline: string }
  | { type: "choice"; title: string; picked: string; outcome?: LogEntry }
  | { type: "line"; entry: LogEntry };

/** "한일 월드컵에서 대표팀이 4강에 올랐다. 거리가…" → its first sentence. */
function headlineOf(text: string): string {
  return text.split("\n")[0].split(/(?<=[다요]\.)\s/)[0];
}

/**
 * Sorts the log into what the feed draws: a date pill per month, the month's headlines in one box off the spine,
 * how a headline touched this life as the player's own line, and each choice (title, answer, result) as one card.
 */
function feedItems(feed: LogEntry[]): FeedItem[] {
  const out: FeedItem[] = [];
  for (let i = 0; i < feed.length; i++) {
    const e = feed[i];
    if (i === 0 || feed[i - 1].mi !== e.mi) out.push({ type: "date", mi: e.mi });
    if (e.kind === "news") {
      const items: LogEntry[] = [];
      while (i < feed.length && feed[i].kind === "news" && feed[i].mi === e.mi) items.push(feed[i++]);
      i--;
      out.push({ type: "world", items });
      for (const n of items) {
        // Saves from before reactions had their own field keep the reaction on the headline's last line.
        const reaction = n.reaction ?? (n.delta || n.money ? n.text.split("\n").slice(1).join("\n") : "");
        if (reaction) out.push({ type: "reaction", entry: { ...n, text: reaction }, headline: headlineOf(n.text) });
      }
      continue;
    }
    // The engine logs a choice as: the event's title, "title: answer", then the result.
    const titled = e.kind === "event" && !e.delta && !e.money && !e.rare && feed[i + 1]?.kind === "choice" && feed[i + 1].text.startsWith(`${e.text}: `);
    if (titled || e.kind === "choice") {
      const c = titled ? feed[++i] : e;
      const title = titled ? e.text : c.text.split(": ")[0];
      const picked = c.text.slice(title.length + 2) || c.text;
      const outcome = feed[i + 1]?.kind === "outcome" && feed[i + 1].mi === c.mi ? feed[++i] : undefined;
      out.push({ type: "choice", title, picked, outcome });
      continue;
    }
    out.push({ type: "line", entry: e });
  }
  return out;
}

/** The feed as a timeline: the line and its dots belong to the player alone; the world sits beside it, folded. */
function Feed({ feed, news }: { feed: LogEntry[]; news: NewsMode }) {
  const items = useMemo(() => feedItems(feed), [feed]);
  return (
    <ol className="relative space-y-2.5 pl-6 before:absolute before:top-3 before:bottom-2 before:left-[7px] before:w-0.5 before:rounded-full before:bg-indigo-100 dark:before:bg-indigo-950">
      {items.map((it, i) => {
        switch (it.type) {
          case "date":
            return (
              <li key={i} className={`-ml-6 ${i === 0 ? "" : "pt-3"}`}>
                <span className="relative inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 tabular-nums dark:bg-indigo-950 dark:text-indigo-300">
                  {formatMi(it.mi)}
                </span>
              </li>
            );
          case "world":
            return news === "hidden" ? null : <WorldBox key={i} items={it.items} open={news === "full"} />;
          case "reaction":
            return (
              <Spine key={i}>
                <span className="block truncate text-xs font-semibold text-amber-700 dark:text-amber-400">↳ {it.headline}</span>
                <span className="leading-relaxed">
                  {it.entry.text}
                  <DeltaChips delta={it.entry.delta} money={it.entry.money} />
                </span>
              </Spine>
            );
          case "choice":
            return <ChoiceCard key={i} title={it.title} picked={it.picked} outcome={it.outcome} />;
          case "line":
            return <LogLine key={i} entry={it.entry} />;
        }
      })}
    </ol>
  );
}

/** A spot on the player's line. Filled dots mark the moments that changed the course. */
function Spine({ children, filled = false, className = "" }: { children: ReactNode; filled?: boolean; className?: string }) {
  return (
    <li className={`relative ${className}`}>
      <span
        aria-hidden
        className={`absolute top-[7px] -left-[22px] h-2.5 w-2.5 rounded-full border-2 border-indigo-500 dark:border-indigo-400 ${
          filled ? "bg-indigo-500 dark:bg-indigo-400" : "bg-[var(--background)]"
        }`}
      />
      {children}
    </li>
  );
}

/** The world's news for one date. Full or headline-only follows the ⋯ menu setting; the box itself has no toggle. */
function WorldBox({ items, open }: { items: LogEntry[]; open: boolean }) {
  return (
    <li className="rounded-lg border border-dashed border-amber-300 bg-amber-50/60 px-3 py-2 text-[13px] text-stone-600 dark:border-amber-900 dark:bg-amber-950/20 dark:text-stone-400">
      <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">그때 세상은 · {items.length}</p>
      <ul className={open ? "mt-1 space-y-1.5" : "mt-0.5"}>
        {items.map((n, j) => {
          const [cat, month] = (n.tag ?? "").split(" · ");
          return open ? (
            <li key={j}>
              {n.tag && <span className="block text-[11px] font-semibold text-amber-700/80 dark:text-amber-400/80">{`${month} · ${cat}`}</span>}
              <span className="whitespace-pre-line leading-relaxed">{n.text.split("\n")[0]}</span>
            </li>
          ) : (
            <li key={j} className="truncate">
              {month && <span className="mr-1.5 text-[11px] font-semibold text-amber-700 tabular-nums dark:text-amber-400">{month}</span>}
              {headlineOf(n.text)}
            </li>
          );
        })}
      </ul>
    </li>
  );
}

function ChoiceCard({ title, picked, outcome }: { title: string; picked: string; outcome?: LogEntry }) {
  const rare = !!outcome?.rare;
  return (
    <Spine filled>
      <div className={`rounded-xl px-3.5 py-2.5 ${rare ? "border-2 border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-950/50" : "bg-indigo-50 dark:bg-indigo-950/60"}`}>
        <p className={`text-[11px] font-semibold ${rare ? "text-amber-700 dark:text-amber-300" : "text-indigo-600 dark:text-indigo-400"}`}>
          {rare ? "✦ 희귀한 순간" : "선택"} · {title}
        </p>
        <p className="font-semibold text-indigo-800 dark:text-indigo-200">{picked}</p>
        {outcome && (
          <p className="mt-1 leading-relaxed">
            {outcome.text}
            <DeltaChips delta={outcome.delta} money={outcome.money} />
          </p>
        )}
      </div>
    </Spine>
  );
}

function LogLine({ entry }: { entry: LogEntry }) {
  switch (entry.kind) {
    case "era":
      return <li className="-ml-6 whitespace-pre-line rounded-xl bg-stone-100 px-4 py-3 text-[15px] leading-relaxed text-stone-700 dark:bg-stone-900 dark:text-stone-300">{entry.text}</li>;
    case "news":
      return null;
    case "turn":
      return (
        <Spine className="text-sm text-stone-500 dark:text-stone-400">
          {entry.facts?.map((f) => (
            <span key={f} className="mr-1 inline-block rounded-full border border-stone-300 px-2 py-px text-xs text-stone-600 tabular-nums dark:border-stone-700 dark:text-stone-300">
              {f}
            </span>
          ))}
          {entry.text}
        </Spine>
      );
    case "event":
    case "outcome":
      if (entry.rare) return <RareLine entry={entry} />;
      return (
        <Spine filled={entry.kind === "event"} className={entry.kind === "event" ? "font-semibold" : "leading-relaxed"}>
          {entry.text}
          <DeltaChips delta={entry.delta} money={entry.money} />
        </Spine>
      );
    case "choice":
      return null;
    case "present":
    case "milestone":
      return (
        <Spine filled>
          <p className="rounded-xl border border-indigo-300 px-4 py-3 font-semibold text-indigo-800 dark:border-indigo-800 dark:text-indigo-300">{entry.text}</p>
        </Spine>
      );
    case "death":
      return (
        <Spine filled>
          <p className="rounded-xl bg-stone-900 px-4 py-3 text-center font-semibold text-stone-50 dark:bg-stone-100 dark:text-stone-900">{entry.text}</p>
        </Spine>
      );
  }
}

function RareLine({ entry }: { entry: LogEntry }) {
  return (
    <Spine filled>
      <div className="rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3 dark:border-amber-500 dark:bg-amber-950/50">
        <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">✦ 희귀한 순간</p>
        <p className="mt-0.5 font-semibold leading-relaxed">
          {entry.text}
          <DeltaChips delta={entry.delta} money={entry.money} />
        </p>
      </div>
    </Spine>
  );
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
          <p className="text-xs text-stone-500 dark:text-stone-400">현실의 나</p>
          <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed">{life.profile.currentLife || "현실의 삶을 입력하지 않았어요."}</p>
        </div>
        <div className="rounded-xl bg-indigo-50 p-4 dark:bg-indigo-950">
          <p className="text-xs text-stone-500 dark:text-stone-400">이 가지의 나 · {ageOf(life)}세</p>
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
