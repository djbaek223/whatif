"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { type Consequence, signed, spanName, stepLabel } from "@/lib/playUi";
import type { PendingChoice, StatKey } from "@/lib/types";
import { SCENE_LATE_MS, SceneWait } from "./Waiting";
import { Button, FieldError, Spinner, STAT_COLORS, Switch, Textarea } from "./ui";
import { L } from "@/lib/i18n";

export type FreeResult = "ok" | "failed" | "stale";

/** Milliseconds since `active` turned on, ticking twice a second; 0 while off. */
export function useElapsed(active: boolean): number {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = Date.now();
    const t = setInterval(() => setMs(Date.now() - start), 500);
    return () => {
      clearInterval(t);
      setMs(0);
    };
  }, [active]);
  return ms;
}

// ── Decision ────────────────────────────────────────────

/**
 * The fork in the road: when and what kind of moment, the title, the scene (folded on phones past three lines),
 * two to four options as cards, and writing one's own. Nothing about the choice shows before the scene is written.
 */
export function DecisionPanel({
  pending,
  when,
  big,
  skipped,
  ai,
  keys,
  busy,
  sceneLoading,
  onChoose,
  onChooseFree,
}: {
  pending: PendingChoice;
  when: string;
  big: boolean;
  skipped: number;
  ai: boolean;
  keys: boolean;
  busy: boolean;
  sceneLoading: boolean;
  onChoose: (id: string) => void;
  onChooseFree: (text: string, force?: boolean) => Promise<FreeResult>;
}) {
  const [more, setMore] = useState(false);
  const long = pending.scene.length > 110;
  const kind = pending.rare ? L("✦ 희귀한 순간") : pending.small ? L("작은 선택") : big ? L("인생의 갈림길") : L("선택의 순간");
  const waited = useElapsed(sceneLoading);
  const [waitedForScene] = useState(sceneLoading);
  // One status line for screen readers. It starts empty so the choice itself is announced first; only the wait,
  // a slow wait and the finished scene are read.
  const status = sceneLoading
    ? waited >= SCENE_LATE_MS
      ? L("조금 더 걸리고 있어요. 늦어지면 기본 이야기로 이어가요.")
      : waited > 0
        ? L("다음 장면이 펼쳐지고 있어요.")
        : ""
    : waitedForScene
      ? L`장면이 준비됐어요. 선택지 ${pending.options.length}개 중에서 골라 주세요.`
      : "";
  const writable = ai && pending.freeText;

  return (
    // While loading, the panel itself takes focus in place of the title, which stays hidden until the scene is written.
    <div className="rise-in space-y-3 outline-none" aria-busy={sceneLoading} tabIndex={sceneLoading ? -1 : undefined} data-focus={sceneLoading ? "choice" : undefined}>
      <p role="status" className="sr-only">
        {status}
      </p>
      <div>
        <p className={`text-xs font-semibold tracking-wide ${pending.rare ? "text-amber-700 dark:text-amber-300" : "text-indigo-700 dark:text-indigo-300"}`}>
          {kind} <span className="font-normal text-stone-600 tabular-nums dark:text-stone-400">· {when}</span>
        </p>
        {skipped > 0 && <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">{L`${spanName(skipped)}이 흘렀어요.`}</p>}
        {!sceneLoading && (
          <h2 tabIndex={-1} data-focus="choice" className="mt-1 text-xl font-bold text-balance outline-none">
            {pending.title}
          </h2>
        )}
        {sceneLoading ? (
          <SceneWait elapsed={waited} />
        ) : (
          <>
            <p id="decision-scene" className={`mt-1.5 leading-relaxed whitespace-pre-line text-stone-700 dark:text-stone-300 ${long && !more ? "line-clamp-3 lg:line-clamp-none" : ""}`}>
              {pending.scene}
            </p>
            {long && (
              <button
                type="button"
                onClick={() => setMore(!more)}
                aria-expanded={more}
                aria-controls="decision-scene"
                className="-my-1 min-h-11 py-1 text-sm font-semibold text-indigo-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:hidden dark:text-indigo-300"
              >
                {more ? L("접기") : L("더 보기")}
              </button>
            )}
          </>
        )}
      </div>
      {/* The options arrive with the finished scene, so the player reads it before choosing. */}
      {!sceneLoading && (
        <div className="space-y-3 motion-safe:animate-[fadein_400ms_ease-out]">
          <ul className="space-y-2" aria-label={L("선택지")}>
            {pending.options.map((o, i) => (
              <li key={o.id}>
                <ChoiceCard index={i} label={o.label} detail={o.detail} keys={keys} disabled={busy} onClick={() => onChoose(o.id)} />
              </li>
            ))}
          </ul>
          {writable && <CustomChoiceComposer busy={busy} onSubmit={onChooseFree} />}
        </div>
      )}
    </div>
  );
}

/** One way to go: a whole-card button (56px or more) with the choice in bold and its terms below in a smaller line. */
function ChoiceCard({ index, label, detail, keys, disabled, onClick }: { index: number; label: string; detail?: string; keys: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <Button variant="choice" disabled={disabled} onClick={onClick} aria-keyshortcuts={keys && index < 9 ? String(index + 1) : undefined} className="group flex min-h-14 items-center gap-3">
      <span
        aria-hidden
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-field text-xs font-semibold text-stone-600 tabular-nums group-hover:border-indigo-500 group-hover:text-indigo-700 dark:text-stone-300 dark:group-hover:text-indigo-300"
      >
        {index + 1}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{label}</span>
        {detail && <span className="mt-0.5 block text-[13px] font-normal text-stone-600 dark:text-stone-400">{detail}</span>}
      </span>
      <span aria-hidden className="shrink-0 text-stone-400 group-hover:text-indigo-500">
        →
      </span>
    </Button>
  );
}

const FREE_MIN = 2;
const FREE_MAX = 200;

/**
 * 내 선택 직접 만들기: the player's own way, in their words. The text stays until the choice is made, so a failed
 * read can be tried again; 취소 goes back to the options with focus on the opener.
 */
export function CustomChoiceComposer({ busy, onSubmit }: { busy: boolean; onSubmit: (text: string, force?: boolean) => Promise<FreeResult> }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [failed, setFailed] = useState(false);
  const [touched, setTouched] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const sending = useRef(false);
  const short = text.trim().length < FREE_MIN;

  // The phone keyboard covers the bottom of the sheet; keep the box and its button above it.
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    const keep = () => box.current?.scrollIntoView({ block: "nearest" });
    vv?.addEventListener("resize", keep);
    return () => vv?.removeEventListener("resize", keep);
  }, [open]);

  const submit = async (force = false) => {
    setTouched(true);
    if (short || busy || sending.current) return;
    sending.current = true; // a double tap sends once
    setFailed(false);
    const r = await onSubmit(text.trim(), force);
    sending.current = false;
    if (r === "failed") setFailed(true);
  };

  if (!open)
    return (
      <button
        ref={opener}
        type="button"
        onClick={() => setOpen(true)}
        disabled={busy}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-300 px-4 py-3 text-[15px] font-semibold text-indigo-700 hover:border-indigo-500 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-40 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950"
      >
        <PencilIcon />
        {L("내 선택 직접 만들기")}
      </button>
    );

  const errorId = "free-error";
  const hintId = "free-hint";
  return (
    <div ref={box} className="space-y-2 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-900 dark:bg-indigo-950/40" role="group" aria-labelledby="free-title">
      <p id="free-title" className="flex items-center gap-1.5 text-sm font-semibold text-indigo-900 dark:text-indigo-100">
        <PencilIcon />
        {L("나라면 이렇게 할래요")}
      </p>
      <Textarea
        rows={3}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setFailed(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
            requestAnimationFrame(() => opener.current?.focus());
          }
        }}
        onFocus={() => setTimeout(() => box.current?.scrollIntoView({ block: "nearest" }), 300)}
        placeholder={L("예: 퇴근 후 대학 입시를 다시 준비한다...")}
        aria-label={L("나라면 이렇게 할래요")}
        aria-describedby={`${hintId}${failed ? ` ${errorId}` : ""}`}
        aria-invalid={touched && short ? true : undefined}
        maxLength={FREE_MAX}
        readOnly={busy}
        autoFocus
      />
      <p id={hintId} className="flex justify-between gap-2 text-xs text-stone-600 dark:text-stone-400">
        <span>{touched && short ? L("두 글자 이상 써 주세요.") : L("무엇을, 어떻게 할지 한 문장으로 써 주세요.")}</span>
        <span className="tabular-nums" aria-label={L`${text.length}자, 최대 ${FREE_MAX}자`}>
          {text.length}/{FREE_MAX}
        </span>
      </p>
      {failed && (
        <div className="space-y-2">
          <FieldError id={errorId}>{L("지금은 이 선택을 읽지 못했어요. 쓴 내용은 그대로 있어요.")}</FieldError>
          <button type="button" onClick={() => submit(true)} className="min-h-11 text-sm font-semibold text-indigo-700 underline underline-offset-2 dark:text-indigo-300">
            {L("AI 없이 이대로 진행")}
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => {
            setOpen(false);
            requestAnimationFrame(() => opener.current?.focus());
          }}
        >
          {L("취소")}
        </Button>
        <Button type="button" className="flex flex-1 items-center justify-center gap-2" disabled={busy || (touched && short)} aria-disabled={short || undefined} onClick={() => submit()}>
          {busy && <Spinner />}
          {busy ? L("선택을 읽는 중") : failed ? L("다시 시도") : L("이 선택으로 진행 →")}
        </Button>
      </div>
    </div>
  );
}

// ── Consequence ─────────────────────────────────────────

/**
 * The step between choosing and the story going on: what was chosen, what happened (the story), what changed in
 * the life (status, pay, wealth, lasting changes), and the gauges before → after. Numbers come from the life itself.
 */
export function ConsequenceView({ c, when, onDone }: { c: Consequence; when: string; onDone: () => void }) {
  const quiet = !c.changes.length && !c.events.length && !c.stats.length;
  return (
    <div className="rise-in space-y-4">
      <div>
        <p className={`text-xs font-semibold tracking-wide ${c.rare ? "text-amber-700 dark:text-amber-300" : "text-indigo-700 dark:text-indigo-300"}`}>
          {L("선택의 결과")} <span className="font-normal text-stone-600 tabular-nums dark:text-stone-400">· {when}</span>
        </p>
        <h2 tabIndex={-1} data-focus="consequence" className="mt-1 text-lg font-bold text-balance outline-none">
          <span className="sr-only">{L("내 선택:")} </span>
          {c.picked}
        </h2>
        <p className="text-xs text-stone-600 dark:text-stone-400">{c.title}</p>
      </div>

      {c.story && (
        <section aria-labelledby="cq-story">
          <h3 id="cq-story" className="text-[11px] font-semibold tracking-wide text-stone-600 dark:text-stone-400">
            {L("기록된 이야기")}
          </h3>
          <p className="mt-1 leading-relaxed whitespace-pre-line">{c.story}</p>
        </section>
      )}

      {(c.changes.length > 0 || c.events.length > 0) && (
        <section aria-labelledby="cq-life" className="rounded-xl bg-stone-50 p-3 dark:bg-stone-800/60">
          <h3 id="cq-life" className="text-[11px] font-semibold tracking-wide text-stone-600 dark:text-stone-400">
            {L("삶의 변화")}
          </h3>
          {c.events.length > 0 && (
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {c.events.map((e) => (
                <li key={e} className="rounded-full border border-indigo-200 bg-white px-2.5 py-0.5 text-[13px] font-medium text-indigo-800 dark:border-indigo-900 dark:bg-stone-900 dark:text-indigo-200">
                  {e}
                </li>
              ))}
            </ul>
          )}
          {c.changes.length > 0 && (
            <dl className="mt-2 space-y-1 text-sm">
              {c.changes.map((ch) => (
                <div key={ch.label} className="grid grid-cols-[3.5rem_1fr] gap-2">
                  <dt className="text-stone-600 dark:text-stone-400">{ch.label}</dt>
                  <dd className="min-w-0 break-words">
                    <span className="text-stone-600 dark:text-stone-400">{ch.from}</span>
                    <span aria-hidden className="mx-1.5">
                      →
                    </span>
                    <span className="sr-only">{L("에서")} </span>
                    <b className="font-semibold">{ch.to}</b>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      )}

      {c.stats.length > 0 && (
        <section aria-labelledby="cq-stats">
          <h3 id="cq-stats" className="text-[11px] font-semibold tracking-wide text-stone-600 dark:text-stone-400">
            {L("능력치")}
          </h3>
          <ul className="mt-1.5 space-y-2">
            {c.stats.map((s) => (
              <StatChangeRow key={s.key} stat={s.key} label={s.label} from={s.from} to={s.to} diff={s.diff} />
            ))}
          </ul>
        </section>
      )}

      {quiet && <p className="text-sm text-stone-600 dark:text-stone-400">{L("큰 변화 없이 하루가 지나갔어요.")}</p>}

      <Button data-focus="consequence-done" className="flex w-full items-center justify-center gap-1.5" onClick={onDone}>
        {L("계속 살아가기")}
        <span aria-hidden>→</span>
      </Button>
    </div>
  );
}

/** "행복 65 → 69 ▲ +4": the bar grows from the old value to the new one; without motion it is simply there. */
function StatChangeRow({ stat, label, from, to, diff }: { stat: StatKey; label: string; from: number; to: number; diff: number }) {
  const [shown, setShown] = useState(from);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setShown(to), reduce ? 0 : 150);
    return () => clearTimeout(t);
  }, [to]);
  const up = diff > 0;
  return (
    <li>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-stone-700 dark:text-stone-300">{label}</span>
        <span className="tabular-nums">
          <span className="text-stone-600 dark:text-stone-400">{from}</span>
          <span aria-hidden className="mx-1">
            →
          </span>
          <span className="sr-only">{L("에서")} </span>
          <b>{to}</b>
          <span className={`ml-2 inline-flex items-center gap-0.5 rounded px-1.5 text-xs font-semibold ${up ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"}`}>
            <span aria-hidden>{up ? "▲" : "▼"}</span>
            {signed(diff)}
          </span>
        </span>
      </div>
      <div aria-hidden className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
        <div className="h-full transition-[width] duration-700 ease-out motion-reduce:transition-none" style={{ width: `${shown}%`, background: STAT_COLORS[stat] }} />
      </div>
    </li>
  );
}

// ── Docks ───────────────────────────────────────────────

/** Timeline mode: one way forward by a step, one to let time run to the next choice. */
export function TimelineDock({ months, keys, onStep, onProgress }: { months: number; keys: boolean; onStep: () => void; onProgress: () => void }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1.15fr_1fr] gap-2">
        <Button className="flex min-h-12 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap" onClick={onStep} aria-keyshortcuts={keys ? "Space" : undefined} data-focus="controls">
          {stepLabel(months)}
          <span aria-hidden>→</span>
        </Button>
        <Button variant="ghost" className="flex min-h-12 min-w-0 items-center justify-center gap-1.5 px-3 whitespace-nowrap" onClick={onProgress} aria-keyshortcuts={keys ? "Enter A" : undefined}>
          <span className="flex max-[359px]:hidden">
            <PlayIcon />
          </span>
          {L("선택까지 진행")}
        </Button>
      </div>
      <p className={`hidden text-xs text-stone-600 dark:text-stone-400 ${keys ? "lg:block" : ""}`}>
        <Kbd>Space</Kbd> {stepLabel(months)} · <Kbd>Enter</Kbd> {L("선택까지 진행")} · <Kbd>1</Kbd>~<Kbd>4</Kbd> {L("선택")}
      </p>
    </div>
  );
}

/** Progressing mode: what is happening and until when, the month it has reached, and one way to stop. */
export function ProgressDock({ when, autoDecide, keys, onStop, onToggleAutoDecide }: { when: string; autoDecide: boolean; keys: boolean; onStop: () => void; onToggleAutoDecide: () => void }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{L("삶을 이어가고 있어요")}</p>
          <p className="truncate text-xs text-stone-600 dark:text-stone-400">
            {autoDecide ? L("다음 큰 갈림길까지 진행 중") : L("다음 중요한 선택까지 진행 중")} · <span className="tabular-nums">{when}</span>
          </p>
        </div>
        <Button data-focus="controls" className="flex min-h-12 shrink-0 items-center gap-2" onClick={onStop} aria-keyshortcuts={keys ? "A" : undefined}>
          <span aria-hidden>■</span>
          {L("멈추기")}
        </Button>
      </div>
      <div aria-hidden className="indeterminate h-1 overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-950">
        <span className="block h-full w-1/3 rounded-full bg-indigo-500 dark:bg-indigo-400" />
      </div>
      <Switch checked={autoDecide} onChange={onToggleAutoDecide}>
        {L("작은 선택은 맡기기")}
      </Switch>
    </div>
  );
}

// Pass a display class (inline-flex, or hidden lg:inline-flex) in className, so it can't fight a built-in one.
export function Kbd({ children, className = "inline-flex", hidden = false }: { children: ReactNode; className?: string; hidden?: boolean }) {
  return (
    <kbd
      aria-hidden={hidden || undefined}
      className={`min-w-5 items-center justify-center rounded border border-stone-300 bg-stone-50 px-1 font-sans text-[11px] leading-4 font-semibold text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 ${className}`}
    >
      {children}
    </kbd>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 4.5v15l12.5-7.5z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}
