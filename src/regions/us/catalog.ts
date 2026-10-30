// American employers, schools, pay and homes for a life in the US. Same shape and tiers as the Korean catalog
// (src/lib/catalog.ts), so the engine treats both alike. Money is in engine units: 1 unit = $10 in today's dollars,
// so a $70,000 salary is 7000. Sources: BLS OEWS wages, College Board tuition, Census/FHFA home values (2025-26).
import type { CompanyTier, SchoolTier } from "../../lib/catalog";

interface Company {
  name: string;
  tier: CompanyTier;
  since?: number;
  until?: number; // last year it hired under this name
  fields?: RegExp;
}

const TECH = /computer|software|information|data|AI|artificial|programming|IT|electrical|electronics|engineering|math/i;
const ENG = /engineering|mechanical|electrical|chemical|materials|industrial|civil|architecture|aerospace|energy/i;
const BIZ = /business|economics|accounting|finance|marketing|statistics|management/i;
const MEDIA = /media|journalism|communications|film|design|art|advertising|english|game/i;
const BIO = /biology|chemistry|biochem|pharmacy|nursing|health|pre-?med|neuroscience/i;

export const US_COMPANIES: Company[] = [
  { name: "General Electric", tier: "large", fields: ENG },
  { name: "Ford Motor Company", tier: "large", fields: /mechanical|industrial|engineering|business/i },
  { name: "General Motors", tier: "large", fields: /mechanical|industrial|engineering|business/i },
  { name: "Procter & Gamble", tier: "large", fields: /marketing|business|chemical/i },
  { name: "JPMorgan Chase", tier: "large", since: 2000, fields: BIZ },
  { name: "Bank of America", tier: "large", since: 1998, fields: BIZ },
  { name: "Boeing", tier: "large", fields: /aerospace|mechanical|engineering/i },
  { name: "Johnson & Johnson", tier: "large", fields: BIO },
  { name: "Pfizer", tier: "large", fields: BIO },
  { name: "ExxonMobil", tier: "large", since: 1999, fields: /chemical|petroleum|geology|engineering/i },
  { name: "Walmart corporate office", tier: "large", since: 1975, fields: /business|logistics|data/i },
  { name: "Lockheed Martin", tier: "large", since: 1995, fields: /aerospace|electrical|engineering|computer/i },
  { name: "AT&T", tier: "large", fields: /electrical|computer|business/i },
  { name: "Coca-Cola", tier: "large", fields: /marketing|business/i },
  { name: "IBM", tier: "it", fields: TECH },
  { name: "Microsoft", tier: "it", since: 1978, fields: TECH },
  { name: "Apple", tier: "it", since: 1978, fields: /computer|design|electrical|engineering/i },
  { name: "Intel", tier: "it", since: 1970, fields: /electrical|computer|materials|physics/i },
  { name: "Google", tier: "it", since: 1999, fields: TECH },
  { name: "Amazon", tier: "it", since: 1996, fields: /computer|data|business|logistics/i },
  { name: "Meta", tier: "it", since: 2022, fields: TECH },
  { name: "Facebook", tier: "it", since: 2005, until: 2021, fields: TECH },
  { name: "NVIDIA", tier: "it", since: 1995, fields: /electrical|computer|AI|math/i },
  { name: "Netflix", tier: "it", since: 2003, fields: /computer|data|media/i },
  { name: "Hewlett-Packard", tier: "it", fields: TECH },
  { name: "McKinsey & Company", tier: "foreign", fields: BIZ },
  { name: "Deloitte", tier: "foreign", since: 1989, fields: /accounting|business|finance|computer/i },
  { name: "Goldman Sachs", tier: "foreign", fields: /finance|economics|math|computer/i },
  { name: "Morgan Stanley", tier: "foreign", fields: /finance|economics|math/i },
  { name: "Boston Consulting Group", tier: "foreign", since: 1975, fields: BIZ },
  { name: "Skadden, Arps (law firm)", tier: "foreign", since: 1975, fields: /law|political|history|english/i },
  { name: "U.S. Postal Service", tier: "public", since: 1971 },
  { name: "Tennessee Valley Authority", tier: "public", fields: /electrical|civil|engineering/i },
  { name: "Amtrak", tier: "public", since: 1971, fields: /civil|mechanical|business/i },
  { name: "the Port Authority of New York and New Jersey", tier: "public", fields: /civil|business|planning/i },
  { name: "the county school district", tier: "public", fields: /education|english|history|math|biology/i },
  { name: "the state university system", tier: "public", fields: /education|business|administration/i },
  { name: "the Federal Reserve", tier: "public", fields: /economics|finance|statistics/i },
  { name: "City Hall", tier: "civil" },
  { name: "the county clerk's office", tier: "civil" },
  { name: "the state Department of Motor Vehicles", tier: "civil" },
  { name: "the IRS", tier: "civil", fields: /accounting|finance/i },
  { name: "the Social Security Administration", tier: "civil" },
  { name: "NASA", tier: "research", fields: /aerospace|physics|engineering|computer/i },
  { name: "the National Institutes of Health", tier: "research", fields: BIO },
  { name: "Los Alamos National Laboratory", tier: "research", fields: /physics|chemistry|engineering|computer/i },
  { name: "Bell Labs", tier: "research", until: 2008, fields: /physics|electrical|computer|math/i },
  { name: "the RAND Corporation", tier: "research", fields: /economics|political|statistics/i },
  { name: "Lawrence Berkeley National Laboratory", tier: "research", fields: /physics|chemistry|materials|biology/i },
  { name: "Whirlpool", tier: "mid", fields: ENG },
  { name: "Hormel Foods", tier: "mid", fields: /food|business|marketing/i },
  { name: "Harley-Davidson", tier: "mid", fields: /mechanical|marketing/i },
  { name: "Hasbro", tier: "mid", fields: /design|marketing|business/i },
  { name: "Autodesk", tier: "mid", since: 1982, fields: TECH },
  { name: "Intuit", tier: "mid", since: 1983, fields: /computer|accounting|finance/i },
  { name: "Ogilvy", tier: "mid", fields: MEDIA },
  { name: "Ryder System", tier: "mid", fields: /logistics|business/i },
  { name: "Regeneron", tier: "mid", since: 1988, fields: BIO },
  { name: "Steelcase", tier: "mid", fields: /design|industrial|business/i },
  // Small firms are made up but specific, so the story names a place instead of "a small company".
  { name: "Miller & Shaw CPAs", tier: "small", fields: /accounting|finance/i },
  { name: "Lakeside Logistics", tier: "small" },
  { name: "Redwood Builders", tier: "small", fields: /civil|architecture|construction/i },
  { name: "Bright Pixel Studio", tier: "small", fields: /computer|design|media/i },
  { name: "Keystone Machine Works", tier: "small", fields: ENG },
  { name: "Harbor Street Media", tier: "small", fields: MEDIA },
  { name: "Oak & Pine Interiors", tier: "small", fields: /design|architecture/i },
  { name: "Sunrise Family Dental", tier: "small", fields: /health|biology/i },
  { name: "Prairie Foods", tier: "small", fields: /food|biology/i },
  { name: "Main Street Insurance Agency", tier: "small", fields: BIZ },
  { name: "Netscape", tier: "startup", since: 1994, until: 1998, fields: TECH },
  { name: "eBay", tier: "startup", since: 1995, until: 2002, fields: TECH },
  { name: "Airbnb", tier: "startup", since: 2008, until: 2020, fields: /computer|design|marketing/i },
  { name: "Uber", tier: "startup", since: 2010, until: 2019, fields: /computer|data|business/i },
  { name: "Stripe", tier: "startup", since: 2011, fields: /computer|finance|math/i },
  { name: "SpaceX", tier: "startup", since: 2002, fields: /aerospace|mechanical|electrical|engineering/i },
  { name: "OpenAI", tier: "startup", since: 2016, fields: /computer|AI|math/i },
  { name: "Etsy", tier: "startup", since: 2005, until: 2015, fields: /design|computer|marketing/i },
  { name: "a seed-stage startup in Austin", tier: "startup", since: 1998, fields: TECH },
  { name: "Walmart", tier: "contract", since: 1970 },
  { name: "Target", tier: "contract" },
  { name: "an Amazon fulfillment center", tier: "contract", since: 1999 },
  { name: "a customer service call center", tier: "contract", since: 1985 },
  { name: "a temp agency", tier: "contract" },
  { name: "the Ford assembly plant", tier: "field", fields: /mechanical|industrial/i },
  { name: "the GM plant in Michigan", tier: "field" },
  { name: "a union construction crew", tier: "field" },
  { name: "a Texas oil field", tier: "field" },
  { name: "the Boeing assembly line in Everett", tier: "field", since: 1967 },
  { name: "Massachusetts General Hospital", tier: "doctor" },
  { name: "Johns Hopkins Hospital", tier: "doctor" },
  { name: "the Mayo Clinic", tier: "doctor" },
  { name: "the Cleveland Clinic", tier: "doctor" },
  { name: "UCSF Medical Center", tier: "doctor" },
  { name: "a community hospital", tier: "doctor" },
];

/** Starting pay range (a year, engine units = $10) for a new graduate; experience raises it. */
export const US_SALARY: Record<CompanyTier, [number, number]> = {
  large: [6500, 8000],
  it: [11000, 14500],
  foreign: [9000, 12000],
  public: [5000, 6000],
  civil: [4300, 5200],
  research: [7500, 9500],
  mid: [5500, 7000],
  small: [4300, 5200],
  startup: [7000, 10500],
  contract: [3200, 3800],
  field: [4400, 5600],
  professor: [8500, 10500],
  doctor: [6500, 7200], // residency; attending pay comes with years (titleFor)
};

export const US_TIER_LABEL: Record<CompanyTier, string> = {
  large: "Fortune 500 company",
  it: "Big Tech company",
  foreign: "consulting, finance or law firm",
  public: "public agency",
  civil: "government office",
  research: "national lab",
  mid: "mid-size company",
  small: "small business",
  startup: "startup",
  contract: "hourly job",
  field: "plant or trade job",
  professor: "university faculty",
  doctor: "hospital physician",
};

export function usTitle(tier: CompanyTier, yearsExp: number): string {
  if (tier === "professor") return yearsExp >= 12 ? "Professor" : yearsExp >= 6 ? "Associate Professor" : "Assistant Professor";
  if (tier === "doctor") return yearsExp >= 12 ? "Chief of Service" : yearsExp >= 4 ? "Attending Physician" : "Resident";
  if (tier === "civil") return yearsExp >= 15 ? "Supervisor" : yearsExp >= 7 ? "Senior Specialist" : "Clerk";
  if (tier === "research") return yearsExp >= 10 ? "Principal Scientist" : yearsExp >= 4 ? "Senior Scientist" : "Research Associate";
  if (tier === "contract") return "Hourly Associate";
  if (tier === "field") return "Production Worker";
  if (tier === "startup") return "Team Member";
  if (yearsExp >= 18) return "Director";
  if (yearsExp >= 13) return "Senior Manager";
  if (yearsExp >= 8) return "Manager";
  if (yearsExp >= 4) return "Senior Associate";
  return "Associate";
}

/** Promotion ladders: a title moves one step up the ladder it is on. */
export const US_LADDERS = [
  ["Associate", "Senior Associate", "Manager", "Senior Manager", "Director", "Vice President"],
  ["Team Member", "Team Lead", "Head of Department"],
  ["Clerk", "Specialist", "Senior Specialist", "Supervisor", "Manager", "Division Director"],
  ["Research Associate", "Scientist", "Senior Scientist", "Principal Scientist"],
  ["Assistant Professor", "Associate Professor", "Professor"],
  ["Resident", "Attending Physician", "Chief of Service", "Chief Medical Officer"],
];

export const US_UNIVERSITIES: Record<SchoolTier, string[]> = {
  top: ["Harvard University", "Stanford University", "MIT", "Yale University", "Princeton University", "Columbia University", "University of Chicago"],
  seoul: ["Duke University", "Northwestern University", "University of Michigan", "UC Berkeley", "UCLA", "University of Virginia", "NYU", "Georgetown University", "Carnegie Mellon University"],
  national: ["Ohio State University", "Penn State", "University of Texas at Austin", "University of Washington", "University of Florida", "Rutgers University", "University of Wisconsin-Madison", "Purdue University"],
  regional: ["Arizona State University", "San Diego State University", "Georgia State University", "University of Central Florida", "Texas Tech University", "Kent State University", "Boise State University", "Western Michigan University"],
  college: ["Santa Monica College", "Miami Dade College", "Houston Community College", "Northern Virginia Community College", "Portland Community College"],
};

/** Public universities: in-state tuition is about a third of a private one. */
const PUBLIC = /State|UC |UCLA|University of (Michigan|Virginia|Texas|Washington|Florida|Wisconsin|Central Florida)|Rutgers|Purdue|Penn State|Ohio State|Community College|College$/;

export function usTuition(school: string, level: "university" | "graduate" | "abroad"): number {
  if (level === "abroad") return 0; // funded PhD
  if (level === "graduate") return PUBLIC.test(school) ? 1600 : 3200;
  if (/Community College|College$/.test(school) && !/University/.test(school)) return 400;
  return PUBLIC.test(school) ? 1150 : 3000; // private sticker price minus typical aid
}

export const US_ABROAD_SCHOOLS = ["Oxford", "Cambridge", "ETH Zurich", "the University of Tokyo", "McGill University", "the University of Toronto", "Imperial College London"];

/** Words that put a school (or the plan to study) abroad, for an American. */
export const US_ABROAD = /abroad|overseas|England|UK|Britain|Germany|France|Japan|Canada|Australia|Switzerland|Korea|China|Oxford|Cambridge|Europe/i;

/** Typical single-family home prices (engine units) by metro area. */
export const US_AREAS = [
  { name: "the San Francisco Bay Area", price: 140000 },
  { name: "Los Angeles", price: 95000 },
  { name: "Seattle", price: 85000 },
  { name: "Boston", price: 75000 },
  { name: "the New York suburbs", price: 72000 },
  { name: "Denver", price: 60000 },
  { name: "Phoenix", price: 45000 },
  { name: "Atlanta", price: 40000 },
  { name: "Dallas", price: 40000 },
  { name: "Chicago", price: 35000 },
  { name: "Houston", price: 33000 },
  { name: "a Midwest small town", price: 22000 },
  { name: "a small town in the South", price: 18000 },
];

/** A 30-year fixed mortgage at today's rates. */
export const US_MORTGAGE_RATE = 0.065;
