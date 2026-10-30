// Template narration used when no AI API key is configured, so the prototype always plays end to end.
import { ageAt } from "../events";
import { eraHints } from "../era";
import { formatMi, formatWealth, heuristicInitial, statusLabel, turningPointMi } from "../engine";
import type { LifeState, Profile, TurningPoint } from "../types";
import type { EndingResult, OpeningResult } from "./schema";
import { josa } from "../onboarding";
import { alternativePaths } from "./turningChoices";
import { inRegion, isEn, langFor } from "../region";

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
  // A few notes read as scene-setting; more turns the opening into a list.
  const hints = eraHints(mi).slice(-3);
  const name = profile.name || "당신";
  const actual = tp.actualChoice || "익숙한 길";
  const student = age < 20;
  const alternatives = alternativePaths(profile, tp);
  if (isEn()) {
    const who = profile.name || "You";
    return {
      persona: `${who} ${profile.mbti ? `is an ${profile.mbti} type. ` : "is hard to sum up in a sentence. "}${profile.personality}`.trim().slice(0, 300),
      stats: mbtiStats(profile.mbti),
      era: [`${formatMi(mi)}. ${who === "You" ? "You were" : `${who} was`} ${age}.`, hints.length ? hints.join(" ") : "The world was changing a little at a time, the way it always does."].join("\n\n"),
      situation: `${tp.situation || "That day, you stood at a fork in the road."} Back then you chose "${tp.actualChoice || "the familiar path"}." What will you do this time?`,
      initial: heuristicInitial(profile, tp),
      choices: [
        { label: tp.actualChoice || "Make the same choice as before", preset: "original", jobTitle: "", place: "", original: true, education: age >= 17 && student && profile.university ? "university" : "same" },
        ...alternatives,
      ],
    };
  }
  return {
    persona: `${name}${josa(name, "는", "은")} ${profile.mbti ? `${profile.mbti} 성향의 ` : ""}사람이다. ${profile.personality || "스스로를 한 문장으로 설명하기 어려워한다."}`.slice(0, 300),
    stats: mbtiStats(profile.mbti),
    era: [
      `${formatMi(mi)}, ${name}${josa(name, "는", "은")} ${age}세였다.`,
      hints.length ? hints.join(" ") : "세상은 늘 그렇듯 조금씩 변하고 있었다.",
    ].join("\n\n"),
    situation: `${tp.situation || "그날, 당신은 갈림길 앞에 서 있었다."} 그때 당신은 "${actual}"${josa(actual, "를", "을")} 택했다. 이번에는 어떻게 하겠는가?`,
    initial: heuristicInitial(profile, tp),
    choices: [
      {
        label: tp.actualChoice || "원래 했던 선택을 그대로 한다",
        preset: "original",
        jobTitle: "",
        place: "",
        original: true,
        // Only a turning point around the entrance exam leads straight to university.
        education: age >= 17 && student && profile.university ? "university" : "same",
      },
      ...alternatives,
    ],
  };
}

export function fallbackEnding(s: LifeState): EndingResult {
  if ((s.lang ?? langFor(s.region)) === "en") return inRegion(s.region, () => usEnding(s), "en");
  const name = s.profile.name || "나";
  const first = s.choices[0];
  const outcomes = s.log
    .filter((l) => l.kind === "outcome")
    .slice(1, 7)
    .map((l) => `${ageAt(s.profile.birthDate, l.mi)}세, ${l.text.split(". ")[0].replace(/\.$/, "")}.`);
  return {
    title: `${name}의 또 다른 ${s.deathAge ?? "?"}년`,
    memoir: [
      `${formatMi(turningPointMi(s.turningPoint))}, 나는 ${first ? `"${first.picked}"${josa(first.picked, "를", "을")}` : "다른 길을"} 택했다.`,
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

function usEnding(s: LifeState): EndingResult {
  const name = s.profile.name || "I";
  const first = s.choices[0];
  const outcomes = s.log
    .filter((l) => l.kind === "outcome")
    .slice(1, 7)
    .map((l) => `At ${ageAt(s.profile.birthDate, l.mi)}: ${l.text.split(". ")[0].replace(/\.$/, "")}.`);
  return {
    title: `${name === "I" ? "My" : `${name}'s`} other ${s.deathAge ?? "?"} years`,
    memoir: [
      `In ${formatMi(turningPointMi(s.turningPoint))}, I chose ${first ? `"${first.picked}"` : "a different road"}.`,
      outcomes.length ? `${outcomes.join(" ")} Every choice led to another.` : "The life that followed was quieter than I expected.",
      `At the end I was ${statusLabel(s) || "an ordinary person"}, and I left ${formatWealth(s.wealth)} behind.`,
      "Looking back, every road had days of laughing and days of crying.",
    ].join("\n\n"),
    epitaph: "I walked a different road, and it was my life too.",
    comparison: s.profile.currentLife
      ? `In real life I am "${s.profile.currentLife.slice(0, 80)}." On this branch I lived to ${s.deathAge ?? "?"}, and at the end I was ${statusLabel(s)}.`
      : "Add what your real life looks like to compare the two side by side.",
  };
}
