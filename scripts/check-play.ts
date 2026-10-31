// The play screen's state and the facts its panels show (src/lib/playUi.ts), checked without a browser:
// the mode for every combination the screen can be in, a consequence read from real lives, milestones with and
// without the chapters older saves lack, the share card leaving out what is unticked, and the stat names.
// Run: npm run check:play
import { advanceUntilStop, autoPick, createLife, isBigChoice, resolveChoice } from "../src/lib/engine";
import { fallbackOpening } from "../src/lib/narrator/fallback";
import { consequenceOf, DEFAULT_SHARE, degreeLine, keyMilestones, markerFor, milestonesOf, playMode, shareText, stepLabel, stopsProgress, summaryOf, type ModeInput } from "../src/lib/playUi";
import { STAT_LABELS, type LifeState, type Profile, type TurningPoint } from "../src/lib/types";

const failures: string[] = [];
const check = (ok: unknown, msg: string) => {
  if (!ok) failures.push(msg);
};

// ── Modes ──
const base: ModeInput = { dead: false, presentOpen: false, consequence: false, pending: false, big: false, busy: false, auto: false, autoDecide: false };
const mode = (m: Partial<ModeInput>) => playMode({ ...base, ...m });
check(mode({}) === "timeline", "idle is timeline");
check(mode({ auto: true }) === "progressing", "auto is progressing");
check(mode({ pending: true }) === "decision", "a choice is decision");
check(mode({ pending: true, auto: true }) === "decision", "progress without 맡기기 hands the choice over");
check(mode({ pending: true, auto: true, autoDecide: true }) === "progressing", "a small choice under 맡기기 keeps progressing");
check(mode({ pending: true, auto: true, autoDecide: true, big: true }) === "decision", "a big fork always stops");
check(mode({ pending: true, busy: true }) === "submitting-choice", "reading own words is submitting");
check(mode({ consequence: true, pending: true }) === "consequence", "the result shows before a follow-up choice");
check(mode({ presentOpen: true, pending: true }) === "present", "the present card comes first");
check(mode({ dead: true, auto: true }) === "ending", "death ends");
check(stopsProgress(false, false) && stopsProgress(true, true) && !stopsProgress(true, false), "stopsProgress");
check(stepLabel(1) === "다음 달로" && stepLabel(3) === "3개월 뒤로" && stepLabel(12) === "1년 뒤로", "step labels");

// ── Terms ──
check(STAT_LABELS.knowledge === "지식", `stat label is 지식, got ${STAT_LABELS.knowledge}`);

// ── Lives ──
const profile: Profile = {
  name: "홍길동", birthDate: "1991-05-12", gender: "남", hometown: "대전", elementary: "", middle: "", high: "대전고", university: "충남대학교", major: "경영학",
  family: "", mbti: "INFP", personality: "신중하다.", currentLife: "회사원",
};
const tp: TurningPoint = { date: "2009-11", situation: "수능을 망쳤다.", actualChoice: "지방대에 갔다", regret: "" };

let consequences = 0;
let withChanges = 0;
for (let n = 0; n < 30; n++) {
  let life: LifeState = createLife(profile, tp, fallbackOpening(profile, tp));
  check(degreeLine(life) === undefined, "a high school senior has no degree line yet");
  for (let guard = 0; guard < 2000 && !life.dead; guard++) {
    if (life.pending) {
      const before = life;
      const big = isBigChoice(life.pending);
      life = resolveChoice(life, autoPick(life) ?? life.pending.options[0].id);
      const c = consequenceOf(before, life);
      check(c, "a resolved choice has a consequence");
      if (!c) continue;
      consequences++;
      if (c.changes.length || c.events.length) withChanges++;
      // Every number shown is the life's own: after equals the life's stats now, and the diff adds up.
      for (const s of c.stats) {
        check(s.to === life.stats[s.key] && s.from === before.stats[s.key] && s.to - s.from === s.diff, `stat ${s.key} ${s.from}→${s.to} matches the life`);
      }
      check(c.picked === life.choices.at(-1)!.picked, "picked is the recorded choice");
      if (big) check(c.title === life.choices.at(-1)!.title, "title is the recorded title");
      continue;
    }
    life = advanceUntilStop(life).state;
  }
  check(degreeLine(life)?.startsWith("학력 · "), `an adult has a degree line: ${degreeLine(life)}`);
  // No consequence when nothing was chosen.
  check(consequenceOf(life, life) === null, "no consequence without a choice");
  const ms = milestonesOf(life);
  check(ms[0].kind === "start", "milestones start at the turning point");
  check(ms.every((m, i) => i === 0 || ms[i - 1].mi <= m.mi), "milestones in order");
  check((life.chapters?.length ?? 0) > 0, "chapters recorded");
  check(life.chapters!.every((c) => c.at <= life.log.length && c.items.length > 0), "chapters point into the log");
  check(keyMilestones(life, 4).length <= 4, "key milestones capped");
  // A save from before chapters existed: milestones come from the choices.
  const old = { ...life, chapters: undefined };
  const oldMs = milestonesOf(old);
  check(oldMs.length >= Math.min(1, life.choices.length) && oldMs.some((m) => m.kind === "choice" || life.choices.length <= 1), "old saves fall back to choices");
  const sum = summaryOf(life);
  check(sum.bornYear === 1991 && sum.age === life.deathAge, "summary years and age");
  // The share card leaves out the name and wealth unless ticked, and always masks nothing it was not given.
  const text = shareText(life, "한 줄", DEFAULT_SHARE, "https://whatif.damoai.net");
  check(!text.includes("홍길동"), "name left out by default");
  check(!text.includes("남긴 자산"), "wealth left out by default");
  check(shareText(life, "한 줄", { ...DEFAULT_SHARE, name: true }, "x").includes("홍길동"), "name in when ticked");
}
check(consequences > 100, `played enough choices (${consequences})`);
check(withChanges > 10, `some choices change the life (${withChanges})`);

// ── Markers ──
check(markerFor(10, [5, 9, 12, 20]) === 12, "next marker at or after");
check(markerFor(10, [5, 10]) === 10, "exact marker");
check(markerFor(30, [5, 10]) === 10, "past the end goes to the last");
check(markerFor(3, []) === null, "no markers");

if (failures.length) {
  console.log(`check:play FAILED (${failures.length})`);
  for (const f of [...new Set(failures)].slice(0, 20)) console.log(`  ${f}`);
  process.exitCode = 1;
} else console.log(`check:play ok · ${consequences} choices, ${withChanges} with life changes`);
