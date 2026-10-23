import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
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
      className={`rounded-xl px-4 py-3 text-[15px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${className}`}
    />
  );
}

export function Field({
  label,
  hint,
  group = false,
  required = false,
  error,
  errorId,
  children,
}: {
  label: string;
  hint?: string;
  group?: boolean;
  required?: boolean;
  error?: string;
  errorId?: string;
  children: ReactNode;
}) {
  // A button group must not sit inside <label>, or clicking the label text presses the first button.
  const Tag = group ? "div" : "label";
  return (
    <Tag className="block space-y-1.5">
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        {label}
        <Badge required={required} />
      </span>
      {children}
      {error && <FieldError id={errorId}>{error}</FieldError>}
      {hint && <span className="block text-xs text-stone-500 dark:text-stone-400">{hint}</span>}
    </Tag>
  );
}

function Badge({ required }: { required: boolean }) {
  return required ? (
    <span className="rounded bg-indigo-50 px-1.5 py-px text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">필수</span>
  ) : (
    <span className="rounded bg-stone-200 px-1.5 py-px text-[11px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">선택</span>
  );
}

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <span id={id} role="alert" className="flex items-center gap-1 text-[13px] font-medium text-rose-700 dark:text-rose-400">
      <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      {children}
    </span>
  );
}

// Invalid fields get a rose ring; focus gets the same indigo ring as buttons.
const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-[15px] outline-none placeholder:text-stone-500 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/25 aria-invalid:border-rose-600 aria-invalid:ring-1 aria-invalid:ring-rose-600 dark:border-stone-700 dark:bg-stone-900 dark:placeholder:text-stone-400 dark:aria-invalid:border-rose-400 dark:aria-invalid:ring-rose-400";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputClass} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={4} {...props} className={`${inputClass} resize-y leading-relaxed`} />;
}

export function Select({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={`relative ${className}`}>
      <select {...props} className={`${inputClass} appearance-none pr-9`}>
        {children}
      </select>
      <svg
        aria-hidden
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-stone-500 dark:text-stone-400"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

export function Spinner({ className = "h-4 w-4 border-current border-t-transparent" }: { className?: string }) {
  return <span aria-hidden className={`inline-block animate-spin rounded-full border-2 ${className}`} />;
}

export const STAT_COLORS: Record<StatKey, string> = {
  health: "var(--stat-health)",
  happiness: "var(--stat-happiness)",
  knowledge: "var(--stat-knowledge)",
  relationships: "var(--stat-relationships)",
};

export function StatBars({ stats, compact = false }: { stats: Stats; compact?: boolean }) {
  return (
    <div className={`grid grid-cols-4 ${compact ? "gap-2" : "gap-3"}`}>
      {(Object.keys(STAT_LABELS) as StatKey[]).map((k) => (
        <div key={k} className="min-w-0">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-stone-500 dark:text-stone-400">{STAT_LABELS[k]}</span>
            <span className="font-semibold tabular-nums">{stats[k]}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
            <div className="h-full transition-all duration-500" style={{ width: `${stats[k]}%`, background: STAT_COLORS[k] }} />
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
