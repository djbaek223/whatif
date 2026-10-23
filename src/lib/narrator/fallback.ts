// Template narration used when no AI API key is configured, so the prototype always plays end to end.
import { ageAt } from "../events";
import { eraHints } from "../era";
import { formatMi, formatWealth, heuristicInitial, statusLabel, turningPointMi } from "../engine";
import type { LifeState, Profile, TurningPoint } from "../types";
import type { EndingResult, OpeningResult } from "./schema";
import { alternativePaths } from "./turningChoices";

function mbtiStats(mbti: string) {
  const m = mbti.toUpperCase();
  return {
    health: 70,
    happiness: 55 + (m.includes("P") ? 3 : 0),
    knowledge: 50 + (m.includes("N") ? 5 : 0) + (m.includes("J") ? 3 : 0),
    relationships: 50 + (m.includes("E") ? 8 : 0) + (m.includes("F") ? 4 : 0),
  };
}

export function fallbackOpening(profile: Profile, tp: TurningPoint): OpeningResult {
  const mi = turningPointMi(tp);
  const age = ageAt(profile.birthDate, mi);
  const year = Math.floor(mi / 12);
  const hints = eraHints(year);
  const name = profile.name || "당신";
  const student = age < 20;
  const alternatives = alternativePaths(profile, tp);
  return {
    persona: `${name}은(는) ${profile.mbti ? `${profile.mbti} 성향의 ` : ""}사람이다. ${profile.personality || "스스로를 한 문장으로 설명하기 어려워한다."}`.slice(0, 300),
    stats: mbtiStats(profile.mbti),
    era: [
      `${formatMi(mi)}, ${name}은(는) ${age}세였다.`,
      hints.length ? hints.join(" ") : "세상은 늘 그렇듯 조금씩 변하고 있었다.",
    ].join("\n\n"),
    situation: `${tp.situation || "그날, 당신은 갈림길 앞에 서 있었다."} 그때 당신은 "${tp.actualChoice || "익숙한 길"}"을(를) 택했다. 이번에는 어떻게 하겠는가?`,
    initial: heuristicInitial(profile, tp),
    choices: [
      {
        label: tp.actualChoice || "원래 했던 선택을 그대로 한다",
        preset: "original",
        jobTitle: "",
        place: "",
        original: true,
        education: student && profile.university ? "university" : "same",
      },
      ...alternatives,
    ],
  };
}

export function fallbackEnding(s: LifeState): EndingResult {
  const name = s.profile.name || "나";
  const first = s.choices[0];
  const outcomes = s.log
    .filter((l) => l.kind === "outcome")
    .slice(1, 7)
    .map((l) => `${ageAt(s.profile.birthDate, l.mi)}세, ${l.text.split(". ")[0].replace(/\.$/, "")}.`);
  return {
    title: `${name}의 또 다른 ${s.deathAge ?? "?"}년`,
    memoir: [
      `${formatMi(turningPointMi(s.turningPoint))}, 나는 ${first ? `"${first.picked}"` : "다른 길"}을(를) 택했다.`,
      outcomes.length ? `${outcomes.join(" ")} 선택은 또 다른 선택을 불러왔다.` : "그 뒤의 삶은 생각보다 조용히 흘러갔다.",
      `마지막 순간의 나는 ${statusLabel(s) || "평범한 사람"}이었고, 남긴 자산은 ${formatWealth(s.wealth)}이었다.`,
      "돌아보면 어느 길이든 웃은 날과 운 날이 섞여 있었다.",
    ].join("\n\n"),
    epitaph: "다른 길을 걸어 보았고, 그 길도 나의 삶이었다.",
    comparison: s.profile.currentLife
      ? `현실의 나는 "${s.profile.currentLife.slice(0, 80)}"인 삶을 살고 있다. 이 가지의 나는 ${s.deathAge ?? "?"}세까지 살았고, 마지막 모습은 ${statusLabel(s)}였다.`
      : "현실의 삶 정보를 입력하면 두 삶을 나란히 비교해 볼 수 있다.",
  };
}
