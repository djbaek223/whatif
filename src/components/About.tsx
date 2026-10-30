"use client";

import { useEffect, useRef } from "react";
import { Button } from "./ui";
import { L } from "@/lib/i18n";

/** Filled in at build time by next.config.ts. */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
export const APP_COMMIT = process.env.NEXT_PUBLIC_APP_COMMIT ?? "";
export const APP_BUILT = process.env.NEXT_PUBLIC_APP_BUILT ?? "";

/** "v0.1.0 · a1b2c3d", short enough for the bottom of the ⋯ menu. */
export const versionLabel = `v${APP_VERSION}${APP_COMMIT ? ` · ${APP_COMMIT}` : ""}`;

const POINTS: { title: string; body: string }[] = [
  { get title() { return L("어떻게 흘러가나요"); }, get body() { return L("프로필과 돌아가고 싶은 순간을 고르면, 그때부터 한 달 또는 몇 달씩 시간이 흐르고 입시, 취업, 결혼 같은 갈림길마다 직접 고르며 끝까지 살아봐요."); } },
  { get title() { return L("누가 정하나요"); }, get body() { return L("능력치, 돈, 성공과 실패, 수명은 규칙 엔진이 확률로 정하고, AI는 그 결과를 장면과 문장으로만 써요. 실제 사건 뉴스는 그 시절 기록을 바탕으로 해요."); } },
  { get title() { return L("내 정보는요"); }, get body() { return L("입력한 정보와 진행 기록은 이 기기 브라우저에만 암호화해 저장되고, 서버에는 남지 않아요. 장면을 쓰는 동안만 AI에 필요한 내용이 전달돼요."); } },
  { get title() { return L("참고해 주세요"); }, get body() { return L("실제 미래를 예측하는 서비스가 아니라, 다른 선택을 상상해 보는 놀이예요. 결과는 같은 선택이어도 매번 달라져요."); } },
];

/** The 서비스 소개 sheet: what What If is, how it works, and which build is running. */
export function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="about-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md rounded-2xl border border-stone-200 bg-white p-0 text-[var(--foreground)] shadow-xl backdrop:bg-stone-950/40 dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="space-y-5 p-6">
        <div className="space-y-1">
          <h2 id="about-title" className="text-lg font-bold">
            What If
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-300">{L("그때 다른 선택을 했다면 내 인생은 어떻게 흘러갔을까요? 과거의 한 순간으로 돌아가 다시 고르고, 그 인생을 끝까지 살아보는 AI 인생 시뮬레이터예요.")}</p>
        </div>
        <dl className="space-y-3">
          {POINTS.map((p) => (
            <div key={p.title} className="space-y-0.5">
              <dt className="text-sm font-semibold">{p.title}</dt>
              <dd className="text-sm text-stone-600 dark:text-stone-300">{p.body}</dd>
            </div>
          ))}
        </dl>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-xl bg-stone-50 px-4 py-3 text-[13px] dark:bg-stone-800/60">
          <dt className="text-stone-500 dark:text-stone-400">{L("버전")}</dt>
          <dd className="font-medium tabular-nums">{APP_VERSION}</dd>
          {APP_COMMIT && (
            <>
              <dt className="text-stone-500 dark:text-stone-400">{L("빌드")}</dt>
              <dd className="font-mono text-[12px]">{APP_COMMIT}</dd>
            </>
          )}
          {APP_BUILT && (
            <>
              <dt className="text-stone-500 dark:text-stone-400">{L("배포일")}</dt>
              <dd className="tabular-nums">{APP_BUILT}</dd>
            </>
          )}
        </dl>
        <Button type="button" className="w-full" onClick={onClose} autoFocus>
          {L("닫기")}
        </Button>
      </div>
    </dialog>
  );
}
