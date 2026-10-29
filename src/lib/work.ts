// How a working life earns: for an employer, or from a shop or business of one's own.
// Office moments (a boss, promotion, overtime, parental leave, layoffs) only fit employees.
import type { LifeFlags } from "./types";

/** Job titles that mean running one's own shop or business, or working for oneself. */
export const BUSINESS = /대표|사업가|창업|프리랜서|자영업|사장|점주|가게\s?주인/;

export const working = (f: LifeFlags) => f.employed && !f.retired;

/** Runs a shop or business, or freelances. Lives saved before the flag existed are read from the job title. */
export const ownsBusiness = (f: LifeFlags) => working(f) && (f.selfEmployed ?? BUSINESS.test(f.job));

/** Works for an employer: the only kind of life that has a boss, a promotion or a company to leave. */
export const employee = (f: LifeFlags) => working(f) && !ownsBusiness(f);

/** A job title for starting out on one's own, read from how the player or narrator put it. */
export function businessTitle(text: string): string {
  if (/카페|커피/.test(text)) return "카페 사장";
  if (/식당|음식점|치킨|분식|고깃집|술집|포차|베이커리|빵집/.test(text)) return "식당 사장";
  if (/가게|매장|편의점|꽃집|옷가게|점포/.test(text)) return "가게 사장";
  if (/유튜브|유튜버|크리에이터|인플루언서/.test(text)) return "유튜버";
  if (/프리랜서|외주/.test(text)) return "프리랜서";
  if (/스타트업|앱|플랫폼|서비스/.test(text)) return "스타트업 대표";
  return "사업가";
}
