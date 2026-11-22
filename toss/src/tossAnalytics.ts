import { Analytics } from "@apps-in-toss/web-framework";
import { registerLogger } from "@/lib/analytics";

/**
 * 이벤트 기록 (앱인토스 analytics): the game's logEvent calls (src/lib/analytics.ts) go to Analytics.log as "event"
 * logs, so they can be picked as 전환 지표 in the console. Toss adds the anonymous key itself; in the sandbox the logs
 * only print to the console, and an old Toss app ignores them.
 */
export function setupTossAnalytics(): void {
  registerLogger((name, params) => {
    void Analytics.log({ log_name: name, log_type: "event", params }).catch(() => {});
  });
}
