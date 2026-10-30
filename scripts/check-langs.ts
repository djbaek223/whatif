// Plays the same fixed-seed lives in both display languages for each country and checks that (1) the language
// changes only the words: the same choices, stats, money and death in Korean and in English; and (2) nothing on
// screen is left in the other language. Run: npm run check:langs [-- <lives>]
import { advanceUntilStop, autoPick, costLine, createLife, lifeSummary, payLabel, resolveChoice, statusLabel } from "../src/lib/engine";
import { fallbackOpening } from "../src/lib/narrator/fallback";
import { inRegion, type Lang, type Region } from "../src/lib/region";
import type { LifeState, Profile, TurningPoint } from "../src/lib/types";

let seed = 1;
Math.random = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

const KR_BASE: Profile = {
  name: "테스트", birthDate: "1991-05-12", gender: "남", hometown: "대전", elementary: "", middle: "", high: "대전고",
  university: "충남대학교", major: "경영학", family: "", mbti: "INFP", personality: "", currentLife: "", country: "kr",
};
const KR: [Partial<Profile>, TurningPoint][] = [
  [{}, { date: "2009-11", situation: "수능을 망쳤다.", actualChoice: "재수하지 않고 지방대에 갔다", regret: "" }],
  [{ birthDate: "1975-02-03", gender: "여", major: "컴퓨터공학" }, { date: "1998-03", situation: "외환위기로 입사가 취소됐다.", actualChoice: "대학원에 갔다", regret: "" }],
  [{ birthDate: "1958-09-30", university: "", major: "" }, { date: "1977-06", situation: "공장에 취직할지 고민했다.", actualChoice: "취직했다", regret: "" }],
  [{ birthDate: "2001-12-01", gender: "여" }, { date: "2010-04", situation: "학원을 그만두고 싶었다.", actualChoice: "계속 다녔다", regret: "" }],
];
const US_BASE: Profile = {
  name: "Alex", birthDate: "1990-04-12", gender: "남", hometown: "Columbus, Ohio", elementary: "", middle: "", high: "",
  university: "Ohio State University", major: "Business", family: "", mbti: "ENFP", personality: "", currentLife: "", country: "us",
};
const US: [Partial<Profile>, TurningPoint][] = [
  [{}, { date: "2008-04", situation: "I got into NYU but it cost twice as much.", actualChoice: "Went to Ohio State", regret: "" }],
  [{ birthDate: "1975-09-30", gender: "여", hometown: "Fresno, California", university: "", major: "" }, { date: "1998-06", situation: "My manager offered me a transfer.", actualChoice: "Stayed", regret: "" }],
  [{ birthDate: "1950-02-03", hometown: "Dayton, Ohio", university: "", major: "" }, { date: "1969-12", situation: "The draft lottery was coming.", actualChoice: "Waited", regret: "" }],
  [{ birthDate: "2001-07-21", gender: "여", hometown: "Austin, Texas", university: "University of Texas at Austin", major: "Computer Science" }, { date: "2019-03", situation: "College or a bootcamp.", actualChoice: "College", regret: "" }],
];

const HANGUL = /[가-힣]/;
// Latin words of three letters or more that are not names or acronyms; a Korean screen may still show names.
const ENGLISH = /\b(the|and|was|you|your|with|from|that|this|for|have|had|got|into)\b/i;

/** Plays one life and returns its numbers (language-free) and every text the player would read. */
function play(region: Region, lang: Lang, profile: Profile, tp: TurningPoint, i: number) {
  const texts: string[] = [];
  // The template persona is a sentence in the language, and temperament is read from its words; leave it out.
  const opening = { ...inRegion(region, () => fallbackOpening(profile, tp), lang), persona: "" };
  seed = 1000 + i;
  let life = createLife(profile, tp, opening, { region, lang });
  const picks: string[] = [];
  for (let guard = 0; guard < 2000 && !life.dead; guard++) {
    if (life.pending) {
      texts.push(life.pending.title, life.pending.scene, ...life.pending.options.map((o) => o.label));
      const id = autoPick(life) ?? life.pending.options[0].id;
      picks.push(id);
      life = resolveChoice(life, id);
    } else life = advanceUntilStop(life).state;
    texts.push(statusLabel(life), payLabel(life) ?? "", costLine(life) ?? "");
  }
  texts.push(lifeSummary(life) as unknown as string);
  for (const l of life.log) texts.push(l.text, l.reaction ?? "", l.tag ?? "", ...(l.facts ?? []));
  const numbers = (s: LifeState) =>
    JSON.stringify([s.deathAge, s.mi, s.stats, Math.round(s.wealth), s.income, picks, s.log.map((l) => `${l.mi}${l.kind}`), Object.entries(s.flags).filter(([, v]) => typeof v !== "string")]);
  // What the player typed (and the paths read from it) stays as typed, so it is taken out before looking for the
  // other language.
  const typed = [profile.name, profile.hometown, profile.high, profile.university, profile.major, tp.situation, tp.actualChoice, ...opening.choices.map((c) => c.label)].filter(Boolean).sort((a, b) => b.length - a.length);
  const strip = (t: string) => typed.reduce((x, u) => x.split(u).join(""), t);
  return { numbers: numbers(life), texts: texts.filter((t) => typeof t === "string" && t).map(strip) };
}

const n = Number(process.argv[2] ?? 12);
let bad = 0;
for (const [region, base, cases] of [["kr", KR_BASE, KR], ["us", US_BASE, US]] as const) {
  const wrong: Record<Lang, Map<string, number>> = { ko: new Map(), en: new Map() };
  let differ = 0;
  for (let i = 0; i < n; i++) {
    const [p, tp] = cases[i % cases.length];
    const profile = { ...base, ...p };
    const ko = play(region, "ko", profile, tp, i);
    const en = play(region, "en", profile, tp, i);
    if (ko.numbers !== en.numbers) {
      differ++;
      if (differ === 1) console.log(`${region} life ${i} differs by language:\n  ko ${ko.numbers.slice(0, 400)}\n  en ${en.numbers.slice(0, 400)}`);
    }
    for (const t of ko.texts) if (ENGLISH.test(t) && !HANGUL.test(t)) wrong.ko.set(t, (wrong.ko.get(t) ?? 0) + 1);
    for (const t of en.texts) if (HANGUL.test(t)) wrong.en.set(t, (wrong.en.get(t) ?? 0) + 1);
  }
  console.log(`${region}: ${differ}/${n} lives differ by language; texts in the wrong language: ko ${wrong.ko.size}, en ${wrong.en.size}`);
  for (const lang of ["ko", "en"] as const)
    for (const [t, c] of [...wrong[lang]].sort((a, b) => b[1] - a[1]).slice(0, Number(process.env.SHOW ?? 15))) { const at = Math.max(0, t.search(lang === "en" ? HANGUL : ENGLISH) - 60); console.log(`  ${region}×${lang} (${c}) ${at ? "…" : ""}${t.replace(/\n/g, " / ").slice(at, at + 160)}`); }
  bad += differ + wrong.ko.size + wrong.en.size;
}
process.exit(bad ? 1 : 0);
