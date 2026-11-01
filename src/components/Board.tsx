"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { statusLabel } from "@/lib/engine";
import type { EndingResult } from "@/lib/narrator/schema";
import type { LifeState } from "@/lib/types";
import { lang, region, type Lang } from "@/lib/region";
import { lifeRecords, type LifeRecords } from "@/lib/records";
import { L } from "@/lib/i18n";
import { RecordGrid, RecordLine, tr } from "./BoardRecords";
import { Button, Input, Spinner, Textarea } from "./ui";

/** A post as the board shows it (src/lib/memoirs.ts). */
export interface PublishedMemoir {
  id: string;
  penName: string;
  title: string;
  epitaph: string;
  memoir: string;
  deathAge: number;
  status: string;
  records?: LifeRecords;
  createdAt: string;
  likes?: number;
}

// The secret for each post written from this browser, so its writer (and only they) can take it down.
const MINE_KEY = "whatif.memoirs";
type Mine = Record<string, { key: string; sig: string }>;
function loadMine(): Mine {
  try {
    return JSON.parse(localStorage.getItem(MINE_KEY) || "{}") as Mine;
  } catch {
    return {};
  }
}
function saveMine(m: Mine) {
  try {
    localStorage.setItem(MINE_KEY, JSON.stringify(m));
  } catch {}
}

/** Tells this ending apart from others, so the ending screen knows it was already posted. */
export const endingSig = (life: LifeState, ending: EndingResult) => `${life.deathAge}|${ending.title}|${ending.epitaph}`;
export const publishedId = (sig: string) => Object.entries(loadMine()).find(([, v]) => v.sig === sig)?.[0] ?? null;

const MASK = "○○";
/** The real name and school names are masked before the writer even sees the draft; they can edit the rest. */
export function masked(text: string, life: LifeState) {
  const p = life.profile;
  const words = [p.name, p.elementary, p.middle, p.high, p.university].map((w) => w?.trim()).filter((w): w is string => !!w && w.length >= 2);
  return words.sort((a, b) => b.length - a.length).reduce((t, w) => t.split(w).join(MASK), text);
}

function useModal(open: boolean) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);
  return dialog;
}

const dialogClass =
  "m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-stone-200 bg-white p-0 text-[var(--foreground)] shadow-xl backdrop:bg-stone-950/40 dark:border-stone-800 dark:bg-stone-900";

type PublishStatus = "idle" | "sending" | "no-store" | "rate-limited" | "error";

/** Posts this life's memoir to the public board under a pen name, after the writer has read and trimmed it. */
export function PublishDialog({
  open,
  life,
  ending,
  onClose,
  onPublished,
}: {
  open: boolean;
  life: LifeState;
  ending: EndingResult;
  onClose: () => void;
  onPublished: (id: string) => void;
}) {
  const dialog = useModal(open);
  const [penName, setPenName] = useState("");
  const [title, setTitle] = useState(() => masked(ending.title, life));
  const [memoir, setMemoir] = useState(() => masked(ending.memoir, life));
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<PublishStatus>("idle");
  const records = lifeRecords(life);
  const ready = agreed && title.trim().length > 0 && memoir.trim().length >= 20 && status !== "sending";

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setStatus("sending");
    const website = (e.currentTarget as HTMLFormElement).elements.namedItem("website") as HTMLInputElement | null;
    try {
      const res = await fetch("/api/memoirs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region: region(),
          penName,
          title,
          epitaph: masked(ending.epitaph, life),
          memoir,
          deathAge: life.deathAge ?? 0,
          status: statusLabel(life),
          records,
          website: website?.value ?? "",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; reason?: string; memoir?: { id: string }; deleteKey?: string };
      if (data.ok && data.memoir && data.deleteKey) {
        saveMine({ ...loadMine(), [data.memoir.id]: { key: data.deleteKey, sig: endingSig(life, ending) } });
        setStatus("idle");
        onPublished(data.memoir.id);
      } else setStatus(data.reason === "no-store" ? "no-store" : data.reason === "rate-limited" ? "rate-limited" : "error");
    } catch {
      setStatus("error");
    }
  };

  const problem = {
    "no-store": L("게시판이 아직 준비되지 않았어요."),
    "rate-limited": L("잠시 뒤에 다시 올려 주세요. 짧은 시간에 너무 많이 올렸어요."),
    error: L("올리지 못했어요. 잠시 뒤 다시 시도해 주세요."),
  }[status as "no-store" | "rate-limited" | "error"];

  return (
    <dialog ref={dialog} aria-labelledby="publish-title" onClose={onClose} onClick={(e) => e.target === e.currentTarget && onClose()} className={dialogClass}>
      <form onSubmit={send} className="space-y-4 p-6">
        <div className="space-y-1">
          <h2 id="publish-title" className="text-lg font-bold">
            {L("회고록 게시하기")}
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-300">{L("회고록 게시판에 올리면 누구나 읽을 수 있어요. 이름과 학교 이름은 ○○로 가려 두었어요. 더 빼고 싶은 내용은 직접 고쳐 주세요.")}</p>
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">{L("필명")}</span>
          <Input value={penName} onChange={(e) => setPenName(e.target.value)} maxLength={20} placeholder={L("비워 두면 익명")} autoComplete="off" />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">{L("제목")}</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} required />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">{L("회고록")}</span>
          <Textarea value={memoir} onChange={(e) => setMemoir(e.target.value)} rows={9} maxLength={8000} className="leading-relaxed" />
        </label>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold">{L("함께 올라가는 인생 기록")}</p>
          <RecordGrid records={records} deathAge={life.deathAge ?? 0} lang={lang()} />
        </div>
        {/* Hidden from people and screen readers; a bot that fills it gets turned away. */}
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
        <label className="flex items-start gap-2.5 text-sm">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-indigo-600" />
          <span>{L("다른 사람이 읽어도 괜찮은 내용인지 확인했어요. 인생 기록은 다른 사람들과 비교할 수 있게 공개돼요. 프로필(생일, 학교, MBTI 등)은 올라가지 않아요.")}</span>
        </label>
        {problem && (
          <p role="alert" className="text-[13px] font-medium text-rose-700 dark:text-rose-400">
            {problem}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
            {L("취소")}
          </Button>
          <Button type="submit" className="flex flex-[2] items-center justify-center gap-2" disabled={!ready}>
            {status === "sending" && <Spinner />}
            {status === "sending" ? L("올리는 중") : L("게시하기")}
          </Button>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400">{L("올린 글은 이 브라우저에서 언제든 게시판에서 지울 수 있어요.")}</p>
      </form>
    </dialog>
  );
}

const dateText = (iso: string) => {
  const d = new Date(iso);
  return region() === "us" ? d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
};

type BoardStatus = "loading" | "ready" | "no-store" | "error";

/** The public board: memoirs other players posted, newest first, ten at a time. `focus` opens one post right away. */
export function BoardDialog({ open, focus, onClose }: { open: boolean; focus?: string | null; onClose: () => void }) {
  const dialog = useModal(open);
  const [items, setItems] = useState<PublishedMemoir[]>([]);
  const [more, setMore] = useState(false);
  const [status, setStatus] = useState<BoardStatus>("loading");
  const [reading, setReading] = useState<string | null>(null);
  const [mine, setMine] = useState<Mine>({});

  const load = useCallback(async (before: number) => {
    if (!before) setStatus("loading");
    try {
      const res = await fetch(`/api/memoirs?region=${region()}&before=${before}`, { cache: "no-store" });
      const data = (await res.json()) as { ok: boolean; reason?: string; items?: PublishedMemoir[]; more?: boolean };
      if (!data.ok) {
        setStatus(data.reason === "no-store" ? "no-store" : "error");
        return;
      }
      setItems((prev) => (before ? [...prev, ...(data.items ?? [])] : (data.items ?? [])));
      setMore(!!data.more);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setMine(loadMine()); // eslint-disable-line react-hooks/set-state-in-effect
    setReading(focus ?? null);
    load(0);
  }, [open, focus, load]);

  const remove = async (id: string) => {
    if (!window.confirm(L("이 회고록을 게시판에서 지울까요?"))) return;
    try {
      const res = await fetch("/api/memoirs", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, key: mine[id]?.key }) });
      if (!res.ok) throw new Error();
      const rest = loadMine();
      delete rest[id];
      saveMine(rest);
      setMine(rest);
      setItems((prev) => prev.filter((m) => m.id !== id));
      setReading(null);
    } catch {
      window.alert(L("지우지 못했어요. 잠시 뒤 다시 시도해 주세요."));
    }
  };

  const post = reading ? items.find((m) => m.id === reading) : undefined;

  return (
    <dialog ref={dialog} aria-labelledby="board-title" onClose={onClose} onClick={(e) => e.target === e.currentTarget && onClose()} className={dialogClass}>
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-stone-100 px-6 pt-5 pb-3 dark:border-stone-800">
          {post ? (
            <button type="button" onClick={() => setReading(null)} className="-ml-2 rounded-lg px-2 py-1.5 text-sm font-medium text-indigo-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300 dark:hover:bg-stone-800">
              ← {L("목록")}
            </button>
          ) : (
            <h2 id="board-title" className="text-lg font-bold">
              {L("회고록 게시판")}
            </h2>
          )}
          <button type="button" onClick={onClose} aria-label={L("닫기")} className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-stone-400 dark:hover:bg-stone-800">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-6 py-4">
          {post ? (
            <article className="space-y-4">
              <header className="space-y-1">
                <h2 id="board-title" className="text-xl font-bold text-balance">
                  {post.title}
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {post.penName || L("익명")} · {L`${post.deathAge}세`} · {dateText(post.createdAt)}
                </p>
                {post.epitaph && <p className="pt-1 italic text-stone-600 dark:text-stone-400">&ldquo;{post.epitaph}&rdquo;</p>}
              </header>
              {post.memoir.split(/\n\s*\n/).map((para, i) => (
                <p key={i} className="leading-[1.8] whitespace-pre-line">
                  {para}
                </p>
              ))}
              {post.records && <RecordGrid records={post.records} deathAge={post.deathAge} lang={lang()} />}
              {post.status && <p className="text-sm text-stone-500 dark:text-stone-400">{L("마지막 모습")} · {post.status}</p>}
              <LikeButton id={post.id} initial={post.likes ?? 0} />
              {mine[post.id] ? (
                <Button type="button" variant="ghost" className="w-full text-rose-700 dark:text-rose-400" onClick={() => remove(post.id)}>
                  {L("내 글 지우기")}
                </Button>
              ) : (
                <ReportButton id={post.id} />
              )}
            </article>
          ) : status === "loading" ? (
            <p role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-stone-500 dark:text-stone-400">
              <Spinner /> {L("불러오는 중")}
            </p>
          ) : status === "no-store" ? (
            <p className="py-10 text-center text-sm text-stone-500 dark:text-stone-400">{L("게시판이 아직 준비되지 않았어요.")}</p>
          ) : status === "error" ? (
            <div className="space-y-3 py-10 text-center">
              <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">
                {L("게시판을 불러오지 못했어요.")}
              </p>
              <Button type="button" variant="ghost" onClick={() => load(0)}>
                {L("다시 시도")}
              </Button>
            </div>
          ) : !items.length ? (
            <p className="py-10 text-center text-sm text-stone-500 dark:text-stone-400">{L("아직 올라온 회고록이 없어요. 인생을 끝까지 살고 첫 회고록을 올려 보세요.")}</p>
          ) : (
            <>
              <ul className="-mx-2 divide-y divide-stone-100 dark:divide-stone-800">
                {items.map((m) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => setReading(m.id)} className="w-full rounded-lg px-2 py-3 text-left hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-stone-800/60">
                      <span className="block font-semibold">
                        {m.title}
                        {mine[m.id] && <span className="ml-1.5 rounded bg-indigo-50 px-1.5 py-0.5 align-middle text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{L("내 글")}</span>}
                      </span>
                      {m.epitaph && <span className="mt-0.5 block truncate text-sm italic text-stone-600 dark:text-stone-400">&ldquo;{m.epitaph}&rdquo;</span>}
                      <RecordLine records={m.records} lang={lang()} />
                      <span className="mt-1 block text-xs text-stone-500 dark:text-stone-400">
                        {m.penName || L("익명")} · {L`${m.deathAge}세`} · {dateText(m.createdAt)}
                        {!!m.likes && <> · ❤ {m.likes}</>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {more && (
                <Button type="button" variant="ghost" className="mt-3 w-full" onClick={() => load(items.length)}>
                  {L("더 보기")}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}

const REPORTED_KEY = "whatif.reported";

/** Flags a post for the owner to look at. Three reports from different people hide it (src/lib/memoirs.ts). */
export function ReportButton({ id, lang: shown }: { id: string; lang?: Lang }) {
  const view = shown ?? lang();
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  useEffect(() => {
    try {
      if ((JSON.parse(localStorage.getItem(REPORTED_KEY) || "[]") as string[]).includes(id)) setState("done"); // eslint-disable-line react-hooks/set-state-in-effect
    } catch {}
  }, [id]);
  const report = async () => {
    if (!window.confirm(tr(view, "이 글을 신고할까요? 욕설, 개인정보, 광고 같은 글은 확인 뒤 내려요."))) return;
    setState("sending");
    try {
      const res = await fetch("/api/memoirs/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!res.ok) throw new Error();
      try {
        const list = JSON.parse(localStorage.getItem(REPORTED_KEY) || "[]") as string[];
        localStorage.setItem(REPORTED_KEY, JSON.stringify([...list, id].slice(-200)));
      } catch {}
      setState("done");
    } catch {
      setState("error");
    }
  };
  return (
    <p className="text-right text-xs text-stone-500 dark:text-stone-400" role="status">
      {state === "done" ? (
        tr(view, "신고했어요. 확인해 볼게요.")
      ) : (
        <button type="button" onClick={report} disabled={state === "sending"} className="-my-2 px-1 py-2 underline-offset-2 hover:underline disabled:opacity-50">
          {state === "error" ? tr(view, "신고하지 못했어요. 다시 시도") : tr(view, "신고하기")}
        </button>
      )}
    </p>
  );
}

const LIKED_KEY = "whatif.liked";
const LIKER_KEY = "whatif.liker";

/** This browser's random id for likes: one like per browser per post, without an account. */
function likerId(): string {
  try {
    let id = localStorage.getItem(LIKER_KEY);
    if (!id) {
      id = Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 32);
      localStorage.setItem(LIKER_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}
function likedSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || "[]") as string[]);
  } catch {
    return new Set();
  }
}

/** 공감: a heart with the count. Pressing it again takes the like back. */
export function LikeButton({ id, initial, lang: shown }: { id: string; initial: number; lang?: Lang }) {
  const view = shown ?? lang();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setLiked(likedSet().has(id)); // eslint-disable-line react-hooks/set-state-in-effect
  }, [id]);
  const toggle = async () => {
    const liker = likerId();
    if (!liker || busy) return;
    const on = !liked;
    setBusy(true);
    setLiked(on);
    setCount((c) => Math.max(0, c + (on ? 1 : -1)));
    try {
      const res = await fetch("/api/memoirs/like", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, liker, on }) });
      const data = (await res.json()) as { ok?: boolean; likes?: number };
      if (!data.ok || typeof data.likes !== "number") throw new Error();
      setCount(data.likes);
      const set = likedSet();
      if (on) set.add(id);
      else set.delete(id);
      try {
        localStorage.setItem(LIKED_KEY, JSON.stringify([...set].slice(-500)));
      } catch {}
    } catch {
      setLiked(!on);
      setCount((c) => Math.max(0, c + (on ? -1 : 1)));
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        liked ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300" : "border-stone-300 text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
      }`}
    >
      <span aria-hidden>{liked ? "❤️" : "🤍"}</span>
      {tr(view, "공감")} <span className="tabular-nums">{count}</span>
    </button>
  );
}
