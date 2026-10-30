// Fixed monthly costs of an adult American life (engine units: 1 = $10). The Korean version is src/lib/budget.ts.
// Rough 2025-26 figures: rent from Census ACS, health premiums (employee share) from KFF, childcare and kids from
// USDA and Child Care Aware, car costs from AAA. A young adult moves out at 18-22 unless still in school.
import type { LifeState } from "../../lib/types";

type Add = (label: string, amount: number) => void;

export function usMonthlyCosts(s: LifeState, age: number, add: Add, ctx: { atHome: boolean; married: boolean; mortgageRate: number }) {
  const f = s.flags;
  // Pitched so a single hourly worker about breaks even and a married couple with a child keeps a little, as in Korea.
  if (ctx.atHome) add("Living costs (at your parents')", f.employed ? 50 : 30);
  else {
    add("Food and living costs", f.retired ? (ctx.married ? 150 : 100) : ctx.married ? 190 : 120);
    if (f.homeOwner) add("Property tax and insurance", 35);
    else add("Rent", ctx.married ? (f.children ? 160 : 140) : 110);
    // A car is part of almost every American adult life; retirees drive less.
    add("Car payment, gas and insurance", f.retired ? 30 : ctx.married ? 70 : 50);
  }
  if (f.homeOwner && f.mortgage) add("Mortgage interest", (f.mortgage * ctx.mortgageRate) / 12);

  // Health insurance: the employee's share at work; marketplace or none without a job; Medicare from 65.
  const family = ctx.married || f.children > 0;
  if (age >= 65) add("Medicare premiums", 20);
  else if (f.employed && !f.retired) add("Health insurance (your share)", family ? 45 : 15);
  else if (!ctx.atHome) add("Health insurance (marketplace)", family ? 90 : 45);

  // Student loans need no line of their own: tuition comes out of savings while enrolled, so a degree paid for on
  // credit shows as debt (negative net worth) that the paychecks then pay down.

  // Children: daycare is the big one; then school-age costs; college for those 18 to 21.
  const kidAges = f.kidsBorn?.length === f.children ? f.kidsBorn.map((b) => (s.mi - b) / 12) : Array(f.children).fill(10);
  let care = 0;
  let school = 0;
  let college = 0;
  for (const a of kidAges) {
    if (a < 5) care += 90;
    else if (a < 13) {
      care += 45;
      school += 15;
    } else if (a < 18) {
      care += 55;
      school += 20;
    } else if (a < 22) college += 100;
  }
  add("Childcare and kids' costs", care);
  add("Activities, camps and tutoring", school);
  add("Kids' college", college);

  // One's own tuition while classes run; parents and grants cover half until 22.
  const enrolled = (f.education === "university" || f.education === "graduate") && s.mi <= f.eduUntil && s.mi >= (f.eduFrom ?? 0);
  if (enrolled && f.tuition) add(age <= 22 ? "Tuition (half from parents and grants)" : "Tuition", (f.tuition / 12) * (age <= 22 ? 0.5 : 1));
}
