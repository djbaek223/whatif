// English for the Korean texts in the code, keyed by the Korean (see src/lib/i18n.ts). One file per part of the code.
import { ENGINE } from "./en/engine";
import { EVENTS_EN } from "./en/events";
import { LIFE_EN } from "./en/lifeEvents";
import { MISC } from "./en/misc";
import { MORE1_EN } from "./en/moreEvents1";
import { MORE2_EN } from "./en/moreEvents2";
import { STORY_EN } from "./en/storyEvents";
import { UI_EN } from "./en/ui";
import { EN_KR } from "./en/korea";
import { KR_NEWS_EN } from "./en/news";
import { EN_NAMES } from "./en/names";

export const EN: Record<string, string> = { ...EN_NAMES, ...ENGINE, ...MISC, ...EVENTS_EN, ...LIFE_EN, ...MORE1_EN, ...MORE2_EN, ...STORY_EN, ...UI_EN, ...KR_NEWS_EN };
export { EN_KR, EN_NAMES };
