"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ageAt } from "@/lib/events";
import { withBadges } from "@/lib/badges";
import { eraHints } from "@/lib/era";
import {
  advanceTurn,
  advanceUntilStop,
  allowedChanges,
  autoPick,
  createLife,
  dropPending,
  fillMoment,
  fillScene,
  lifeFacts,
  lifeSummary,
  pendingKeyOf,
  resolveChoice,
  TURNING_POINT_ID,
  turningPointMi,
  type StopReason,
} from "@/lib/engine";
import { clearDraft, dropLegacySaves, eraseAll, forgetProfile, loadProfile, readDraft, readProgress, saveProfile, writeProgress, type StoredProfile } from "@/lib/localData";
import { aiAvailable, narrate } from "@/lib/narrator/client";
import { fallbackEnding, fallbackOpening } from "@/lib/narrator/fallback";
import type { ClassifyResult, EndingResult, MomentResult, OpeningResult, SceneResult } from "@/lib/narrator/schema";
import { EMPTY_TP } from "@/lib/onboarding";
import type { LifeState, Profile, TurningPoint } from "@/lib/types";
import { EndingView } from "./Ending";
import { EMPTY_DRAFT, EMPTY_PROFILE, Onboarding, TURNING_STEP, type WizardDraft } from "./Forms";
import { PlayView } from "./Play";
import { Button } from "./ui";
import { OpeningWait } from "./Waiting";

type Screen = "intro" | "profile" | "turning" | "loading" | "play" | "ending";

interface Saved {
  screen: Screen;
  profile: Profile;
  tp: TurningPoint;
  life: LifeState | null;
  ending: EndingResult | null;
}


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
  const [draft, setDraft] = useState<WizardDraft | null>(null); // answers restored after a refresh
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
    // A refresh in the middle of the questions goes straight back to the same question.
    readDraft<WizardDraft>().then((d) => {
      if (!d?.profile) return;
      setDraft(d);
      setRemember(d.remember);
      setScreen((s) => (s === "intro" ? "profile" : s));
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
    setDraft(null);
    setProfile(EMPTY_PROFILE);
    setTp(EMPTY_TP);
    setLife(null);
    setEnding(null);
  };

  const resume = () => {
    if (!saved) return;
    setProfile(saved.profile);
    setTp(saved.tp);
    // Lives saved before AI-written moments existed pick them up when AI is on.
    setLife(saved.life ? { ...saved.life, ai } : null);
    setEnding(saved.ending);
    setScreen(saved.life ? (saved.life.dead ? "ending" : "play") : saved.screen === "turning" ? "turning" : "profile");
  };

  const startNew = () => {
    setProfile(stored?.profile ?? saved?.profile ?? EMPTY_PROFILE);
    setTp(EMPTY_TP);
    setDraft(null);
    setLife(null);
    setEnding(null);
    setScreen("profile");
  };

  // The questions start from the restored draft, or from what is known so far (a saved profile, a previous turning point).
  const wizardStart = (): WizardDraft => {
    if (draft) return draft;
    const freeText = !!tp.situation; // turning points written before the fill-in-the-blanks sentence stay as plain text
    return {
      ...EMPTY_DRAFT,
      step: screen === "turning" || profile.birthDate ? TURNING_STEP : 0, // a saved profile goes straight to the turning point
      profile,
      tp,
      mode: freeText ? "free" : "template",
      free: tp.situation,
      remember,
    };
  };

  async function startOpening(p: Profile, t: TurningPoint) {
    setScreen("loading");
    const mi = turningPointMi(t);
    const res = ai
      ? await narrate<OpeningResult>({ kind: "opening", profile: p, turningPoint: t, eraHints: eraHints(Math.floor(mi / 12)), age: ageAt(p.birthDate, mi) })
      : null;
    const opening = res && res.choices.length >= 2 ? res : fallbackOpening(p, t);
    personalized.current = null;
    setLife(withBadges(createLife(p, t, opening, { ai })));
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

  function afterAdvance(prev: LifeState, advanced: LifeState, stop: StopReason) {
    const next = withBadges(advanced);
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
    setLife(withBadges(resolveChoice(life, optionId, freeText)));
  };

  async function chooseFree(text: string) {
    if (!life?.pending) return;
    setBusy(true);
    const res = await narrate<ClassifyResult>({ kind: "classify", text, options: life.pending.options.map(({ id, label }) => ({ id, label })) });
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
  // A "personal" moment has no options until the narrator writes them from this life's state, so it always waits.
  const pendingKey = life ? pendingKeyOf(life) : null;
  const isMoment = life?.pending?.eventId === "personal";
  const wantsScene = ai && !!life?.pending && life.pending.eventId !== TURNING_POINT_ID && (isMoment || !(auto && autoDecide));
  const sceneLoading = wantsScene && sceneDone !== pendingKey;

  const personalize = useEffectEvent(async (key: string) => {
    if (!life?.pending || personalized.current === key) return;
    personalized.current = key;
    const pending = life.pending;
    const common = { summary: lifeSummary(life), facts: lifeFacts(life), persona: life.persona, eraHints: eraHints(Math.floor(life.mi / 12)) };
    if (pending.eventId === "personal") {
      const recentTitles = life.choices.slice(-8).map((c) => c.title);
      const res = await narrate<MomentResult>({ kind: "moment", ...common, allowed: allowedChanges(life), recentTitles });
      // An unwritten moment is dropped as if it never happened, so play goes on.
      setLife((cur) => (cur && pendingKeyOf(cur) === key ? ((res && fillMoment(cur, key, res)) ?? dropPending(cur)) : cur));
    } else {
      const res = await narrate<SceneResult>({
        kind: "scene",
        ...common,
        title: pending.title,
        intro: pending.scene,
        options: pending.options.map(({ id, label, detail }) => ({ id, label, ...(detail ? { detail } : {}) })),
      });
      if (res) setLife((cur) => (cur ? fillScene(cur, key, res) : cur));
    }
    setSceneDone(key);
  });

  useEffect(() => {
    // personalize only sets state after its fetch resolves, so this is a subscription, not a cascade.
    if (pendingKey && wantsScene) personalize(pendingKey); // eslint-disable-line react-hooks/set-state-in-effect
  }, [pendingKey, wantsScene]);

  return (
    <main className={`mx-auto flex w-full flex-1 flex-col px-4 ${screen === "profile" || screen === "turning" ? "max-w-2xl lg:max-w-5xl" : "max-w-2xl"}`}>
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
                <button type="button" onClick={eraseDevice} className="-my-2 shrink-0 px-1 py-2 text-rose-700 underline-offset-2 hover:underline dark:text-rose-400">
                  지우기
                </button>
              </div>
            )}
            <p className="text-center text-xs text-stone-500 dark:text-stone-400">
              {ai ? "AI 내레이션이 켜져 있어요." : "AI 키가 없어 기본 문장으로 진행해요."} 입력한 정보는 서버에 보관하지 않아요.
              {!stored && saved && (
                <>
                  {" "}
                  <button type="button" onClick={eraseDevice} className="-my-2 py-2 underline underline-offset-2">
                    진행 기록 지우기
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {(screen === "profile" || screen === "turning") && (
        <div className="py-6 sm:py-10">
          <Onboarding
            key={screen}
            initial={wizardStart()}
            onExit={() => {
              clearDraft();
              setDraft(null);
              setScreen("intro");
            }}
            onDone={(p, t, keep) => {
              clearDraft();
              setDraft(null);
              setProfile(p);
              setTp(t);
              setRemember(keep);
              if (keep)
                saveProfile(p).then(setStored, () => {
                  setStored(null);
                  setRemember(false); // this browser can't encrypt or store; fall back to not saving
                });
              else if (stored) forgetProfile().then(() => setStored(null));
              startOpening(p, t);
            }}
          />
        </div>
      )}

      {screen === "loading" && (
        <OpeningWait date={tp.date} ai={ai} />
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
