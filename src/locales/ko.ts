// Korean for the English texts in the code, keyed by the English (T in src/lib/i18n.ts). One file per part of the code.
import { US_EVENTS_KO } from "./ko/events";
import { KO_US } from "./ko/america";
import { KO_NAMES } from "./ko/names";
import { US_NEWS_KO } from "./ko/news";
import { US_MISC_KO } from "./ko/misc";

export const KO: Record<string, string> = { ...KO_NAMES, ...US_MISC_KO, ...US_EVENTS_KO, ...US_NEWS_KO };
export { KO_NAMES, KO_US };
