"use client";

import { useState } from "react";
import { FieldError } from "./ui";

export interface Ymd {
  y: number;
  m: number;
  d: number; // 0 when unset or when the picker has no day
}

const range = (from: number, to: number) => Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);
const daysIn = (y: number, m: number) => new Date(y, m, 0).getDate();
const pad = (n: number) => String(n).padStart(2, "0");

const cell =
  "min-h-11 rounded-lg border text-[15px] font-medium tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-30";
const idle = "border-stone-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-indigo-400 dark:hover:bg-indigo-950";
const active = "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-500";

type Part = "decade" | "y" | "m" | "d";

/**
 * Year, month and (optionally) day picked with big buttons, plus a typed shortcut ("19920514").
 * Dates outside min..max can't be picked, so the value is always valid or partly empty.
 */
export function DatePicker({
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
  min: { y: number; m: number };
  max: { y: number; m: number; d: number };
  withDay?: boolean;
  error?: string;
  onTypedError?: (message: string | null) => void;
}) {
  const [open, setOpen] = useState<Part | null>(null);
  const [decade, setDecade] = useState(() => (value.y ? Math.floor(value.y / 10) * 10 : 0));
  const [typed, setTyped] = useState(() => (value.y && value.m && (!withDay || value.d) ? format(value, withDay) : ""));

  const part: Part | "done" = open ?? (!value.y ? (decade ? "y" : "decade") : !value.m ? "m" : withDay && !value.d ? "d" : "done");
  const maxMonth = value.y === max.y ? max.m : 12;
  const minMonth = value.y === min.y ? min.m : 1;
  const maxDay = value.y && value.m ? (value.y === max.y && value.m === max.m ? max.d : daysIn(value.y, value.m)) : 31;

  // Picking a part keeps the others when they still fit, so changing only the year is one tap.
  const set = (next: Ymd) => {
    if (next.y === max.y && next.m > max.m) next.m = 0;
    if (next.y === min.y && next.m && next.m < min.m) next.m = 0;
    if (next.y && next.m && next.d > (next.y === max.y && next.m === max.m ? max.d : daysIn(next.y, next.m))) next.d = 0;
    onChange(next);
    setTyped(next.y && next.m && (!withDay || next.d) ? format(next, withDay) : "");
    onTypedError?.(null);
    setOpen(null);
  };

  const onType = (text: string) => {
    setTyped(text);
    const parsed = parse(text, withDay);
    if (parsed === "partial") return onTypedError?.(null);
    if (!parsed) return onTypedError?.(withDay ? "날짜를 알아보지 못했어요. 예: 1992 05 14" : "날짜를 알아보지 못했어요. 예: 2010 03");
    const n = parsed.y * 12 + parsed.m;
    if (n < min.y * 12 + min.m) return onTypedError?.(`${min.y}년 ${min.m}월 이후로 골라주세요`);
    if (n > max.y * 12 + max.m || (n === max.y * 12 + max.m && parsed.d > max.d)) return onTypedError?.("미래 날짜는 고를 수 없어요");
    onTypedError?.(null);
    setDecade(Math.floor(parsed.y / 10) * 10);
    setOpen(null);
    onChange(parsed);
  };

  const errorId = `${id}-error`;
  const chip = (p: Part, text: string, filled: boolean) => (
    <button
      type="button"
      onClick={() => setOpen(p === "y" ? "decade" : p)}
      aria-pressed={part === p || (p === "y" && part === "decade")}
      className={`min-h-11 flex-1 rounded-xl border-2 px-2 text-lg font-bold tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        part === p || (p === "y" && part === "decade")
          ? "border-indigo-500 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300"
          : filled
            ? "border-stone-200 dark:border-stone-700"
            : "border-dashed border-stone-300 text-stone-400 dark:border-stone-700 dark:text-stone-500"
      }`}
    >
      {text}
    </button>
  );

  return (
    <div className="space-y-3" id={id} tabIndex={-1}>
      <div className="flex gap-2" aria-label="고른 날짜">
        {chip("y", value.y ? `${value.y}년` : "연도", !!value.y)}
        {chip("m", value.m ? `${value.m}월` : "월", !!value.m)}
        {withDay && chip("d", value.d ? `${value.d}일` : "일", !!value.d)}
      </div>

      {part === "decade" && (
        <Grid label="연대 고르기" cols="grid-cols-3 sm:grid-cols-4">
          {range(Math.floor(min.y / 10), Math.floor(max.y / 10)).map((t) => {
            const dec = t * 10;
            return (
              <button
                key={dec}
                type="button"
                className={`${cell} ${decade === dec ? active : idle}`}
                onClick={() => {
                  setDecade(dec);
                  setOpen("y");
                }}
              >
                {dec}년대
              </button>
            );
          })}
        </Grid>
      )}
      {part === "y" && (
        <Grid
          label={`${decade}년대에서 연도 고르기`}
          cols="grid-cols-5"
          back={
            <button type="button" onClick={() => setOpen("decade")} className="min-h-11 text-sm font-medium text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-300">
              ← 다른 연대
            </button>
          }
        >
          {range(decade, decade + 9).map((y) => (
            <button key={y} type="button" disabled={y < min.y || y > max.y} className={`${cell} ${value.y === y ? active : idle}`} onClick={() => set({ ...value, y })}>
              {y}
            </button>
          ))}
        </Grid>
      )}
      {part === "m" && (
        <Grid label={`${value.y}년, 몇 월이었나요?`} cols="grid-cols-4">
          {range(1, 12).map((m) => (
            <button
              key={m}
              type="button"
              disabled={!value.y || m > maxMonth || m < minMonth}
              className={`${cell} ${value.m === m ? active : idle}`}
              onClick={() => set({ ...value, m })}
            >
              {m}월
            </button>
          ))}
        </Grid>
      )}
      {part === "d" && (
        <Grid label={`${value.m}월 며칠이었나요?`} cols="grid-cols-7">
          {range(1, maxDay).map((d) => (
            <button key={d} type="button" className={`${cell} ${value.d === d ? active : idle}`} onClick={() => set({ ...value, d })}>
              {d}
            </button>
          ))}
        </Grid>
      )}

      <label className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
        <span className="shrink-0">직접 입력</span>
        <input
          inputMode="numeric"
          autoComplete={withDay ? "bday" : "off"}
          value={typed}
          onChange={(e) => onType(e.target.value)}
          placeholder={withDay ? "예: 1992 05 14" : "예: 2010 03"}
          maxLength={12}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? errorId : undefined}
          className="min-h-11 w-full min-w-0 rounded-lg border border-stone-300 bg-white px-3 text-[15px] tabular-nums outline-none placeholder:text-stone-400 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/25 aria-invalid:border-rose-600 dark:border-stone-700 dark:bg-stone-900"
        />
      </label>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}

function Grid({ label, cols, back, children }: { label: string; cols: string; back?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="space-y-2" style={{ animation: "fadein .2s ease-out" }}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-stone-600 dark:text-stone-400">{label}</span>
        {back}
      </div>
      <div className={`grid gap-1.5 ${cols}`}>{children}</div>
    </div>
  );
}

const format = (v: Ymd, withDay: boolean) => `${v.y} ${pad(v.m)}${withDay ? ` ${pad(v.d)}` : ""}`;

/** "19920514", "1992-5-14", "1992.05.14", "1992 5 14" → date; "partial" while still typing. */
function parse(text: string, withDay: boolean): Ymd | "partial" | null {
  const t = text.trim();
  if (!t) return "partial";
  const parts = t.split(/[^0-9]+/).filter(Boolean);
  let y: number, m: number, d = 0;
  if (parts.length === 1) {
    const s = parts[0];
    const need = withDay ? 8 : 6;
    if (s.length < need) return "partial";
    if (s.length > need) return null;
    [y, m, d] = [Number(s.slice(0, 4)), Number(s.slice(4, 6)), withDay ? Number(s.slice(6, 8)) : 0];
  } else {
    if (parts.length < (withDay ? 3 : 2)) return parts[0].length === 4 ? "partial" : null;
    [y, m, d] = [Number(parts[0]), Number(parts[1]), withDay ? Number(parts[2]) : 0];
    if (withDay && parts[2].length < 1) return "partial";
  }
  if (y < 1900 || m < 1 || m > 12) return null;
  if (withDay && (d < 1 || d > daysIn(y, m))) return null;
  return { y, m, d };
}
