"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { FieldError } from "./ui";
import { L } from "@/lib/i18n";
import { isEn } from "@/lib/region";

/** A date picked in parts; 0 is a part not given yet. */
export type Ymd = { y: number; m: number; d: number };

type Part = "y" | "m" | "d";
type Texts = Record<Part, string>;

const daysIn = (y: number, m: number) => new Date(y, m, 0).getDate();
const digits = (s: string) => s.replace(/\D/g, "");
const LEN: Record<Part, number> = { y: 4, m: 2, d: 2 };

/** The order people write a date in: 년 월 일 in Korean, Month Day Year in American English. Without the day: 년 월, Month Year. */
export const dateParts = (withDay = true): Part[] => (isEn() ? ["m", "d", "y"] : ["y", "m", "d"]).filter((p) => withDay || p !== "d") as Part[];

/** A box is done when no more digits could follow: 4 for the year, 2 (or a 2..9 month, a 4..9 day) for the others. */
const done = (p: Part, t: string) => t.length >= LEN[p] || (p === "m" && /^[2-9]$/.test(t)) || (p === "d" && /^[4-9]$/.test(t));

/** "19920514", "1992-5-14", "1992.05.14", "1992 5 14" (or "201003", "2010-3" without the day): a whole date pasted or autofilled into one box. */
function whole(text: string, withDay: boolean): Texts | null {
  const parts = text.split(/[^0-9]+/).filter(Boolean);
  if (!withDay) {
    if (parts.length === 1 && parts[0].length === 6) return { y: parts[0].slice(0, 4), m: parts[0].slice(4, 6), d: "" };
    if (parts.length === 2 && parts[0].length === 4) return { y: parts[0], m: parts[1].slice(0, 2), d: "" };
    if (parts.length === 2 && parts[1].length === 4 && isEn()) return { y: parts[1], m: parts[0].slice(0, 2), d: "" };
    return null;
  }
  if (parts.length === 1 && parts[0].length === 8) return { y: parts[0].slice(0, 4), m: parts[0].slice(4, 6), d: parts[0].slice(6, 8) };
  if (parts.length === 3 && parts[0].length === 4) return { y: parts[0], m: parts[1].slice(0, 2), d: parts[2].slice(0, 2) };
  if (parts.length === 3 && parts[2].length === 4 && isEn()) return { y: parts[2], m: parts[0].slice(0, 2), d: parts[1].slice(0, 2) };
  return null;
}

/** What the boxes hold: the parts that are usable (0 when not), and the first wrong one with its message. */
function check(t: Texts, min: number, max: { y: number; m: number; d: number }): { value: Ymd; bad: Part | null; message: string | null } {
  const y = t.y.length === 4 ? Number(t.y) : 0;
  const m = t.m ? Number(t.m) : 0;
  const d = t.d ? Number(t.d) : 0;
  const value: Ymd = { y: 0, m: 0, d: 0 };
  if (t.m && (m < 1 || m > 12)) return { value, bad: "m", message: L("월은 1부터 12 사이로 적어 주세요") };
  if (t.d && (d < 1 || d > 31)) return { value, bad: "d", message: L("일은 1부터 31 사이로 적어 주세요") };
  if (y && y < min) return { value, bad: "y", message: L`${min}년 이후로 적어 주세요` };
  if (y > max.y) return { value, bad: "y", message: L("미래 날짜는 고를 수 없어요") };
  if (y && m && d > daysIn(y, m)) return { value, bad: "d", message: L`${y}년 ${m}월은 ${daysIn(y, m)}일까지 있어요` };
  if (y === max.y && (m > max.m || (m === max.m && d > max.d))) return { value, bad: m > max.m ? "m" : "d", message: L("미래 날짜는 고를 수 없어요") };
  return { value: { y, m: m && done("m", t.m) ? m : 0, d: d && done("d", t.d) ? d : 0 }, bad: null, message: null };
}

/**
 * A date in number boxes (day, month and year in the reader's order), or just year and month with withDay={false}.
 * Each box opens the number pad and hands over to the next one once it is full. Nothing here takes focus on its own,
 * so on a phone the pad comes up only when a box is tapped (see keyboard.ts).
 */
export function DateBoxes({
  id,
  value,
  onChange,
  min,
  max,
  withDay = true,
  error,
  onTypedError,
}: {
  id: string;
  value: Ymd;
  onChange: (v: Ymd) => void;
  min: number;
  max: { y: number; m: number; d: number };
  withDay?: boolean;
  error?: string;
  onTypedError?: (message: string | null) => void;
}) {
  const order = dateParts(withDay);
  const [text, setText] = useState<Texts>(() => ({
    y: value.y ? String(value.y) : "",
    m: value.m ? String(value.m).padStart(2, "0") : "",
    d: value.d ? String(value.d).padStart(2, "0") : "",
  }));
  // The latest boxes, for handlers that run before the next render (a box's blur fires inside the previous box's focus move).
  const latest = useRef(text);
  const [bad, setBad] = useState<Part | null>(null);
  const boxes = useRef<Partial<Record<Part, HTMLInputElement | null>>>({});
  const focus = (p: Part | undefined) => p && boxes.current[p]?.focus();

  const update = (next: Texts) => {
    latest.current = next;
    setText(next);
    const c = check(next, min, max);
    setBad(c.bad);
    onTypedError?.(c.message);
    onChange(c.value);
    return c;
  };

  const type = (p: Part, raw: string) => {
    const all = whole(raw, withDay);
    if (all) return update(all);
    const t = digits(raw).slice(0, LEN[p]);
    const c = update({ ...latest.current, [p]: t });
    // Full and fine: the next box in reading order takes over, so a date is typed in one go.
    const after = order[order.indexOf(p) + 1];
    if (after && done(p, t) && c.bad !== p) focus(after);
  };

  const key = (p: Part) => (e: KeyboardEvent<HTMLInputElement>) => {
    const i = order.indexOf(p);
    if (e.key === "Backspace" && !text[p] && i > 0) {
      e.preventDefault();
      focus(order[i - 1]);
    } else if (e.key === "Enter" && i < order.length - 1) {
      // Enter before the last box goes to the next box, not to the whole screen's 다음.
      e.preventDefault();
      focus(order[i + 1]);
    }
  };

  // A single month or day digit reads as "05" once the box is left.
  const leave = (p: Part) => {
    const now = latest.current;
    if (p !== "y" && /^[1-9]$/.test(now[p])) update({ ...now, [p]: `0${now[p]}` });
  };

  const label: Record<Part, string> = { y: L("연도"), m: L("월"), d: isEn() ? "Day" : "일" };
  const hint: Record<Part, string> = { y: "YYYY", m: "MM", d: "DD" };
  const complete: Record<Part, string> = withDay ? { y: "bday-year", m: "bday-month", d: "bday-day" } : { y: "off", m: "off", d: "off" };
  const errorId = `${id}-error`;
  const invalid = (p: Part) => bad === p || (!!error && !bad && !text[p]);

  return (
    <div id={id} tabIndex={-1} className="space-y-3 outline-none">
      <div className="grid gap-2.5" style={{ gridTemplateColumns: order.map((p) => (p === "y" ? "1.35fr" : "1fr")).join(" ") }}>
        {order.map((p, i) => (
          <label key={p} className="block min-w-0 space-y-1">
            <span className="block text-[13px] font-semibold text-stone-600 dark:text-stone-400">{label[p]}</span>
            <input
              ref={(el) => {
                boxes.current[p] = el;
              }}
              id={`${id}-${p}`}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={complete[p]}
              enterKeyHint={i < order.length - 1 ? "next" : "done"}
              maxLength={p === "y" ? 10 : 4}
              value={text[p]}
              placeholder={hint[p]}
              onChange={(e) => type(p, e.target.value)}
              onKeyDown={key(p)}
              onBlur={() => leave(p)}
              onFocus={(e) => e.currentTarget.select()}
              aria-invalid={invalid(p) || undefined}
              aria-describedby={error ? errorId : undefined}
              className="h-14 w-full min-w-0 rounded-xl border-2 border-field bg-white px-2 text-center text-xl font-bold tabular-nums tracking-wide outline-none transition placeholder:text-base placeholder:font-medium placeholder:text-stone-400 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/25 aria-invalid:border-rose-600 dark:bg-stone-900 dark:placeholder:text-stone-500 dark:aria-invalid:border-rose-400"
            />
          </label>
        ))}
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
