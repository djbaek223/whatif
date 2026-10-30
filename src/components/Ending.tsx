"use client";

import { useEffect, useState } from "react";
import { formatWealth, statusLabel } from "@/lib/engine";
import type { EndingResult } from "@/lib/narrator/schema";
import type { LifeState } from "@/lib/types";
import { BoardDialog, PublishDialog, endingSig, publishedId } from "./Board";
import { BadgeCollection } from "./GameFx";
import { LifeChart } from "./LifeChart";
import { Button, Card, StatBars } from "./ui";
import { EndingWait } from "./Waiting";
import { L } from "@/lib/i18n";
import { isUS } from "@/lib/region";
import { ageText } from "@/lib/format";

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
  const [writing, setWriting] = useState(false);
  const [board, setBoard] = useState(false);
  const [posted, setPosted] = useState<string | null>(null);
  // An ending posted earlier from this browser shows "게시판에서 보기" instead of posting it twice.
  const sig = ending ? endingSig(life, ending) : "";
  useEffect(() => {
    if (sig) setPosted(publishedId(sig)); // eslint-disable-line react-hooks/set-state-in-effect
  }, [sig]);
  if (!ending) {
    return <EndingWait />;
  }

  return (
    <div className="space-y-6 py-6">
      <div className="text-center">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {isUS() ? `${life.profile.name ? `${life.profile.name}'s` : "My"} other life · age ${life.deathAge}` : `${life.profile.name || "나"}의 또 다른 인생 · ${life.deathAge}세`}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-balance">{ending.title}</h1>
        <p className="mt-3 italic text-stone-600 dark:text-stone-400">&ldquo;{ending.epitaph}&rdquo;</p>
      </div>

      <Card>
        <h2 className="text-xs font-semibold text-stone-500 dark:text-stone-400">{L("마지막 모습")}</h2>
        <p className="mt-1 font-semibold">{statusLabel(life)}</p>
        <p className="text-sm text-stone-500 dark:text-stone-400">{L("남긴 자산")} {formatWealth(life.wealth)}</p>
        <div className="mt-4">
          <StatBars stats={life.stats} />
        </div>
      </Card>

      <Card>
        <BadgeCollection life={life} />
      </Card>

      <Card className="space-y-3">
        <h2 className="text-xs font-semibold text-stone-500 dark:text-stone-400">{L("현실과의 비교")}</h2>
        <p className="leading-relaxed">{ending.comparison}</p>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-xs font-semibold text-stone-500 dark:text-stone-400">{L("회고록")}</h2>
        {ending.memoir.split(/\n\s*\n/).map((para, i) => (
          <p key={i} className="leading-[1.8]">
            {para}
          </p>
        ))}
      </Card>

      <Card>
        <h2 className="mb-3 text-xs font-semibold text-stone-500 dark:text-stone-400">{L("인생 그래프 · 나이에 따른 능력치 변화")}</h2>
        <LifeChart life={life} />
      </Card>

      {!!life.rares?.length && (
        <Card className="border-2 border-amber-400 dark:border-amber-500">
          <h2 className="text-xs font-semibold text-amber-700 dark:text-amber-300">{L("✦ 희귀한 순간 ·")} {life.rares.length}{L("번")}</h2>
          <ol className="mt-3 space-y-3">
            {life.rares.map((r, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="w-12 shrink-0 font-semibold tabular-nums text-stone-500 dark:text-stone-400">{ageText(r.age)}</span>
                <span>
                  <b>{r.title}</b>
                  <span className="block leading-relaxed text-stone-600 dark:text-stone-300">{r.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <Card>
        <h2 className="text-xs font-semibold text-stone-500 dark:text-stone-400">{L("내가 한 선택들")}</h2>
        <ol className="mt-3 space-y-2">
          {life.choices.map((c, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="w-12 shrink-0 font-semibold tabular-nums text-stone-500 dark:text-stone-400">{ageText(c.age)}</span>
              <span>
                <span className="text-stone-500 dark:text-stone-400">{c.title}</span> · {c.picked}
              </span>
            </li>
          ))}
        </ol>
      </Card>

      <div className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-stone-300 text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
        {L("광고 영역 (출시 때 연결)")}
      </div>

      <div className="space-y-2">
        <Button className="w-full" onClick={onReplay}>
          {L("같은 변곡점에서 다시 살아보기")}
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onNewTurningPoint}>
            {L("다른 변곡점 고르기")}
          </Button>
          <Button variant="ghost" className="flex-1" aria-haspopup="dialog" onClick={() => (posted ? setBoard(true) : setWriting(true))}>
            {posted ? L("게시판에서 보기") : L("회고록 게시")}
          </Button>
        </div>
        <button className="w-full py-3 text-sm text-stone-500 hover:underline dark:text-stone-400" onClick={onHome}>
          {L("처음으로")}
        </button>
      </div>

      <PublishDialog
        open={writing}
        life={life}
        ending={ending}
        onClose={() => setWriting(false)}
        onPublished={(id) => {
          setPosted(id);
          setWriting(false);
          setBoard(true);
        }}
      />
      <BoardDialog
        open={board}
        focus={posted}
        onClose={() => {
          setBoard(false);
          setPosted(publishedId(sig)); // deleted from the board: offer posting again
        }}
      />
    </div>
  );
}
