// How often holding the step button stops for a big change (bigChange), and how far a hold runs between stops.
// Plays pool-only lives with 작은 선택은 맡기기 on; choices that ask the player take the first option.
// Run: npx tsx scripts/check-hold.ts [lives]
import { advanceTurn, asksPlayer, autoPick, createLife, resolveChoice } from "../src/lib/engine";
import { fallbackOpening } from "../src/lib/narrator/fallback";
import { bigChange } from "../src/lib/playUi";
import { Rng } from "../src/lib/rng";
import type { Gender, LifeState, Profile, TurningPoint } from "../src/lib/types";

const N = Number(process.argv[2] ?? 100);
const rng = new Rng(7);
const reasons = new Map<string, number>();
let stops = 0, choiceStops = 0, steps = 0;
for (let n = 0; n < N; n++) {
  const by = 1960 + Math.floor(rng.next() * 46);
  const profile: Profile = {
    name: "테스트", birthDate: `${by}-0${1 + Math.floor(rng.next() * 9)}-15`, gender: rng.pick<Gender>(["남", "여"]),
    hometown: "서울", elementary: "", middle: "", high: "", university: rng.pick(["부산대학교", ""]), major: "", family: "",
    mbti: "", personality: "", currentLife: "",
  };
  const tp: TurningPoint = { date: `${by + 12 + Math.floor(rng.next() * 24)}-03`, situation: "진로를 고민했다.", actualChoice: "원래 하던 대로 했다", regret: "" };
  let life: LifeState = createLife(profile, tp, fallbackOpening(profile, tp));
  for (let guard = 0; guard < 3000 && !life.dead; guard++) {
    if (life.pending) {
      if (asksPlayer(life.pending)) choiceStops++;
      life = resolveChoice(life, autoPick(life) ?? life.pending.options[0].id);
      continue;
    }
    const before = life;
    life = advanceTurn(life).state;
    steps++;
    const p = life.pending;
    if (p && !asksPlayer(p)) life = resolveChoice(life, autoPick(life) ?? p.options[0].id);
    const why = bigChange(before, life);
    if (why) {
      stops++;
      const k = why.length > 14 ? "(rare)" : why;
      reasons.set(k, (reasons.get(k) ?? 0) + 1);
    }
  }
}
console.log(`lives ${N}: steps/life ${(steps / N).toFixed(0)}, big-change stops/life ${(stops / N).toFixed(1)}, choice stops/life ${(choiceStops / N).toFixed(1)}`);
console.log(`steps between hold stops ≈ ${(steps / (stops + choiceStops)).toFixed(1)}`);
console.log([...reasons].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(v / N).toFixed(2)}`).join(" · "));
