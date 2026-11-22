import { Share } from "@apps-in-toss/web-framework";
import { registerShare } from "@/lib/share";

/** The console app id, as appName in apps-in-toss.config.ts (that file is build config, not bundled). */
const APP_NAME = "whatif-host";

/**
 * 공유: a Toss link to the mini-app (intoss://<appName>) and Toss's share sheet, in place of the website's address, so a
 * shared life brings the friend into the mini-app (and counts as its visit) instead of out to the website.
 */
export function setupTossShare(): void {
  let made: Promise<string> | null = null;
  registerShare({
    link: () => {
      // One link per session is enough: it always opens the mini-app's first screen.
      made ??= Share.createLink({ path: `intoss://${APP_NAME}` }).catch((e) => {
        made = null;
        throw e;
      });
      return made;
    },
    send: (text) => Share.sendMessage({ message: text }),
    fallback: "토스에서 '왓 이프' 검색",
  });
}
