"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { EndingResult } from "@/lib/narrator/schema";
import type { LifeState } from "@/lib/types";
import { BoardDialog, PublishDialog, endingSig, publishedId } from "./Board";
import { BadgeCollection } from "./GameFx";
import { LifeChart } from "./LifeChart";
import { LifeSummaryCard, ShareDialog } from "./LifeSummary";
import { Button, Card } from "./ui";
import { EndingWait } from "./Waiting";
import { L } from "@/lib/i18n";
import { isEn } from "@/lib/region";
import { ageText } from "@/lib/format";
import { summaryOf } from "@/lib/playUi";

export function EndingView({
  life,
  ending,
  memoir,
  onWriteMemoir,
  onSkipMemoir,
  onReplay,
  onNewTurningPoint,
  onHome,
}: {
  life: LifeState;
  ending: EndingResult | null;
  /** The player's answer to "회고록을 써 드릴까요?": null asks it, "skip" shows the life without a memoir. */
  memoir: "write" | "skip" | null;
  onWriteMemoir: () => void;
  onSkipMemoir: () => void;
  onReplay: () => void;
  onNewTurningPoint: () => void;
  onHome: () => void;
}) {
  const [writing, setWriting] = useState(false);
  const [board, setBoard] = useState(false);
  const [posted, setPosted] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  // An ending posted earlier from this browser shows "게시판에서 보기" instead of posting it twice.
  const sig = ending ? endingSig(life, ending) : "";
  useEffect(() => {
    if (sig) setPosted(publishedId(sig)); // eslint-disable-line react-hooks/set-state-in-effect
  }, [sig]);
  if (!memoir && !ending) {
    return <LifeEnded life={life} onWrite={onWriteMemoir} onSkip={onSkipMemoir} />;
  }
  if (!ending && memoir === "write") {
    return <EndingWait />;
  }

  return (
    <div className="space-y-6 py-6">
      <div className="text-center">
        <p className="text-sm text-stone-500 dark:text-stone-400">{otherLife(life)}</p>
        {ending ? (
          <>
            <h1 className="mt-2 text-3xl font-bold text-balance">{ending.title}</h1>
            <p className="mt-3 italic text-stone-600 dark:text-stone-400">&ldquo;{ending.epitaph}&rdquo;</p>
          </>
        ) : (
          <h1 className="mt-2 text-3xl font-bold text-balance">{L("삶이 끝났습니다")}</h1>
        )}
      </div>

      <LifeSummaryCard life={life} />

      <Card>
        <BadgeCollection life={life} />
      </Card>

      {ending ? (
        <>
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
        </>
      ) : (
        // Skipped the memoir: it can still be written from here, any time.
        <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-stone-600 dark:text-stone-400">{L("회고록은 쓰지 않았어요. 마음이 바뀌면 지금 써도 돼요.")}</p>
          <Button variant="ghost" className="shrink-0" onClick={onWriteMemoir}>
            {L("회고록 쓰기")}
          </Button>
        </Card>
      )}

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
          {L("다른 삶 살아보기")}
          <span className="block text-xs font-normal opacity-80">{L("같은 변곡점에서 다시 시작해요")}</span>
        </Button>
        <Button variant="ghost" className="w-full" aria-haspopup="dialog" onClick={() => setSharing(true)}>
          {L("내 인생 공유하기")}
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onNewTurningPoint}>
            {L("다른 변곡점 고르기")}
          </Button>
          {ending && (
            <Button variant="ghost" className="flex-1" aria-haspopup="dialog" onClick={() => (posted ? setBoard(true) : setWriting(true))}>
              {posted ? L("게시판에서 보기") : L("회고록 게시")}
            </Button>
          )}
        </div>
        <button className="w-full py-3 text-sm text-stone-500 hover:underline dark:text-stone-400" onClick={onHome}>
          {L("처음으로")}
        </button>
      </div>

      <ShareDialog open={sharing} life={life} line={ending?.epitaph ?? ""} onClose={() => setSharing(false)} />
      {ending && (
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
      )}
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

const otherLife = (life: LifeState) =>
  isEn() ? `${life.profile.name ? `${life.profile.name}'s` : "My"} other life · age ${life.deathAge}` : `${life.profile.name || "나"}의 또 다른 인생 · ${life.deathAge}세`;

/**
 * The first thing after the last breath: the life is over, and nothing has been written yet. The player decides whether
 * the memoir is written (and, once ads are on, sees a fullscreen ad on phones first: lib/ads.ts beforeMemoir).
 */
function LifeEnded({ life, onWrite, onSkip }: { life: LifeState; onWrite: () => void; onSkip: () => void }) {
  const s = useMemo(() => summaryOf(life), [life]);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const big = life.choices.length;
  return (
    <div className="flex min-h-[70dvh] flex-col justify-center gap-8 py-10">
      <div className="text-center">
        <p className="text-sm text-stone-500 dark:text-stone-400">{otherLife(life)}</p>
        <h1 ref={heading} tabIndex={-1} className="mt-3 text-3xl font-bold text-balance focus:outline-none">
          {L("삶이 끝났습니다")}
        </h1>
        <p className="mt-3 text-stone-600 tabular-nums dark:text-stone-400">
          {s.bornYear}–{s.lastYear} · {L`변곡점 뒤로 ${s.years}년, ${s.age}세까지 살았어요.`}
        </p>
        {big > 0 && <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{L`그동안 ${big}번의 선택을 했어요.`}</p>}
      </div>

      <Card className="space-y-4 text-center">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{L("이 삶의 회고록을 써 드릴까요?")}</h2>
          <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            {L("지나온 선택들을 돌아보며 한 편의 글로 남기고, 현실의 삶과도 비교해 드려요.")}
          </p>
        </div>
        <div className="space-y-2">
          <Button className="w-full" onClick={onWrite}>
            {L("회고록 쓰기")}
          </Button>
          <Button variant="ghost" className="w-full" onClick={onSkip}>
            {L("쓰지 않고 돌아보기")}
            <span className="block text-xs font-normal opacity-80">{L("요약과 인생 그래프만 볼게요")}</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
