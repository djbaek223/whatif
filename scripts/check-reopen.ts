// Reopening the site (or refreshing) picks the first screen like this:
// - a life still being lived goes straight back to play, ahead of any unfinished questions;
// - an ended life, unfinished questions, or nothing saved shows the title screen,
//   where 이어하기 / 이어서 입력하기 wait as buttons. Reopening never jumps into the questions.
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/components/Game.tsx", import.meta.url), "utf8");
const fail = (m: string) => {
  console.error(`check:reopen FAIL — ${m}`);
  process.exit(1);
};

if (!/useState<Screen>\("intro"\)/.test(src)) fail('the first screen is not "intro"');

// The effect that restores saved data on load: from the progress read to the end of its useEffect.
const start = src.indexOf("readProgress<Saved>()");
if (start < 0) fail("restore effect not found");
const restore = src.slice(start, src.indexOf("}, [", start));
if (!restore.includes("readDraft")) fail("restore effect no longer reads the draft");

// The only screen change on load is the automatic resume of a living life.
if (/setScreen|startNew\(|startFresh\(|resume\(/.test(restore)) fail("restoring saved data on load changes the screen other than through autoResume");
const auto = restore.match(/Promise\.all\(\[([^\]]*)\]\)\.then\(\(\[s, on\]\) => \{\s*if \(([^)]*)\) autoResume\(s, on\);/);
if (!auto) fail("a living life is not resumed automatically on load");
const [, waits, cond] = auto!;
// It waits for the AI check (so the life keeps AI) and the saved-profile check (so the save stays on the device).
for (const p of ["progressRead", "aiRead", "profileRead"]) if (!waits.includes(p)) fail(`automatic resume does not wait for ${p}`);
if (cond.replace(/\s/g, "") !== "s?.life&&!s.life.dead") fail(`automatic resume condition changed: ${cond}`);

// The draft is only kept for the button, and the automatic resume steps aside once the player has left the title.
const draftStep = restore.slice(restore.indexOf("readDraft"), restore.indexOf("Promise.all"));
if (!/setDraft\(d\)/.test(draftStep)) fail("draft is not kept for 이어서 입력하기");
if (!/useEffectEvent\(\(s: Saved, on: boolean\) => \{\s*if \(screen === "intro"\) resumeFrom\(s, on\);/.test(src)) fail("autoResume does not check the player is still on the title screen");

// Both ways back in stay on the title screen.
if (!/label: L\("이어하기"\)[\s\S]{0,400}onClick: resume/.test(src)) fail("이어하기 button missing");
if (!/L\("이어서 입력하기"\), onClick: startNew/.test(src)) fail("이어서 입력하기 button missing");

// No other load-time navigation (URL hash or query) jumps past the title screen.
if (/location\.(hash|search)/.test(src)) fail("Game reads the URL to pick a screen");

console.log("check:reopen ok — a living life resumes on reopen; otherwise the title screen with 이어하기 / 이어서 입력하기");
