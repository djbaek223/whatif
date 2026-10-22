"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ageAt } from "@/lib/events";
import { eraHints } from "@/lib/era";
import {
  advanceTurn,
  advanceUntilStop,
  autoPick,
  createLife,
  lifeSummary,
  resolveChoice,
  TURNING_POINT_ID,
  turningPointMi,
  type StopReason,
} from "@/lib/engine";
import { dropLegacySaves, eraseAll, forgetProfile, loadProfile, readProgress, saveProfile, writeProgress, type StoredProfile } from "@/lib/localData";
import { aiAvailable, narrate } from "@/lib/narrator/client";
import { fallbackEnding, fallbackOpening } from "@/lib/narrator/fallback";
import type { ClassifyResult, EndingResult, OpeningResult, SceneResult } from "@/lib/narrator/schema";
import type { LifeState, Profile, TurningPoint } from "@/lib/types";
import { EndingView } from "./Ending";
import { EMPTY_PROFILE, ProfileForm, TurningPointForm } from "./Forms";
import { PlayView } from "./Play";
import { Button } from "./ui";

type Screen = "intro" | "profile" | "turning" | "loading" | "play" | "ending";

interface Saved {
  screen: Screen;
  profile: Profile;
  tp: TurningPoint;
  life: LifeState | null;
  ending: EndingResult | null;
}

const EMPTY_TP: TurningPoint = { date: "", situation: "", actualChoice: "", regret: "" };

export default function Game() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [tp, setTp] = useState<TurningPoint>(EMPTY_TP);
  const [life, setLife] = useState<LifeState | null>(null);
  const [ending, setEnding] = useState<EndingResult | null>(null);
  const [ai, setAi] = useState(false);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [stored, setStored] = useState<StoredProfile | null>(null);
  const [remember, setRemember] = useState(false);
  const [auto, setAuto] = useState(false);
  const [autoDecide, setAutoDecide] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sceneDone, setSceneDone] = useState<string | null>(null);
  const [presentOpen, setPresentOpen] = useState(false);
  const personalized = useRef<string | null>(null);

  // Restore the saved profile and game, and check whether the server has an AI key.
  useEffect(() => {
    dropLegacySaves();
    loadProfile().then((sp) => {
      setStored(sp);
      setRemember(!!sp);
    });
    readProgress<Saved>().then((s) => {
      if (s?.life || s?.profile.birthDate) setSaved(s);
    });
    aiAvailable().then(setAi);
  }, []);

  useEffect(() => {
    if (screen === "intro" || screen === "loading") return;
    writeProgress({ screen, profile, tp, life, ending } satisfies Saved, remember);
  }, [screen, profile, tp, life, ending, remember]);

  const eraseDevice = async () => {
    if (!confirm("이 기기에 저장된 기본정보와 진행 중인 게임을 모두 지울까요? 되돌릴 수 없어요.")) return;
    await eraseAll();
    setStored(null);
    setRemember(false);
    setSaved(null);
    setProfile(EMPTY_PROFILE);
    setTp(EMPTY_TP);
    setLife(null);
    setEnding(null);
  };

  const resume = () => {
    if (!saved) return;
    setProfile(saved.profile);
    setTp(saved.tp);
    setLife(saved.life);
    setEnding(saved.ending);
    setScreen(saved.life ? (saved.life.dead ? "ending" : "play") : saved.screen === "turning" ? "turning" : "profile");
  };

  const startNew = () => {
    setProfile(stored?.profile ?? saved?.profile ?? EMPTY_PROFILE);
    setTp(EMPTY_TP);
    setLife(null);
    setEnding(null);
    setScreen("profile");
  };

  async function startOpening(p: Profile, t: TurningPoint) {
    setScreen("loading");
    const mi = turningPointMi(t);
    const res = ai
      ? await narrate<OpeningResult>({ kind: "opening", profile: p, turningPoint: t, eraHints: eraHints(Math.floor(mi / 12)), age: ageAt(p.birthDate, mi) })
      : null;
    const opening = res && res.choices.length >= 2 ? res : fallbackOpening(p, t);
    personalized.current = null;
    setLife(createLife(p, t, opening));
    setEnding(null);
    setPresentOpen(false);
    setAuto(false);
    setScreen("play");
  }

  async function finish(dead: LifeState) {
    setTimeout(() => setScreen("ending"), 1200);
    const res = ai
      ? await narrate<EndingResult>({
          kind: "ending",
          summary: lifeSummary(dead, 30),
          persona: dead.persona,
          profile: dead.profile,
          turningPoint: dead.turningPoint,
          deathAge: dead.deathAge ?? 0,
        })
      : null;
    setEnding(res ?? fallbackEnding(dead));
  }

  function afterAdvance(prev: LifeState, next: LifeState, stop: StopReason) {
    setLife(next);
    if (next.log.slice(prev.log.length).some((e) => e.kind === "present")) {
      setPresentOpen(true);
      setAuto(false);
    }
    if (stop === "death") {
      setAuto(false);
      finish(next);
    }
  }

  const step = () => {
    if (!life) return;
    const r = advanceTurn(life);
    afterAdvance(life, r.state, r.stop);
  };

  const skip = () => {
    if (!life) return;
    const r = advanceUntilStop(life);
    afterAdvance(life, r.state, r.stop);
  };

  const choose = (optionId: string, freeText?: string) => {
    if (!life?.pending) return;
    setLife(resolveChoice(life, optionId, freeText));
  };

  async function chooseFree(text: string) {
    if (!life?.pending) return;
    setBusy(true);
    const res = await narrate<ClassifyResult>({ kind: "classify", text, options: life.pending.options });
    const id = life.pending.options.some((o) => o.id === res?.choiceId) ? res!.choiceId : life.pending.options[0].id;
    setBusy(false);
    choose(id, text);
  }

  // Auto play: one turn per tick; stops at choices unless auto-decide is on.
  const tick = useEffectEvent(() => {
    if (!life || life.dead || presentOpen) return setAuto(false);
    if (life.pending) {
      if (!autoDecide || sceneLoading) return autoDecide ? undefined : setAuto(false);
      const id = autoPick(life);
      if (id) choose(id);
      return;
    }
    step();
  });

  useEffect(() => {
    if (!auto || screen !== "play") return;
    const t = setInterval(tick, 450);
    return () => clearInterval(t);
  }, [auto, screen]);

  // Ask the narrator to write the scene and personalize the options for each new choice event.
  const pendingKey = life?.pending ? `${life.pending.eventId}@${life.mi}` : null;
  const wantsScene = ai && !!life?.pending && life.pending.eventId !== TURNING_POINT_ID && !(auto && autoDecide);
  const sceneLoading = wantsScene && sceneDone !== pendingKey;

  const personalize = useEffectEvent(async (key: string) => {
    if (!life?.pending || personalized.current === key) return;
    personalized.current = key;
    const pending = life.pending;
    const res = await narrate<SceneResult>({
      kind: "scene",
      summary: lifeSummary(life),
      persona: life.persona,
      title: pending.title,
      intro: pending.scene,
      options: pending.options,
      eraHints: eraHints(Math.floor(life.mi / 12)),
    });
    if (res) {
      const labels = new Map(res.labels.map((l) => [l.id, l.label]));
      setLife((cur) => {
        if (!cur?.pending || `${cur.pending.eventId}@${cur.mi}` !== key) return cur;
        return {
          ...cur,
          pending: { ...cur.pending, scene: res.scene || cur.pending.scene, options: cur.pending.options.map((o) => ({ ...o, label: labels.get(o.id) || o.label })) },
        };
      });
    }
    setSceneDone(key);
  });

  useEffect(() => {
    // personalize only sets state after its fetch resolves, so this is a subscription, not a cascade.
    if (pendingKey && wantsScene) personalize(pendingKey); // eslint-disable-line react-hooks/set-state-in-effect
  }, [pendingKey, wantsScene]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4">
      {screen === "intro" && (
        <div className="flex flex-1 flex-col justify-center gap-10 py-16">
          <div>
            <p className="text-sm font-semibold tracking-widest text-indigo-600 dark:text-indigo-400">WHAT IF</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight">
              그때 다른 선택을 했다면,
              <br />
              지금 나는 어떻게 살고 있을까?
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-stone-600 dark:text-stone-400">
              인생의 한 순간으로 돌아가 다른 선택을 하고, 그 인생을 마지막 날까지 살아보세요.
            </p>
          </div>
          <div className="space-y-3">
            <Button className="w-full py-4 text-base" onClick={startNew}>
              시작하기
            </Button>
            {saved?.life && (
              <Button variant="ghost" className="w-full" onClick={resume}>
                이어하기
              </Button>
            )}
            {stored && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 px-4 py-3 text-sm dark:border-stone-800">
                <span className="text-stone-600 dark:text-stone-400">
                  저장된 기본정보: <b className="text-stone-900 dark:text-stone-100">{stored.profile.name || "별명 없음"}</b> · {stored.profile.birthDate.slice(0, 4)}년생
                </span>
                <button type="button" onClick={eraseDevice} className="shrink-0 text-rose-600 underline-offset-2 hover:underline dark:text-rose-400">
                  지우기
                </button>
              </div>
            )}
            <p className="text-center text-xs text-stone-500">
              {ai ? "AI 내레이션이 켜져 있어요." : "AI 키가 없어 기본 문장으로 진행해요."} 입력한 정보는 서버에 보관하지 않아요.
              {!stored && saved && (
                <>
                  {" "}
                  <button type="button" onClick={eraseDevice} className="underline underline-offset-2">
                    진행 기록 지우기
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {screen === "profile" && (
        <div className="py-10">
          <ProfileForm
            initial={profile}
            initialRemember={remember}
            onBack={() => setScreen("intro")}
            onDone={(p, keep) => {
              setProfile(p);
              setRemember(keep);
              if (keep)
                saveProfile(p).then(setStored, () => {
                  setStored(null);
                  setRemember(false); // this browser can't encrypt or store; fall back to not saving
                });
              else if (stored) forgetProfile().then(() => setStored(null));
              setScreen("turning");
            }}
          />
        </div>
      )}

      {screen === "turning" && (
        <div className="py-10">
          <TurningPointForm
            profile={profile}
            initial={tp}
            onBack={() => setScreen("profile")}
            onDone={(t) => {
              setTp(t);
              startOpening(profile, t);
            }}
          />
        </div>
      )}

      {screen === "loading" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-stone-300 border-t-indigo-500" />
          <p className="text-lg font-semibold">그날로 돌아가는 중...</p>
          <p className="text-sm text-stone-500">{tp.date.replace("-", "년 ")}월의 공기를 떠올리고 있어요.</p>
        </div>
      )}

      {screen === "play" && life && (
        <PlayView
          life={life}
          ai={ai}
          auto={auto}
          autoDecide={autoDecide}
          busy={busy}
          sceneLoading={sceneLoading}
          presentOpen={presentOpen}
          handlers={{
            onStep: step,
            onSkip: skip,
            onToggleAuto: () => setAuto((a) => !a),
            onToggleAutoDecide: () => setAutoDecide((a) => !a),
            onChoose: (id) => choose(id),
            onChooseFree: chooseFree,
            onClosePresent: () => setPresentOpen(false),
            onQuit: () => {
              setAuto(false);
              setSaved({ screen, profile, tp, life, ending });
              setScreen("intro");
            },
          }}
        />
      )}

      {screen === "ending" && life && (
        <EndingView
          life={life}
          ending={ending}
          onReplay={() => startOpening(profile, tp)}
          onNewTurningPoint={() => {
            setLife(null);
            setEnding(null);
            setScreen("turning");
          }}
          onHome={() => {
            setSaved(null);
            setScreen("intro");
          }}
        />
      )}
    </main>
  );
}
