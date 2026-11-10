/**
 * Keyboard debug log for device tests: build with VITE_KB_DEBUG=1 and a small box at the top of the screen lists,
 * for the last moments, what the page saw while a box took focus (scroll position, window and visual viewport
 * heights). A screenshot of it shows whether the page or iOS moved the box. Off in normal builds.
 */
export function setupKbDebug(): void {
  if (import.meta.env.VITE_KB_DEBUG !== "1") return;
  const box = document.createElement("pre");
  box.style.cssText =
    "position:fixed;top:0;left:0;right:0;z-index:99999;max-height:38vh;overflow:auto;margin:0;padding:4px 6px;font:10px/1.3 monospace;background:rgba(0,0,0,.78);color:#7f7;pointer-events:none;white-space:pre-wrap";
  document.addEventListener("DOMContentLoaded", () => document.body.appendChild(box));
  if (document.body) document.body.appendChild(box);
  let t0 = performance.now();
  const lines: string[] = [];
  const vv = window.visualViewport;
  const log = (what: string) => {
    const ms = Math.round(performance.now() - t0);
    const room = document.documentElement.style.getPropertyValue("--keyboard-room") || "-";
    const el = document.activeElement as HTMLElement | null;
    const top = el && el !== document.body ? Math.round(el.getBoundingClientRect().top) : "-";
    lines.push(`${ms} ${what} sy=${Math.round(scrollY)} ih=${innerHeight} vh=${vv ? Math.round(vv.height) : "-"} vo=${vv ? Math.round(vv.offsetTop) : "-"} room=${room} top=${top}`);
    if (lines.length > 40) lines.shift();
    box.textContent = lines.join("\n");
  };
  document.addEventListener("focusin", (e) => {
    t0 = performance.now();
    lines.length = 0;
    log(`focus ${(e.target as HTMLElement).id || (e.target as HTMLElement).tagName}`);
  });
  document.addEventListener("focusout", () => log("blur"));
  window.addEventListener("scroll", () => log("scroll"), { passive: true });
  window.addEventListener("resize", () => log("win-resize"));
  vv?.addEventListener("resize", () => log("vv-resize"));
  vv?.addEventListener("scroll", () => log("vv-scroll"));
}
