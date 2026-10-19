import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { STAT_LABELS, type StatKey, type Stats } from "@/lib/types";

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "choice" }) {
  const styles = {
    primary: "bg-stone-900 text-stone-50 hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300",
    ghost: "border border-stone-300 hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800",
    choice:
      "w-full text-left border border-stone-300 bg-white hover:border-indigo-500 hover:bg-indigo-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-indigo-400 dark:hover:bg-indigo-950",
  }[variant];
  return (
    <button
      {...props}
      className={`rounded-xl px-4 py-3 text-[15px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${className}`}
    />
  );
}

export function Field({ label, hint, group = false, children }: { label: string; hint?: string; group?: boolean; children: ReactNode }) {
  // A button group must not sit inside <label>, or clicking the label text presses the first button.
  const Tag = group ? "div" : "label";
  return (
    <Tag className="block space-y-1.5">
      <span className="block text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="block text-xs text-stone-500">{hint}</span>}
    </Tag>
  );
}

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-indigo-500 dark:border-stone-700 dark:bg-stone-900";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputClass} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={4} {...props} className={`${inputClass} resize-y leading-relaxed`} />;
}

const STAT_COLORS: Record<StatKey, string> = {
  health: "bg-emerald-500",
  happiness: "bg-amber-500",
  knowledge: "bg-indigo-500",
  relationships: "bg-rose-500",
};

export function StatBars({ stats, compact = false }: { stats: Stats; compact?: boolean }) {
  return (
    <div className={`grid grid-cols-4 ${compact ? "gap-2" : "gap-3"}`}>
      {(Object.keys(STAT_LABELS) as StatKey[]).map((k) => (
        <div key={k} className="min-w-0">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-stone-500">{STAT_LABELS[k]}</span>
            <span className="font-semibold tabular-nums">{stats[k]}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
            <div className={`h-full ${STAT_COLORS[k]} transition-all duration-500`} style={{ width: `${stats[k]}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DeltaChips({ delta }: { delta?: Partial<Stats> }) {
  if (!delta) return null;
  const items = (Object.entries(delta) as [StatKey, number][]).filter(([, v]) => v !== 0);
  if (items.length === 0) return null;
  return (
    <span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
      {items.map(([k, v]) => (
        <span
          key={k}
          className={`rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
            v > 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
          }`}
        >
          {STAT_LABELS[k]} {v > 0 ? `+${v}` : v}
        </span>
      ))}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 ${className}`}>{children}</div>;
}
