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
  asksPlayer,
  loveFromText,
  loveOf,
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
import { EMPTY_DRAFT, EMPTY_PROFILE, Onboarding, type WizardDraft } from "./Forms";
import { BoardPreview } from "./BoardPreview";
import { BoardDialog } from "./Board";
import { SiteFooter } from "./InfoPages";
import { isToss } from "@/lib/platform";
import { TitleScreen } from "./Title";
import { PlayView, type FreeResult } from "./Play";
import { moderate } from "@/lib/moderation";
import { markAutoPicked, stopsProgress } from "@/lib/playUi";
import { OpeningWait, REWIND_MS, reducedMotion } from "./Waiting";
import { L } from "@/lib/i18n";
import { ageText, ymText } from "@/lib/format";
import { countryFor, inRegion, langFor, loveFor, setLang, setLove, setRegion, type Lang, type Region } from "@/lib/region";
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
  // 앱인토스: the memoir board opens as a window over the title screen (the website links to its /board pages instead).
  const [board, setBoard] = useState(false);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [stored, setStored] = useState<StoredProfile | null>(null);
  const [remember, setRemember] = useState(false);
  const [auto, setAuto] = useState(false);
  // 작은 선택은 맡기기 is on from the start: a life had about 86 stops before, 16 with it (only the big forks, rare and personal moments).
  const [autoDecide, setAutoDecide] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sceneDone, setSceneDone] = useState<string | null>(null);
  const [presentOpen, setPresentOpen] = useState(false);
  const [draft, setDraft] = useState<WizardDraft | null>(null); // answers restored after a refresh
  const [quick, setQuick] = useState(false); // 빠른 시작 picked on the first screen
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
  // Who the player falls for is "her" or "him" in English (i18n.ts withLove): as the life says, else from the gender.
  setLove(lifeShown ? loveOf(life) : loveFromText([tp.situation, tp.actualChoice, tp.regret].join(" ")) ?? loveFor(profile.gender));

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

  function resumeFrom(saved: Saved, ai: boolean) {
    // A profile saved before the hometown question asked for the country takes the country picked on the first screen then.
    setProfile(saved.region && !saved.profile.country ? { ...saved.profile, country: saved.region } : saved.profile);
    setTp(saved.tp);
    // Lives saved before AI-written moments existed pick them up when AI is on.
    setLife(saved.life ? { ...saved.life, ai } : null);
    setEnding(saved.ending);
    // A memoir still being written when the page closed is asked about again rather than left waiting.
    setMemoir(saved.ending ? (saved.memoir ?? "write") : saved.memoir === "skip" ? "skip" : null);
    setScreen(saved.life ? (saved.life.dead ? "ending" : "play") : saved.screen === "turning" ? "turning" : "profile");
  }

  // Going back to a life on load steps aside if the player already left the title screen meanwhile.
  const autoResume = useEffectEvent((s: Saved, on: boolean) => {
    if (screen === "intro") resumeFrom(s, on);
  });

  // Restore the saved profile and game, and check whether the server has an AI key.
  useEffect(() => {
    // A pick from before the cookie existed lives only in storage: honor it and copy it to the cookie.
    const kept = keptLang();
    if (kept && (!initialLang || guessed)) {
      setLangState(kept); // eslint-disable-line react-hooks/set-state-in-effect
      if (!document.cookie.includes(`${LANG_COOKIE}=`)) keepLangCookie(kept);
    } else if (!initialLang) setLangState(fromTag(navigator.languages?.[0] ?? navigator.language ?? ""));
    dropLegacySaves();
    const profileRead = loadProfile().then((sp) => {
      setStored(sp);
      setRemember(!!sp);
    });
    const aiRead = aiAvailable();
    aiRead.then(setAi);
    // The kept game is read first, so a refresh in the middle of the questions can't save over it before it is known.
    const progressRead = readProgress<Saved>().then((s) => {
      if (s?.life || s?.profile.birthDate) setSaved(s);
      return s;
    });
    progressRead
      .then(() => readDraft<WizardDraft>())
      .then((d) => {
        // Answers typed so far wait behind 이어서 입력하기 on the title screen; reopening never jumps into the questions.
        if (!d?.profile) return;
        setDraft(d);
        setRemember(d.remember);
      });
    // A life still being lived when the page closed goes straight back to it (ahead of any unfinished questions).
    // An ended life, or only unfinished questions, shows the title screen with 이어하기 / 이어서 입력하기.
    // It waits for the AI check and the saved-profile check, so the life keeps its AI and stays kept on the device.
    Promise.all([progressRead, aiRead, profileRead]).then(([s, on]) => {
      if (s?.life && !s.life.dead) autoResume(s, on);
    });
  }, [initialLang, guessed]);

  useEffect(() => {
    if (screen === "intro" || screen === "loading") return;
    // While new questions are being answered, a life kept to go back to stays saved; it is replaced only once
    // the new life actually begins (the questions themselves live in the draft).
    if ((screen === "profile" || screen === "turning") && !life && saved?.life) return;
    writeProgress({ screen, profile, tp, life, ending, memoir } satisfies Saved, remember);
  }, [screen, profile, tp, life, ending, memoir, remember, saved]);

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

  const resume = () => saved && resumeFrom(saved, ai);

  const startNew = () => setScreen("profile"); // came back from 처음으로: pick up where they left off
  const startFresh = (q: boolean) => {
    setQuick(q);
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
      step: 0,
      // A saved profile goes straight to the turning point (빠른 시작: to the year).
      at: screen === "turning" ? "date" : profile.birthDate && profile.name && profile.gender && profile.hometown ? (quick ? "year" : "date") : "birth",
      quick: quick && screen !== "turning",
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
    // The rewind plays through at least once, even when the opening needs no AI call.
    const rewound = new Promise((r) => setTimeout(r, reducedMotion() ? 0 : REWIND_MS + 400));
    const [res] = await Promise.all([
      ai
        ? here(() => narrate<OpeningResult>({ kind: "opening", profile: p, turningPoint: t, eraHints: eraHints(mi), age: ageAt(p.birthDate, mi), hints: pathHints(p, t) }))
        : null,
      rewound,
    ]);
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
    if (stop === "choice" && next.pending && stopsProgress(autoDecide, asksPlayer(next.pending))) setAuto(false);
    if (stop === "death") {
      setAuto(false);
      finish();
    }
  }

  const step = () => {
    if (!life) return;
    const r = advanceTurn(life);
    // 다음 달로 with 작은 선택은 맡기기: a small choice that came up is picked at once, as it would be while progressing.
    const p = r.state.pending;
    if (r.stop === "choice" && p && !stopsProgress(autoDecide, asksPlayer(p))) {
      const id = autoPick(r.state);
      if (id) return afterAdvance(life, markAutoPicked(r.state, resolveChoice(r.state, id)), null);
    }
    afterAdvance(life, r.state, r.stop);
  };

  /** A small choice picked for the player while time runs on. */
  const chooseForPlayer = (id: string) => {
    if (!life?.pending) return;
    setLife(withBadges(markAutoPicked(life, resolveChoice(life, id))));
  };

  const choose = (optionId: string, freeText?: string, intent?: Intent | null) => {
    if (!life?.pending) return;
    setLife(withBadges(resolveChoice(life, optionId, freeText, intent)));
  };

  // The player's own words: the narrator reads which option they are closest to and what they change.
  // If it can't be reached the words are kept and the player can try again, or go on with the engine reading them alone.
  async function chooseFree(text: string, force = false): Promise<FreeResult> {
    if (!life?.pending || busy) return "stale";
    if (moderate(text)) return "blocked"; // violence or sex never reaches the narrator or the story
    const key = pendingKeyOf(life);
    let res: ClassifyResult | null = null;
    if (!force) {
      setBusy(true);
      res = await narrate<ClassifyResult>({ kind: "classify", text, options: life.pending.options.map(({ id, label }) => ({ id, label })), allowed: allowedChanges(life) });
      setBusy(false);
      if (!res) return "failed";
      if (res.unsafe) return "blocked"; // the narrator caught what the word list missed
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
      if (stopsProgress(autoDecide, asksPlayer(life.pending))) return setAuto(false);
      if (sceneLoading) return; // a moment that is still being written
      const id = autoPick(life);
      if (id) chooseForPlayer(id);
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
  const wantsScene = ai && !!life?.pending && life.pending.eventId !== TURNING_POINT_ID && (isMoment || !(autoDecide && !asksPlayer(life.pending)));
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
    <main className={`mx-auto flex w-full flex-1 flex-col ${screen === "intro" ? "" : "px-4"} ${screen === "intro" ? "" : screen === "profile" || screen === "turning" ? "max-w-2xl lg:max-w-5xl" : screen === "play" ? "max-w-2xl lg:max-w-6xl" : "max-w-2xl"}`}>
      {screen === "intro" && (
        <div className="flex flex-1 flex-col">
          <TitleScreen
            langs={isToss ? [] : LANGS}
            lang={lang}
            onLang={pickLang}
            onPick={startFresh}
            slots={[
              ...(saved?.life
                ? [
                    {
                      label: L("이어하기"),
                      detail: saved.life.dead
                        ? L`${saved.life.deathAge ?? ageAt(saved.life.profile.birthDate, saved.life.mi)}세에 끝난 인생`
                        : `${ymText(`${Math.floor(saved.life.mi / 12)}-${(saved.life.mi % 12) + 1}`)}, ${ageText(ageAt(saved.life.profile.birthDate, saved.life.mi), "살")}`,
                      onClick: resume,
                    },
                  ]
                : []),
              ...(draft ? [{ label: L("이어서 입력하기"), onClick: startNew }] : []),
              ...(isToss ? [{ label: L("회고록 게시판"), detail: L("다른 사람들이 다시 산 인생"), icon: "☰", onClick: () => setBoard(true) }] : []),
            ]}
            footer={
              <>
                {stored && (
                  <p>
                    {L("저장된 기본정보:")} <b className="font-semibold text-[#efeaff]">{stored.profile.name || L("별명 없음")}</b> · {L`${stored.profile.birthDate.slice(0, 4)}년생`}{" "}
                    <button type="button" onClick={eraseDevice} className="-my-2 px-1 py-2 text-[#ffb3c7] underline underline-offset-2 hover:text-white">
                      {L("지우기")}
                    </button>
                  </p>
                )}
                <p>
                  <span aria-hidden>🔒 </span>
                  {L("입력한 정보는 서버에 남지 않아요")}
                  {!stored && saved && (
                    <>
                      {" · "}
                      <button type="button" onClick={eraseDevice} className="-my-2 py-2 underline underline-offset-2 hover:text-white">
                        {L("진행 기록 지우기")}
                      </button>
                    </>
                  )}
                </p>
              </>
            }
          />
          {/* The board and text pages are server-drawn pages of the website; the 앱인토스 build has no pages to link to. */}
          {!isToss && (
            <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">
              <BoardPreview lang={lang} />
              <SiteFooter lang={lang} />
            </div>
          )}
          {isToss && <BoardDialog open={board} onClose={() => setBoard(false)} />}
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
            onLeave={(d) => {
              setDraft(d);
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
            setSaved({ screen, profile, tp, life, ending, memoir }); // stays to go back to until the new life begins
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
