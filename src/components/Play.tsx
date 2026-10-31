"use client";

import { type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type RefObject, type TouchEvent as ReactTouchEvent, useCallback, useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState } from "react";
import { costBreakdown, costTotal, monthlyCosts } from "@/lib/budget";
import { ageOf } from "@/lib/events";
import { formatMi, formatWealth, isBigChoice, pendingKeyOf, payLabel, statusLabel, turnLength } from "@/lib/engine";
import { consequenceOf, degreeLine, markerFor, markerId, playMode, type Milestone } from "@/lib/playUi";
import { sceneOf, type SceneState } from "@/lib/scene";
import { loadSoundPref, setSound, sfx } from "@/lib/sound";
import type { LifeChapter, LifeState, LogEntry, PendingChoice, StatKey } from "@/lib/types";
import { AboutDialog, versionLabel } from "./About";
import { BoardDialog } from "./Board";
import { ConsequenceView, DecisionPanel, type FreeResult, ProgressDock, TimelineDock } from "./Decision";
import { FeedbackDialog } from "./Feedback";
import { BadgeToast, bigSwings, DiceRoll, rollOf, type Roll, YearBanner } from "./GameFx";
import { LifeHud, useCompactHud } from "./LifeHud";
import { LifeScene } from "./LifeScene";
import { MilestoneDialog } from "./Milestones";
import { Button, Card, DeltaChips, Spinner, StatBars } from "./ui";
import { L } from "@/lib/i18n";
import { ageText } from "@/lib/format";

export type { FreeResult };

export interface PlayHandlers {
  onStep: () => void;
  onProgress: () => void; // 선택까지 진행: time runs until the next choice that is the player's to make
  onStop: () => void;
  onToggleAutoDecide: () => void;
  onChoose: (optionId: string) => void;
  onChooseFree: (text: string, force?: boolean) => Promise<FreeResult>;
  onClosePresent: () => void;
  onQuit: () => void;
}

/**
 * Phones: the Life HUD fixed on top (compact once the timeline is scrolled), the timeline, and one thing at the
 * bottom that depends on the mode: the step and progress buttons, the progress status with 멈추기, the choice sheet,
 * or the choice's result. Desktop: the timeline on the left, and a sticky side column with the HUD and that panel.
 * The HUD and the panel live in one <aside> that is display:contents on phones, so the same elements serve both.
 */
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
  const { following, jumpToLatest, scrollToMarker } = useFollowLatest(root);
  const age = ageOf(life);
  const fx = usePlayFx(life);
  const [sound, setSoundOn] = useState(loadSoundPref);
  const [news, setNews] = useState(loadNewsPref);
  const [keys, setKeys] = useState(loadKeysPref);
  const [path, setPath] = useState(false);
  const pendingKey = pendingKeyOf(life);
  // Each new choice card rises in with a whoosh.
  useEffect(() => {
    if (pendingKey) sfx.flip();
  }, [pendingKey]);

  const pending = life.pending;
  const big = !!pending && isBigChoice(pending);

  // The life just before the player's own choice, so the result step can show what it changed. Cleared when
  // the player carries on. A choice picked for them during progress is not theirs, so it shows no result step.
  const [chosenFrom, setChosenFrom] = useState<LifeState | null>(null);
  const consequence = useMemo(() => (chosenFrom ? consequenceOf(chosenFrom, life) : null), [chosenFrom, life]);

  const mode = playMode({ dead: life.dead, presentOpen, consequence: !!consequence, pending: !!pending, big, busy, auto, autoDecide });
  const choosing = mode === "decision" || mode === "submitting-choice";
  // The engine logs a choice event's title as it stops; the choice sheet already shows it, so drop that line from the feed.
  const last = life.log.at(-1);
  const hideLast = !!pending && last?.kind === "event" && last.mi === life.mi && last.text === pending.title;
  const feed = hideLast ? life.log.slice(0, -1) : life.log;
  const latest = feed.at(-1);

  // Per choice: whether the sheet is pulled down, and whether its big-moment card has been shown.
  const [collapsedKey, setCollapsedKey] = useState<string | null>(null);
  const collapsed = choosing && collapsedKey === pendingKey;
  const sheetRef = useSheetDrag(choosing && !collapsed, () => setCollapsedKey(pendingKey));
  const pillDrag = useSwipeUp(() => setCollapsedKey(null));
  const [introSeen, setIntroSeen] = useState<string | null>(null);
  const showIntro = choosing && big && introSeen !== pendingKey;
  useEffect(() => {
    if (!showIntro) return;
    const t = setTimeout(() => setIntroSeen(pendingKey), 1500);
    return () => clearTimeout(t);
  }, [showIntro, pendingKey]);

  // 선택까지 진행 remembers where it started, so the sheet can say how much time went by.
  const [skipFrom, setSkipFrom] = useState<number | null>(null);
  const skipped = choosing && skipFrom !== null && life.mi > skipFrom ? life.mi - skipFrom : 0;
  const act = {
    step: () => {
      setSkipFrom(null);
      handlers.onStep();
    },
    progress: () => {
      setSkipFrom(life.mi);
      handlers.onProgress();
    },
    choose: (id: string) => {
      if (mode !== "decision") return; // one answer per choice, even with a double tap or a key held down
      setSkipFrom(null);
      setChosenFrom(life);
      handlers.onChoose(id);
    },
    chooseFree: async (text: string, force?: boolean) => {
      setSkipFrom(null);
      const from = life;
      const r = await handlers.onChooseFree(text, force);
      if (r === "ok") setChosenFrom(from);
      return r;
    },
    carryOn: () => setChosenFrom(null),
  };

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    const t = e.target as HTMLElement | null;
    if (t?.closest("input, textarea, select, [contenteditable=true], [role=menu], dialog")) return;
    // A focused button already answers Space and Enter itself.
    if ((e.key === " " || e.key === "Enter") && t?.closest("button, a")) return;
    if (e.key === "Escape" && showIntro) return setIntroSeen(pendingKey);
    // Single keys can be turned off in the ⋯ menu, for voice control and anyone who presses them by accident.
    if (!keys) return;
    if (mode === "decision" && pending) {
      const n = Number(e.key);
      if (n >= 1 && n <= pending.options.length && !sceneLoading) {
        e.preventDefault();
        setIntroSeen(pendingKey);
        act.choose(pending.options[n - 1].id);
      }
    } else if (mode === "consequence" && e.key === "Enter") {
      e.preventDefault();
      act.carryOn();
    } else if (mode === "timeline" && e.key === " ") {
      e.preventDefault();
      act.step();
    } else if (mode === "timeline" && (e.key === "Enter" || e.key === "a" || e.key === "A")) {
      e.preventDefault();
      act.progress();
    } else if (mode === "progressing" && (e.key === "a" || e.key === "A")) handlers.onStop();
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Choosing, answering, folding the sheet and starting or stopping progress each take the focused control off the page.
  // When that leaves focus nowhere, hand it to what took its place, so keyboard and screen reader users keep their spot.
  useEffect(() => {
    const a = document.activeElement;
    if (a && a !== document.body) return;
    const target = mode === "consequence" ? "consequence" : choosing ? (collapsed ? "pill" : "choice") : mode === "present" ? "present" : "controls";
    root.current?.querySelector<HTMLElement>(`[data-focus="${target}"]:not(:disabled)`)?.focus({ preventScroll: true });
  }, [mode, choosing, collapsed, pendingKey]);

  // During progress every turn would be read aloud several times a second, so only the year and rare moments are.
  const announce =
    mode === "consequence"
      ? ""
      : choosing && pending
        ? sceneLoading
          ? L("선택의 순간")
          : L`선택의 순간: ${pending.title}`
        : mode === "progressing" && !latest?.rare
          ? L`${Math.floor(life.mi / 12)}년`
          : latest?.text;

  // The HUD is fixed on phones; a spacer holds its full height in the page, so turning compact never shifts the story.
  const compact = useCompactHud();
  const hud = useRef<HTMLElement>(null);
  const [hudH, setHudH] = useState(0);
  const compactRef = useRef(compact);
  useLayoutEffect(() => {
    compactRef.current = compact;
  }, [compact]);
  useLayoutEffect(() => {
    const el = hud.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (!compactRef.current) setHudH(el.offsetHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const goTo = (m: Milestone) => {
    setPath(false);
    // Reading the past: fold the choice sheet so the story has the screen; the pill brings it back.
    if (choosing) setCollapsedKey(pendingKey);
    const marks = [...(root.current?.querySelectorAll<HTMLElement>("[data-mi]") ?? [])].map((x) => Number(x.dataset.mi));
    const mi = markerFor(m.mi, marks);
    if (mi !== null) requestAnimationFrame(() => scrollToMarker(mi, hudH));
  };

  const sheetOpen = mode === "consequence" || (choosing && !collapsed);
  const menu = (
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
      keys={keys}
      onKeys={() => {
        saveKeysPref(!keys);
        setKeys(!keys);
      }}
      onPath={() => setPath(true)}
      where={L`${life.profile.name || L("나")} · ${age}세 · ${formatMi(life.mi)}`}
      onQuit={handlers.onQuit}
    />
  );

  return (
    <div ref={root} data-mode={mode} className="flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-10">
      <div aria-hidden className="order-1 lg:hidden" style={{ height: hudH }} />
      <aside className="contents lg:sticky lg:top-0 lg:col-start-2 lg:row-start-1 lg:flex lg:max-h-dvh lg:flex-col lg:gap-4 lg:overflow-y-auto lg:overscroll-contain lg:-mx-2 lg:px-2 lg:py-6">
        <header
          ref={hud}
          aria-label={L("지금의 삶")}
          data-compact={compact || undefined}
          className={`fixed inset-x-0 top-0 z-20 mx-auto max-w-2xl border-b border-stone-200 bg-[var(--background)]/95 px-4 pt-[var(--hud-pad-top)] backdrop-blur transition-[padding] duration-200 motion-reduce:transition-none dark:border-stone-800 lg:relative lg:inset-auto lg:z-20 lg:mx-0 lg:max-w-none lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none ${compact ? "pb-2" : "pb-3"}`}
        >
          <LifeHud
            life={life}
            compact={compact}
            menu={menu}
            flash={fx.swing}
            flashKey={fx.swingKey}
            scene={
              <LifeScene scene={fx.scene} slim={compact || sheetOpen} paused={!(auto || fx.walking) || !!pending || life.dead || presentOpen}>
                {fx.banner && <YearBanner year={fx.banner} onDone={fx.clearBanner} />}
                {fx.roll && <DiceRoll roll={fx.roll} onDone={fx.clearRoll} />}
              </LifeScene>
            }
          />
        </header>

        {mode === "consequence" && consequence ? (
          <section
            aria-label={L("선택의 결과")}
            className="sheet-up sticky bottom-0 z-10 order-3 -mx-4 max-h-[var(--sheet-max)] overflow-y-auto overscroll-contain rounded-t-3xl bg-white px-4 pt-4 pb-[var(--dock-pad-bottom)] shadow-[0_-10px_30px_rgb(0_0_0/0.10)] dark:bg-stone-900 dark:shadow-[0_-10px_30px_rgb(0_0_0/0.5)] lg:static lg:order-none lg:mx-0 lg:max-h-none lg:overflow-visible lg:rounded-2xl lg:border lg:border-stone-200 lg:p-5 lg:shadow-none dark:lg:border-stone-800"
          >
            <ConsequenceView c={consequence} when={formatMi(consequence.mi)} onDone={act.carryOn} />
          </section>
        ) : choosing && pending ? (
          <>
            {collapsed && (
              <div className="sticky bottom-0 z-10 order-3 -mx-4 px-4 pt-2 pb-[var(--dock-pad-bottom)] lg:hidden">
                <button
                  type="button"
                  data-focus="pill"
                  onClick={() => setCollapsedKey(null)}
                  {...pillDrag}
                  aria-expanded={false}
                  className="flex min-h-12 w-full items-center justify-between gap-3 rounded-full bg-indigo-600 px-5 py-3.5 text-left text-[15px] font-semibold text-white shadow-lg hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 dark:bg-indigo-500"
                >
                  <span className="min-w-0 truncate">{sceneLoading ? L("다음 장면이 펼쳐지고 있어요") : L`선택의 순간 · ${pending.title}`}</span>
                  <span className="flex shrink-0 items-center gap-1 text-sm">
                    {L("펼치기")}
                    <Chevron up />
                  </span>
                </button>
              </div>
            )}
            <section
              ref={sheetRef}
              aria-label={L("선택의 순간")}
              className={`sheet-up sticky bottom-0 z-10 order-3 -mx-4 max-h-[var(--sheet-max)] overflow-y-auto overscroll-contain rounded-t-3xl bg-white px-4 pt-1 pb-[var(--dock-pad-bottom)] shadow-[0_-10px_30px_rgb(0_0_0/0.10)] dark:bg-stone-900 dark:shadow-[0_-10px_30px_rgb(0_0_0/0.5)] lg:static lg:order-none lg:mx-0 lg:max-h-none lg:overflow-visible lg:rounded-2xl lg:border lg:p-5 lg:shadow-none ${
                pending.rare ? "border-2 border-b-0 border-amber-400 dark:border-amber-500 lg:border-b-2" : "lg:border-stone-200 dark:lg:border-stone-800"
              } ${collapsed ? "max-lg:hidden" : ""}`}
            >
              <button
                type="button"
                onClick={() => setCollapsedKey(pendingKey)}
                aria-label={L("선택 창 내리고 이야기 읽기")}
                aria-expanded
                className="mx-auto flex h-8 w-16 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:hidden"
              >
                <span aria-hidden className="h-1.5 w-10 rounded-full bg-stone-300 dark:bg-stone-600" />
              </button>
              <DecisionPanel
                key={pendingKey}
                pending={pending}
                when={formatMi(life.mi)}
                big={big}
                skipped={skipped}
                ai={ai}
                keys={keys}
                busy={busy}
                sceneLoading={sceneLoading}
                onChoose={act.choose}
                onChooseFree={act.chooseFree}
              />
            </section>
          </>
        ) : mode === "present" ? null : (
          <div className="sticky bottom-0 z-10 order-3 -mx-4 border-t border-stone-200 bg-[var(--background)]/95 px-4 pt-3 pb-[var(--dock-pad-bottom)] backdrop-blur dark:border-stone-800 lg:static lg:order-none lg:mx-0 lg:rounded-2xl lg:border lg:bg-white lg:p-4 lg:backdrop-blur-none dark:lg:bg-stone-900">
            {!following && <CurrentPositionButton onClick={jumpToLatest} className="absolute -top-14 left-1/2 -translate-x-1/2 lg:hidden" />}
            {mode === "ending" ? (
              <p className="flex items-center justify-center gap-2 text-center text-stone-600 dark:text-stone-400" role="status">
                <Spinner />
                {L("삶이 끝났습니다. 회고록을 쓰는 중...")}
              </p>
            ) : mode === "progressing" ? (
              <ProgressDock when={formatMi(life.mi)} autoDecide={autoDecide} keys={keys} onStop={handlers.onStop} onToggleAutoDecide={handlers.onToggleAutoDecide} />
            ) : (
              <TimelineDock months={turnLength(life)} keys={keys} onStep={act.step} onProgress={act.progress} />
            )}
          </div>
        )}
      </aside>

      {/* While the sheet leads, the story behind it steps back; folding the sheet brings it forward again. */}
      <div className={`order-2 flex-1 py-4 transition-opacity duration-300 motion-reduce:transition-none lg:col-start-1 lg:row-start-1 lg:min-h-dvh lg:py-8 ${sheetOpen ? "max-lg:opacity-60" : ""}`}>
        <Feed feed={feed} news={news} chapters={life.chapters} />
        <p aria-live="polite" className="sr-only">
          {announce}
        </p>
        {presentOpen && <PresentCard life={life} onClose={handlers.onClosePresent} />}
        {!following && (
          <div className="sticky bottom-6 hidden justify-center pt-4 lg:flex">
            <CurrentPositionButton onClick={jumpToLatest} />
          </div>
        )}
      </div>

      {showIntro && pending && <BigMomentIntro pending={pending} showTitle={!sceneLoading} onDone={() => setIntroSeen(pendingKey)} />}
      {fx.toast && <BadgeToast ids={fx.toast.ids} toastKey={fx.toast.key} onDone={fx.clearToast} />}
      <MilestoneDialog open={path} life={life} onClose={() => setPath(false)} onPick={goTo} />
    </div>
  );
}

/** A big fork rises into the middle of the screen for a moment, then settles into the sheet below. */
function BigMomentIntro({ pending, showTitle, onDone }: { pending: PendingChoice; showTitle: boolean; onDone: () => void }) {
  return (
    <div aria-hidden onClick={onDone} className="fixed inset-0 z-40 flex items-center justify-center bg-stone-950/45 p-6 [animation:fadein_.2s_ease-out]">
      <div className="rise-in w-full max-w-sm">
        <div
          className={`rounded-3xl px-6 py-8 text-center shadow-2xl ${pending.rare ? "border-2 border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-950" : "bg-white dark:bg-stone-900"}`}
        >
          {/* While the scene is being written its title stays hidden too, so the card names only the kind of moment. */}
          <p className={`font-semibold ${showTitle ? "text-xs tracking-widest" : "text-2xl"} ${pending.rare ? "text-amber-700 dark:text-amber-300" : "text-indigo-600 dark:text-indigo-400"}`}>
            {pending.rare ? L("✦ 희귀한 순간") : L("인생의 갈림길")}
          </p>
          {showTitle && <p className="mt-2 text-2xl font-bold text-balance">{pending.title}</p>}
          <p className="mt-4 text-xs text-stone-500 dark:text-stone-400">{L("탭하면 바로 고를 수 있어요")}</p>
        </div>
      </div>
    </div>
  );
}

/** Sound, the memoir board, feedback, the about sheet and leaving live behind ⋯ so the control row holds only what moves time. */
function PlayMenu({
  sound,
  onSound,
  news,
  onNews,
  keys,
  onKeys,
  onPath,
  where,
  onQuit,
}: {
  sound: boolean;
  onSound: () => void;
  news: NewsMode;
  onNews: (m: NewsMode) => void;
  keys: boolean;
  onKeys: () => void;
  onPath: () => void;
  where: string;
  onQuit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [writing, setWriting] = useState(false);
  const [reading, setReading] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  // Opening moves focus to the first item; a press outside closes it.
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>("[role^=menuitem]")?.focus();
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);
  // Arrow keys, Home and End move between items; Escape closes and returns to ⋯; Tab leaves and closes.
  const onMenuKey = (e: ReactKeyboardEvent) => {
    const items = [...(menu.current?.querySelectorAll<HTMLElement>("[role^=menuitem]") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: items.length - 1 }[e.key];
    if (to !== undefined) {
      e.preventDefault();
      items[(to + items.length) % items.length]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") setOpen(false);
  };
  const item = "flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm hover:bg-stone-100 focus-visible:bg-stone-100 focus-visible:outline-none dark:hover:bg-stone-800 dark:focus-visible:bg-stone-800";
  return (
    <div ref={box} className="relative">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={L("메뉴")}
        className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-stone-400 dark:hover:bg-stone-800"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open && (
        <div ref={menu} role="menu" aria-label={L("메뉴")} onKeyDown={onMenuKey} className="absolute top-11 right-0 z-30 w-48 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-800 dark:bg-stone-900">
          <button
            type="button"
            role="menuitem"
            aria-haspopup="dialog"
            className={`${item} border-b border-stone-100 font-semibold dark:border-stone-800`}
            onClick={() => {
              setOpen(false);
              onPath();
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="6" cy="19" r="2" />
              <circle cx="18" cy="5" r="2" />
              <path d="M8 19h7a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h7" />
            </svg>
            {L("지나온 길")}
          </button>
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={sound}
            className={item}
            onClick={() => {
              onSound();
              close();
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M11 5 6 9H2v6h4l5 4z" />
              {sound ? <path d="m22 9-6 6M16 9l6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />}
            </svg>
            {sound ? L("효과음 끄기") : L("효과음 켜기")}
          </button>
          <div role="group" aria-label={L("세상 뉴스")} className="border-y border-stone-100 py-1 dark:border-stone-800">
            <p className="px-4 pt-1.5 pb-0.5 text-xs font-semibold text-stone-500 dark:text-stone-400">{L("세상 뉴스")}</p>
            {NEWS_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                role="menuitemradio"
                aria-checked={news === m.value}
                className={`${item} py-2.5`}
                onClick={() => {
                  onNews(m.value);
                  close();
                }}
              >
                <span aria-hidden className={`w-[18px] text-center text-indigo-600 dark:text-indigo-400 ${news === m.value ? "" : "invisible"}`}>
                  ✓
                </span>
                {m.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={keys}
            className={`${item} border-b border-stone-100 dark:border-stone-800`}
            onClick={() => {
              onKeys();
              close();
            }}
          >
            <span aria-hidden className={`w-[18px] text-center text-indigo-600 dark:text-indigo-400 ${keys ? "" : "invisible"}`}>
              ✓
            </span>
            {L("키보드 단축키")}
          </button>
          <button
            type="button"
            role="menuitem"
            aria-haspopup="dialog"
            className={item}
            onClick={() => {
              setOpen(false);
              setBrowsing(true);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />
            </svg>
            {L("회고록 게시판")}
          </button>
          <button
            type="button"
            role="menuitem"
            aria-haspopup="dialog"
            className={item}
            onClick={() => {
              setOpen(false);
              setWriting(true);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-10 6L2 7" />
            </svg>
            {L("의견 보내기")}
          </button>
          <button
            type="button"
            role="menuitem"
            aria-haspopup="dialog"
            className={item}
            onClick={() => {
              setOpen(false);
              setReading(true);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            {L("서비스 소개")}
          </button>
          <button type="button" role="menuitem" className={item} onClick={onQuit}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            {L("저장하고 나가기")}
          </button>
          <p className="border-t border-stone-100 px-4 pt-2 pb-1.5 text-[11px] text-stone-500 tabular-nums dark:border-stone-800 dark:text-stone-400">What If {versionLabel}</p>
        </div>
      )}
      <AboutDialog
        open={reading}
        onClose={() => {
          setReading(false);
          trigger.current?.focus();
        }}
      />
      <BoardDialog
        open={browsing}
        onClose={() => {
          setBrowsing(false);
          trigger.current?.focus();
        }}
      />
      <FeedbackDialog
        open={writing}
        where={where}
        onClose={() => {
          setWriting(false);
          trigger.current?.focus();
        }}
      />
    </div>
  );
}

/**
 * Shown only while the player reads the past: back to now. A quiet pill, so it never outranks the panel below.
 * It hides itself once the timeline is back at the bottom (useFollowLatest).
 */
function CurrentPositionButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-full border border-indigo-200 bg-white/95 px-4 py-2 text-sm font-semibold whitespace-nowrap text-indigo-700 shadow-md backdrop-blur hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:border-indigo-900 dark:bg-stone-900/95 dark:text-indigo-300 dark:hover:bg-indigo-950 ${className}`}
    >
      {L("↓ 현재로 돌아가기")}
    </button>
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
const DISMISS_PX = 90;
const FLICK_PX_PER_MS = 0.5;

/**
 * On phones, pulling the choice sheet down puts it away, like the 내리기 button. The pull only starts
 * when the sheet is scrolled to its top, so reading a long scene still scrolls as usual.
 */
function useSheetDrag(active: boolean, onDismiss: () => void) {
  const ref = useRef<HTMLElement | null>(null);
  const dismiss = useEffectEvent(onDismiss);
  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return;
    let startY = 0;
    let startT = 0;
    let dy = 0;
    let armed = false;
    let dragging = false;
    const phone = () => !window.matchMedia("(min-width: 1024px)").matches;
    const reset = () => {
      el.style.transition = "transform 0.2s ease-out";
      el.style.transform = "";
      const clear = () => (el.style.transition = "");
      el.addEventListener("transitionend", clear, { once: true });
    };
    const onStart = (e: TouchEvent) => {
      const t = e.target as HTMLElement;
      armed = phone() && e.touches.length === 1 && el.scrollTop <= 0 && !t.closest("textarea, input");
      dragging = false;
      dy = 0;
      startY = e.touches[0].clientY;
      startT = e.timeStamp;
    };
    const onMove = (e: TouchEvent) => {
      if (!armed) return;
      dy = e.touches[0].clientY - startY;
      if (!dragging) {
        // A first move upward is a scroll, not a pull.
        if (dy < -4 || el.scrollTop > 0) return void (armed = false);
        if (dy < 6) return;
        dragging = true;
        el.style.animation = "none";
        el.style.transition = "none";
      }
      e.preventDefault();
      el.style.transform = `translateY(${Math.max(0, dy)}px)`;
    };
    const onEnd = (e: TouchEvent) => {
      if (!dragging) return;
      dragging = armed = false;
      const fast = dy / Math.max(1, e.timeStamp - startT) > FLICK_PX_PER_MS && dy > 30;
      if (dy > DISMISS_PX || fast) {
        el.style.transform = "";
        el.style.transition = "";
        el.style.animation = "";
        dismiss();
      } else reset();
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
      el.style.transform = el.style.transition = el.style.animation = "";
    };
  }, [active]);
  return ref;
}

/** A swipe up on the "선택 대기" pill opens the sheet again; a tap still works too. */
function useSwipeUp(onSwipe: () => void) {
  const start = useRef<number | null>(null);
  return {
    onTouchStart: (e: ReactTouchEvent) => {
      start.current = e.touches[0].clientY;
    },
    onTouchMove: (e: ReactTouchEvent) => {
      if (start.current !== null && start.current - e.touches[0].clientY > 24) {
        start.current = null;
        onSwipe();
      }
    },
    onTouchEnd: () => {
      start.current = null;
    },
  };
}

const smooth = (): ScrollBehavior => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");

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
      if (followingRef.current) scrollToEnd(smooth());
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [root, scrollToEnd]);

  const jumpToLatest = useCallback(() => {
    setFollow(true);
    scrollToEnd(smooth());
  }, [setFollow, scrollToEnd]);

  /** Scrolls to a month's date marker, below the fixed HUD; following stops, so 현재로 돌아가기 appears. */
  const scrollToMarker = useCallback(
    (mi: number, offset: number) => {
      const el = document.querySelector<HTMLElement>(`[data-mi="${mi}"]`);
      if (!el) return;
      setFollow(false);
      const top = el.getBoundingClientRect().top + window.scrollY - offset - 12;
      window.scrollTo({ top: Math.max(0, top), behavior: smooth() });
      el.querySelector("span")?.animate?.([{ boxShadow: "0 0 0 4px rgb(99 102 241 / 0.5)" }, { boxShadow: "0 0 0 0 transparent" }], { duration: 1200 });
    },
    [setFollow],
  );

  return { following, jumpToLatest, scrollToMarker };
}

export type NewsMode = "full" | "headline" | "hidden";
const NEWS_MODES: { value: NewsMode; label: string }[] = [
  { value: "full", get label() { return L("펼쳐 보기"); } },
  { value: "headline", get label() { return L("헤드라인만"); } },
  { value: "hidden", get label() { return L("숨기기"); } },
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

const KEYS_KEY = "whatif.shortcuts";

function loadKeysPref(): boolean {
  try {
    return localStorage.getItem(KEYS_KEY) !== "off";
  } catch {
    return true;
  }
}

function saveKeysPref(on: boolean) {
  try {
    localStorage.setItem(KEYS_KEY, on ? "on" : "off");
  } catch {
    // Private mode or blocked storage: the choice lasts for this visit only.
  }
}

type FeedItem =
  | { type: "date"; mi: number }
  | { type: "world"; items: LogEntry[] }
  | { type: "reaction"; entry: LogEntry; headline: string }
  | { type: "choice"; title: string; picked: string; outcome?: LogEntry; changes: string[] }
  | { type: "line"; entry: LogEntry };

/** "한일 월드컵에서 대표팀이 4강에 올랐다. 거리가…" → its first sentence. */
function headlineOf(text: string): string {
  return text.split("\n")[0].split(/(?<=[다요]\.)\s/)[0];
}

/**
 * Sorts the log into what the feed draws: a date marker per month, the month's headlines in one box off the spine,
 * how a headline touched this life as the player's own line, and each choice (title, answer, result, what changed)
 * as one card. A choice's lasting changes are the ones the engine recorded with its result (LifeChapter.at).
 */
function feedItems(feed: LogEntry[], chapters: LifeChapter[] = []): FeedItem[] {
  const changesAt = new Map(chapters.map((c) => [c.at, c.items]));
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
      out.push({ type: "choice", title, picked, outcome, changes: outcome ? (changesAt.get(i) ?? []) : [] });
      continue;
    }
    out.push({ type: "line", entry: e });
  }
  return out;
}

/**
 * The feed as a timeline. Three weights: a fork in the road is a card with a filled node, an important event is a
 * bold line with a filled node, and everyday notes are plain lines with a hollow one. The world sits off the line.
 */
function Feed({ feed, news, chapters }: { feed: LogEntry[]; news: NewsMode; chapters?: LifeChapter[] }) {
  const items = useMemo(() => feedItems(feed, chapters), [feed, chapters]);
  return (
    <ol className="relative space-y-2.5 pl-6 before:absolute before:top-3 before:bottom-2 before:left-[7px] before:w-0.5 before:rounded-full before:bg-indigo-100 dark:before:bg-indigo-950">
      {items.map((it, i) => {
        switch (it.type) {
          case "date":
            return (
              <li key={i} id={markerId(it.mi)} data-mi={it.mi} className={`-ml-6 scroll-mt-4 ${i === 0 ? "" : "pt-3"}`}>
                <span className="relative inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-800 tabular-nums dark:bg-indigo-950 dark:text-indigo-300">
                  {formatMi(it.mi)}
                </span>
              </li>
            );
          case "world":
            return news === "hidden" ? null : <WorldBox key={i} items={it.items} open={news === "full"} />;
          case "reaction":
            return (
              <Spine key={i}>
                <span className="block truncate text-xs font-semibold text-amber-800 dark:text-amber-400">📻 {it.headline}</span>
                <span className="leading-relaxed">
                  {it.entry.text}
                  <DeltaChips delta={it.entry.delta} money={it.entry.money} />
                </span>
              </Spine>
            );
          case "choice":
            return <ChoiceCard key={i} title={it.title} picked={it.picked} outcome={it.outcome} changes={it.changes} />;
          case "line":
            return <LogLine key={i} entry={it.entry} />;
        }
      })}
    </ol>
  );
}

/** A spot on the player's line. Filled dots mark the moments that changed the course; a big one is larger. */
function Spine({ children, filled = false, big = false, className = "" }: { children: ReactNode; filled?: boolean; big?: boolean; className?: string }) {
  return (
    <li className={`relative ${className}`}>
      <span
        aria-hidden
        className={`absolute rounded-full border-2 border-indigo-500 dark:border-indigo-400 ${big ? "top-3 -left-[24px] h-3.5 w-3.5" : "top-[7px] -left-[22px] h-2.5 w-2.5"} ${
          filled ? "bg-indigo-500 dark:bg-indigo-400" : "bg-[var(--background)]"
        }`}
      />
      {children}
    </li>
  );
}

/**
 * The world's news for one date, off the player's line: real headlines from the record (or the imagined future,
 * marked as such), never mixed with what the story made up. Full or headline-only follows the ⋯ menu setting.
 */
function WorldBox({ items, open }: { items: LogEntry[]; open: boolean }) {
  const imagined = (n: LogEntry) => {
    const cat = (n.tag ?? "").split(" · ")[0];
    return cat === "가상" || cat === L("가상");
  };
  const kind = items.every(imagined) ? L("상상한 미래") : L("실제 기록");
  return (
    <li className="rounded-lg border border-dashed border-amber-300 bg-amber-50/60 px-3 py-2 text-[13px] text-stone-700 dark:border-amber-900 dark:bg-amber-950/20 dark:text-stone-400">
      <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-400">
        <span aria-hidden>📻 </span>
        {L("그때 세상은")} <span className="font-normal">· {kind} {items.length}</span>
      </p>
      <ul className={open ? "mt-1 space-y-1.5" : "mt-0.5"}>
        {items.map((n, j) => {
          const [cat, month] = (n.tag ?? "").split(" · ");
          return open ? (
            <li key={j}>
              {n.tag && <span className="block text-[11px] font-semibold text-amber-800/90 dark:text-amber-400/80">{`${month} · ${cat}`}</span>}
              <span className="whitespace-pre-line leading-relaxed">{n.text.split("\n")[0]}</span>
            </li>
          ) : (
            <li key={j} className="truncate">
              {month && <span className="mr-1.5 text-[11px] font-semibold text-amber-800 tabular-nums dark:text-amber-400">{month}</span>}
              {headlineOf(n.text)}
            </li>
          );
        })}
      </ul>
    </li>
  );
}

/** A fork in the road as it was lived: the question, the answer, what happened, what changed in the life, then the gauges. */
function ChoiceCard({ title, picked, outcome, changes }: { title: string; picked: string; outcome?: LogEntry; changes: string[] }) {
  const rare = !!outcome?.rare;
  const system = !!outcome && (Object.values(outcome.delta ?? {}).some((v) => v) || !!outcome.money);
  return (
    <Spine filled big>
      <div className={`rounded-xl px-4 py-3 ${rare ? "border-2 border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-950/50" : "border border-indigo-200 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/60"}`}>
        <p className={`text-[11px] font-semibold ${rare ? "text-amber-800 dark:text-amber-300" : "text-indigo-700 dark:text-indigo-300"}`}>
          {rare ? L("✦ 희귀한 순간") : L("인생의 갈림길")} · {title}
        </p>
        <p className="mt-0.5 font-semibold text-indigo-900 dark:text-indigo-100">{picked}</p>
        {outcome?.text && <p className="mt-1.5 leading-relaxed whitespace-pre-line">{outcome.text}</p>}
        {changes.length > 0 && (
          <div className="mt-2 border-t border-indigo-200/70 pt-2 dark:border-indigo-900">
            <p className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">{L("삶의 변화")}</p>
            <p className="text-sm font-medium">{changes.join(" · ")}</p>
          </div>
        )}
        {system && (
          <p className="mt-2">
            <DeltaChips delta={outcome?.delta} money={outcome?.money} />
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
        <Spine className="text-sm text-stone-600 dark:text-stone-400">
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
        <Spine filled big>
          <p className="rounded-xl border border-indigo-300 px-4 py-3 font-semibold text-indigo-800 dark:border-indigo-800 dark:text-indigo-300">{entry.text}</p>
        </Spine>
      );
    case "death":
      return (
        <Spine filled big>
          <p className="rounded-xl bg-stone-900 px-4 py-3 text-center font-semibold text-stone-50 dark:bg-stone-100 dark:text-stone-900">{entry.text}</p>
        </Spine>
      );
  }
}

function RareLine({ entry }: { entry: LogEntry }) {
  return (
    <Spine filled big>
      <div className="rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3 dark:border-amber-500 dark:bg-amber-950/50">
        <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">{L("✦ 희귀한 순간")}</p>
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
        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{L("지금 이 순간")}</p>
        <p className="text-lg font-bold">{L("현실의 나와 또 다른 나")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-stone-100 p-4 dark:bg-stone-800">
          <p className="text-xs text-stone-600 dark:text-stone-400">{L("현실의 나")}</p>
          <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed">{life.profile.currentLife || L("현실의 삶을 입력하지 않았어요.")}</p>
        </div>
        <div className="rounded-xl bg-indigo-50 p-4 dark:bg-indigo-950">
          <p className="text-xs text-stone-600 dark:text-stone-400">{L("이 가지의 나 ·")} {ageText(ageOf(life))}</p>
          <p className="mt-1 text-[15px] font-semibold">{statusLabel(life)}</p>
          {degreeLine(life) && <p className="text-xs text-stone-600 dark:text-stone-400">{degreeLine(life)}</p>}
          <p className="text-sm text-stone-600 dark:text-stone-400">
            {L("자산")} {formatWealth(life.wealth)}
            {payLabel(life) && ` · ${payLabel(life)}`}
          </p>
          {monthlyCosts(life).length > 0 && <p className="text-xs text-stone-500 dark:text-stone-400">{L("고정지출 월")} {formatWealth(costTotal(monthlyCosts(life)))}: {costBreakdown(monthlyCosts(life))}</p>}
          <div className="mt-3">
            <StatBars stats={life.stats} compact />
          </div>
        </div>
      </div>
      <Button data-focus="present" className="w-full" onClick={onClose}>
        {L("계속 살아보기")}
      </Button>
    </Card>
  );
}
