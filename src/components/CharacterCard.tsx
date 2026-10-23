"use client";

import { ageIn, kindDef } from "@/lib/onboarding";
import type { Profile, TurningPoint } from "@/lib/types";

const clip = (s: string, n: number) => {
  const t = s.trim().replace(/\s+/g, " ");
  return t.length > n ? `${t.slice(0, n)}…` : t;
};

/** What the answers so far say about the main character, in the order they are asked. */
export function characterFacts(p: Profile, tp: TurningPoint, now: Date): { key: string; label: string; text: string }[] {
  const facts: { key: string; label: string; text: string }[] = [];
  const add = (key: string, label: string, text: string) => text && facts.push({ key, label, text });
  if (p.birthDate) {
    const nowYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    add("birth", "출생", `${p.birthDate.slice(0, 4)}년생 · 지금 ${ageIn(p.birthDate, nowYm)}살`);
  }
  add("name", "별명", clip(p.name, 16));
  add("gender", "성별", p.gender);
  add("hometown", "자란 곳", clip(p.hometown, 16));
  add("schools", "학교", [p.elementary, p.middle, p.high].map((s) => clip(s, 10)).filter(Boolean).join(" → "));
  add("university", "대학", [clip(p.university, 14), clip(p.major, 12)].filter(Boolean).join(" · "));
  add("family", "가족", clip(p.family, 24));
  add("mbti", "MBTI", p.mbti);
  add("personality", "성격", clip(p.personality, 24));
  add("current", "지금", clip(p.currentLife, 24));
  const kind = kindDef(tp.kind);
  add("kind", "변곡점", kind ? `${kind.icon} ${kind.label}` : "");
  if (tp.date) {
    const age = p.birthDate ? ageIn(p.birthDate, tp.date) : null;
    add("date", "그때", `${tp.date.replace("-", "년 ").replace(/년 0?/, "년 ")}월${age !== null ? ` · ${age}살` : ""}`);
  }
  add("situation", "고민", clip(tp.situation, 28));
  return facts;
}

/** Reacts to every answer: the avatar shows up with the birth date, and each answer stacks up as a line. */
export function CharacterCard({ profile, tp, now, compact = false }: { profile: Profile; tp: TurningPoint; now: Date; compact?: boolean }) {
  const facts = characterFacts(profile, tp, now);
  const age = profile.birthDate ? ageIn(profile.birthDate, `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`) : null;
  const title = profile.name || "이야기의 주인공";

  if (compact)
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-3 py-2 dark:border-stone-800 dark:bg-stone-900" aria-hidden>
        <Avatar age={age} gender={profile.gender} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p key={facts.length} className="truncate text-xs text-stone-500 dark:text-stone-400" style={{ animation: "fadein .3s ease-out" }}>
            {facts.length ? facts[facts.length - 1].text : "답할 때마다 주인공이 채워져요"}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 tabular-nums dark:bg-indigo-950 dark:text-indigo-300">
          {facts.length}
        </span>
      </div>
    );

  return (
    <aside aria-label="지금까지 입력한 정보" className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex flex-col items-center text-center">
        <Avatar age={age} gender={profile.gender} size={96} />
        <p className="mt-3 text-lg font-bold">{title}</p>
        <p className="text-sm text-stone-500 dark:text-stone-400">{age !== null ? `${age}살 · ${profile.mbti || "성향 미정"}` : "태어난 날을 알려주면 나타나요"}</p>
      </div>
      <ul className="mt-4 space-y-2 border-t border-stone-100 pt-4 text-sm dark:border-stone-800">
        {facts.map((f) => (
          <li key={f.key} className="flex gap-2" style={{ animation: "fadein .35s ease-out" }}>
            <span className="w-12 shrink-0 text-xs leading-5 text-stone-500 dark:text-stone-400">{f.label}</span>
            <span className="min-w-0 break-words">{f.text}</span>
          </li>
        ))}
        {facts.length === 0 && <li className="text-center text-xs text-stone-500 dark:text-stone-400">답할 때마다 여기에 하나씩 쌓여요.</li>}
      </ul>
    </aside>
  );
}

/** A simple face: hidden until the birth date is known, then drawn for the person's age and gender. */
function Avatar({ age, gender, size }: { age: number | null; gender: string; size: number }) {
  if (age === null)
    return (
      <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden>
        <circle cx="48" cy="48" r="46" className="fill-stone-100 dark:fill-stone-800" />
        <circle cx="48" cy="40" r="16" className="fill-stone-300 dark:fill-stone-600" />
        <path d="M20 84c4-16 16-24 28-24s24 8 28 24" className="fill-stone-300 dark:fill-stone-600" />
        <text x="48" y="46" textAnchor="middle" fontSize="16" fontWeight="700" className="fill-white dark:fill-stone-900">
          ?
        </text>
      </svg>
    );
  const hair = age >= 60 ? "#b8b3ad" : age >= 45 ? "#4a403a" : "#2b2522";
  const skin = "#f3cfae";
  const long = gender === "여";
  const shirt = age < 13 ? "#f59e0b" : age < 20 ? "#1e3a8a" : age >= 60 ? "#7c9a74" : "#4f46e5";
  const scale = age < 13 ? 0.86 : 1;
  return (
    <svg key={`${long}-${age >= 60}-${age < 13}`} width={size} height={size} viewBox="0 0 96 96" aria-hidden style={{ animation: "pop .45s cubic-bezier(.2,1.4,.4,1)" }}>
      <circle cx="48" cy="48" r="46" className="fill-indigo-50 dark:fill-indigo-950" />
      <g transform={`translate(48 52) scale(${scale}) translate(-48 -52)`}>
        {long && <path d="M28 40c0-14 9-22 20-22s20 8 20 22v26H28z" fill={hair} />}
        <path d="M18 92c3-18 15-27 30-27s27 9 30 27z" fill={shirt} />
        <rect x="42" y="54" width="12" height="12" rx="4" fill={skin} />
        <circle cx="48" cy="40" r="17" fill={skin} />
        <path d={long ? "M31 38c0-11 7-18 17-18s17 7 17 18c-6-1-12-5-15-10-3 5-10 9-19 10z" : "M31 37c0-10 7-17 17-17s17 7 17 17c-4-3-9-5-17-5s-13 2-17 5z"} fill={hair} />
        <circle cx="42" cy="42" r="1.8" fill="#2b2522" />
        <circle cx="54" cy="42" r="1.8" fill="#2b2522" />
        <path d="M43 48c3 3 7 3 10 0" stroke="#2b2522" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {age >= 60 && <path d="M38 36h6M52 36h6" stroke="#8a827b" strokeWidth="1.2" strokeLinecap="round" />}
      </g>
    </svg>
  );
}
