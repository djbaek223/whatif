// English for the Korean texts in the code, keyed by the Korean (see src/lib/i18n.ts). One file per part of the code.
import { ENGINE } from "./en/engine";
import { EVENTS_EN } from "./en/events";
import { LIFE_EN } from "./en/lifeEvents";
import { MISC } from "./en/misc";
import { MORE1_EN } from "./en/moreEvents1";
import { MORE2_EN } from "./en/moreEvents2";

export const EN: Record<string, string> = { ...ENGINE, ...MISC, ...EVENTS_EN, ...LIFE_EN, ...MORE1_EN, ...MORE2_EN };
