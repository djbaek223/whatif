// 빠른 시작 (only nickname, birthday, gender, hometown and a year): every empty field the quick start leaves must still
// give a whole opening and a life that plays to the end, in Korea and the US, told in Korean and English, at any age.
// Checks the turning point it builds, the template opening, the AI opening prompt, the age fit, and a life to its ending.
// Run: npm run check:quick
import { advanceUntilStop, autoPick, createLife, resolveChoice } from "../src/lib/engine";
import { ageAt } from "../src/lib/events";
import { fallbackEnding, fallbackOpening } from "../src/lib/narrator/fallback";
import { promptFor } from "../src/lib/narrator/prompts";
import { pathHints } from "../src/lib/narrator/turningChoices";
import { eraHints } from "../src/lib/era";
import { quickStart, quickTurningPoint, quickYears } from "../src/lib/onboarding";
import { inRegion, type Lang, type Region } from "../src/lib/region";
import { turningPointMi } from "../src/lib/engine";
import type { LifeState, Profile } from "../src/lib/types";
import { EMPTY_PROFILE } from "../src/components/Forms";

const failures: string[] = [];
const check = (ok: unknown, msg: string) => {
  if (!ok) failures.push(msg);
};
const now = new Date(2026, 10, 3);
const broken = /undefined|NaN|null|\[object|____/;

let lives = 0;
for (const region of ["kr", "us"] as Region[]) {
  for (const lang of ["ko", "en"] as Lang[]) {
    for (const [birth, gender] of [["1958-02-03", "여"], ["1975-08-21", "남"], ["1991-05-12", "기타"], ["2008-11-30", "남"]] as const) {
      const profile: Profile = { ...EMPTY_PROFILE, name: "늦깎이", birthDate: birth, gender, hometown: region === "us" ? "Columbus, Ohio" : "대전", country: region };
      const by = Number(birth.slice(0, 4));
      const years = inRegion(region, () => quickYears(birth, now), lang);
      check(years.length > 0 && years.every((y) => y.year <= now.getFullYear()), `${region}/${lang} ${birth}: quick ages`);
      for (const year of [by + 7, by + 12, by + 17, by + 18, by + 22, by + 26, by + 35, by + 50, now.getFullYear()].filter((y) => y >= by + 7 && y <= now.getFullYear())) {
        const at = `${region}/${lang} ${birth} → ${year}`;
        const tp = inRegion(region, () => quickTurningPoint(birth, gender, year, now), lang);
        check(/^\d{4}-\d{2}$/.test(tp.date) && tp.date.startsWith(String(year)), `${at}: date ${tp.date}`);
        check(turningPointMi(tp) <= now.getFullYear() * 12 + now.getMonth(), `${at}: not in the future (${tp.date})`);
        check(quickStart(tp), `${at}: reads as a quick start`);
        const opening = inRegion(region, () => fallbackOpening(profile, tp), lang);
        check(opening.choices.length >= 3, `${at}: ${opening.choices.length} opening choices`);
        check(new Set(opening.choices.map((c) => c.label)).size === opening.choices.length, `${at}: choices repeat ${opening.choices.map((c) => c.label)}`);
        for (const text of [opening.situation, opening.era, opening.persona, ...opening.choices.map((c) => c.label)]) check(text.trim() && !broken.test(text), `${at}: broken text "${text}"`);
        check(lang === "en" ? !/[가-힣]/.test(opening.situation) : /[가-힣]/.test(opening.situation), `${at}: situation in ${lang}: ${opening.situation}`);
        const age = ageAt(birth, turningPointMi(tp));
        if (age < 16) check(!opening.initial.employed && opening.initial.partner === "none" && opening.initial.children === 0, `${at}: a ${age}-year-old has no job or partner`);
        // The AI opening asks for the quick-start scene.
        const mi = turningPointMi(tp);
        const { prompt } = inRegion(region, () => promptFor({ kind: "opening", profile, turningPoint: tp, eraHints: eraHints(mi), age, hints: pathHints(profile, tp) }), lang);
        check(/빠른 시작|Quick start/.test(prompt), `${at}: opening prompt has the quick-start line`);

        let life: LifeState = createLife(profile, tp, opening, { region, lang });
        check(!broken.test(life.log[0]?.text ?? ""), `${at}: first log line`);
        for (let guard = 0; guard < 3000 && !life.dead; guard++) {
          if (life.pending) life = resolveChoice(life, autoPick(life) ?? life.pending.options[0].id);
          else life = advanceUntilStop(life).state;
        }
        check(life.dead && life.deathAge !== null, `${at}: life reaches its end`);
        const ending = inRegion(region, () => fallbackEnding(life), lang);
        check(ending && !broken.test(JSON.stringify(ending)), `${at}: ending text`);
        lives++;
      }
    }
  }
}

// A detailed turning point is not a quick start.
check(!quickStart({ situation: "수능을 망쳤다.", actualChoice: "" }), "a written situation is not a quick start");

if (failures.length) {
  console.error(`check:quick ${failures.length} failures`);
  for (const f of [...new Set(failures)].slice(0, 40)) console.error("  " + f);
  process.exit(1);
}
console.log(`check:quick ok · ${lives} quick-start lives played to the end`);
