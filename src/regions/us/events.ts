// Life forks and moments that only happen in an American life: applying to college, enlisting, the draft lottery,
// a driver's license at sixteen, health insurance, moving states, and the big American moments of each era.
// Written in English, shown through T (Korean in src/locales/ko); money in engine units of $10. Korean-only events are listed in KR_ONLY (events.ts).
import { DEGREE_RANK } from "../../lib/catalog";
import { formatWealth } from "../../lib/format";
import { degreeOnLeaving } from "../../lib/education";
import type { EventDef } from "../../lib/events";
import { inService, retaking } from "../../lib/timeline";
import type { LifeState } from "../../lib/types";
import { employee, ownsBusiness } from "../../lib/work";
import { T } from "../../lib/i18n";

const year = (s: LifeState) => Math.floor(s.mi / 12);
const month = (s: LifeState) => (s.mi % 12) + 1;
const age = (s: LifeState) => {
  const [y, m] = s.profile.birthDate.split("-").map(Number);
  return Math.floor((s.mi - (y * 12 + (m - 1))) / 12);
};
const knowledgeOdds = (base: number) => (s: LifeState) => Math.min(0.9, Math.max(0.1, base + (s.stats.knowledge - 50) / 100));
const male = (s: LifeState) => /^(남|male|man|m)$/i.test(s.profile.gender);

/** Forks that always play as written (like CORE_EVENTS). */
export const US_CORE_EVENTS: EventDef[] = [
  {
    id: "college-apps",
    region: "us",
    get title() { return T("College decisions"); },
    minAge: 17,
    maxAge: 21,
    perYear: 1,
    // Senior spring, or the spring after a gap year. At most two gap years.
    when: (s) => s.flags.education === "highschool" && s.mi % 12 >= 2 && s.mi % 12 <= 4 && (s.flags.retaking === undefined || s.mi >= s.flags.retaking),
    intro: (s) =>
      retaking(s)
        ? T("The envelopes from your second round of applications are in. This time you have to decide.")
        : T("Senior spring. The college letters are in, thick envelopes and thin ones. Time to decide what comes after high school."),
    choices: [
      {
        id: "university",
        get label() { return T("Go to the best college that took me"); },
        when: (s) => !retaking(s),
        effect: { get text() { return T("Sent in the deposit and bought a dorm comforter."); }, stats: { knowledge: 5, happiness: 3 }, flags: { education: "university" }, eduYears: 4, enroll: { level: "university", pick: "fit" } },
      },
      {
        id: "retake-apply",
        get label() { return T("Accept an offer from this round"); },
        when: retaking,
        effect: {
          get text() { return T("Opened the last of the letters."); },
          risk: {
            chance: knowledgeOdds(0.5),
            success: { get text() { return T("The year off paid off: a better school said yes."); }, stats: { knowledge: 10, happiness: 12 }, flags: { education: "university" }, eduYears: 4, enroll: { level: "university", pick: "better" } },
            failure: { get text() { return T("No dream school this time either, but a place is a place."); }, stats: { knowledge: 4, happiness: -5 }, flags: { education: "university" }, eduYears: 4, enroll: { level: "university", pick: "fit" } },
          },
        },
      },
      {
        id: "community-college",
        get label() { return T("Start at community college and transfer later"); },
        when: (s) => !retaking(s),
        effect: { get text() { return T("Signed up for classes at the community college. Cheaper, closer to home, and a plan to transfer."); }, stats: { knowledge: 3, happiness: 1 }, wealth: 300, flags: { education: "university" }, eduYears: 4, enroll: { level: "university", pick: "fit" } },
      },
      {
        id: "retake",
        label: (s) => (retaking(s) ? T("Take one more year and apply again") : T("Take a gap year and reapply")),
        when: (s) => (s.flags.retakes ?? 0) < 2,
        effect: { get text() { return T("Decided to work for a year, retake the SAT and apply again."); }, stats: { happiness: -6 }, intense: 6, retake: true },
      },
      {
        id: "enlist",
        get label() { return T("Enlist in the military"); },
        when: (s) => !inService(s) && s.flags.serviceUntil === undefined,
        effect: { get text() { return T("Signed the papers at the recruiting office. The GI Bill would pay for college later."); }, stats: { health: 4, happiness: -2, relationships: 2 }, flags: { education: "done" }, enlist: true },
      },
      {
        id: "work",
        get label() { return T("Skip college and start working"); },
        effect: { get text() { return T("Went straight to work while friends left for campus."); }, stats: { knowledge: -2, happiness: 2 }, flags: { education: "done" }, hire: { tier: "field" } },
      },
    ],
  },
  {
    id: "draft-lottery",
    region: "us",
    get title() { return T("The draft lottery"); },
    minAge: 18,
    maxAge: 26,
    perYear: 1,
    once: true,
    // December 1969 to 1972: birthdays drawn on live TV decided who went to Vietnam.
    when: (s) => male(s) && !inService(s) && s.flags.serviceUntil === undefined && year(s) >= 1969 && year(s) <= 1972 && (year(s) > 1969 || month(s) === 12),
    get intro() { return T("The draft lottery is on TV tonight. Capsules with birthdays are pulled one by one. A low number means Vietnam."); },
    choices: [
      {
        id: "wait",
        get label() { return T("Wait for the number and take what comes"); },
        effect: {
          get text() { return T("Watched the drawing with the whole family in silence."); },
          risk: {
            chance: () => 0.6,
            success: { get text() { return T("A high number. The family exhaled for the first time in months."); }, stats: { happiness: 8 } },
            failure: { get text() { return T("A low number. The induction notice came within weeks."); }, stats: { happiness: -10, health: -2 }, enlist: true },
          },
        },
      },
      {
        id: "enlist-early",
        get label() { return T("Enlist first, to choose the branch"); },
        effect: { get text() { return T("Joined the Navy before the Army could call. At least it would be a ship, not a jungle."); }, stats: { happiness: -4, relationships: 2 }, enlist: true },
      },
      {
        id: "school-deferment",
        get label() { return T("Stay in school for the deferment"); },
        when: (s) => s.flags.education === "university" || s.flags.education === "graduate",
        effect: { get text() { return T("Kept the student deferment and kept studying, glad and a little guilty."); }, stats: { knowledge: 4, happiness: -2 } },
      },
    ],
  },
  {
    id: "us-enlist-offer",
    region: "us",
    get title() { return T("The recruiter"); },
    minAge: 18,
    maxAge: 24,
    perYear: 0.04, // about one in ten young Americans has served; the college-decision fork offers it too
    once: true,
    when: (s) => !inService(s) && s.flags.serviceUntil === undefined && (s.flags.education === "done" || s.flags.education === "highschool") && !ownsBusiness(s.flags),
    get intro() { return T("A recruiter at the mall talks about signing bonuses, paid college and getting out of this town."); },
    choices: [
      { id: "enlist", get label() { return T("Sign up"); }, effect: { get text() { return T("Shipped out to basic training a few months later."); }, stats: { health: 4, happiness: -3, relationships: 2 }, flags: { employed: false, job: "" }, income: 0, enlist: true } },
      { id: "no", get label() { return T("Thank them and walk away"); }, effect: { get text() { return T("Took the pamphlet and threw it away at home."); }, stats: { happiness: 1 } } },
    ],
  },
  {
    id: "health-bill",
    region: "us",
    get title() { return T("The hospital bill"); },
    minAge: 20,
    maxAge: 64,
    perYear: 0.06,
    cooldown: 120,
    when: (s) => !s.flags.retired,
    intro: (s) =>
      employee(s.flags)
        ? T("An ER visit and two days in the hospital. Weeks later the bill arrives: insurance paid part of it, and the rest is yours.")
        : T("An ER visit and two days in the hospital, without good insurance. The bill is longer than the stay was."),
    choices: [
      {
        id: "pay",
        get label() { return T("Pay it off from savings"); },
        effect: { get text() { return T("Paid it and felt the savings account shrink."); }, stats: { happiness: -4 }, wealth: -350, note: "Hospital bill" },
      },
      {
        id: "negotiate",
        get label() { return T("Call the billing office and negotiate"); },
        effect: {
          get text() { return T("Spent three afternoons on hold with the billing office."); },
          risk: {
            chance: (s) => Math.min(0.8, 0.4 + s.stats.knowledge / 200),
            success: { get text() { return T("They cut the bill by more than half and set up a payment plan."); }, stats: { happiness: 3, knowledge: 2 }, wealth: -150, note: "Hospital bill (negotiated)" },
            failure: { get text() { return T("They would not budge. The bill went to collections before it was paid."); }, stats: { happiness: -6 }, wealth: -400, note: "Hospital bill and fees" },
          },
        },
      },
    ],
  },
  {
    id: "move-states",
    region: "us",
    get title() { return T("A job in another state"); },
    minAge: 24,
    maxAge: 55,
    perYear: 0.12,
    cooldown: 96,
    when: (s) => employee(s.flags) && s.mi >= s.flags.busyUntil,
    intro: (s) => T`${s.flags.company ? T`A rival of ${s.flags.company}` : T("A company")} two thousand miles away offers a bigger title and a relocation package. ${s.flags.partner === "married" ? T("Your spouse would have to start over too.") : T("Everyone you know is here.")}`,
    theme: "career",
    choices: [
      { id: "move", get label() { return T("Pack up and move"); }, effect: { get text() { return T("Loaded the moving truck and drove across the country."); }, stats: { happiness: 4, relationships: -8, knowledge: 3 }, switchJob: { payPct: 1.2 } } },
      { id: "stay", get label() { return T("Stay where life already is"); }, effect: { get text() { return T("Turned it down and stayed close to the people who mattered."); }, stats: { relationships: 5, happiness: -1 } } },
    ],
  },
  {
    id: "retire-us",
    region: "us",
    get title() { return T("Social Security"); },
    minAge: 62,
    maxAge: 70,
    perYear: 0.5,
    once: true,
    when: (s) => employee(s.flags) && !s.flags.retired,
    get intro() { return T("You can start Social Security now at a smaller check, or keep working and wait for the full amount."); },
    choices: [
      { id: "now", get label() { return T("Retire and claim it now"); }, effect: { get text() { return T("Cleaned out the desk. The first Social Security deposit came the next month."); }, stats: { happiness: 8, health: 3 }, flags: { retired: true, employed: false }, income: 180 } },
      { id: "wait", get label() { return T("Keep working a few more years"); }, effect: { get text() { return T("Decided to keep going; the bigger check could wait."); }, stats: { happiness: -2 }, incomePct: 1 } },
    ],
  },
  {
    id: "us-graduation-debt",
    region: "us",
    get title() { return T("Student loans"); },
    minAge: 21,
    maxAge: 35,
    perYear: 1,
    once: true,
    when: (s) => s.flags.education === "done" && s.wealth < -1500 && DEGREE_RANK[degreeOnLeaving(s)] >= DEGREE_RANK.bachelor && s.flags.employed,
    intro: (s) => T`The first student loan statement arrives. The balance is ${formatWealth(-s.wealth)}.`,
    choices: [
      { id: "aggressive", get label() { return T("Live like a student and pay it off fast"); }, effect: { get text() { return T("Kept the roommates and the old car, and threw every spare dollar at the loans."); }, stats: { happiness: -4, knowledge: 1 }, wealth: 300 } },
      { id: "minimum", get label() { return T("Pay the minimum and live a little"); }, effect: { get text() { return T("Set the loans on autopay and got an apartment of your own."); }, stats: { happiness: 4 } } },
    ],
  },
];

/** Everyday and era moments of an American life. */
export const US_MORE_EVENTS: EventDef[] = [
  {
    id: "us-drivers-license",
    region: "us",
    get title() { return T("Driver's license"); },
    category: "daily",
    get keywords() { return [T("driver's license")]; },
    minAge: 16,
    maxAge: 18,
    perYear: 0.8,
    once: true,
    intro: "",
    effect: { get text() { return T("Passed the driving test at the DMV and drove around the block alone for the first time."); }, get alt() { return [T("Failed parallel parking once, then passed the driving test on the second try.")]; }, stats: { happiness: 4, knowledge: 1 } },
  },
  {
    id: "us-prom",
    region: "us",
    get title() { return T("Prom"); },
    category: "relation",
    keywords: ["prom"],
    minAge: 16,
    maxAge: 18,
    perYear: 0.5,
    once: true,
    when: (s) => s.flags.education === "school" || s.flags.education === "highschool",
    intro: "",
    effect: { get text() { return T("Went to prom in a rented tux and borrowed shoes. The photos were awkward and perfect."); }, get alt() { return [T("Went to prom with a group of friends instead of a date and danced until they turned on the lights.")]; }, stats: { happiness: 5, relationships: 4 }, wealth: -30 },
  },
  {
    id: "us-thanksgiving",
    region: "us",
    get title() { return T("Thanksgiving"); },
    category: "relation",
    get keywords() { return [T("Thanksgiving")]; },
    minAge: 20,
    maxAge: 90,
    perYear: 0.2,
    cooldown: 36,
    when: (s) => month(s) === 11,
    intro: "",
    effect: { get text() { return T("Drove home for Thanksgiving through airport-level traffic. An uncle argued about politics over the pie."); }, get alt() { return [T("Hosted Thanksgiving for the first time. The turkey was dry and nobody minded.")]; }, stats: { relationships: 3, happiness: 2 }, wealth: -20 },
  },
  {
    id: "us-moon-landing",
    region: "us",
    get title() { return T("The Moon landing"); },
    category: "era",
    get keywords() { return [T("Apollo 11")]; },
    minAge: 4,
    maxAge: 90,
    perYear: 6,
    once: true,
    when: (s) => year(s) === 1969 && month(s) === 7,
    intro: "",
    effect: { get text() { return T("The whole neighborhood crowded around one TV to watch a man step onto the Moon."); }, stats: { happiness: 4, knowledge: 2 } },
  },
  {
    id: "us-gas-lines",
    region: "us",
    get title() { return T("Gas lines"); },
    category: "era",
    get keywords() { return [T("oil crisis")]; },
    minAge: 17,
    maxAge: 90,
    perYear: 3,
    once: true,
    when: (s) => (year(s) === 1974 && month(s) <= 3) || (year(s) === 1979 && month(s) >= 5 && month(s) <= 8),
    intro: "",
    effect: { get text() { return T("Waited an hour in a gas line on an odd-numbered day. Prices kept climbing."); }, stats: { happiness: -2 }, wealth: -20 },
  },
  {
    id: "us-challenger",
    region: "us",
    get title() { return T("Challenger"); },
    category: "era",
    get keywords() { return [T("Challenger")]; },
    minAge: 6,
    maxAge: 90,
    perYear: 6,
    once: true,
    when: (s) => year(s) === 1986 && month(s) === 1,
    intro: "",
    effect: { text: (s) => (age(s) < 18 ? T("The class watched the Challenger launch on a TV wheeled into the room. The teacher turned it off without a word.") : T("Watched the Challenger break apart on the news, over and over.")), stats: { happiness: -3 } },
  },
  {
    id: "us-black-monday",
    region: "us",
    get title() { return T("Black Monday"); },
    category: "era",
    get keywords() { return [T("stock market crash")]; },
    minAge: 25,
    maxAge: 90,
    perYear: 6,
    once: true,
    when: (s) => year(s) === 1987 && month(s) === 10 && s.wealth > 2000,
    intro: "",
    effect: { get text() { return T("The market fell 22% in one day. The 401(k) statement was hard to look at."); }, stats: { happiness: -4 }, wealthPct: -0.08 },
  },
  {
    id: "us-y2k",
    region: "us",
    get title() { return T("Y2K"); },
    category: "era",
    get keywords() { return [T("Y2K")]; },
    minAge: 10,
    maxAge: 90,
    perYear: 6,
    once: true,
    when: (s) => year(s) === 1999 && month(s) === 12,
    intro: "",
    effect: { get text() { return T("Stocked up on bottled water for Y2K. At midnight the lights stayed on and everyone laughed a little."); }, stats: { happiness: 2 }, wealth: -10 },
  },
  {
    id: "us-911",
    region: "us",
    get title() { return T("September 11"); },
    category: "era",
    keywords: ["9/11"],
    minAge: 6,
    maxAge: 95,
    perYear: 12,
    once: true,
    when: (s) => year(s) === 2001 && month(s) === 9,
    intro: "",
    effect: { get text() { return T("Watched the towers fall on live TV. Called everyone you loved that night."); }, stats: { happiness: -6, relationships: 3 } },
  },
  {
    id: "us-foreclosure",
    region: "us",
    get title() { return T("Underwater"); },
    category: "era",
    get keywords() { return [T("housing crash")]; },
    minAge: 25,
    maxAge: 90,
    perYear: 3,
    once: true,
    when: (s) => s.flags.homeOwner && (year(s) === 2008 || year(s) === 2009),
    get intro() { return T("The house is now worth less than the mortgage. Neighbors are walking away from theirs."); },
    choices: [
      { id: "hold", get label() { return T("Keep paying and wait it out"); }, effect: { get text() { return T("Kept making the payments on a house worth a third less."); }, stats: { happiness: -5 }, homeValuePct: -0.3 } },
      {
        id: "sell",
        get label() { return T("Sell at a loss and rent"); },
        effect: { get text() { return T("Sold for less than was owed and moved into a rental."); }, stats: { happiness: -8 }, homeValuePct: -0.3, flags: { homeOwner: false, mortgage: 0, homeValue: 0 } },
      },
    ],
  },
  {
    id: "us-stimulus",
    region: "us",
    get title() { return T("The stimulus check"); },
    category: "era",
    get keywords() { return [T("stimulus check"), T("COVID-19")]; },
    minAge: 18,
    maxAge: 95,
    perYear: 12,
    once: true,
    when: (s) => year(s) === 2020 && month(s) >= 4 && month(s) <= 5,
    intro: "",
    effect: { get text() { return T("A $1,200 stimulus check landed in the bank account. Toilet paper was still hard to find."); }, stats: { happiness: 2 }, wealth: 120 },
  },
  {
    id: "us-remote-work",
    region: "us",
    get title() { return T("Working from home"); },
    category: "era",
    get keywords() { return [T("Zoom"), T("COVID-19")]; },
    minAge: 20,
    maxAge: 70,
    perYear: 6,
    once: true,
    when: (s) => employee(s.flags) && year(s) === 2020 && month(s) >= 3 && month(s) <= 6,
    intro: "",
    effect: { get text() { return T("The office closed 'for two weeks.' The kitchen table became a desk for the next two years."); }, stats: { happiness: -1, relationships: 2 } },
  },
  {
    id: "us-great-resignation",
    region: "us",
    get title() { return T("The Great Resignation"); },
    category: "era",
    keywords: ["quitting"],
    minAge: 22,
    maxAge: 60,
    perYear: 0.8,
    once: true,
    when: (s) => employee(s.flags) && (year(s) === 2021 || year(s) === 2022),
    get intro() { return T("Everyone seems to be quitting. Recruiters message daily with offers well above your pay."); },
    theme: "career",
    choices: [
      { id: "jump", get label() { return T("Take the best offer"); }, effect: { get text() { return T("Quit by email on a Friday and started somewhere new on Monday."); }, stats: { happiness: 4 }, switchJob: { payPct: 1.18 } } },
      { id: "stay", get label() { return T("Stay put and ask for a raise"); }, effect: { get text() { return T("Asked for a raise and got a smaller one than hoped."); }, stats: { happiness: 1 }, incomePct: 1.06 } },
    ],
  },
  {
    id: "us-meme-stocks",
    region: "us",
    get title() { return T("Meme stocks"); },
    category: "era",
    get keywords() { return [T("GameStop"), "crypto"]; },
    minAge: 18,
    maxAge: 60,
    perYear: 2,
    once: true,
    when: (s) => year(s) === 2021 && month(s) <= 4 && s.wealth > 200,
    get intro() { return T("Friends are posting screenshots of GameStop and Dogecoin gains. It is all anyone talks about."); },
    theme: "risk",
    choices: [
      {
        id: "buy",
        get label() { return T("Put in a few thousand dollars"); },
        effect: {
          get text() { return T("Downloaded a trading app and bought at what felt like the bottom."); },
          risk: {
            chance: () => 0.35,
            success: { get text() { return T("Sold near the top and laughed the whole way to the bank."); }, stats: { happiness: 8 }, wealth: 400 },
            failure: { get text() { return T("Held too long. Most of it was gone by summer."); }, stats: { happiness: -5 }, wealth: -250 },
          },
        },
      },
      { id: "skip", get label() { return T("Watch from the sidelines"); }, effect: { get text() { return T("Stayed out and quietly wondered."); }, stats: { happiness: -1 } } },
    ],
  },
];
