"use client";

import { useState } from "react";
import { PROFILE_TTL_DAYS } from "@/lib/localData";
import type { Gender, Profile, TurningPoint } from "@/lib/types";
import { Button, Card, Field, Input, Textarea } from "./ui";

export const EMPTY_PROFILE: Profile = {
  name: "",
  birthDate: "",
  gender: "",
  hometown: "",
  elementary: "",
  middle: "",
  high: "",
  university: "",
  major: "",
  family: "",
  mbti: "",
  personality: "",
  currentLife: "",
};

const MBTI = ["", "ISTJ", "ISFJ", "INFJ", "INTJ", "ISTP", "ISFP", "INFP", "INTP", "ESTP", "ESFP", "ENFP", "ENTP", "ESTJ", "ESFJ", "ENFJ", "ENTJ"];

const STEPS = ["기본 정보", "학교", "가족과 환경", "성향", "지금의 나"] as const;

const NICKNAMES = ["새벽산책러", "늦깎이여행자", "골목고양이", "주말등산가", "별헤는밤", "커피한잔", "느린거북이", "바닷가소년", "책방주인", "구름조각", "밤하늘고래", "봄날의곰"];

// Common Korean surnames; a 2-4 syllable Hangul name starting with one of these probably is a real name.
const SURNAMES = "김이박최정강조윤장임한오서신권황안송류전홍고문양손배백허유남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용예봉경사부";
const looksLikeRealName = (name: string) => /^[가-힣]{2,4}$/.test(name.trim()) && SURNAMES.includes(name.trim()[0]);

export function ProfileForm({
  initial,
  initialRemember,
  onDone,
  onBack,
}: {
  initial: Profile;
  initialRemember: boolean;
  onDone: (p: Profile, remember: boolean) => void;
  onBack: () => void;
}) {
  const [p, setP] = useState<Profile>(initial);
  const [step, setStep] = useState(0);
  const [remember, setRemember] = useState(initialRemember);
  const suggestNickname = () => {
    const pool = NICKNAMES.filter((n) => n !== p.name);
    setP({ ...p, name: pool[Math.floor(Math.random() * pool.length)] });
  };
  const set = (k: keyof Profile) => (e: { target: { value: string } }) => setP({ ...p, [k]: e.target.value });
  const birthOk = /^\d{4}-\d{2}-\d{2}$/.test(p.birthDate) && p.birthDate >= "1930-01-01" && new Date(p.birthDate) < new Date();
  const canNext = step !== 0 || birthOk;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-stone-500">
          {step + 1} / {STEPS.length}
        </p>
        <h2 className="mt-1 text-2xl font-bold">{STEPS[step]}</h2>
        <ol className="mt-3 flex gap-1">
          {STEPS.map((label, i) => (
            <li key={label} className="flex-1" aria-current={i === step ? "step" : undefined}>
              <div className={`h-1 rounded-full ${i <= step ? "bg-indigo-500" : "bg-stone-200 dark:bg-stone-800"}`} />
              <span
                className={`mt-1.5 block text-center text-xs leading-tight break-keep ${
                  i === step ? "font-semibold text-indigo-600 dark:text-indigo-400" : i < step ? "text-stone-500" : "text-stone-400 dark:text-stone-500"
                }`}
              >
                {label}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <Card className="space-y-5">
        {step === 0 && (
          <>
            <Field label="별명" hint="실명 대신 별명을 써주세요. 이야기 속 주인공을 부를 때만 쓰여요.">
              <div className="flex gap-2">
                <Input value={p.name} onChange={set("name")} placeholder="예: 늦깎이여행자" maxLength={20} />
                <Button type="button" variant="ghost" onClick={suggestNickname} className="shrink-0 py-2.5">
                  추천
                </Button>
              </div>
              {looksLikeRealName(p.name) && (
                <span className="block text-xs text-amber-700 dark:text-amber-400">혹시 실명이라면, 개인정보 보호를 위해 별명으로 바꾸는 걸 권해요.</span>
              )}
            </Field>
            <Field label="생년월일 (필수)">
              <Input type="date" value={p.birthDate} onChange={set("birthDate")} min="1930-01-01" />
            </Field>
            <Field label="성별" hint="입대 같은 일부 이벤트에만 쓰여요." group>
              <div className="flex gap-2">
                {(["남", "여", "기타"] as Gender[]).map((g) => (
                  <Button key={g} type="button" variant={p.gender === g ? "primary" : "ghost"} onClick={() => setP({ ...p, gender: g })} className="flex-1">
                    {g}
                  </Button>
                ))}
              </div>
            </Field>
            <Field label="자란 지역">
              <Input value={p.hometown} onChange={set("hometown")} placeholder="예: 대전" maxLength={40} />
            </Field>
          </>
        )}
        {step === 1 && (
          <>
            <Field label="초등학교">
              <Input value={p.elementary} onChange={set("elementary")} placeholder="예: 대전 문화초등학교" maxLength={60} />
            </Field>
            <Field label="중학교">
              <Input value={p.middle} onChange={set("middle")} maxLength={60} />
            </Field>
            <Field label="고등학교">
              <Input value={p.high} onChange={set("high")} maxLength={60} />
            </Field>
            <Field label="대학교" hint="안 다녔다면 비워두세요.">
              <Input value={p.university} onChange={set("university")} maxLength={60} />
            </Field>
            <Field label="전공">
              <Input value={p.major} onChange={set("major")} maxLength={60} />
            </Field>
          </>
        )}
        {step === 2 && (
          <Field label="가족과 자란 환경" hint="부모님 직업, 형제, 집안 분위기 등을 편하게 적어주세요.">
            <Textarea value={p.family} onChange={set("family")} placeholder="예: 공무원 아버지와 미용실을 하던 어머니, 누나 한 명. 넉넉하진 않았지만 화목했다." maxLength={800} />
          </Field>
        )}
        {step === 3 && (
          <>
            <Field label="MBTI">
              <select value={p.mbti} onChange={set("mbti")} className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 dark:border-stone-700 dark:bg-stone-900">
                {MBTI.map((m) => (
                  <option key={m} value={m}>
                    {m || "모름 / 선택 안 함"}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="나는 어떤 사람인가요?" hint="성격, 가치관, 습관, 좋아하는 것. 길수록 이야기가 더 나다워져요.">
              <Textarea
                rows={6}
                value={p.personality}
                onChange={set("personality")}
                placeholder="예: 겉으로는 무난하지만 속으로 고민이 많다. 안정을 좋아하면서도 늘 다른 삶을 상상한다."
                maxLength={1500}
              />
            </Field>
          </>
        )}
        {step === 4 && (
          <Field label="지금 나는 어떻게 살고 있나요?" hint="엔딩에서 실제 삶과 비교할 때 써요. 비워도 됩니다.">
            <Textarea
              rows={5}
              value={p.currentLife}
              onChange={set("currentLife")}
              placeholder="예: 서울의 IT 회사 기획자. 결혼 3년 차, 아이는 아직 없다. 일은 안정적이지만 가끔 허전하다."
              maxLength={800}
            />
          </Field>
        )}
      </Card>

      {step === STEPS.length - 1 && (
        <label className="flex cursor-pointer gap-3 rounded-xl border border-stone-200 p-4 dark:border-stone-800">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-indigo-600" />
          <span className="space-y-1">
            <span className="block text-sm font-semibold">다음에 다시 입력하지 않도록 이 기기에 저장하기</span>
            <span className="block text-xs leading-relaxed text-stone-500">
              암호화해서 이 브라우저에만 보관하고 서버에는 저장하지 않아요. {PROFILE_TTL_DAYS}일 동안 쓰지 않으면 자동으로 지워지고, 첫 화면에서 언제든
              지울 수 있어요. 여러 사람이 쓰는 기기라면 체크하지 마세요.
            </span>
          </span>
        </label>
      )}

      <div className="flex gap-3">
        <Button variant="ghost" onClick={() => (step === 0 ? onBack() : setStep(step - 1))}>
          이전
        </Button>
        <Button className="flex-1" disabled={!canNext} onClick={() => (step === STEPS.length - 1 ? onDone(p, remember) : setStep(step + 1))}>
          {step === STEPS.length - 1 ? "다음: 변곡점 고르기" : "다음"}
        </Button>
      </div>
    </div>
  );
}

export function TurningPointForm({
  profile,
  initial,
  onDone,
  onBack,
}: {
  profile: Profile;
  initial: TurningPoint;
  onDone: (tp: TurningPoint) => void;
  onBack: () => void;
}) {
  const [tp, setTp] = useState<TurningPoint>(initial);
  const set = (k: keyof TurningPoint) => (e: { target: { value: string } }) => setTp({ ...tp, [k]: e.target.value });
  const now = new Date();
  const maxMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const minMonth = profile.birthDate ? `${Number(profile.birthDate.slice(0, 4)) + 7}-01` : "1940-01";
  const dateOk = /^\d{4}-\d{2}$/.test(tp.date) && tp.date >= minMonth && tp.date <= maxMonth;
  const ok = dateOk && tp.situation.trim().length >= 5;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">인생의 변곡점</h2>
        <p className="mt-2 text-stone-600 dark:text-stone-400">돌아가고 싶은 그 순간을 알려주세요. 그날부터 인생을 다시 살아봅니다.</p>
      </div>
      <Card className="space-y-5">
        <Field label="언제였나요?" hint="일곱 살 이후, 지금 이전의 달을 골라주세요.">
          <Input type="month" value={tp.date} onChange={set("date")} min={minMonth} max={maxMonth} />
        </Field>
        <Field label="어떤 상황이었나요?">
          <Textarea value={tp.situation} onChange={set("situation")} placeholder="예: 고3 수능을 기대보다 못 봤다. 재수를 할지, 성적에 맞춰 지방대에 갈지 고민했다." maxLength={1000} />
        </Field>
        <Field label="실제로는 어떤 선택을 했나요?">
          <Input value={tp.actualChoice} onChange={set("actualChoice")} placeholder="예: 재수하지 않고 지방대에 갔다" maxLength={100} />
        </Field>
        <Field label="무엇이 아쉬웠나요?" hint="선택 사항">
          <Textarea rows={3} value={tp.regret} onChange={set("regret")} placeholder="예: 그때 한 번만 더 도전했다면 어땠을까." maxLength={600} />
        </Field>
      </Card>
      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack}>
          이전
        </Button>
        <Button className="flex-1" disabled={!ok} onClick={() => onDone(tp)}>
          그날로 돌아가기
        </Button>
      </div>
    </div>
  );
}
