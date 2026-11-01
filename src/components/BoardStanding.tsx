"use client";

import { useEffect, useState } from "react";
import { L } from "@/lib/i18n";
import { lifeRecords } from "@/lib/records";
import { lang } from "@/lib/region";
import type { LifeState } from "@/lib/types";
import { money } from "./BoardRecords";
import { Button, Card } from "./ui";

type Cat = "wealth" | "happiness" | "giving" | "longevity" | "badges";
type Standing = { above: number; total: number };

/**
 * The ending's "게시판 사람들과 비교": where this life's numbers would stand among every post on the memoir board.
 * Shown once the board has a few ranked lives; offers posting when the memoir is written and not posted yet.
 */
export function BoardStanding({ life, posted, onPublish }: { life: LifeState; posted: boolean; onPublish?: () => void }) {
  const [rows, setRows] = useState<Partial<Record<Cat, Standing>> | null>(null);
  const r = lifeRecords(life);
  const values: Partial<Record<Cat, number>> = {
    wealth: r.finalWealth,
    happiness: r.avgHappiness,
    ...(r.donated > 0 ? { giving: r.donated } : {}),
    longevity: life.deathAge ?? 0,
    badges: r.badges.length,
  };
  const query = Object.entries(values)
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const region = life.region ?? "kr";
  useEffect(() => {
    let live = true;
    fetch(`/api/memoirs/rank?region=${region}&${query}`)
      .then((res) => res.json())
      .then((d: { ok?: boolean; standings?: Partial<Record<Cat, Standing>> }) => live && setRows(d.ok ? (d.standings ?? {}) : null))
      .catch(() => live && setRows(null));
    return () => {
      live = false;
    };
  }, [region, query]);

  const shown = (Object.entries(rows ?? {}) as [Cat, Standing][]).filter(([, s]) => s.total >= 1);
  if (!rows || !shown.length) return null;
  const v = lang();
  const label: Record<Cat, string> = { wealth: L("자산"), happiness: L("평생 행복"), giving: L("평생 기부"), longevity: L("수명"), badges: L("배지") };
  const valueText = (c: Cat) => {
    const x = values[c] ?? 0;
    return c === "wealth" || c === "giving" ? money(v, x) : c === "longevity" ? L`${x}세` : c === "badges" ? L`${x}개` : String(x);
  };
  // Once posted, this life is already among the total; before that, it would be one more.
  const place = (s: Standing) => {
    const people = posted ? s.total : s.total + 1;
    const rank = s.above + 1;
    if (people >= 20) return L`상위 ${Math.max(1, Math.ceil((rank / people) * 100))}%`;
    return L`${people}명 중 ${rank}위`;
  };
  return (
    <Card className="space-y-3">
      <h2 className="text-xs font-semibold text-stone-500 dark:text-stone-400">{L("게시판 사람들과 비교")}</h2>
      <ul className="divide-y divide-stone-100 dark:divide-stone-800">
        {shown.map(([c, s]) => (
          <li key={c} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="text-stone-600 dark:text-stone-300">
              {label[c]} <b className="tabular-nums text-stone-900 dark:text-stone-100">{valueText(c)}</b>
            </span>
            <span className="font-bold tabular-nums text-indigo-700 dark:text-indigo-300">{place(s)}</span>
          </li>
        ))}
      </ul>
      {!posted && onPublish && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-stone-600 dark:text-stone-400">{L("회고록을 게시하면 명예의 전당 순위에 올라요.")}</p>
          <Button variant="ghost" className="shrink-0" onClick={onPublish}>
            {L("회고록 게시하기")}
          </Button>
        </div>
      )}
    </Card>
  );
}
