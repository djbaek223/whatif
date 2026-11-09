"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { PROFILE_TTL_DAYS, writeDraft } from "@/lib/localData";
import { isToss } from "@/lib/platform";
import {
  ageIn,
  EMPTY_TP,
  countryName,
  fillTemplate,
  josa,
  kindDef,
  personalityChips,
  quickTurningPoint,
  quickYears,
  suggestions,
  tpKinds,
  type TpBlanks,
} from "@/lib/onboarding";
import { canAutoFocusText } from "@/lib/keyboard";
import type { Gender, Profile, TurningPoint } from "@/lib/types";
import { CharacterCard } from "./CharacterCard";
import { DatePicker, type Ymd } from "./DatePicker";
import { BirthDateInput, birthParts } from "./BirthDateInput";
import { Badge, blockedMessage, Button, Card, Field, FieldError, Input, Textarea } from "./ui";
import { moderateAll } from "@/lib/moderation";
import { L, T } from "@/lib/i18n";
import { ageText, ymText, ymdText, cap } from "@/lib/format";
import { countryFor, isEn, lang, setRegion, type Region } from "@/lib/region";

export const EMPTY_PROFILE: Profile = {
  name: "",
  birthDate: "",
  gender: "",
  hometown: "",
  elementary: "",
  middle: "",
  high: "",
  university: "",
  universityYear: "",
  major: "",
  family: "",
  mbti: "",
  personality: "",
  currentLife: "",
};

export type StepId = "birth" | "year" | "kind" | "date" | "situation" | "review" | "family" | "personality" | "current" | "regret";

// Quick start: four questions (main) and the summary, then the life begins. The rest are asked only if the player
// opens them from the summary ("더 알려주기"); each such question goes back to the summary when answered.
// secs is a rough time to answer, for the "about a minute left" line; short names the step on the bar and the summary.
// 빠른 시작 (quick) asks the first screen and then only the year to go back to (the "year" step), and starts at once.
const STEPS: { id: StepId; short: string; secs: number; required?: boolean; main?: boolean; quick?: boolean }[] = [
  // The first screen asks the birth date (required) with the nickname, gender and hometown (optional), as in Figma frame A.
  { id: "birth", get short() { return L("기본 정보"); }, secs: 25, required: true, main: true },
  { id: "year", get short() { return L("돌아갈 해"); }, secs: 8, required: true, quick: true },
  // The time first, so the kinds of fork offered fit the age gone back to (2026-11-08).
  { id: "date", get short() { return L("그때"); }, secs: 10, required: true, main: true },
  { id: "kind", get short() { return L("갈림길"); }, secs: 5, main: true },
  { id: "situation", get short() { return L("상황"); }, secs: 30, required: true, main: true },
  { id: "review", get short() { return L("시작"); }, secs: 5, main: true },
  { id: "family", get short() { return L("가족"); }, secs: 18 },
  { id: "personality", get short() { return L("성격"); }, secs: 20 },
  { id: "current", get short() { return L("지금의 나"); }, secs: 18 },
  { id: "regret", get short() { return L("아쉬움"); }, secs: 12 },
];
const MAIN = STEPS.filter((s) => s.main);
const REVIEW = STEPS.findIndex((s) => s.id === "review");
const QUICK = STEPS.filter((s) => s.id === "birth" || s.quick);
const EXTRA = STEPS.filter((s) => !s.main && !s.quick);
const indexOf = (id: StepId) => STEPS.findIndex((s) => s.id === id);

// The questions before the schools and MBTI were dropped (2026-11), to read a draft saved then by its step number.
const OLD_STEPS = ["birth", "name", "gender", "hometown", "schools", "university", "family", "mbti", "personality", "current", "kind", "date", "situation", "actual", "regret", "review"];
/** Where a restored draft opens: its saved question, or for an older draft the next question still on the quick path. */
function startStep(d: { step?: number; at?: string }): number {
  if (d.at && indexOf(d.at as StepId) >= 0) return indexOf(d.at as StepId);
  if (d.at && ["name", "gender", "hometown"].includes(d.at)) return 0; // asked on the first screen since 2026-11-02
  const i = OLD_STEPS.slice(d.step ?? 0).map((id) => indexOf(id as StepId)).find((n) => n >= 0 && STEPS[n].main);
  return i ?? 0;
}

const MIN_SITUATION = 5;
const pad = (n: number) => String(n).padStart(2, "0");

const US_NICKNAMES = ["NightOwl", "LateBloomer", "AlleyCat", "WeekendHiker", "Stargazer", "CoffeeBreak", "SlowTurtle", "BeachKid", "Bookworm", "CloudPiece", "SkyWhale", "SpringBear"];
const nicknames = () => (isEn() ? US_NICKNAMES : ["새벽산책러", "늦깎이여행자", "골목고양이", "주말등산가", "별헤는밤", "커피한잔", "느린거북이", "바닷가소년", "책방주인", "구름조각", "밤하늘고래", "봄날의곰"]);

// Common Korean surnames; a 2-4 syllable Hangul name starting with one of these probably is a real name.
const SURNAMES = "김이박최정강조윤장임한오서신권황안송류전홍고문양손배백허유남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용예봉경사부";
const looksLikeRealName = (name: string) => /^[가-힣]{2,4}$/.test(name.trim()) && SURNAMES.includes(name.trim()[0]);

/** What is kept in the browser while the questions are answered, so a refresh picks up where it left off. */
export interface WizardDraft {
  step: number;
  at?: string; // the StepId of the question by name; drafts saved before it count steps in OLD_STEPS
  profile: Profile;
  tp: TurningPoint;
  blanks: TpBlanks;
  mode: "template" | "free";
  free: string;
  remember: boolean;
  toReview?: boolean; // editing one answer from the summary; 확인 goes back there
  quick?: boolean; // 빠른 시작: the first screen and the year, then the life begins
  year?: string; // the year typed or picked in 빠른 시작
}

const toYmd = (date: string): Ymd => {
  const [y = 0, m = 0, d = 0] = date ? date.split("-").map(Number) : [];
  return { y, m, d };
};

function remaining(step: number, flow = MAIN) {
  const at = flow.findIndex((s) => s.id === STEPS[step].id);
  const secs = flow.slice(Math.max(0, at)).reduce((sum, s) => sum + s.secs, 0);
  return secs < 70 ? L("1분 이내") : L`약 ${Math.round(secs / 60)}분`;
}

export function Onboarding({
  initial,
  onDone,
  onExit,
  onLeave,
}: {
  initial: Omit<WizardDraft, "step"> & { step?: number };
  onDone: (p: Profile, tp: TurningPoint, remember: boolean) => void;
  onExit: () => void;
  /** 처음으로: back to the main screen from any question, with the answers so far kept for 시작하기 to pick up. */
  onLeave: (draft: WizardDraft) => void;
}) {
  const [now] = useState(() => new Date());
  // 돌아갈 해 belongs to 빠른 시작 only; a detailed draft saved there (an old bug) opens at the turning point instead.
  const [step, setStep] = useState(() => (!initial.quick && STEPS[startStep(initial)].id === "year" ? indexOf("date") : startStep(initial)));
  const [p, setP] = useState<Profile>(initial.profile);
  const [tp, setTp] = useState<TurningPoint>(initial.tp);
  const [blanks, setBlanks] = useState<TpBlanks>(initial.blanks);
  const [mode, setMode] = useState(initial.mode);
  const [free, setFree] = useState(initial.free);
  const [remember, setRemember] = useState(initial.remember);
  const [birth, setBirth] = useState(() => toYmd(p.birthDate));
  const [tpYm, setTpYm] = useState(() => toYmd(tp.date));
  const [typedError, setTypedError] = useState<string | null>(null);
  const [tried, setTried] = useState(false); // the user pressed 다음 on this step at least once
  const [toReview, setToReview] = useState(initial.toReview ?? false);
  const [quick] = useState(initial.quick ?? false);
  const [year, setYear] = useState(initial.year ?? "");
  const root = useRef<HTMLDivElement>(null);

  // Where they grew up decides the school system, the examples and later the whole life, so the questions follow it.
  const country: Region = p.country ?? countryFor(lang());
  setRegion(country);

  const cur = STEPS[step];
  // The questions on the way to the life: 빠른 시작's two, or the detailed four and the summary.
  const flow = quick ? QUICK : MAIN;
  const onPath = (id: StepId) => flow.some((s) => s.id === id);
  const curMain = onPath(cur.id);
  const age = ageIn(p.birthDate, tp.date);
  const kind = kindDef(tp.kind, age) ?? kindDef("other", age)!;
  const birthYear = Number(p.birthDate.slice(0, 4)) || 0;

  // Keep answers in the browser (encrypted, see localData.ts) a moment after each change.
  useEffect(() => {
    const t = setTimeout(() => writeDraft({ step, at: STEPS[step].id, profile: p, tp, blanks, mode, free, remember, toReview, quick, year } satisfies WizardDraft, remember), 400);
    return () => clearTimeout(t);
  }, [step, p, tp, blanks, mode, free, remember, toReview, quick, year]);

  // Each new question takes focus. On a phone that is the question itself, so the keyboard doesn't open
  // over the screen until a box is tapped; with a mouse and keyboard it is the first text box.
  useEffect(() => {
    const box = canAutoFocusText() ? root.current?.querySelector<HTMLElement>("[data-autofocus]") : null;
    const el = box ?? root.current?.querySelector<HTMLElement>("h1");
    el?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [step]);

  const setField = (k: keyof Profile) => (e: { target: { value: string } }) => setP({ ...p, [k]: e.target.value });

  const setBirthYmd = (v: Ymd) => {
    setBirth(v);
    setP({ ...p, birthDate: v.y && v.m && v.d ? `${v.y}-${pad(v.m)}-${pad(v.d)}` : "" });
  };
  const setDate = (v: Ymd) => {
    setTpYm(v);
    const date = v.y && v.m ? `${v.y}-${pad(v.m)}` : "";
    const at = ageIn(p.birthDate, date);
    // A kind picked for another age (입시 picked, then the year moved to 9) is dropped, so the blanks fit the new age.
    const fits = (k?: string) => !k || at === null || tpKinds(at).some((d) => d.label === k);
    setTp((t) => ({ ...t, date, kind: fits(t.kind) ? t.kind : undefined, situation: mode === "template" ? fillTemplate(at, blanks) : t.situation }));
  };
  const setBlank = (next: TpBlanks) => {
    setBlanks(next);
    setTp({ ...tp, situation: fillTemplate(age, next) });
  };
  const switchMode = (m: "template" | "free") => {
    setMode(m);
    if (m === "free") {
      const text = free || tp.situation;
      setTp({ ...tp, situation: text });
    } else {
      setFree(tp.situation);
      setTp({ ...tp, situation: fillTemplate(age, blanks) });
    }
  };

  // The first empty birth date box in reading order (년 월 일, or Month Day Year in English).
  const birthGap = birthParts().find((k) => !birth[k]) ?? "d";
  // Errors for required answers. Missing answers show once 다음 is pressed; wrong ones show as soon as they're typed.
  const errors: Partial<Record<StepId, { id: string; text: string } | null>> = {
    birth: typedError
      ? { id: "birth", text: typedError }
      : !p.birthDate && tried
        ? { id: `birth-${birthGap}`, text: { y: L("태어난 해를 네 자리로 적어 주세요"), m: L("태어난 달을 적어 주세요"), d: L("태어난 날을 적어 주세요") }[birthGap] }
        : null,
    date: typedError
      ? { id: "tp-date", text: typedError }
      : !tp.date && tried
        ? { id: "tp-date", text: !tpYm.y ? L("몇 년이었는지 골라 주세요") : L("몇 월이었는지 골라 주세요") }
        : null,
    situation:
      mode === "template"
        ? (!blanks.a.trim() || !blanks.b.trim()) && tried
          ? { id: !blanks.a.trim() ? "blank-a" : "blank-b", text: L("고민했던 두 갈래를 모두 적어 주세요") }
          : null
        : (() => {
            const len = tp.situation.trim().length;
            if (len === 0) return tried ? { id: "tp-situation", text: L("어떤 상황이었는지 한 줄이라도 적어 주세요") } : null;
            return len < MIN_SITUATION ? { id: "tp-situation", text: L`조금만 더 적어 주세요. ${MIN_SITUATION}자 이상이면 돼요 (지금 ${len}자)` } : null;
          })(),
  };
  // 빠른 시작's year: from the year they turned seven (as the detailed date question) to this year.
  const minYear = birthYear ? Math.min(birthYear + 7, now.getFullYear()) : 1937;
  const yearNum = /^\d{4}$/.test(year.trim()) ? Number(year.trim()) : 0;
  const yearErr = !year.trim()
    ? tried
      ? L("돌아가고 싶은 해를 적거나 골라 주세요")
      : null
    : !yearNum
      ? tried || year.trim().length >= 4
        ? L("네 자리 연도로 적어 주세요. 예: 2005")
        : null
      : yearNum < minYear || yearNum > now.getFullYear()
        ? L`${minYear}년부터 ${now.getFullYear()}년 사이로 골라 주세요`
        : null;
  // The first screen needs all four answers; each missing one shows its own message once 다음 was pressed.
  const profileErr = {
    name: tried && !p.name.trim() ? L("별명을 정해 주세요. 막막하면 추천을 눌러 보세요") : null,
    gender: tried && !p.gender ? L("성별을 골라 주세요") : null,
    hometown: tried && !p.hometown.trim() ? L("자란 지역을 적어 주세요") : null,
  };
  // What each question's boxes hold. Violence or sex in any of them keeps the question open until it is changed.
  const typed = (id: StepId): string[] =>
    ({
      birth: [p.name, p.hometown],
      family: [p.family],
      personality: [p.personality],
      current: [p.currentLife],
      situation: [tp.situation, tp.actualChoice],
      regret: [tp.regret],
    })[id as string] ?? [];
  const blockedAt = (id: StepId) => !!moderateAll(typed(id));
  const invalid = (id: StepId) =>
    blockedAt(id) ||
    (id === "year" ? !yearNum || !!yearErr : id === "birth" ? !p.birthDate || !!typedError || !p.name.trim() || !p.gender || !p.hometown.trim() : id === "date" ? !tp.date || !!typedError : id === "situation" ? (mode === "template" ? !blanks.a.trim() || !blanks.b.trim() : tp.situation.trim().length < MIN_SITUATION) : false);
  const err = errors[cur.id] ?? null;
  // Answered questions get a check on the step bar.
  const answered = (id: StepId) =>
    ({
      birth: !!p.birthDate && !!p.name.trim() && !!p.gender && !!p.hometown.trim(),
      year: !!yearNum && !yearErr,
      family: !!p.family.trim(),
      personality: !!p.personality.trim(),
      current: !!p.currentLife.trim(),
      kind: !!tp.kind,
      date: !!tp.date,
      situation: !invalid("situation"),
      regret: !!tp.regret.trim(),
      review: false,
    })[id];

  // Where the current question sits on the way to the life, and the questions before and after it there.
  const pos = flow.findIndex((s) => s.id === cur.id);
  const isLast = curMain && pos === flow.length - 1;
  // The last step starts the life, so its button opens only once every required answer on the way is in.
  const missing = flow.filter((s) => (s.required && invalid(s.id)) || blockedAt(s.id));
  const ready = missing.length === 0;

  const go = (to: number, review = false) => {
    setTried(false);
    setTypedError(null);
    setToReview(review);
    setStep(to);
  };
  const next = () => {
    if (isLast) {
      if (!ready) {
        // The button is disabled then; Enter in the year box lands here, so show what is missing.
        if (missing[0].id !== cur.id) go(indexOf(missing[0].id), !quick);
        return setTried(true);
      }
      return onDone({ ...p, country }, quick ? quickTurningPoint(p.birthDate, p.gender, yearNum, now) : tp, remember);
    }
    if (blockedAt(cur.id)) {
      setTried(true);
      return root.current?.querySelector<HTMLElement>("textarea, input:not([type=checkbox]):not([type=radio])")?.focus();
    }
    if (invalid(cur.id)) {
      setTried(true);
      const id = errors[cur.id]?.id ?? (cur.id === "year" ? "quick-year" : cur.id === "birth" ? (!p.name.trim() ? "nickname" : !p.birthDate ? (typedError ? "birth" : `birth-${birthGap}`) : !p.gender ? "gender-group" : "hometown-input") : cur.id === "date" ? "tp-date" : mode === "template" ? (blanks.a.trim() ? "blank-b" : "blank-a") : "tp-situation");
      const el = document.getElementById(id);
      (el?.matches("button, input, select, textarea") ? el : el?.querySelector<HTMLElement>("[aria-invalid=true], button, input"))?.focus();
      return;
    }
    // The next question on this flow (STEPS also holds 빠른 시작's year right after 기본 정보).
    go(toReview || !curMain ? REVIEW : indexOf(flow[pos + 1].id));
  };
  // An extra question opened from the summary goes back there either way.
  const leave = () => {
    const d: WizardDraft = { step, at: STEPS[step].id, profile: p, tp, blanks, mode, free, remember, toReview, quick, year };
    writeDraft(d, remember);
    onLeave(d);
  };
  const back = () => (!curMain ? go(REVIEW) : pos === 0 ? onExit() : go(indexOf(flow[pos - 1].id)));

  const pick = (k: keyof Profile, v: string) => setP({ ...p, [k]: p[k] === v ? "" : v });

  const question = (title: string, hint?: ReactNode) => (
    <div className="space-y-1.5">
      <h1 tabIndex={-1} className="text-[22px] leading-snug font-bold outline-none sm:text-2xl">
        {title}
        {cur.id !== "review" && cur.id !== "birth" && cur.id !== "year" && (cur.required || !cur.main) && <Badge required={!!cur.required} className="ml-2 align-middle" />}
      </h1>
      {hint && <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">{hint}</p>}
    </div>
  );

  const body = (() => {
    switch (cur.id) {
      case "birth":
        return (
          <>
            {question(L("주인공에 대해 알려 주세요"), L("네 가지 모두 꼭 필요해요. 이야기의 시대와 사건을 맞추는 데 써요."))}
            <Field required label={L("별명")} error={profileErr.name ?? undefined} errorId="nickname-error" hint={L("실명 대신 별명을 써 주세요. 주인공을 부를 때만 쓰여요.")}>
              <span className="flex gap-2">
                <Input id="nickname" data-autofocus value={p.name} onChange={setField("name")} aria-invalid={!!profileErr.name || undefined} aria-describedby={profileErr.name ? "nickname-error" : undefined} placeholder={L("예: 늦깎이여행자")} maxLength={20} />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    const pool = nicknames().filter((n) => n !== p.name);
                    setP({ ...p, name: pool[Math.floor(Math.random() * pool.length)] });
                  }}
                  className="shrink-0 py-2.5"
                >
                  {L("추천")}
                </Button>
              </span>
              {looksLikeRealName(p.name) && <span className="block text-[13px] text-amber-700 dark:text-amber-400">{L("혹시 실명이라면, 개인정보 보호를 위해 별명으로 바꾸는 걸 권해요.")}</span>}
            </Field>
            <Field group required label={L("생년월일")} hint={L("나이와 그 시절 이야기를 맞추는 데 써요.")}>
              <BirthDateInput
                id="birth"
                value={birth}
                onChange={setBirthYmd}
                min={1930}
                max={{ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() }}
                error={err?.text}
                onTypedError={setTypedError}
              />
            </Field>
            <Field group required label={L("성별")} error={profileErr.gender ?? undefined} errorId="gender-error" hint={L("입대 같은 일부 사건에만 쓰여요.")}>
              <span id="gender-group" className="grid grid-cols-3 gap-2" role="group" aria-label={L("성별")}>
                {(["남", "여", "기타"] as Gender[]).map((g) => (
                  <Choice key={g} selected={p.gender === g} onClick={() => pick("gender", g)}>
                    {({ 남: L("남"), 여: L("여"), 기타: L("기타") } as Record<string, string>)[g]}
                  </Choice>
                ))}
              </span>
            </Field>
            <Field group required label={L("자란 곳")} error={profileErr.hometown ?? undefined} errorId="hometown-error" hint={L("고른 나라의 학교와 군대, 그 시절 뉴스와 사건으로 인생이 흘러가요.")}>
              <span role="group" aria-label={L("자란 나라")} className="grid grid-cols-2 gap-2">
                {COUNTRIES.map((c) => (
                  <Choice key={c} selected={country === c} onClick={() => setP({ ...p, country: c })}>
                    <span aria-hidden>{c === "us" ? "🇺🇸" : "🇰🇷"}</span> {countryName(c)}
                  </Choice>
                ))}
              </span>
              <Input id="hometown-input" aria-label={L("자란 지역")} value={p.hometown} onChange={setField("hometown")} aria-invalid={!!profileErr.hometown || undefined} aria-describedby={profileErr.hometown ? "hometown-error" : undefined} placeholder={country === "us" ? T("e.g. Columbus, Ohio") : L("예: 대전")} maxLength={40} />
            </Field>
          </>
        );
      case "year": {
        const years = quickYears(p.birthDate, now);
        const at = yearNum && !yearErr && birthYear ? yearNum - birthYear : null;
        return (
          <>
            {question(L("몇 년도로 돌아갈까요?"), L("해만 정하면 바로 그 시절로 가요. 그때의 학교, 일, 집은 그 시대에 맞춰 채워져요."))}
            <Field required label={L("돌아갈 해")} error={yearErr ?? undefined} errorId="year-error">
              <span className="flex items-center gap-2">
                <Input
                  id="quick-year"
                  data-autofocus
                  inputMode="numeric"
                  autoComplete="off"
                  value={year}
                  onChange={(e) => setYear(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                  aria-invalid={!!yearErr || undefined}
                  aria-describedby={yearErr ? "year-error" : "year-age"}
                  placeholder={L`예: ${birthYear ? Math.min(birthYear + 18, now.getFullYear()) : 2005}`}
                  maxLength={4}
                  className="max-w-40 text-lg tabular-nums"
                />
                {!isEn() && <span className="text-[15px] font-medium">년</span>}
              </span>
            </Field>
            <p id="year-age" aria-live="polite" className="min-h-6 text-[15px] font-semibold text-indigo-700 dark:text-indigo-300">
              {at !== null ? L`${yearNum}년, ${at}살이 되는 해예요.` : ""}
            </p>
            {years.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-stone-600 dark:text-stone-400">{L("나이로 고르기")}</p>
                <div className="grid grid-cols-3 gap-2" role="group" aria-label={L("나이로 고르기")}>
                  {years.map((y) => (
                    <Choice key={y.year} small selected={yearNum === y.year} onClick={() => setYear(String(y.year))}>
                      <span className="flex flex-col items-center py-1 leading-tight">
                        <b className="font-semibold">{ageText(y.age, "살")}</b>
                        <span className="text-xs tabular-nums opacity-75">{y.year}</span>
                      </span>
                    </Choice>
                  ))}
                </div>
              </div>
            )}
          </>
        );
      }
      case "family":
        return (
          <>
            {question(L("어떤 집에서 자랐나요?"), L("부모님 일, 형제, 집안 분위기를 편하게 적어 주세요."))}
            <Textarea
              data-autofocus
              aria-label={L("가족과 자란 환경")}
              value={p.family}
              onChange={setField("family")}
              placeholder={L("예: 공무원 아버지와 미용실을 하던 어머니, 누나 한 명. 넉넉하진 않았지만 화목했다.")}
              maxLength={800}
            />
          </>
        );
      case "personality":
        return (
          <>
            {question(L("나는 어떤 사람인가요?"), L("성격, 가치관, 습관, 좋아하는 것. 자세할수록 이야기가 나다워져요."))}
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={L("자주 쓰는 표현 넣기")}>
              {personalityChips().map((c) => {
                const on = p.personality.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setP({
                        ...p,
                        personality: on
                          ? p.personality.replace(new RegExp(`,?\\s*${c}`), "").replace(/^,\s*/, "")
                          : p.personality.trim()
                            ? `${p.personality.trim().replace(/[,.]$/, "")}, ${c}`
                            : c,
                      })
                    }
                    className={`min-h-11 rounded-full border px-3.5 text-sm transition ${
                      on
                        ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-500"
                        : "border-stone-300 hover:border-indigo-400 dark:border-stone-700"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <Textarea
              aria-label={L("나는 어떤 사람인가요")}
              rows={4}
              value={p.personality}
              onChange={setField("personality")}
              placeholder={L("예: 겉으로는 무난하지만 속으로 고민이 많다. 안정을 좋아하면서도 늘 다른 삶을 상상한다.")}
              maxLength={1500}
            />
          </>
        );
      case "current":
        return (
          <>
            {question(L("지금은 어떻게 살고 있나요?"), L("엔딩에서 실제 삶과 비교할 때 써요."))}
            <Textarea
              data-autofocus
              aria-label={L("지금의 나")}
              rows={4}
              value={p.currentLife}
              onChange={setField("currentLife")}
              placeholder={L("예: 서울의 IT 회사 기획자. 결혼 3년 차, 아이는 아직 없다. 일은 안정적이지만 가끔 허전하다.")}
              maxLength={800}
            />
          </>
        );
      case "kind":
        return (
          <>
            {question(L("돌아가고 싶은 순간은 어떤 갈림길이었나요?"), L("가장 가까운 것을 골라 주세요. 다음 질문이 그에 맞게 바뀌어요."))}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label={L("변곡점 유형")}>
              {tpKinds(age).map((k) => (
                <Choice key={k.label} selected={tp.kind === k.label} onClick={() => setTp({ ...tp, kind: tp.kind === k.label ? undefined : k.label })}>
                  <span aria-hidden className="mr-1">
                    {k.icon}
                  </span>
                  {k.label}
                </Choice>
              ))}
            </div>
          </>
        );
      case "date": {
        const recs = suggestions(p.birthDate, p.gender, now, tp.kind && kind.id);
        return (
          <>
            {question(L("그때가 언제였나요?"), age !== null && tp.date ? L`그때 ${age}살이었어요.` : L`${birthYear ? birthYear + 7 : 1940}년(일곱 살)부터 고를 수 있어요.`)}
            <DatePicker
              id="tp-date"
              value={tpYm}
              onChange={setDate}
              withDay={false}
              min={{ y: birthYear ? birthYear + 7 : 1940, m: 1 }}
              max={{ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() }}
              error={err?.text}
              onTypedError={setTypedError}
            />
            {recs.length > 0 && (
              <Suggestions
                title={L("혹시 이때였나요?")}
                items={recs}
                current={tp.date}
                onPick={(s) => {
                  setDate(toYmd(s.date));
                }}
              />
            )}
          </>
        );
      }
      case "situation": {
        const options = mode === "template" ? [blanks.a, blanks.b].map((x) => x.trim()).filter(Boolean) : [];
        return (
          <>
            {question(L("어떤 상황이었나요?"), mode === "template" ? L("빈칸만 채우면 문장이 완성돼요.") : L("고민, 주변 상황, 마음을 자유롭게 적어 주세요."))}
            {mode === "template" ? (
              <div className="space-y-3 rounded-2xl bg-stone-50 p-4 leading-loose dark:bg-stone-800/50">
                <p className="text-[15px] leading-[2.6]">
                  {isEn() ? (
                    <>
                      {age !== null && age >= 0 && <b>At {age}, </b>}
                      <span>I was torn between </span>
                      <Blank id="blank-a" autoFocus value={blanks.a} placeholder={kind.a} onChange={(a) => setBlank({ ...blanks, a })} invalid={err?.id === "blank-a"} label="First path" />
                      <span> and </span>
                      <Blank id="blank-b" value={blanks.b} placeholder={kind.b} onChange={(b) => setBlank({ ...blanks, b })} invalid={err?.id === "blank-b"} label="Second path" />
                      <span>. What weighed on me most was </span>
                      <Blank id="blank-why" value={blanks.why} placeholder={kind.why} onChange={(why) => setBlank({ ...blanks, why })} label="What weighed on you" />
                      <span>.</span>
                    </>
                  ) : (
                    <>
                      {age !== null && age >= 0 && <b>{age}살, </b>}
                      <Blank id="blank-a" autoFocus value={blanks.a} placeholder={kind.a} onChange={(a) => setBlank({ ...blanks, a })} invalid={err?.id === "blank-a"} label="첫 번째 갈래" />
                      <span>{blanks.a.trim() ? josa(blanks.a, "와", "과") : "와(과)"} </span>
                      <Blank id="blank-b" value={blanks.b} placeholder={kind.b} onChange={(b) => setBlank({ ...blanks, b })} invalid={err?.id === "blank-b"} label="두 번째 갈래" />
                      <span> 사이에서 고민했다. 가장 마음에 걸린 건 </span>
                      <Blank id="blank-why" value={blanks.why} placeholder={kind.why} onChange={(why) => setBlank({ ...blanks, why })} label="마음에 걸린 것" />
                      <span>{blanks.why.trim() ? josa(blanks.why, "였다", "이었다") : "(이)었다"}.</span>
                    </>
                  )}
                </p>
              </div>
            ) : (
              <Textarea
                id="tp-situation"
                data-autofocus
                aria-label={L("어떤 상황이었나요")}
                value={tp.situation}
                onChange={(e) => setTp({ ...tp, situation: e.target.value })}
                placeholder={L("예: 고3 수능을 기대보다 못 봤다. 재수를 할지, 성적에 맞춰 지방대에 갈지 고민했다.")}
                maxLength={1000}
                aria-invalid={!!err || undefined}
                aria-describedby={err ? "situation-error" : undefined}
              />
            )}
            {err && <FieldError id="situation-error">{err.text}</FieldError>}
            <div className="flex flex-wrap gap-2">
              <SmallButton
                onClick={() => {
                  if (mode === "template") setBlank(kind.example);
                  else setTp({ ...tp, situation: fillTemplate(age, kind.example) });
                  setTried(false);
                }}
              >
                {L("예시로 채워 보기")}
              </SmallButton>
              <SmallButton onClick={() => switchMode(mode === "template" ? "free" : "template")}>{mode === "template" ? L("직접 자유롭게 쓰기") : L("빈칸 채우기로 쓰기")}</SmallButton>
            </div>
            {/* The choice actually made, asked on the same screen: one tap on a path just written. */}
            <div className="space-y-2 border-t border-stone-200 pt-4 dark:border-stone-800">
              <p id="actual-label" className="flex items-center gap-1.5 text-sm font-semibold">
                {L("그때 실제로는 어느 쪽을 골랐나요?")}
                <Badge required={false} />
              </p>
              {options.length > 0 && (
                <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="actual-label">
                  {options.map((o) => (
                    <Choice key={o} selected={tp.actualChoice === o} onClick={() => setTp({ ...tp, actualChoice: tp.actualChoice === o ? "" : o })}>
                      {o}
                    </Choice>
                  ))}
                </div>
              )}
              <Input aria-labelledby="actual-label" value={tp.actualChoice} onChange={(e) => setTp({ ...tp, actualChoice: e.target.value })} placeholder={options.length ? L("다른 선택이었다면 적어 주세요") : L("예: 재수하지 않고 지방대에 갔다")} maxLength={100} />
            </div>
          </>
        );
      }
      case "regret":
        return (
          <>
            {question(L("무엇이 아쉬웠나요?"), L("그때의 마음을 적어 주면 이야기에 담겨요."))}
            <Textarea data-autofocus aria-label={L("아쉬웠던 점")} rows={3} value={tp.regret} onChange={(e) => setTp({ ...tp, regret: e.target.value })} placeholder={L("예: 그때 한 번만 더 도전했다면 어땠을까.")} maxLength={600} />
          </>
        );
      case "review":
        return (
          <>
            {question(L("이대로 그날로 돌아갈까요?"), L("나머지는 모두 선택이에요. 더 알려줄수록 이야기가 나다워져요."))}
            <Review profile={p} tp={tp} country={country} onEdit={(id) => go(indexOf(id), true)} />
            <label className="flex cursor-pointer gap-3 rounded-xl border border-stone-200 p-4 dark:border-stone-800">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-indigo-600" />
              <span className="space-y-1">
                <span className="block text-sm font-semibold">{L("다음에 다시 입력하지 않도록 이 기기에 저장하기")}</span>
                <span className="block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                  {L("암호화해서 이 브라우저에만 보관하고 서버에는 저장하지 않아요.")} {PROFILE_TTL_DAYS}{L("일 동안 쓰지 않으면 자동으로 지워지고, 첫 화면에서 언제든 지울 수 있어요. 여러 사람이 쓰는 기기라면 체크하지 마세요.")}
                </span>
              </span>
            </label>
          </>
        );
    }
  })();

  return (
    <div ref={root} className="lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-8">
      <div className="space-y-4">
        <button
          type="button"
          onClick={leave}
          className="-mb-1 inline-flex min-h-11 items-center gap-1 rounded-lg pr-3 text-sm font-medium text-stone-600 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-stone-400 dark:hover:text-indigo-300"
        >
          <span aria-hidden>←</span>
          {L("처음으로")}
        </button>
        <Stepper step={step} flow={flow} done={answered} onPick={(i) => i !== step && go(i)} />
        <div className="lg:hidden">
          <CharacterCard profile={p} tp={tp} now={now} compact />
        </div>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
          className="space-y-5"
        >
          <Card key={cur.id}>
            <div className="space-y-4" style={{ animation: "fadein .25s ease-out" }}>
              {body}
              {tried && blockedAt(cur.id) && <FieldError id="blocked-error">{blockedMessage()}</FieldError>}
            </div>
          </Card>
          {/* Stays at the bottom of a phone screen, so 다음 is never a scroll away. */}
          <div className="sticky bottom-0 z-10 space-y-2 bg-[var(--background)]/95 py-3 backdrop-blur-sm sm:static sm:bg-transparent sm:py-0 sm:backdrop-blur-none">
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={back} className="min-h-11">
                {curMain ? L("이전") : L("돌아가기")}
              </Button>
              {cur.main && !quick && !cur.required && !isLast && (
                <Button type="button" variant="ghost" onClick={() => go(toReview ? REVIEW : indexOf(flow[pos + 1].id))} className="min-h-11 text-stone-600 dark:text-stone-300">
                  {L("건너뛰기")}
                </Button>
              )}
              <Button type="submit" disabled={isLast && !ready} aria-describedby={isLast && !ready ? "start-missing" : undefined} className="min-h-11 flex-1">
                {isLast ? L("그날로 돌아가기") : !curMain ? L("완료") : toReview ? L("확인") : L("다음")}
              </Button>
            </div>
            {isLast && !ready && (
              <p id="start-missing" className="text-center text-sm text-stone-600 dark:text-stone-400">
                {missing.some((s) => s.id !== cur.id) ? (
                  <>
                    {L("아직 입력하지 않은 단계:")}{" "}
                    {missing
                      .filter((s) => s.id !== cur.id)
                      .map((s, i) => (
                        <span key={s.id}>
                          {i > 0 && ", "}
                          <button type="button" onClick={() => go(indexOf(s.id), !quick)} className="font-semibold text-indigo-700 underline underline-offset-2 dark:text-indigo-300">
                            {cap(s.short)}
                          </button>
                        </span>
                      ))}
                  </>
                ) : (
                  L("모두 입력하면 그날로 돌아갈 수 있어요.")
                )}
              </p>
            )}
          </div>
          {!isLast && <p className="hidden text-center text-xs text-stone-500 sm:block dark:text-stone-400">{L("Enter 키를 눌러도 다음으로 넘어가요.")}</p>}
        </form>
      </div>
      <div className="sticky top-6 hidden lg:block">
        <CharacterCard profile={p} tp={tp} now={now} />
      </div>
    </div>
  );
}

/**
 * The quick-start steps as the Figma "Progress > Steps" bar: one segment per step, its bar filled once answered,
 * the current one in bold accent. Each segment is a button, so any step opens with a tap besides 이전/다음.
 */
function Stepper({ step, flow, done, onPick }: { step: number; flow: typeof MAIN; done: (id: StepId) => boolean; onPick: (i: number) => void }) {
  const cur = STEPS[step];
  const main = flow.some((s) => s.id === cur.id);
  const at = main ? cur.id : "review"; // an extra question is opened from the summary
  const n = flow.findIndex((s) => s.id === at) + 1;
  const quick = flow === QUICK;
  return (
    <nav aria-label={L("입력 단계")}>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold text-indigo-700 dark:text-indigo-300">{quick ? L("바로 되돌리기") : main ? L("내 이야기로 시작") : L`더 알려주기 · ${cap(cur.short)}`}</span>
        <span className="text-stone-500 tabular-nums dark:text-stone-400">
          {n} / {flow.length}
          {main && cur.id !== "review" ? ` · ${L`${remaining(step, flow)} 남음`}` : ""}
        </span>
      </div>
      <ol className="mt-1.5 flex gap-1">
        {flow.map((s) => {
          const here = s.id === at;
          const ok = done(s.id);
          const need = s.required && !ok;
          return (
            <li key={s.id} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onPick(indexOf(s.id))}
                aria-current={here ? "step" : undefined}
                className="group flex min-h-11 w-full flex-col gap-1.5 rounded-md pt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <span
                  aria-hidden
                  className={`h-1 w-full rounded-sm transition-colors ${here || ok ? "bg-indigo-600 dark:bg-indigo-400" : "bg-stone-200 group-hover:bg-indigo-200 dark:bg-stone-800 dark:group-hover:bg-indigo-900"}`}
                />
                <span
                  className={`flex w-full items-center justify-center gap-1 truncate text-xs ${here ? "font-bold text-indigo-700 dark:text-indigo-300" : "text-stone-600 group-hover:text-indigo-700 dark:text-stone-400 dark:group-hover:text-indigo-300"}`}
                >
                  {cap(s.short)}
                  {need && !here && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />}
                </span>
                <span className="sr-only">{ok ? L(" (입력함)") : need ? L(" (필수)") : ""}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// The 앱인토스 build is for Korea only.
const COUNTRIES: Region[] = isToss ? ["kr"] : ["kr", "us"];

function Choice({ selected, onClick, small = false, children }: { selected: boolean; onClick: () => void; small?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-11 rounded-xl border px-2 font-medium break-keep transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${small ? "text-sm" : "py-2.5 text-[15px]"} ${
        selected
          ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-500"
          : "border-field bg-white hover:border-indigo-400 hover:bg-indigo-50 dark:bg-stone-900 dark:hover:bg-indigo-950"
      }`}
    >
      {children}
    </button>
  );
}

function SmallButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 rounded-full border border-stone-300 px-4 text-sm font-medium hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-stone-700 dark:hover:bg-stone-800"
    >
      {children}
    </button>
  );
}

function Blank({ id, value, placeholder, onChange, invalid, label, autoFocus }: { id: string; value: string; placeholder: string; onChange: (v: string) => void; invalid?: boolean; label: string; autoFocus?: boolean }) {
  return (
    <input
      id={id}
      data-autofocus={autoFocus || undefined}
      aria-label={label}
      aria-invalid={invalid || undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={40}
      style={{ width: `${Math.max(5, Math.min(15, (value || placeholder).length + 1.5))}em` }}
      className="mx-0.5 inline-block min-h-11 max-w-full rounded-lg border-b-2 border-indigo-500 bg-white px-2 align-middle text-[15px] font-semibold text-indigo-800 outline-none placeholder:font-normal placeholder:text-stone-500 focus:ring-2 focus:ring-indigo-600 dark:placeholder:text-stone-400 dark:focus:ring-indigo-400 aria-invalid:border-rose-600 aria-invalid:bg-rose-50 dark:bg-stone-900 dark:text-indigo-200 dark:aria-invalid:bg-rose-950"
    />
  );
}

function Suggestions({ title, items, current, onPick }: { title: string; items: ReturnType<typeof suggestions>; current: string; onPick: (s: ReturnType<typeof suggestions>[number]) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-stone-600 dark:text-stone-400">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((s) => (
          <button
            key={s.label + s.date}
            type="button"
            aria-pressed={current === s.date}
            onClick={() => onPick(s)}
            className={`min-h-11 rounded-full border px-3.5 text-sm transition ${
              current === s.date
                ? "border-indigo-600 bg-indigo-50 text-indigo-800 dark:border-indigo-400 dark:bg-indigo-950 dark:text-indigo-200"
                : "border-stone-300 hover:border-indigo-400 dark:border-stone-700"
            }`}
          >
            <b className="font-semibold">{ageText(s.age, "살")}</b> {s.label} <span className="text-stone-500 dark:text-stone-400">· {s.date.slice(0, 4)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Review({ profile: p, tp, country, onEdit }: { profile: Profile; tp: TurningPoint; country: Region; onEdit: (id: StepId) => void }) {
  const gender = p.gender && (({ 남: L("남"), 여: L("여"), 기타: L("기타") } as Record<string, string>)[p.gender] ?? p.gender);
  // The quick-start answers, then the optional ones.
  // [step that asks it, label, answer, required]
  const main: [StepId, string, string, boolean][] = [
    ["birth", L("별명"), p.name, true],
    ["birth", L("생년월일"), p.birthDate ? ymdText(p.birthDate) : "", true],
    ["birth", L("성별"), gender, true],
    ["birth", L("자란 곳"), p.hometown.trim() ? [countryName(country), p.hometown].join(" · ") : "", true],
    ["date", L("그때"), tp.date ? ymText(tp.date) : "", true],
    ["kind", L("갈림길"), tp.kind ?? "", false],
    ["situation", L("상황"), tp.situation, true],
    ["situation", L("실제 선택"), tp.actualChoice, false],
  ];
  const extra: Record<string, string> = {
    family: p.family,
    personality: p.personality,
    current: p.currentLife,
    regret: tp.regret,
  };
  const filled = EXTRA.filter((s) => extra[s.id]).length;
  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-[max-content_minmax(0,1fr)_auto] gap-x-3 divide-y divide-stone-100 dark:divide-stone-800">
        {main.map(([id, rawLabel, value, required]) => {
          const label = cap(rawLabel);
          return (
            <div key={rawLabel} className="col-span-3 grid grid-cols-subgrid items-center py-1.5">
              <dt className="max-w-28 text-xs text-stone-500 dark:text-stone-400">{label}</dt>
              <dd className={`min-w-0 truncate text-sm ${value ? "" : required ? "font-medium text-rose-700 dark:text-rose-400" : "text-stone-500 dark:text-stone-400"}`}>
                {value || (required ? L("꼭 필요해요") : L("건너뜀"))}
              </dd>
              <button
                type="button"
                onClick={() => onEdit(id)}
                aria-label={L`${label} 수정`}
                className="min-h-11 shrink-0 rounded-lg px-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950"
              >
                {L("수정")}
              </button>
            </div>
          );
        })}
      </dl>
      <section aria-labelledby="extra-title" className="space-y-2.5 rounded-2xl bg-stone-50 p-4 dark:bg-stone-800/50">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="extra-title" className="flex items-center gap-1.5 text-sm font-semibold">
            {L("더 알려주기")}
            <Badge required={false} />
          </h2>
          <span className="text-xs text-stone-500 tabular-nums dark:text-stone-400">
            {filled} / {EXTRA.length}
          </span>
        </div>
        <ul className="grid grid-cols-2 gap-2">
          {EXTRA.map((s) => {
            const value = extra[s.id];
            return (
              <li key={s.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => onEdit(s.id)}
                  className={`flex min-h-14 w-full flex-col items-start justify-center rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    value
                      ? "border-indigo-200 bg-white hover:border-indigo-400 dark:border-indigo-900 dark:bg-stone-900"
                      : "border-dashed border-field bg-white hover:border-indigo-400 hover:bg-indigo-50 dark:bg-stone-900 dark:hover:bg-indigo-950"
                  }`}
                >
                  <span className="text-sm font-medium">{cap(s.short)}</span>
                  <span className={`w-full truncate text-xs ${value ? "text-stone-600 dark:text-stone-300" : "text-indigo-700 dark:text-indigo-300"}`}>{value || L("+ 추가")}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

export const EMPTY_DRAFT: Omit<WizardDraft, "step"> = {
  profile: EMPTY_PROFILE,
  tp: EMPTY_TP,
  blanks: { a: "", b: "", why: "" },
  mode: "template",
  free: "",
  remember: false,
};
