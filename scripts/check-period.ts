// Checks that lives keep to their years (period.ts): no laptop in 1976, no 삼성전자 기흥공장 in 1967, 학력고사 before 수능.
// Plays Korean and American lives that start from the 1950s to the 1990s with template narration and auto-picked
// choices, and fails when any line of the feed or any choice names a thing from another time.
// Run: npm run check:period [-- <lives>]
import { advanceUntilStop, autoPick, createLife, fillMoment, fillScene, lifeFacts, pendingKeyOf, resolveChoice } from "../src/lib/engine";
import { pickCompany } from "../src/lib/catalog";
import { conflictIn } from "../src/lib/hybrid";
import { fallbackOpening } from "../src/lib/narrator/fallback";
import { promptFor } from "../src/lib/narrator/prompts";
import { anachronism, existedIn, periodFacts, periodize } from "../src/lib/period";
import { inRegion, type Region } from "../src/lib/region";
import { Rng } from "../src/lib/rng";
import type { Gender, LifeState, Profile, TurningPoint } from "../src/lib/types";

let failed = 0;
function check(ok: boolean, what: string) {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
}

// ── The table ──────────────────────────────────────────
check(!!anachronism("주말에도 노트북을 펴고 일했다.", 1975), "a laptop in 1975 is out of its time");
check(!anachronism("주말에도 노트북을 펴고 일했다.", 2005), "a laptop in 2005 is fine");
check(!!anachronism("삼성전자 기흥공장 생산라인에 들어갔다.", 1967), "삼성전자 기흥공장 in 1967 is out of its time");
check(!!anachronism("삼성전자에 입사했다.", 1967), "삼성전자 in 1967 (founded 1969) is out of its time");
check(!anachronism("삼성전자에 입사했다.", 1975), "삼성전자 in 1975 is fine");
check(!!anachronism("카톡 단톡방에 사진을 올렸다.", 2005), "KakaoTalk in 2005 is out of its time");
check(periodize("금성사에 입사했다.", 2005) === "LG전자에 입사했다." && periodize("LG전자에 입사했다.", 1985) === "금성사에 입사했다.", "금성사 and LG전자 follow the year both ways");
check(!anachronism("KB국민은행에 들렀다.", 2010) && !anachronism("SC제일은행 창구", 2010), "a new name that contains an old one is fine");
check(!anachronism("이어폰을 꽂고 걸었다.", 1985), "earphones are not a phone");
check(!anachronism("문자를 배웠다.", 1960), "learning letters (문자) is not texting");
check(!!anachronism("He texted her from his cell phone.", 1980), "English: a cell phone in 1980 is out of its time");
check(periodize("수능 성적표가 나왔다.", 1985) === "학력고사 성적표가 나왔다.", "수능 reads 학력고사 in 1985");
check(periodize("수능 성적표가 나왔다.", 1975) === "예비고사 성적표가 나왔다.", "수능 reads 예비고사 in 1975");
check(periodize("수능 성적표가 나왔다.", 2000) === "수능 성적표가 나왔다.", "수능 stays 수능 in 2000");
check(periodize("초등학교 입학식", 1980) === "국민학교 입학식", "초등학교 reads 국민학교 in 1980");
check(!existedIn("포항공과대학교", 1980) && existedIn("포항공과대학교", 1990), "POSTECH takes students from 1987");
check(periodFacts(1976).includes("노트북") && !periodFacts(2010).includes("노트북"), "the narrator's 시대 line lists a laptop as not yet in 1976 only");
for (const tier of ["field", "large", "it", "startup", "contract", "mid", "small", "public", "foreign"] as const) {
  const rng = new Rng(tier.length * 97);
  const names = new Set(Array.from({ length: 60 }, () => pickCompany(rng, tier, 1967, "")));
  const bad = [...names].filter((n) => anachronism(n, 1967));
  check(!bad.length, `1967 ${tier} employers all existed (${[...names].slice(0, 4).join(", ")}${bad.length ? `; bad: ${bad.join(", ")}` : ""})`);
}
inRegion("us", () => {
  check(!!anachronism("She posted it on Facebook.", 1990), "US: Facebook in 1990 is out of its time");
  check(!anachronism("She logged into Facebook.", 2023), "US: Facebook still exists after it was renamed Meta");
  const rng = new Rng(5);
  const bad = [...new Set(Array.from({ length: 80 }, () => pickCompany(rng, "it", 1972, "")))].filter((n) => anachronism(n, 1972));
  check(!bad.length, `US: 1972 tech employers all existed${bad.length ? ` (bad: ${bad.join(", ")})` : ""}`);
});

// ── The narrator's words ───────────────────────────────
const SINGLE: Partial<Profile> = { birthDate: "1950-03-03", gender: "남", hometown: "대구", university: "", major: "" };
const base: Profile = { name: "테스트", birthDate: "1950-01-01", gender: "남", hometown: "", elementary: "", middle: "", high: "", university: "", major: "", family: "", mbti: "ISTJ", personality: "성실하다.", currentLife: "" };
{
  const profile = { ...base, ...SINGLE };
  const tp: TurningPoint = { date: "1968-02", situation: "집안 형편이 어려워 대학을 포기할지 고민했다.", actualChoice: "공장에 취직했다", regret: "" };
  let life = createLife(profile, tp, fallbackOpening(profile, tp), { ai: true });
  check(lifeFacts(life).includes("시대: 1968년") && lifeFacts(life).includes("노트북"), "facts carry the 시대 line for the narrator");
  const prompt = promptFor({ kind: "opening", profile, turningPoint: tp, eraHints: [], age: 18 }).prompt;
  check(prompt.includes("시대: 1968년"), "the opening prompt carries the 시대 line");
  check(!!conflictIn("주말에도 노트북을 펴고 일했다.", life), "conflictIn drops a narrator's laptop in 1968");
  // A scene rewrite that names a laptop keeps the pool's scene.
  for (let g = 0; g < 400 && !life.pending?.options.length; g++) {
    if (life.pending) life = resolveChoice(life, autoPick(life) ?? "0");
    life = advanceUntilStop(life).state;
  }
  if (life.pending && !life.pending.slot) {
    const key = pendingKeyOf(life)!;
    const after = fillScene(life, key, { scene: "노트북을 열고 메일함을 확인했다.", labels: life.pending.options.map((o) => ({ id: o.id, label: "카톡으로 물어본다", place: "네이버" })) });
    check(after.pending!.scene === life.pending.scene && after.pending!.options.every((o, i) => o.label === life.pending!.options[i].label), "a scene rewrite from another time keeps the pool's words");
  } else if (life.pending?.slot) {
    const key = pendingKeyOf(life)!;
    const res = { title: "새 노트북", type: "daily", scene: "노트북을 샀다.", tone: "담담함", keywords: [], followUp: "", options: [{ label: "카톡을 보낸다", outcome: "답이 왔다.", stats: {}, money: 0, theme: "love", chance: 1, failure: "" }, { label: "유튜브를 본다", outcome: "웃었다.", stats: {}, money: 0, theme: "leisure", chance: 1, failure: "" }] };
    check(fillMoment(life, key, res as never) === null, "a moment from another time is not used");
  }
}

// ── Whole lives ────────────────────────────────────────
const TOWNS: Record<Region, string[]> = { kr: ["서울", "부산", "대구", "광주", "전주"], us: ["Columbus, Ohio", "Fresno, California", "Dayton, Ohio"] };
const SITUATIONS: Record<Region, string[]> = {
  kr: ["대학 진학을 고민했다.", "첫 직장을 고민했다.", "결혼을 앞두고 망설였다.", "공장에 취직할지 고민했다.", "서울로 올라갈지 고민했다."],
  us: ["I was choosing between college and a job at the plant.", "I was offered a transfer.", "I was thinking about getting married."],
};

function playLife(region: Region, rng: Rng): { life: LifeState; bad: string[] } {
  const birthYear = 1935 + Math.floor(rng.next() * 35); // 1935-1969
  const profile: Profile = {
    ...base,
    birthDate: `${birthYear}-${String(1 + Math.floor(rng.next() * 12)).padStart(2, "0")}-15`,
    gender: rng.pick<Gender>(["남", "여"]),
    hometown: rng.pick(TOWNS[region]),
    mbti: rng.pick(["ISTJ", "ENFP", "INTP", "ESFJ", ""]),
  };
  const tp: TurningPoint = { date: `${birthYear + 12 + Math.floor(rng.next() * 18)}-0${1 + Math.floor(rng.next() * 9)}`, situation: rng.pick(SITUATIONS[region]), actualChoice: region === "us" ? "Stayed put" : "원래대로 했다", regret: "" };
  const bad: string[] = [];
  const see = (text: string | undefined, mi: number) => {
    const year = Math.floor(mi / 12);
    const a = text && anachronism(text, year);
    if (a) bad.push(`${year}: ${a} ← ${text!.slice(0, 70)}`);
  };
  let life = inRegion(region, () => createLife(profile, tp, fallbackOpening(profile, tp), { region }));
  for (let guard = 0; guard < 3000 && !life.dead; guard++) {
    if (life.pending) {
      inRegion(region, () => {
        see(life.pending!.title, life.mi);
        see(life.pending!.scene, life.mi);
        for (const o of life.pending!.options) see(`${o.label} ${o.detail ?? ""}`, life.mi);
      });
      life = resolveChoice(life, autoPick(life) ?? life.pending.options[0]?.id ?? "0");
      continue;
    }
    life = advanceUntilStop(life).state;
  }
  // News is dated and written for its month; era lines are the opening's own text.
  inRegion(region, () => {
    for (const e of life.log) if (e.kind !== "news" && e.kind !== "era") see(e.text, e.mi);
  });
  return { life, bad };
}

const n = Number(process.argv[2] ?? 200);
for (const region of ["kr", "us"] as Region[]) {
  const rng = new Rng(region === "kr" ? 1976 : 1967);
  const bad: string[] = [];
  let lines = 0;
  for (let i = 0; i < n; i++) {
    const r = playLife(region, rng);
    lines += r.life.log.length;
    bad.push(...r.bad);
  }
  const counts = new Map<string, number>();
  for (const b of bad) counts.set(b, (counts.get(b) ?? 0) + 1);
  check(bad.length === 0, `${region}: ${n} lives born 1935-1969, ${lines} feed lines, ${bad.length} from another time`);
  for (const [b, c] of [...counts].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`     ${c}× ${b}`);
}

console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
if (failed) process.exit(1);
