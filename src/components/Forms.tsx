"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { PROFILE_TTL_DAYS, writeDraft } from "@/lib/localData";
import {
  ageIn,
  EMPTY_TP,
  fillTemplate,
  josa,
  kindDef,
  MBTI_QUIZ,
  MBTI_TYPES,
  PERSONALITY_CHIPS,
  schoolYears,
  suggestions,
  TP_KINDS,
  type TpBlanks,
} from "@/lib/onboarding";
import type { Gender, Profile, TurningPoint } from "@/lib/types";
import { CharacterCard } from "./CharacterCard";
import { DatePicker, type Ymd } from "./DatePicker";
import { Button, Card, FieldError, Input, Select, Textarea } from "./ui";

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

type StepId =
  | "birth"
  | "name"
  | "gender"
  | "hometown"
  | "schools"
  | "university"
  | "family"
  | "mbti"
  | "personality"
  | "current"
  | "kind"
  | "date"
  | "situation"
  | "actual"
  | "regret"
  | "review";

// One question per screen. secs is a rough time to answer, for the "about 2 minutes left" estimate.
const STEPS: { id: StepId; section: string; secs: number; required?: boolean }[] = [
  { id: "birth", section: "나에 대해", secs: 15, required: true },
  { id: "name", section: "나에 대해", secs: 8 },
  { id: "gender", section: "나에 대해", secs: 4 },
  { id: "hometown", section: "나에 대해", secs: 6 },
  { id: "schools", section: "나에 대해", secs: 18 },
  { id: "university", section: "나에 대해", secs: 10 },
  { id: "family", section: "나에 대해", secs: 18 },
  { id: "mbti", section: "나에 대해", secs: 8 },
  { id: "personality", section: "나에 대해", secs: 20 },
  { id: "current", section: "나에 대해", secs: 18 },
  { id: "kind", section: "변곡점", secs: 5 },
  { id: "date", section: "변곡점", secs: 10, required: true },
  { id: "situation", section: "변곡점", secs: 30, required: true },
  { id: "actual", section: "변곡점", secs: 8 },
  { id: "regret", section: "변곡점", secs: 12 },
  { id: "review", section: "확인", secs: 8 },
];
const indexOf = (id: StepId) => STEPS.findIndex((s) => s.id === id);
export const TURNING_STEP = indexOf("kind");

const MIN_SITUATION = 5;
const pad = (n: number) => String(n).padStart(2, "0");

const NICKNAMES = ["새벽산책러", "늦깎이여행자", "골목고양이", "주말등산가", "별헤는밤", "커피한잔", "느린거북이", "바닷가소년", "책방주인", "구름조각", "밤하늘고래", "봄날의곰"];

// Common Korean surnames; a 2-4 syllable Hangul name starting with one of these probably is a real name.
const SURNAMES = "김이박최정강조윤장임한오서신권황안송류전홍고문양손배백허유남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용예봉경사부";
const looksLikeRealName = (name: string) => /^[가-힣]{2,4}$/.test(name.trim()) && SURNAMES.includes(name.trim()[0]);

/** What is kept in the browser while the questions are answered, so a refresh picks up where it left off. */
export interface WizardDraft {
  step: number;
  profile: Profile;
  tp: TurningPoint;
  blanks: TpBlanks;
  mode: "template" | "free";
  free: string;
  remember: boolean;
  toReview?: boolean; // editing one answer from the summary; 확인 goes back there
}

const toYmd = (date: string): Ymd => {
  const [y = 0, m = 0, d = 0] = date ? date.split("-").map(Number) : [];
  return { y, m, d };
};

function remaining(step: number) {
  const secs = STEPS.slice(step).reduce((sum, s) => sum + s.secs, 0);
  return secs < 50 ? "1분 이내" : `약 ${Math.round(secs / 60)}분`;
}

export function Onboarding({
  initial,
  initialStep = 0,
  onDone,
  onExit,
}: {
  initial: Omit<WizardDraft, "step"> & { step?: number };
  initialStep?: number;
  onDone: (p: Profile, tp: TurningPoint, remember: boolean) => void;
  onExit: () => void;
}) {
  const [now] = useState(() => new Date());
  const [step, setStep] = useState(initial.step ?? initialStep);
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
  const [quiz, setQuiz] = useState<string[] | null>(null);
  const root = useRef<HTMLDivElement>(null);

  const cur = STEPS[step];
  const age = ageIn(p.birthDate, tp.date);
  const kind = kindDef(tp.kind) ?? kindDef("other")!;
  const birthYear = Number(p.birthDate.slice(0, 4)) || 0;
  // University entrance year: the usual year straight from high school, or any year from 17 up to this year (재수, 늦깎이 입학).
  const usualUniYear = schoolYears(p.birthDate)?.stages[3].from ?? 0;
  const uniYears = birthYear ? Array.from({ length: Math.max(0, now.getFullYear() - (birthYear + 17) + 1) }, (_, i) => birthYear + 17 + i) : [];

  // Keep answers in the browser (encrypted, see localData.ts) a moment after each change.
  useEffect(() => {
    const t = setTimeout(() => writeDraft({ step, profile: p, tp, blanks, mode, free, remember, toReview } satisfies WizardDraft, remember), 400);
    return () => clearTimeout(t);
  }, [step, p, tp, blanks, mode, free, remember, toReview]);

  // Each new question takes focus: its first text box if it has one, otherwise the question itself.
  useEffect(() => {
    const el = root.current?.querySelector<HTMLElement>("[data-autofocus]") ?? root.current?.querySelector<HTMLElement>("h1");
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
    setTp((t) => ({ ...t, date, situation: mode === "template" ? fillTemplate(ageIn(p.birthDate, date), blanks) : t.situation }));
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

  // Errors for required answers. Missing answers show once 다음 is pressed; wrong ones show as soon as they're typed.
  const errors: Partial<Record<StepId, { id: string; text: string } | null>> = {
    birth: typedError
      ? { id: "birth", text: typedError }
      : !p.birthDate && tried
        ? { id: "birth", text: !birth.y ? "태어난 해부터 골라 주세요" : !birth.m ? "몇 월에 태어났는지 골라 주세요" : "며칠에 태어났는지 골라 주세요" }
        : null,
    date: typedError
      ? { id: "tp-date", text: typedError }
      : !tp.date && tried
        ? { id: "tp-date", text: !tpYm.y ? "몇 년이었는지 골라 주세요" : "몇 월이었는지 골라 주세요" }
        : null,
    situation:
      mode === "template"
        ? (!blanks.a.trim() || !blanks.b.trim()) && tried
          ? { id: !blanks.a.trim() ? "blank-a" : "blank-b", text: "고민했던 두 갈래를 모두 적어 주세요" }
          : null
        : (() => {
            const len = tp.situation.trim().length;
            if (len === 0) return tried ? { id: "tp-situation", text: "어떤 상황이었는지 한 줄이라도 적어 주세요" } : null;
            return len < MIN_SITUATION ? { id: "tp-situation", text: `조금만 더 적어 주세요. ${MIN_SITUATION}자 이상이면 돼요 (지금 ${len}자)` } : null;
          })(),
  };
  const invalid = (id: StepId) =>
    id === "birth" ? !p.birthDate || !!typedError : id === "date" ? !tp.date || !!typedError : id === "situation" ? (mode === "template" ? !blanks.a.trim() || !blanks.b.trim() : tp.situation.trim().length < MIN_SITUATION) : false;
  const err = errors[cur.id] ?? null;

  const go = (to: number, review = false) => {
    setTried(false);
    setTypedError(null);
    setQuiz(null);
    setToReview(review);
    setStep(to);
  };
  const next = () => {
    if (cur.id === "review") {
      const missing = STEPS.findIndex((s) => s.required && invalid(s.id));
      if (missing >= 0) {
        go(missing, true);
        return setTried(true);
      }
      return onDone(p, tp, remember);
    }
    if (invalid(cur.id)) {
      setTried(true);
      const id = errors[cur.id]?.id ?? (cur.id === "birth" ? "birth" : cur.id === "date" ? "tp-date" : mode === "template" ? (blanks.a.trim() ? "blank-b" : "blank-a") : "tp-situation");
      document.getElementById(id)?.focus();
      return;
    }
    go(toReview ? indexOf("review") : step + 1);
  };
  const back = () => (step === 0 ? onExit() : go(step - 1));

  const pick = (k: keyof Profile, v: string) => setP({ ...p, [k]: p[k] === v ? "" : v });

  const question = (title: string, hint?: ReactNode) => (
    <div className="space-y-1.5">
      <h1 tabIndex={-1} className="text-[22px] leading-snug font-bold outline-none sm:text-2xl">
        {title}
        {cur.required && <span className="ml-2 align-middle rounded bg-indigo-50 px-1.5 py-px text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">필수</span>}
      </h1>
      {hint && <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">{hint}</p>}
    </div>
  );

  const body = (() => {
    switch (cur.id) {
      case "birth":
        return (
          <>
            {question("언제 태어났나요?", "학교 연도와 그 시절 이야기를 맞추는 데 써요.")}
            <DatePicker
              id="birth"
              value={birth}
              onChange={setBirthYmd}
              min={{ y: 1930, m: 1 }}
              max={{ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() }}
              error={err?.text}
              onTypedError={setTypedError}
            />
          </>
        );
      case "name":
        return (
          <>
            {question("이야기 속에서 뭐라고 부를까요?", "실명 대신 별명을 써 주세요. 주인공을 부를 때만 쓰여요.")}
            <div className="flex gap-2">
              <Input data-autofocus aria-label="별명" value={p.name} onChange={setField("name")} placeholder="예: 늦깎이여행자" maxLength={20} />
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  const pool = NICKNAMES.filter((n) => n !== p.name);
                  setP({ ...p, name: pool[Math.floor(Math.random() * pool.length)] });
                }}
                className="shrink-0 py-2.5"
              >
                추천
              </Button>
            </div>
            {looksLikeRealName(p.name) && <p className="text-[13px] text-amber-700 dark:text-amber-400">혹시 실명이라면, 개인정보 보호를 위해 별명으로 바꾸는 걸 권해요.</p>}
          </>
        );
      case "gender":
        return (
          <>
            {question("성별을 알려 주세요", "입대 같은 일부 사건에만 쓰여요.")}
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="성별">
              {(["남", "여", "기타"] as Gender[]).map((g) => (
                <Choice key={g} selected={p.gender === g} onClick={() => pick("gender", g)}>
                  {g}
                </Choice>
              ))}
            </div>
          </>
        );
      case "hometown":
        return (
          <>
            {question("어디서 자랐나요?", "도시나 동네 이름이면 충분해요.")}
            <Input data-autofocus aria-label="자란 지역" value={p.hometown} onChange={setField("hometown")} placeholder="예: 대전" maxLength={40} />
          </>
        );
      case "schools":
        return (
          <>
            {question("어느 학교를 다녔나요?", "학교 이름을 적으면 아래 연표가 바로 채워져요.")}
            <div className="space-y-2">
              <LabeledInput label="초등학교" autoFocus value={p.elementary} onChange={setField("elementary")} placeholder={`예: ${p.hometown || "대전"} 문화초`} />
              <LabeledInput label="중학교" value={p.middle} onChange={setField("middle")} placeholder="예: 문화중" />
              <LabeledInput label="고등학교" value={p.high} onChange={setField("high")} placeholder="예: 대전고" />
            </div>
            <SchoolTimeline profile={p} upTo="high" />
          </>
        );
      case "university":
        return (
          <>
            {question("대학은 어디서 무엇을 공부했나요?", "재수했거나 늦게 들어갔다면 입학년도를 골라 주세요. 안 다녔다면 건너뛰어도 괜찮아요.")}
            <div className="space-y-2">
              <LabeledInput label="대학교" autoFocus value={p.university} onChange={setField("university")} placeholder="예: 충남대" />
              <LabeledInput label="전공" value={p.major} onChange={setField("major")} placeholder="예: 경영학" />
              <label className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-sm font-medium text-stone-600 dark:text-stone-400">입학년도</span>
                <Select className="flex-1" value={p.universityYear ?? ""} onChange={setField("universityYear")}>
                  <option value="">{usualUniYear ? `고교 졸업 후 바로 (${usualUniYear}년)` : "선택"}</option>
                  {uniYears
                    .filter((y) => y !== usualUniYear)
                    .map((y) => (
                      <option key={y} value={y}>
                        {y}년{!usualUniYear ? "" : y < usualUniYear ? " (조기 입학)" : ` (${y - usualUniYear}년 늦게)`}
                      </option>
                    ))}
                </Select>
              </label>
            </div>
            <SchoolTimeline profile={p} upTo="university" />
          </>
        );
      case "family":
        return (
          <>
            {question("어떤 집에서 자랐나요?", "부모님 일, 형제, 집안 분위기를 편하게 적어 주세요.")}
            <Textarea
              data-autofocus
              aria-label="가족과 자란 환경"
              value={p.family}
              onChange={setField("family")}
              placeholder="예: 공무원 아버지와 미용실을 하던 어머니, 누나 한 명. 넉넉하진 않았지만 화목했다."
              maxLength={800}
            />
          </>
        );
      case "mbti":
        return (
          <>
            {question("MBTI가 뭔가요?", "몰라도 괜찮아요. 네 문항이면 대략 알 수 있어요.")}
            {quiz ? (
              <MbtiQuiz
                answers={quiz}
                onAnswer={(letter) => {
                  const a = [...quiz, letter];
                  if (a.length < MBTI_QUIZ.length) return setQuiz(a);
                  setQuiz(null);
                  setP({ ...p, mbti: a.join("") });
                }}
                onCancel={() => setQuiz(null)}
              />
            ) : (
              <>
                <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="MBTI">
                  {MBTI_TYPES.map((m) => (
                    <Choice key={m} selected={p.mbti === m} onClick={() => pick("mbti", m)} small>
                      {m}
                    </Choice>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setQuiz([])}
                  className="min-h-11 w-full rounded-xl border border-dashed border-indigo-300 text-sm font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950"
                >
                  모르겠어요 → 4문항 간단 테스트
                </button>
              </>
            )}
          </>
        );
      case "personality":
        return (
          <>
            {question("나는 어떤 사람인가요?", "성격, 가치관, 습관, 좋아하는 것. 자세할수록 이야기가 나다워져요.")}
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="자주 쓰는 표현 넣기">
              {PERSONALITY_CHIPS.map((c) => {
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
              aria-label="나는 어떤 사람인가요"
              rows={4}
              value={p.personality}
              onChange={setField("personality")}
              placeholder="예: 겉으로는 무난하지만 속으로 고민이 많다. 안정을 좋아하면서도 늘 다른 삶을 상상한다."
              maxLength={1500}
            />
          </>
        );
      case "current":
        return (
          <>
            {question("지금은 어떻게 살고 있나요?", "엔딩에서 실제 삶과 비교할 때 써요.")}
            <Textarea
              data-autofocus
              aria-label="지금의 나"
              rows={4}
              value={p.currentLife}
              onChange={setField("currentLife")}
              placeholder="예: 서울의 IT 회사 기획자. 결혼 3년 차, 아이는 아직 없다. 일은 안정적이지만 가끔 허전하다."
              maxLength={800}
            />
          </>
        );
      case "kind": {
        const recs = suggestions(p.birthDate, p.gender, now);
        return (
          <>
            {question("돌아가고 싶은 순간은 어떤 갈림길이었나요?", "가장 가까운 것을 골라 주세요. 다음 질문이 그에 맞게 바뀌어요.")}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="변곡점 유형">
              {TP_KINDS.map((k) => (
                <Choice key={k.id} selected={tp.kind === k.label} onClick={() => setTp({ ...tp, kind: tp.kind === k.label ? undefined : k.label })}>
                  <span aria-hidden className="mr-1">
                    {k.icon}
                  </span>
                  {k.label}
                </Choice>
              ))}
            </div>
            {recs.length > 0 && (
              <Suggestions
                title="이 나이에 많이들 겪는 순간"
                items={recs}
                current={tp.date}
                onPick={(s) => {
                  setTp({ ...tp, kind: kindDef(s.kind)!.label, date: s.date, situation: mode === "template" ? fillTemplate(ageIn(p.birthDate, s.date), blanks) : tp.situation });
                  setTpYm(toYmd(s.date));
                  go(indexOf("date"), toReview);
                }}
              />
            )}
          </>
        );
      }
      case "date": {
        const recs = suggestions(p.birthDate, p.gender, now, tp.kind && kind.id);
        return (
          <>
            {question("그때가 언제였나요?", age !== null && tp.date ? `그때 ${age}살이었어요.` : `${birthYear ? birthYear + 7 : 1940}년(일곱 살)부터 고를 수 있어요.`)}
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
                title="혹시 이때였나요?"
                items={recs}
                current={tp.date}
                onPick={(s) => {
                  // A skipped kind step takes the picked moment's kind, so the next step's blanks fit it.
                  if (!tp.kind) setTp((t) => ({ ...t, kind: kindDef(s.kind)!.label }));
                  setDate(toYmd(s.date));
                }}
              />
            )}
          </>
        );
      }
      case "situation":
        return (
          <>
            {question("어떤 상황이었나요?", mode === "template" ? "빈칸만 채우면 문장이 완성돼요." : "고민, 주변 상황, 마음을 자유롭게 적어 주세요.")}
            {mode === "template" ? (
              <div className="space-y-3 rounded-2xl bg-stone-50 p-4 leading-loose dark:bg-stone-800/50">
                <p className="text-[15px] leading-[2.6]">
                  {age !== null && age >= 0 && <b>{age}살, </b>}
                  <Blank id="blank-a" autoFocus value={blanks.a} placeholder={kind.a} onChange={(a) => setBlank({ ...blanks, a })} invalid={err?.id === "blank-a"} label="첫 번째 갈래" />
                  <span>{blanks.a.trim() ? josa(blanks.a, "와", "과") : "와(과)"} </span>
                  <Blank id="blank-b" value={blanks.b} placeholder={kind.b} onChange={(b) => setBlank({ ...blanks, b })} invalid={err?.id === "blank-b"} label="두 번째 갈래" />
                  <span> 사이에서 고민했다. 가장 마음에 걸린 건 </span>
                  <Blank id="blank-why" value={blanks.why} placeholder={kind.why} onChange={(why) => setBlank({ ...blanks, why })} label="마음에 걸린 것" />
                  <span>{blanks.why.trim() ? josa(blanks.why, "였다", "이었다") : "(이)었다"}.</span>
                </p>
              </div>
            ) : (
              <Textarea
                id="tp-situation"
                data-autofocus
                aria-label="어떤 상황이었나요"
                value={tp.situation}
                onChange={(e) => setTp({ ...tp, situation: e.target.value })}
                placeholder="예: 고3 수능을 기대보다 못 봤다. 재수를 할지, 성적에 맞춰 지방대에 갈지 고민했다."
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
                예시로 채워 보기
              </SmallButton>
              <SmallButton onClick={() => switchMode(mode === "template" ? "free" : "template")}>{mode === "template" ? "직접 자유롭게 쓰기" : "빈칸 채우기로 쓰기"}</SmallButton>
            </div>
          </>
        );
      case "actual": {
        const options = [blanks.a, blanks.b].map((s) => s.trim()).filter(Boolean);
        return (
          <>
            {question("실제로는 어떤 선택을 했나요?", "이번 인생에서는 다른 길을 가볼 수 있어요.")}
            {options.length > 0 && (
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="고민했던 갈래">
                {options.map((o) => (
                  <Choice key={o} selected={tp.actualChoice === o} onClick={() => setTp({ ...tp, actualChoice: tp.actualChoice === o ? "" : o })}>
                    {o}
                  </Choice>
                ))}
              </div>
            )}
            <Input data-autofocus={options.length ? undefined : true} aria-label="실제로 한 선택" value={tp.actualChoice} onChange={(e) => setTp({ ...tp, actualChoice: e.target.value })} placeholder="예: 재수하지 않고 지방대에 갔다" maxLength={100} />
          </>
        );
      }
      case "regret":
        return (
          <>
            {question("무엇이 아쉬웠나요?", "그때의 마음을 적어 주면 이야기에 담겨요.")}
            <Textarea data-autofocus aria-label="아쉬웠던 점" rows={3} value={tp.regret} onChange={(e) => setTp({ ...tp, regret: e.target.value })} placeholder="예: 그때 한 번만 더 도전했다면 어땠을까." maxLength={600} />
          </>
        );
      case "review":
        return (
          <>
            {question("이 정보로 시작할까요?", "고치고 싶은 항목은 바로 수정할 수 있어요.")}
            <Review profile={p} tp={tp} onEdit={(id) => go(indexOf(id), true)} />
            <label className="flex cursor-pointer gap-3 rounded-xl border border-stone-200 p-4 dark:border-stone-800">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-indigo-600" />
              <span className="space-y-1">
                <span className="block text-sm font-semibold">다음에 다시 입력하지 않도록 이 기기에 저장하기</span>
                <span className="block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                  암호화해서 이 브라우저에만 보관하고 서버에는 저장하지 않아요. {PROFILE_TTL_DAYS}일 동안 쓰지 않으면 자동으로 지워지고, 첫 화면에서 언제든 지울 수
                  있어요. 여러 사람이 쓰는 기기라면 체크하지 마세요.
                </span>
              </span>
            </label>
          </>
        );
    }
  })();

  const isLast = cur.id === "review";
  return (
    <div ref={root} className="lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-8">
      <div className="space-y-4">
        <Progress step={step} />
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
            </div>
          </Card>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={back} className="min-h-11">
              이전
            </Button>
            {!cur.required && !isLast && (
              <Button type="button" variant="ghost" onClick={() => go(toReview ? indexOf("review") : step + 1)} className="min-h-11 text-stone-600 dark:text-stone-300">
                건너뛰기
              </Button>
            )}
            <Button type="submit" className="min-h-11 flex-1">
              {isLast ? "그날로 돌아가기" : toReview ? "확인" : "다음"}
            </Button>
          </div>
          {!isLast && <p className="hidden text-center text-xs text-stone-500 sm:block dark:text-stone-400">Enter 키를 눌러도 다음으로 넘어가요.</p>}
        </form>
      </div>
      <div className="sticky top-6 hidden lg:block">
        <CharacterCard profile={p} tp={tp} now={now} />
      </div>
    </div>
  );
}

function Progress({ step }: { step: number }) {
  const cur = STEPS[step];
  const pct = Math.round((step / (STEPS.length - 1)) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold text-indigo-700 dark:text-indigo-300">{cur.section}</span>
        <span className="text-stone-500 tabular-nums dark:text-stone-400">
          {step + 1} / {STEPS.length} · {cur.id === "review" ? "마지막 확인" : `${remaining(step)} 남음`}
        </span>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800"
        role="progressbar"
        aria-label="입력 진행률"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${Math.max(4, pct)}%` }} />
      </div>
    </div>
  );
}

function Choice({ selected, onClick, small = false, children }: { selected: boolean; onClick: () => void; small?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-11 rounded-xl border px-2 font-medium break-keep transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${small ? "text-sm" : "py-2.5 text-[15px]"} ${
        selected
          ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-500"
          : "border-stone-300 bg-white hover:border-indigo-400 hover:bg-indigo-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-indigo-950"
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

function LabeledInput({ label, autoFocus, ...props }: { label: string; autoFocus?: boolean; value: string; onChange: (e: { target: { value: string } }) => void; placeholder?: string }) {
  return (
    <label className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-sm font-medium text-stone-600 dark:text-stone-400">{label}</span>
      <Input {...props} data-autofocus={autoFocus || undefined} maxLength={60} />
    </label>
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
      className="mx-0.5 inline-block min-h-11 max-w-full rounded-lg border-b-2 border-indigo-400 bg-white px-2 align-middle text-[15px] font-semibold text-indigo-800 outline-none placeholder:font-normal placeholder:text-stone-400 focus:ring-3 focus:ring-indigo-500/25 aria-invalid:border-rose-600 aria-invalid:bg-rose-50 dark:bg-stone-900 dark:text-indigo-200 dark:aria-invalid:bg-rose-950"
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
            <b className="font-semibold">{s.age}살</b> {s.label} <span className="text-stone-500 dark:text-stone-400">· {s.date.slice(0, 4)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SchoolTimeline({ profile: p, upTo }: { profile: Profile; upTo: "high" | "university" }) {
  const sy = schoolYears(p.birthDate, p.universityYear);
  if (!sy) return null;
  const names: Record<string, string> = { elementary: p.elementary, middle: p.middle, high: p.high, university: [p.university, p.major].filter(Boolean).join(" ") };
  // Three stages fit a phone's width, so the university step shows high school → university.
  const stages = upTo === "high" ? sy.stages.slice(0, 3) : sy.stages.slice(2);
  return (
    <div className="rounded-2xl bg-stone-50 p-4 dark:bg-stone-800/50" aria-label="학교 연표">
      <ol className="flex items-stretch gap-1.5">
        {stages.map((s, i) => (
          <li key={s.key} className="flex min-w-0 flex-1 items-center gap-1.5">
            <div
              className={`min-w-0 flex-1 rounded-xl border px-2 py-2 text-center ${
                names[s.key] ? "border-indigo-300 bg-white dark:border-indigo-800 dark:bg-stone-900" : "border-dashed border-stone-300 dark:border-stone-700"
              }`}
            >
              <p key={names[s.key] ? "named" : "empty"} className={`truncate text-sm font-semibold ${names[s.key] ? "" : "text-stone-400 dark:text-stone-500"}`} style={{ animation: "fadein .3s ease-out" }}>
                {names[s.key] || s.label}
              </p>
              <p className="text-[11px] text-stone-500 tabular-nums dark:text-stone-400">
                {s.from}~{s.to}
              </p>
            </div>
            {i < stages.length - 1 && (
              <span aria-hidden className="shrink-0 text-stone-400">
                →
              </span>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
        {p.birthDate.slice(0, 4)}년생 기준으로 계산했어요{sy.early ? " (1~2월생이라 한 해 일찍 입학한 빠른년생 기준)" : ""}.{upTo === "university" ? ` 대학은 ${p.universityYear ? `${p.universityYear}년 입학, ` : ""}4년제, 휴학·군대 없이 계산했어요.` : ""}
      </p>
    </div>
  );
}

function MbtiQuiz({ answers, onAnswer, onCancel }: { answers: string[]; onAnswer: (letter: string) => void; onCancel: () => void }) {
  const q = MBTI_QUIZ[answers.length];
  return (
    <div className="space-y-3 rounded-2xl bg-stone-50 p-4 dark:bg-stone-800/50" style={{ animation: "fadein .2s ease-out" }}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-indigo-700 dark:text-indigo-300">
          간단 테스트 {answers.length + 1} / {MBTI_QUIZ.length}
        </span>
        <button type="button" onClick={onCancel} className="min-h-11 px-1 text-stone-500 underline-offset-2 hover:underline dark:text-stone-400">
          그만두기
        </button>
      </div>
      <p key={q.q} className="font-semibold" role="status">
        {q.q}
      </p>
      <div className="grid gap-2">
        {q.options.map((o, i) => (
          <button
            key={o}
            type="button"
            onClick={() => onAnswer(q.letters[i])}
            className="min-h-12 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-left text-[15px] hover:border-indigo-400 hover:bg-indigo-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-indigo-950"
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Review({ profile: p, tp, onEdit }: { profile: Profile; tp: TurningPoint; onEdit: (id: StepId) => void }) {
  const rows: [StepId, string, string][] = [
    ["birth", "생년월일", p.birthDate ? p.birthDate.replace(/^(\d+)-0?(\d+)-0?(\d+)$/, "$1년 $2월 $3일") : ""],
    ["name", "별명", p.name],
    ["gender", "성별", p.gender],
    ["hometown", "자란 곳", p.hometown],
    ["schools", "학교", [p.elementary, p.middle, p.high].filter(Boolean).join(" → ")],
    ["university", "대학", [p.university, p.major, p.university && p.universityYear ? `${p.universityYear}년 입학` : ""].filter(Boolean).join(" · ")],
    ["family", "가족", p.family],
    ["mbti", "MBTI", p.mbti],
    ["personality", "성격", p.personality],
    ["current", "지금의 나", p.currentLife],
    ["kind", "변곡점", tp.kind ?? ""],
    ["date", "그때", tp.date ? tp.date.replace(/^(\d+)-0?(\d+)$/, "$1년 $2월") : ""],
    ["situation", "상황", tp.situation],
    ["actual", "실제 선택", tp.actualChoice],
    ["regret", "아쉬움", tp.regret],
  ];
  return (
    <dl className="divide-y divide-stone-100 dark:divide-stone-800">
      {rows.map(([id, label, value]) => {
        const required = STEPS[indexOf(id)].required;
        return (
          <div key={id} className="flex items-center gap-3 py-1.5">
            <dt className="w-16 shrink-0 text-xs text-stone-500 dark:text-stone-400">{label}</dt>
            <dd className={`min-w-0 flex-1 truncate text-sm ${value ? "" : required ? "font-medium text-rose-700 dark:text-rose-400" : "text-stone-400 dark:text-stone-500"}`}>
              {value || (required ? "꼭 필요해요" : "건너뜀")}
            </dd>
            <button
              type="button"
              onClick={() => onEdit(id)}
              aria-label={`${label} 수정`}
              className="min-h-11 shrink-0 rounded-lg px-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950"
            >
              수정
            </button>
          </div>
        );
      })}
    </dl>
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
