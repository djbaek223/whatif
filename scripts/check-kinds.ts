// The "어떤 갈림길이었나요?" step offers kinds of fork that fit the age gone back to (2026-11-08): a 9-year-old gets
// school, friends and hobbies, not exams, jobs or marriage. Checks every age 7-80 in Korea and the US, told in Korean
// and English: the kinds, their blanks and examples, the sentence they fill, the kind read back by label, and the
// opening paths the template story offers from that example.
// Run: npm run check:kinds
import { fallbackOpening } from "../src/lib/narrator/fallback";
import { themeOf } from "../src/lib/narrator/turningChoices";
import { fillTemplate, kindDef, quickTurningPoint, tpKinds, type TpKindDef } from "../src/lib/onboarding";
import { inRegion, type Lang, type Region } from "../src/lib/region";
import { EMPTY_PROFILE } from "../src/components/Forms";
import type { Profile, TurningPoint } from "../src/lib/types";

const failures: string[] = [];
const check = (ok: unknown, msg: string) => {
  if (!ok) failures.push(msg);
};
const broken = /undefined|NaN|null|\[object|____/;

// Words that have no place in a child's or a middle schooler's fork.
const ADULT_KO = /취업|취직|입사|결혼|이혼|창업|이직|퇴사|투자|대출|아파트|전세|월세|재수|수능|대학|이민|연봉|회사|직장|인턴|모기지/;
const ADULT_EN = /\bjob\b|career|marr|wedding|business|invest|\bloan|mortgage|apartment|\brent\b|retake|college|university|emigrat|salary|company|internship/i;
// And none of the adult kinds reach a child or teen list.
const ADULT_IDS = new Set(["job", "career", "invest"]);

const text = (d: TpKindDef) => [d.label, d.a, d.b, d.why, d.example.a, d.example.b, d.example.why].join(" / ");

let shown = 0;
for (const region of ["kr", "us"] as Region[]) {
  for (const lang of ["ko", "en"] as Lang[]) {
    const run = <T,>(f: () => T) => inRegion(region, f, lang);
    const adult = lang === "en" ? ADULT_EN : ADULT_KO;
    for (let age = 7; age <= 80; age++) {
      const at = `${region}/${lang} ${age}세`;
      const kinds = run(() => tpKinds(age));
      check(kinds.length >= 4 && kinds.length <= 8, `${at}: ${kinds.length} kinds`);
      check(new Set(kinds.map((d) => d.label)).size === kinds.length, `${at}: labels repeat`);
      check(kinds.at(-1)?.id === "other", `${at}: 기타 last`);
      for (const d of kinds) {
        const t = text(d);
        check(!broken.test(t) && d.icon, `${at}: broken kind ${t}`);
        check(lang === "en" ? !/[가-힣]/.test(t) : /[가-힣]/.test(t), `${at}: kind not in ${lang}: ${t}`);
        // Read back by its label at that age, the same kind (the blanks of the next step come from it).
        check(run(() => kindDef(d.label, age)) === d, `${at}: ${d.label} reads back as another kind`);
        check(run(() => kindDef(d.label))?.id === d.id, `${at}: ${d.label} has another id without the age`);
        if (age < 16) {
          check(!ADULT_IDS.has(d.id) && d.id !== "love" || age >= 13, `${at}: ${d.id} offered to a child`);
          check(!adult.test(t) || (age >= 13 && d.id === "move"), `${at}: adult words in ${t}`);
        }
        if (age < 19) check(!ADULT_IDS.has(d.id), `${at}: ${d.id} offered to a ${age}-year-old`);
        if (age < 22) check(d.id !== "career", `${at}: 이직·창업 at ${age}`);
        if (age > 27) check(d.id !== "exam", `${at}: 입시 at ${age}`);

        // The example sentence, and the template story's opening built from it.
        const tp: TurningPoint = { date: "", situation: run(() => fillTemplate(age, d.example)), actualChoice: "", regret: "", kind: d.label };
        check(tp.situation && !broken.test(tp.situation), `${at}: example sentence "${tp.situation}"`);
        // "가장 마음에 걸린 건 ___였다" takes a noun: "실망하실까 봐였다" does not read.
        if (lang === "ko") check(!/봐(였|이었)다/.test(tp.situation), `${at}: "${d.example.why}" does not end the sentence`);
        const birth = region === "us" ? "1990-04-10" : "1990-04-10";
        tp.date = `${1990 + age}-06`;
        if (1990 + age > 2026) continue;
        const profile: Profile = { ...EMPTY_PROFILE, name: "늦깎이", birthDate: birth, gender: "여", hometown: region === "us" ? "Columbus, Ohio" : "대전", country: region };
        check(run(() => themeOf(tp)) && true, `${at}: theme`);
        const opening = run(() => fallbackOpening(profile, tp));
        check(opening.choices.length >= 3, `${at} ${d.label}: ${opening.choices.length} opening choices`);
        for (const c of opening.choices) check(!broken.test(c.label), `${at} ${d.label}: broken choice "${c.label}"`);
        if (age < 13) {
          for (const c of opening.choices) check(!/취업|입사|결혼|창업|이직|대출|marr|wedding|start(ing)? a business|mortgage|job offer/i.test(c.label), `${at} ${d.label}: adult path "${c.label}"`);
          check(!opening.initial.employed && opening.initial.partner === "none", `${at} ${d.label}: a child with a job or partner`);
        }
      }
      shown++;
    }
    // 빠른 시작's kind for a common moment is the one of that age (15 → 진학, not 입시 with 재수 blanks).
    const tp15 = run(() => quickTurningPoint("2000-03-02", "남", 2015, new Date(2026, 10, 8)));
    if (tp15.kind) check(run(() => tpKinds(15)).some((d) => d.label === tp15.kind), `${region}/${lang}: quick 15세 kind ${tp15.kind}`);
  }
}

// What a 9-year-old, a 15-year-old, a 17-year-old and a 30-year-old see in Korea, for the record.
for (const age of [9, 15, 17, 30]) console.log(`  ${age}세: ${inRegion("kr", () => tpKinds(age), "ko").map((d) => d.label).join(" · ")}`);

if (failures.length) {
  console.error(`check:kinds ${failures.length} failures`);
  for (const f of [...new Set(failures)].slice(0, 40)) console.error("  " + f);
  process.exit(1);
}
console.log(`check:kinds ok · ${shown} age × region × language lists`);
