"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ageAt } from "@/lib/events";
import { withBadges } from "@/lib/badges";
import { eraHints } from "@/lib/era";
import {
  advanceTurn,
  allowedChanges,
  autoPick,
  createLife,
  dropPending,
  fillMoment,
  fillScene,
  isBigChoice,
  lifeSummary,
  pendingKeyOf,
  resolveChoice,
  slotFallback,
  TURNING_POINT_ID,
  turningPointMi,
  type Intent,
  type StopReason,
} from "@/lib/engine";
import { clearDraft, dropLegacySaves, eraseAll, forgetProfile, loadProfile, readDraft, readProgress, saveProfile, writeProgress, type StoredProfile } from "@/lib/localData";
import { aiAvailable, narrate } from "@/lib/narrator/client";
import { fallbackEnding, fallbackOpening } from "@/lib/narrator/fallback";
import { choiceRequest } from "@/lib/narrator/requests";
import { pathHints, topUpChoices } from "@/lib/narrator/turningChoices";
import type { ClassifyResult, EndingResult, MomentResult, OpeningResult, SceneResult } from "@/lib/narrator/schema";
import { EMPTY_TP } from "@/lib/onboarding";
import type { LifeState, Profile, TurningPoint } from "@/lib/types";
import { EndingView } from "./Ending";
import { beforeMemoir } from "@/lib/ads";
import { EMPTY_DRAFT, EMPTY_PROFILE, Onboarding, TURNING_STEP, type WizardDraft } from "./Forms";
import { PlayView, type FreeResult } from "./Play";
import { stopsProgress } from "@/lib/playUi";
import { Button } from "./ui";
import { OpeningWait } from "./Waiting";
import { L } from "@/lib/i18n";
import { countryFor, inRegion, langFor, setLang, setRegion, type Lang, type Region } from "@/lib/region";
import { fromTag, LANG_COOKIE } from "@/lib/langPick";

// Everyday moments, small dilemmas, follow-ups and rare moments written for each life (hybrid.ts).
// NEXT_PUBLIC_WHATIF_HYBRID=0 turns it off for new lives: every event then plays from the pool.
const HYBRID = process.env.NEXT_PUBLIC_WHATIF_HYBRID !== "0";

type Screen = "intro" | "profile" | "turning" | "loading" | "play" | "ending";

interface Saved {
  screen: Screen;
  region?: Region; // no longer written: the country is in the profile, and a life carries its own

  profile: Profile;
  tp: TurningPoint;
  life: LifeState | null;
  ending: EndingResult | null;
  memoir?: MemoirPick; // missing in saves from before the question: an ending there was always written
}

/** The answer to "회고록을 써 드릴까요?" when a life ends; null until the player answers. */
type MemoirPick = "write" | "skip" | null;


const LANG_KEY = "whatif.lang";

// Each language is named in itself, so a player who can't read the other one still finds theirs.
const LANGS: { id: Lang; name: string }[] = [
  { id: "ko", name: "한국어" },
  { id: "en", name: "English" },
];

/** The language picked last time on this device (or the country picked before languages existed). */
function keptLang(): Lang | undefined {
  try {
    const kept = localStorage.getItem(LANG_KEY) ?? { us: "en", kr: "ko" }[localStorage.getItem("whatif.region") ?? ""];
    if (kept === "en" || kept === "ko") return kept;
  } catch {
    // storage blocked
  }
  return undefined;
}

/** Keeps the pick as a cookie too, so the next visit is drawn in it from the first paint. */
function keepLangCookie(l: Lang) {
  document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * initialLang is the language the server drew the page in: /en is English; on / it is the visitor's earlier pick
 * (cookie) or the browser's language, and `guessed` says a pick kept only on this device may still change it.
 */
export default function Game({ initialLang, guessed }: { initialLang?: Lang; guessed?: boolean } = {}) {
  const [screen, setScreen] = useState<Screen>("intro");
  const [lang, setLangState] = useState<Lang>(initialLang ?? "ko");
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [tp, setTp] = useState<TurningPoint>(EMPTY_TP);
  const [life, setLife] = useState<LifeState | null>(null);
  const [ending, setEnding] = useState<EndingResult | null>(null);
  const [memoir, setMemoir] = useState<MemoirPick>(null);
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
  // The life as last rendered, so an answer that comes back after the choice moved on is dropped, not applied twice.
  const lifeRef = useRef<LifeState | null>(null);
  useEffect(() => {
    lifeRef.current = life;
  }, [life]);

  // A life on screen keeps the country and language it was started in; before that, the language picked on the
  // first screen and the country answered in the questions (the wizard sets it while it is open).
  const lifeShown = life && (screen === "play" || screen === "ending");
  const shownRegion: Region = lifeShown ? (life.region ?? "kr") : (profile.country ?? countryFor(lang));
  const shownLang: Lang = lifeShown ? (life.lang ?? langFor(life.region)) : lang;
  setRegion(shownRegion);
  setLang(shownLang);

  useEffect(() => {
    document.documentElement.lang = shownLang;
  }, [shownLang]);

  const pickLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
      keepLangCookie(l);
    } catch {
      // not remembered; the address still says which
    }
    window.history.replaceState(null, "", l === "en" ? "/en" : "/");
  };

  // Restore the saved profile and game, and check whether the server has an AI key.
  useEffect(() => {
    // A pick from before the cookie existed lives only in storage: honor it and copy it to the cookie.
    const kept = keptLang();
    if (kept && (!initialLang || guessed)) {
      setLangState(kept); // eslint-disable-line react-hooks/set-state-in-effect
      if (!document.cookie.includes(`${LANG_COOKIE}=`)) keepLangCookie(kept);
    } else if (!initialLang) setLangState(fromTag(navigator.languages?.[0] ?? navigator.language ?? ""));
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
  }, [initialLang, guessed]);

  useEffect(() => {
    if (screen === "intro" || screen === "loading") return;
    writeProgress({ screen, profile, tp, life, ending, memoir } satisfies Saved, remember);
  }, [screen, profile, tp, life, ending, memoir, remember]);

  const eraseDevice = async () => {
    if (!confirm(L("이 기기에 저장된 기본정보와 진행 중인 게임을 모두 지울까요? 되돌릴 수 없어요."))) return;
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
    // A profile saved before the hometown question asked for the country takes the country picked on the first screen then.
    setProfile(saved.region && !saved.profile.country ? { ...saved.profile, country: saved.region } : saved.profile);
    setTp(saved.tp);
    // Lives saved before AI-written moments existed pick them up when AI is on.
    setLife(saved.life ? { ...saved.life, ai } : null);
    setEnding(saved.ending);
    // A memoir still being written when the page closed is asked about again rather than left waiting.
    setMemoir(saved.ending ? (saved.memoir ?? "write") : saved.memoir === "skip" ? "skip" : null);
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
    // The new life's country and language, until it is on screen and sets them itself.
    const here = <T,>(fn: () => T) => inRegion(p.country ?? "kr", fn, lang);
    const res = ai
      ? await here(() => narrate<OpeningResult>({ kind: "opening", profile: p, turningPoint: t, eraHints: eraHints(mi), age: ageAt(p.birthDate, mi), hints: pathHints(p, t) }))
      : null;
    const opening = here(() => (res && res.choices.length >= 2 ? { ...res, choices: topUpChoices(res.choices, p, t) } : fallbackOpening(p, t)));
    personalized.current = null;
    setLife(withBadges(createLife(p, t, opening, { ai, hybrid: HYBRID, region: p.country ?? "kr", lang })));
    setEnding(null);
    setPresentOpen(false);
    setAuto(false);
    setScreen("play");
  }

  // The end of a life first says so and asks whether to write the memoir (EndingView); nothing is written until then.
  function finish() {
    setMemoir(null);
    setEnding(null);
    setTimeout(() => setScreen("ending"), 1200);
  }

  async function writeMemoir() {
    if (!life?.dead) return;
    const dead = life;
    setMemoir("write");
    setEnding(null);
    window.scrollTo({ top: 0 }); // asked from the bottom of the skipped view: the memoir starts at its top
    // The ad (phones, once ads are on) and the writing run together; the memoir shows when both are done.
    const [res] = await Promise.all([ai
      ? narrate<EndingResult>({
          kind: "ending",
          summary: lifeSummary(dead, 30),
          persona: dead.persona,
          profile: dead.profile,
          turningPoint: dead.turningPoint,
          deathAge: dead.deathAge ?? 0,
        })
      : null, beforeMemoir()]);
    if (lifeRef.current !== dead) return; // moved on to another life meanwhile
    setEnding(res ?? fallbackEnding(dead));
  }

  function afterAdvance(prev: LifeState, advanced: LifeState, stop: StopReason) {
    const next = withBadges(advanced);
    setLife(next);
    // 선택까지 진행 runs until the player has something to do: the present-day card, a choice
    // (with 선택도 맡기기, only a big one; small ones are picked on the next tick), or the end.
    if (next.log.slice(prev.log.length).some((e) => e.kind === "present")) {
      setPresentOpen(true);
      setAuto(false);
    }
    if (stop === "choice" && next.pending && stopsProgress(autoDecide, isBigChoice(next.pending))) setAuto(false);
    if (stop === "death") {
      setAuto(false);
      finish();
    }
  }

  const step = () => {
    if (!life) return;
    const r = advanceTurn(life);
    afterAdvance(life, r.state, r.stop);
  };

  const choose = (optionId: string, freeText?: string, intent?: Intent | null) => {
    if (!life?.pending) return;
    setLife(withBadges(resolveChoice(life, optionId, freeText, intent)));
  };

  // The player's own words: the narrator reads which option they are closest to and what they change.
  // If it can't be reached the words are kept and the player can try again, or go on with the engine reading them alone.
  async function chooseFree(text: string, force = false): Promise<FreeResult> {
    if (!life?.pending || busy) return "stale";
    const key = pendingKeyOf(life);
    let res: ClassifyResult | null = null;
    if (!force) {
      setBusy(true);
      res = await narrate<ClassifyResult>({ kind: "classify", text, options: life.pending.options.map(({ id, label }) => ({ id, label })), allowed: allowedChanges(life) });
      setBusy(false);
      if (!res) return "failed";
    }
    // Another answer already settled this choice while the narrator was reading (a second tap, a reload): drop this one.
    const cur = lifeRef.current;
    if (!cur?.pending || pendingKeyOf(cur) !== key) return "stale";
    const id = cur.pending.options.some((o) => o.id === res?.choiceId) ? res!.choiceId : cur.pending.options[0].id;
    // What the player wrote decides the life change and where it happens; without the narrator, the engine reads both from the words.
    setLife(withBadges(resolveChoice(cur, id, text, res ? { change: res.change, title: res.jobTitle, place: res.place } : null)));
    return "ok";
  }

  // 선택까지 진행: one turn per tick until the next choice is the player's to make (afterAdvance stops it there),
  // or until they press 멈추기. With 선택도 맡기기, small choices are picked by temperament and time runs on.
  const tick = useEffectEvent(() => {
    if (!life || life.dead) return setAuto(false);
    if (presentOpen) return setAuto(false);
    if (life.pending) {
      if (stopsProgress(autoDecide, isBigChoice(life.pending))) return setAuto(false);
      if (sceneLoading) return; // a moment that is still being written
      const id = autoPick(life);
      if (id) choose(id);
      return;
    }
    step();
  });

  useEffect(() => {
    if (!auto || screen !== "play") return;
    const t = setInterval(tick, 800);
    return () => clearInterval(t);
  }, [auto, screen]);

  // Ask the narrator to write the scene and personalize the options for each new choice event.
  // A "personal" moment has no options until the narrator writes them from this life's state, so it always waits.
  const pendingKey = life ? pendingKeyOf(life) : null;
  // A rare moment the pool rolled has nothing to show until it is written (or falls back to the pool's outcome).
  const isMoment = life?.pending?.eventId === "personal" || (!!life?.pending?.slot && life.pending.options.length === 0);
  const wantsScene = ai && !!life?.pending && life.pending.eventId !== TURNING_POINT_ID && (isMoment || !(auto && autoDecide && !isBigChoice(life.pending)));
  const sceneLoading = wantsScene && sceneDone !== pendingKey;

  const personalize = useEffectEvent(async (key: string) => {
    if (!life?.pending || personalized.current === key) return;
    personalized.current = key;
    const req = choiceRequest(life);
    if (req?.kind === "moment") {
      const res = await narrate<MomentResult>(req);
      // A pool moment the narrator couldn't write plays as the pool has it; a free one is dropped as if it never happened.
      setLife((cur) => {
        if (!cur || pendingKeyOf(cur) !== key) return cur;
        return (res && fillMoment(cur, key, res)) ?? (cur.pending?.slot ? slotFallback(cur, key) : dropPending(cur));
      });
    } else if (req) {
      const res = await narrate<SceneResult>(req);
      if (res) setLife((cur) => (cur ? fillScene(cur, key, res) : cur));
    }
    setSceneDone(key);
  });

  useEffect(() => {
    // personalize only sets state after its fetch resolves, so this is a subscription, not a cascade.
    if (pendingKey && wantsScene) personalize(pendingKey); // eslint-disable-line react-hooks/set-state-in-effect
  }, [pendingKey, wantsScene]);

  return (
    <main className={`mx-auto flex w-full flex-1 flex-col px-4 ${screen === "profile" || screen === "turning" ? "max-w-2xl lg:max-w-5xl" : screen === "play" ? "max-w-2xl lg:max-w-6xl" : "max-w-2xl"}`}>
      {screen === "intro" && (
        <div className="relative flex flex-1 flex-col justify-center gap-10 py-16">
          <div role="group" aria-label="Language · 언어" className="fixed right-4 top-4 z-10 flex rounded-full border border-stone-200 bg-[var(--background)] p-0.5 text-sm dark:border-stone-800">
            <span aria-hidden className="flex items-center pl-2.5 pr-1 text-stone-500 dark:text-stone-400">
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="10" cy="10" r="7.5" />
                <path d="M2.5 10h15M10 2.5c2.2 2.3 3.2 4.8 3.2 7.5s-1 5.2-3.2 7.5c-2.2-2.3-3.2-4.8-3.2-7.5s1-5.2 3.2-7.5z" />
              </svg>
            </span>
            {LANGS.map((l) => (
              <button
                key={l.id}
                type="button"
                lang={l.id}
                aria-pressed={lang === l.id}
                onClick={() => pickLang(l.id)}
                className={`min-h-9 rounded-full px-3 font-medium transition ${
                  lang === l.id ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900" : "text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
                }`}
              >
                {l.name}
              </button>
            ))}
          </div>
          <div>
            <p className="text-sm font-semibold tracking-widest text-indigo-600 dark:text-indigo-400">WHAT IF</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight">
              {L("그때 다른 선택을 했다면,")}
              <br />
              {L("지금 나는 어떻게 살고 있을까?")}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-stone-600 dark:text-stone-400">
              {L("인생의 한 순간으로 돌아가 다른 선택을 하고, 그 인생을 마지막 날까지 살아보세요.")}
            </p>
          </div>
          <div className="space-y-3">
            <Button className="w-full py-4 text-base" onClick={startNew}>
              {L("시작하기")}
            </Button>
            {saved?.life && (
              <Button variant="ghost" className="w-full" onClick={resume}>
                {L("이어하기")}
              </Button>
            )}
            {stored && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 px-4 py-3 text-sm dark:border-stone-800">
                <span className="text-stone-600 dark:text-stone-400">
                  {L("저장된 기본정보:")} <b className="text-stone-900 dark:text-stone-100">{stored.profile.name || L("별명 없음")}</b> · {L`${stored.profile.birthDate.slice(0, 4)}년생`}
                </span>
                <button type="button" onClick={eraseDevice} className="-my-2 shrink-0 px-1 py-2 text-rose-700 underline-offset-2 hover:underline dark:text-rose-400">
                  {L("지우기")}
                </button>
              </div>
            )}
            <p className="text-center text-xs text-stone-500 dark:text-stone-400">
              {ai ? L("AI 내레이션이 켜져 있어요.") : L("AI 키가 없어 기본 문장으로 진행해요.")} {L("입력한 정보는 서버에 보관하지 않아요.")}
              {!stored && saved && (
                <>
                  {" "}
                  <button type="button" onClick={eraseDevice} className="-my-2 py-2 underline underline-offset-2">
                    {L("진행 기록 지우기")}
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
            onProgress: () => {
              // The first turn moves at once; the rest follow on the tick. afterAdvance turns it off again if a choice is already here.
              setAuto(true);
              step();
            },
            onStop: () => setAuto(false),
            onToggleAutoDecide: () => setAutoDecide((a) => !a),
            onChoose: (id) => choose(id),
            onChooseFree: chooseFree,
            onClosePresent: () => setPresentOpen(false),
            onQuit: () => {
              setAuto(false);
              setSaved({ screen, profile, tp, life, ending, memoir });
              setScreen("intro");
            },
          }}
        />
      )}

      {screen === "ending" && life && (
        <EndingView
          life={life}
          ending={ending}
          memoir={memoir}
          onWriteMemoir={writeMemoir}
          onSkipMemoir={() => setMemoir("skip")}
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
