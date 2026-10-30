// What the play screen draws: the era and season around this life, and how the person looks right now.
// Everything comes from the life's state, so the picture never disagrees with the story.
import { tierOf } from "./catalog";
import { ageOf } from "./events";
import type { LifeState } from "./types";
import { inService, retaking } from "./timeline";
import { ownsBusiness } from "./work";
import { L } from "./i18n";

export type Era = "old" | "apartment" | "highrise" | "future";
export type Season = "spring" | "sunny" | "rain" | "autumn" | "snow";
export type Outfit = "kid" | "uniform" | "military" | "suit" | "work" | "apron" | "casual" | "retired";
export type Mood = "happy" | "plain" | "sad";
export type Look = "m" | "f" | "x";

export interface Person {
  age: number;
  look: Look;
  outfit: Outfit;
  mood: Mood;
  pale: boolean;
}

export interface SceneState {
  year: number;
  month: number;
  era: Era;
  season: Season;
  me: Person;
  spouse: Person | null;
  kids: Person[]; // youngest last; babies ride in a stroller
  pet: boolean;
  home: boolean;
  store: string | null; // sign on the shop when this person runs one
}


export function eraOf(year: number): Era {
  if (year < 1990) return "old";
  if (year < 2010) return "apartment";
  if (year < 2027) return "highrise";
  return "future";
}

export function seasonOf(month: number): Season {
  if (month >= 3 && month <= 5) return "spring";
  if (month === 7) return "rain"; // 장마
  if (month >= 6 && month <= 8) return "sunny";
  if (month >= 9 && month <= 11) return "autumn";
  return "snow";
}

const moodOf = (happiness: number): Mood => (happiness >= 60 ? "happy" : happiness >= 35 ? "plain" : "sad");

function outfitOf(s: LifeState, age: number): Outfit {
  const f = s.flags;
  if (inService(s)) return "military";
  if (f.education === "school") return age < 13 ? "kid" : "uniform";
  if (f.education === "highschool") return retaking(s) ? "casual" : "uniform";
  if (f.education === "university" || f.education === "graduate") return "casual";
  if (f.retired || (!f.employed && age >= 65)) return "retired";
  if (!f.employed) return "casual";
  if (ownsBusiness(f)) return "apron";
  const tier = tierOf(f.company);
  if (tier === "field" || tier === "contract" || /생산|기사|기술|현장|정비|배달|기능/.test(f.job)) return "work";
  if (tier === "it" || tier === "startup") return "casual";
  return "suit";
}

function lookOf(gender: string): Look {
  return gender === "남" ? "m" : gender === "여" ? "f" : "x";
}

/** Grown children stay in the picture until they leave home. */
const KID_LEAVES = 28;

export function sceneOf(s: LifeState): SceneState {
  const year = Math.floor(s.mi / 12);
  const month = (s.mi % 12) + 1;
  const age = ageOf(s);
  const f = s.flags;
  const look = lookOf(s.profile.gender);
  const me: Person = { age, look, outfit: outfitOf(s, age), mood: moodOf(s.stats.happiness), pale: s.stats.health < 35 };
  const together = f.partner === "married" || f.partner === "dating";
  const spouse: Person | null = together
    ? {
        age,
        look: look === "m" ? "f" : look === "f" ? "m" : "x",
        outfit: age >= 65 ? "retired" : "casual",
        // The partner mirrors the home's mood more softly.
        mood: moodOf(Math.min(100, s.stats.relationships + 10)),
        pale: false,
      }
    : null;
  const born = f.kidsBorn?.length === f.children ? f.kidsBorn : Array.from({ length: f.children }, () => s.mi - 6 * 12);
  const kids = born
    .map((b, i): Person => {
      const a = Math.max(0, Math.floor((s.mi - b) / 12));
      return { age: a, look: i % 2 ? "f" : "m", outfit: a < 7 ? "kid" : a < 19 ? (a < 13 ? "kid" : "uniform") : "casual", mood: "happy", pale: false };
    })
    .filter((k) => k.age < KID_LEAVES)
    .slice(-3);
  const store = ownsBusiness(f) ? shortSign(f.company) : null;
  return { year, month, era: eraOf(year), season: seasonOf(month), me, spouse, kids, pet: !!f.pet, home: f.homeOwner, store };
}

function shortSign(company: string | undefined): string {
  const name = (company ?? "").replace(/\(.*?\)/g, "").trim();
  if (!name) return L("내 가게");
  return name.length > 6 ? `${name.slice(0, 5)}…` : name;
}
