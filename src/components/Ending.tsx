"use client";

import { useState } from "react";
import { formatWealth, statusLabel } from "@/lib/engine";
import type { EndingResult } from "@/lib/narrator/schema";
import type { LifeState } from "@/lib/types";
import { LifeChart } from "./LifeChart";
import { Button, Card, StatBars } from "./ui";
import { EndingWait } from "./Waiting";

export function EndingView({
  life,
  ending,
  onReplay,
  onNewTurningPoint,
  onHome,
}: {
  life: LifeState;
  ending: EndingResult | null;
  onReplay: () => void;
  onNewTurningPoint: () => void;
  onHome: () => void;
}) {
  const [copied, setCopied] = useState(false);
  if (!ending) {
    return <EndingWait />;
  }
  const share = async () => {
    const text = `[What If] ${ending.title}\n${life.deathAge}세 · ${statusLabel(life)}\n"${ending.epitaph}"\nhttps://whatif.damoai.net`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-6 py-6">
      <div className="text-center">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {life.profile.name || "나"}의 또 다른 인생 · {life.deathAge}세
        </p>
        <h1 className="mt-2 text-3xl font-bold text-balance">{ending.title}</h1>
        <p className="mt-3 italic text-stone-600 dark:text-stone-400">&ldquo;{ending.epitaph}&rdquo;</p>
      </div>

      <Card>
        <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">마지막 모습</p>
        <p className="mt-1 font-semibold">{statusLabel(life)}</p>
        <p className="text-sm text-stone-500 dark:text-stone-400">남긴 자산 {formatWealth(life.wealth)}</p>
        <div className="mt-4">
          <StatBars stats={life.stats} />
        </div>
      </Card>

      <Card className="space-y-3">
        <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">현실과의 비교</p>
        <p className="leading-relaxed">{ending.comparison}</p>
      </Card>

      <Card className="space-y-4">
        <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">회고록</p>
        {ending.memoir.split(/\n\s*\n/).map((para, i) => (
          <p key={i} className="leading-[1.8]">
            {para}
          </p>
        ))}
      </Card>

      <Card>
        <p className="mb-3 text-xs font-semibold text-stone-500 dark:text-stone-400">인생 그래프 · 나이에 따른 능력치 변화</p>
        <LifeChart life={life} />
      </Card>

      <Card>
        <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">내가 한 선택들</p>
        <ol className="mt-3 space-y-2">
          {life.choices.map((c, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="w-12 shrink-0 font-semibold tabular-nums text-stone-500 dark:text-stone-400">{c.age}세</span>
              <span>
                <span className="text-stone-500 dark:text-stone-400">{c.title}</span> · {c.picked}
              </span>
            </li>
          ))}
        </ol>
      </Card>

      <div className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-stone-300 text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
        광고 영역 (출시 때 연결)
      </div>

      <div className="space-y-2">
        <Button className="w-full" onClick={onReplay}>
          같은 변곡점에서 다시 살아보기
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onNewTurningPoint}>
            다른 변곡점 고르기
          </Button>
          <Button variant="ghost" className="flex-1" onClick={share}>
            {copied ? "복사했어요" : "결과 복사"}
          </Button>
        </div>
        <button className="w-full py-3 text-sm text-stone-500 hover:underline dark:text-stone-400" onClick={onHome}>
          처음으로
        </button>
      </div>
    </div>
  );
}
