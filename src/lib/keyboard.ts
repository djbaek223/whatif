/**
 * True on devices whose text boxes don't bring up an on-screen keyboard (a mouse and a hardware keyboard).
 * On a phone or tablet, focusing a text box opens the keyboard over half the screen, so a new screen
 * there focuses its heading instead and the keyboard comes up only when the person taps a box.
 */
export function canAutoFocusText(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches && !window.matchMedia("(any-pointer: coarse)").matches;
}
