// Small sound effects synthesized with Web Audio, so there are no files to load. Off until the player turns them on.
const KEY = "whatif:sound";

let ctx: AudioContext | null = null;
let on = false;

export function loadSoundPref(): boolean {
  try {
    on = localStorage.getItem(KEY) === "on";
  } catch {
    on = false;
  }
  return on;
}

/** Called from a click, which is also what browsers require before audio may start. */
export function setSound(next: boolean) {
  on = next;
  try {
    localStorage.setItem(KEY, next ? "on" : "off");
  } catch {
    // Private mode or blocked storage: the choice lasts for this visit only.
  }
  if (next) audio()?.resume();
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.08, slideTo?: number) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  flip() {
    if (on) tone(320, 0, 0.18, "triangle", 0.06, 720);
  },
  dice() {
    if (!on) return;
    for (let i = 0; i < 5; i++) tone(900 + i * 60, i * 0.09, 0.04, "square", 0.025);
  },
  luck(good: boolean) {
    if (!on) return;
    if (good) [660, 880].forEach((f, i) => tone(f, i * 0.08, 0.16, "triangle", 0.06));
    else tone(300, 0, 0.25, "sine", 0.06, 200);
  },
  badge() {
    if (on) [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.22, "triangle", 0.06));
  },
  year() {
    if (on) tone(440, 0, 0.3, "sine", 0.04, 660);
  },
};
