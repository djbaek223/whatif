"use client";

import { useState } from "react";
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

export function ProfileForm({ initial, onDone, onBack }: { initial: Profile; onDone: (p: Profile) => void; onBack: () => void }) {
  const [p, setP] = useState<Profile>(initial);
  const [step, setStep] = useState(0);
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
        <div className="mt-3 flex gap-1">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-indigo-500" : "bg-stone-200 dark:bg-stone-800"}`} />
          ))}
        </div>
      </div>

      <Card className="space-y-5">
        {step === 0 && (
          <>
            <Field label="이름 또는 별명">
              <Input value={p.name} onChange={set("name")} placeholder="예: 동준" maxLength={20} />
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

      <div className="flex gap-3">
        <Button variant="ghost" onClick={() => (step === 0 ? onBack() : setStep(step - 1))}>
          이전
        </Button>
        <Button className="flex-1" disabled={!canNext} onClick={() => (step === STEPS.length - 1 ? onDone(p) : setStep(step + 1))}>
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
