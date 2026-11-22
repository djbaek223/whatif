/**
 * Where "내 인생 공유하기" points and how it is sent. The website shares its own address through the browser's share
 * sheet (or the clipboard). The 앱인토스 build registers Toss's share at start-up (toss/src/tossShare.ts): a link that
 * opens the mini-app inside Toss, and Toss's own share sheet, so a friend lands in the mini-app, not on the website.
 * Kept as a plain registry so the website never imports Toss code.
 */
export type ShareProvider = {
  /** A link that opens the app; may be slow (a call to Toss) and may fail. */
  link: () => Promise<string>;
  /** Opens a share sheet with the text. Resolves when it closed. */
  send: (text: string) => Promise<void>;
  /** Shown in place of the link while it is made, or if it can't be. */
  fallback: string;
};

let provider: ShareProvider | null = null;

export function registerShare(p: ShareProvider): void {
  provider = p;
}

export function shareProvider(): ShareProvider | null {
  return provider;
}
