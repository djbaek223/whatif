"use client";

import { useEffect } from "react";
import { isToss } from "@/lib/platform";

/**
 * Keeps the focused text box above the phone keyboard or number pad, on every screen.
 *
 * Phones open the keyboard over the page (the visual viewport shrinks, the page does not), and browsers
 * scroll the box only "just into view", often still under the keyboard or the sticky 다음 bar. A short
 * page can't scroll at all, because there is nothing below the box to scroll into. So while a keyboard is
 * up this adds bottom room the height of the keyboard and moves the focused box to the upper part of the
 * visible area: once the keyboard has finished opening, and again each time focus moves to another box
 * (the birth date boxes jump from one to the next while the number pad stays up).
 *
 * A box can opt out with an ancestor `data-keyboard-scroll="self"` when its screen places it itself.
 *
 * Inside the Toss app (앱인토스) the keyboard covers the web view without shrinking the visual viewport, so the
 * height can't be measured: iOS scrolls the box into view, then pulls it back under the keyboard because the page
 * has nothing below to scroll into. There, while a text box is focused on a touch screen, the keyboard is assumed
 * to take KEYBOARD_GUESS of the screen, and the room under the page is added the moment the box takes focus, before
 * iOS scrolls. There iOS alone moves the box into view: a screen recording (2026-11-10) showed this code's own
 * smooth scroll running into iOS's (up, down under the number pad, up again), also when focus hopped from one birth
 * date box to the next. This code steps in only once iOS is done, and only if the box is still hidden.
 */

const NOT_TEXT = new Set(["checkbox", "radio", "button", "submit", "reset", "range", "color", "file", "image", "hidden"]);
/** A visual viewport shorter than the page by more than this means an on-screen keyboard is up. */
const KEYBOARD_MIN = 120;
/** Where the box goes: its top this far down the visible area. */
const TOP_SHARE = 0.3;
/** Room kept clear at the bottom of the visible area for a sticky button bar. */
const BOTTOM_CLEAR = 96;
const TOP_CLEAR = 12;
/** Share of the screen an unmeasurable keyboard is assumed to cover (iPhone keyboard with its bar ≈ 0.40–0.45). */
const KEYBOARD_GUESS = 0.45;
/** Toss: a box counts as under the keyboard once it reaches this share of the guessed keyboard (the guess runs high). */
const HIDDEN_SHARE = 0.8;

function isTextBox(el: Element | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (el.closest("[data-keyboard-scroll=self]")) return false;
  if (el instanceof HTMLTextAreaElement) return !el.readOnly;
  if (el instanceof HTMLInputElement) return !NOT_TEXT.has(el.type) && !el.readOnly && !el.disabled;
  return el.isContentEditable;
}

function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
    const s = getComputedStyle(p);
    if (/(auto|scroll)/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 1) return p;
  }
  return null;
}

export function KeyboardFocus() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let timer = 0;
    let recheck = 0;
    let lastKeyboard = 0;

    const touch = window.matchMedia?.("(any-pointer: coarse)").matches ?? false;
    const measured = () => Math.max(0, Math.round(window.innerHeight - vv.height));
    // In the Toss app the viewport never shrinks for the keyboard; assume one while a text box is focused.
    const guessed = () => (isToss && touch && isTextBox(document.activeElement) ? Math.round(window.innerHeight * KEYBOARD_GUESS) : 0);
    const keyboardHeight = () => {
      const kb = measured();
      return kb >= KEYBOARD_MIN ? kb : Math.max(kb, guessed());
    };

    const guessing = () => measured() < KEYBOARD_MIN && guessed() >= KEYBOARD_MIN;

    const setRoom = (px: number) => {
      if (px > 0) root.style.setProperty("--keyboard-room", `${px}px`);
      else root.style.removeProperty("--keyboard-room");
    };

    const place = () => {
      const kb = keyboardHeight();
      const el = document.activeElement;
      if (kb < KEYBOARD_MIN || !isTextBox(el)) {
        setRoom(0);
        lastKeyboard = 0;
        return;
      }
      setRoom(kb);
      const r = el.getBoundingClientRect();
      if (guessing()) {
        lastKeyboard = kb;
        // Toss: iOS has scrolled the box itself. Move it only if it still sits under the keyboard or above the top.
        const top = r.top - vv.offsetTop;
        const hidden = top < 0 || r.bottom - vv.offsetTop > window.innerHeight - kb * HIDDEN_SHARE;
        if (hidden) window.scrollBy({ top: top - (window.innerHeight - kb) * TOP_SHARE, behavior: "auto" });
        return;
      }
      // What the person can actually see: the visual viewport, or above the assumed keyboard when it isn't measured.
      const seen = measured() >= KEYBOARD_MIN ? vv.height : Math.min(vv.height, window.innerHeight - kb);
      // Position of the box inside that.
      const top = r.top - vv.offsetTop;
      const bottom = r.bottom - vv.offsetTop;
      const fits = top >= TOP_CLEAR && bottom <= seen - BOTTOM_CLEAR;
      const opened = lastKeyboard < KEYBOARD_MIN;
      lastKeyboard = kb;
      // Leave a box alone that is already in clear view, unless the keyboard just opened over it.
      if (fits && !opened) return;
      const want = Math.max(TOP_CLEAR, Math.min(seen * TOP_SHARE, seen - BOTTOM_CLEAR - r.height));
      const delta = top - want;
      if (Math.abs(delta) < 4) return;
      const behavior: ScrollBehavior = reduce?.matches ? "auto" : "smooth";
      const box = scrollParent(el);
      if (box) box.scrollBy({ top: delta, behavior });
      else window.scrollBy({ top: delta, behavior });
    };

    // The keyboard animates in over ~250ms and the viewport fires resize all along; act once it settles.
    const soon = (ms: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(place, ms);
    };

    const onFocusIn = (e: FocusEvent) => {
      if (!isTextBox(e.target as Element)) return;
      // Toss: make room now, so iOS's own scroll into view has somewhere to go, and look only once iOS is done.
      if (guessing()) {
        window.clearTimeout(timer);
        setRoom(guessed());
        window.clearTimeout(recheck);
        recheck = window.setTimeout(place, 700);
        return;
      }
      // Keyboard already up (moving between boxes): place right away; otherwise wait for it to open.
      const up = measured() >= KEYBOARD_MIN;
      soon(up ? 60 : 450);
    };
    const onFocusOut = () => soon(200);
    const onResize = () => soon(120);

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    vv.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(recheck);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      vv.removeEventListener("resize", onResize);
      setRoom(0);
    };
  }, []);
  return null;
}
