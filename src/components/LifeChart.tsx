"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { STAT_LABELS, type LifeState, type StatKey } from "@/lib/types";
import { STAT_COLORS } from "./ui";

const KEYS = Object.keys(STAT_LABELS) as StatKey[];
const H = 240;
const PAD = { left: 30, right: 44, top: 14, bottom: 30 };

/** Line graph of the four stats across the simulated life, with each choice marked on the age axis. */
export function LifeChart({ life }: { life: LifeState }) {
  const [hover, setHover] = useState<number | null>(null);
  // Draw at the container's real pixel width so text stays 11px on phones instead of being scaled down.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const birthYear = Number(life.profile.birthDate.slice(0, 4));
  const points = life.history.map((h) => ({ age: h.year - birthYear, year: h.year, stats: h.stats }));
  if (points.length < 2) return null;

  const minAge = points[0].age;
  const maxAge = points.at(-1)!.age;
  const x = (age: number) => PAD.left + ((age - minAge) / Math.max(1, maxAge - minAge)) * (W - PAD.left - PAD.right);
  // Stats rarely drop low, so start the axis just under the lowest value (at most 50) rather than leaving half the plot empty.
  const lowest = Math.min(...points.flatMap((p) => KEYS.map((k) => p.stats[k])));
  const yMin = Math.min(50, Math.floor(lowest / 10) * 10);
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (100 - yMin)) * (H - PAD.top - PAD.bottom);
  const step = W < 480 ? 20 : 10;
  const firstTick = Math.ceil(minAge / step) * step;
  const ticks = Array.from({ length: Math.floor((maxAge - firstTick) / step) + 1 }, (_, i) => firstTick + i * step);

  // Direct labels at the line ends, nudged apart so they never overlap.
  const ends = KEYS.map((k) => ({ k, y: y(points.at(-1)!.stats[k]) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) ends[i].y = Math.max(ends[i].y, ends[i - 1].y + 13);

  const choicesByAge = new Map<number, string[]>();
  for (const c of life.choices) choicesByAge.set(c.age, [...(choicesByAge.get(c.age) ?? []), c.picked]);

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < points.length; i++) if (Math.abs(x(points[i].age) - px) < Math.abs(x(points[best].age) - px)) best = i;
    setHover(best);
  };
  const hp = hover !== null ? points[hover] : null;

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600 dark:text-stone-400">
        {KEYS.map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded" style={{ background: STAT_COLORS[k] }} />
            {STAT_LABELS[k]}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rotate-45 bg-stone-500" />
          내가 한 선택
        </span>
      </div>
      <div ref={box} className="relative">
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full touch-none select-none"
          role="img"
          aria-label="나이에 따른 건강, 행복, 지식, 관계의 변화"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {[yMin, Math.round((yMin + 100) / 2), 100].map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--chart-grid)" />
              <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="currentColor" opacity="0.7">
                {v}
              </text>
            </g>
          ))}
          {ticks.map((t) => (
            <text key={t} x={x(t)} y={H - 10} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.7">
              {t}세
            </text>
          ))}
          {[...choicesByAge.keys()].map((age) => (
            <rect key={age} x={x(age) - 3.5} y={H - PAD.bottom - 3.5} width="7" height="7" transform={`rotate(45 ${x(age)} ${H - PAD.bottom})`} fill="var(--chart-axis)" />
          ))}
          {KEYS.map((k) => (
            <polyline
              key={k}
              points={points.map((p) => `${x(p.age)},${y(p.stats[k])}`).join(" ")}
              fill="none"
              stroke={STAT_COLORS[k]}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {ends.map((e) => (
            <text key={e.k} x={W - PAD.right + 6} y={e.y + 4} fontSize="11" fill="currentColor" opacity="0.8">
              {STAT_LABELS[e.k]}
            </text>
          ))}
          {hp && (
            <g>
              <line x1={x(hp.age)} x2={x(hp.age)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--chart-axis)" strokeDasharray="3 3" />
              {KEYS.map((k) => (
                <circle key={k} cx={x(hp.age)} cy={y(hp.stats[k])} r="4" fill={STAT_COLORS[k]} stroke="var(--background)" strokeWidth="2" />
              ))}
            </g>
          )}
        </svg>
        {hp && (
          <div
            className="pointer-events-none absolute top-2 w-44 rounded-lg border border-stone-200 bg-white p-2.5 text-xs shadow-sm dark:border-stone-700 dark:bg-stone-900"
            style={x(hp.age) > W / 2 ? { right: `${((W - x(hp.age)) / W) * 100 + 2}%` } : { left: `${(x(hp.age) / W) * 100 + 2}%` }}
          >
            <p className="font-semibold">
              {hp.age}세 · {hp.year}년
            </p>
            {KEYS.map((k) => (
              <p key={k} className="mt-0.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: STAT_COLORS[k] }} />
                  {STAT_LABELS[k]}
                </span>
                <span className="tabular-nums">{hp.stats[k]}</span>
              </p>
            ))}
            {choicesByAge.get(hp.age)?.map((c, i) => (
              <p key={i} className="mt-1.5 border-t border-stone-200 pt-1.5 text-stone-600 dark:border-stone-700 dark:text-stone-400">
                {c}
              </p>
            ))}
          </div>
        )}
      </div>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-stone-500 dark:text-stone-400">표로 보기</summary>
        <table className="mt-2 w-full tabular-nums">
          <thead>
            <tr className="text-left text-stone-500 dark:text-stone-400">
              <th className="py-1 font-medium">나이</th>
              {KEYS.map((k) => (
                <th key={k} className="py-1 text-right font-medium">
                  {STAT_LABELS[k]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {points
              .filter((p, i) => p.age % 5 === 0 || i === points.length - 1)
              .map((p) => (
                <tr key={p.year} className="border-t border-stone-200 dark:border-stone-800">
                  <td className="py-1">{p.age}세</td>
                  {KEYS.map((k) => (
                    <td key={k} className="py-1 text-right">
                      {p.stats[k]}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
