"use client";

import { memo, type ReactNode } from "react";
import type { Era, Outfit, Person, SceneState, Season } from "@/lib/scene";
import { L } from "@/lib/i18n";

// The world scrolls past in four layers at different speeds while the family walks in place.
// Every moving part is a CSS transform on its own layer, so the browser composites it without repainting.

const GROUND = 97; // where feet and buildings stand, in the 120-high viewBox

const SKY: Record<Season, [string, string]> = {
  spring: ["#bfe3ff", "#fde7f0"],
  sunny: ["#6ec6ff", "#e6f7ff"],
  rain: ["#8a9bb0", "#cfd8e1"],
  autumn: ["#ffcf9c", "#fff1dc"],
  snow: ["#bccde2", "#eef3f8"],
};

const MOUNTAIN: Record<Season, string> = { spring: "#a3c9ab", sunny: "#73b083", rain: "#7f9a8c", autumn: "#c8915e", snow: "#d4dee9" };
const CANOPY: Record<Season, string> = { spring: "#f6b3cc", sunny: "#4caf50", rain: "#3e8b4a", autumn: "#e8892f", snow: "#eef3f8" };
const SEASON_LABEL: Record<Season, string> = { get spring() { return L("봄 🌸"); }, get sunny() { return L("여름 ☀️"); }, get rain() { return L("장마 ☔"); }, get autumn() { return L("가을 🍁"); }, get snow() { return L("겨울 ❄️"); } };

export const LifeScene = memo(function LifeScene({ scene, paused, slim = false, children }: { scene: SceneState; paused: boolean; slim?: boolean; children?: ReactNode }) {
  const [top, bottom] = SKY[scene.season];
  return (
    <div
      className={`relative overflow-hidden rounded-xl transition-[height] duration-300 motion-reduce:transition-none lg:h-[140px] ${slim ? "h-[52px]" : "h-[104px] sm:h-[140px]"} ${paused ? "scene-paused" : ""}`}
      style={{ background: `linear-gradient(${top}, ${bottom})` }}
      role="img"
      aria-label={L`${scene.year}년 ${scene.month}월, ${SEASON_LABEL[scene.season].split(" ")[0]}의 거리를 걷는 모습`}
    >
      <Sun season={scene.season} />
      <Layer dur={150} tile={400}>
        {(x) => <Clouds x={x} rain={scene.season === "rain"} />}
      </Layer>
      <Layer dur={90} tile={400}>
        {(x) => <Far x={x} season={scene.season} era={scene.era} />}
      </Layer>
      <Layer dur={36} tile={400}>
        {(x) => <Mid x={x} era={scene.era} />}
      </Layer>
      {/* Night falls in dark mode, behind the street so the people stay readable. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden bg-[#0b1230]/45 dark:block" />
      <Layer dur={14} tile={800}>
        {(x) => <Near x={x} season={scene.season} era={scene.era} home={scene.home} store={scene.store} />}
      </Layer>
      <Weather season={scene.season} />
      <Family scene={scene} />
      <span className="absolute top-1.5 left-2 rounded-full bg-white/75 px-2 py-0.5 text-[11px] font-semibold text-stone-700 backdrop-blur-sm">
        {SEASON_LABEL[scene.season]}
      </span>
      {children}
    </div>
  );
});

/** One parallax layer: three identical tiles, panned left by one tile and looped. */
function Layer({ dur, tile, children }: { dur: number; tile: number; children: (x: number) => ReactNode }) {
  return (
    <div aria-hidden className="scene-layer absolute inset-y-0 left-0" style={{ animationDuration: `${dur}s` }}>
      <svg viewBox={`0 0 ${tile * 3} 120`} className="block h-full w-auto" preserveAspectRatio="xMinYMax meet">
        {children(0)}
        {children(tile)}
        {children(tile * 2)}
      </svg>
    </div>
  );
}

function Sun({ season }: { season: Season }) {
  if (season === "rain") return null;
  const color = season === "snow" ? "#fff8e1" : season === "autumn" ? "#ffb84d" : "#ffd54f";
  return (
    <svg aria-hidden viewBox="0 0 40 40" className="absolute top-1 right-3 h-9 w-9 sm:h-12 sm:w-12">
      {season === "sunny" && (
        <g className="sun-rays" stroke={color} strokeWidth="2" strokeLinecap="round">
          {Array.from({ length: 8 }, (_, i) => (
            <line key={i} x1="20" y1="3" x2="20" y2="8" transform={`rotate(${i * 45} 20 20)`} />
          ))}
        </g>
      )}
      <circle cx="20" cy="20" r="9" fill={color} />
      {/* In dark mode the sun reads as a moon. */}
      <circle cx="24" cy="17" r="8" className="hidden fill-[#1c2448] dark:block" />
    </svg>
  );
}

function Clouds({ x, rain }: { x: number; rain: boolean }) {
  const fill = rain ? "#9aa6b4" : "#ffffff";
  return (
    <g transform={`translate(${x} 0)`} fill={fill} opacity={rain ? 0.9 : 0.85}>
      {[
        [40, 18, 1],
        [190, 30, 0.8],
        [310, 14, 1.1],
      ].map(([cx, cy, s], i) => (
        <g key={i} transform={`translate(${cx} ${cy}) scale(${s})`}>
          <ellipse cx="0" cy="0" rx="16" ry="6" />
          <ellipse cx="-8" cy="-3" rx="8" ry="6" />
          <ellipse cx="6" cy="-5" rx="9" ry="7" />
        </g>
      ))}
    </g>
  );
}

function Far({ x, season, era }: { x: number; season: Season; era: Era }) {
  const m = MOUNTAIN[season];
  return (
    <g transform={`translate(${x} 0)`}>
      <path d="M0 80 L40 60 L75 70 L120 46 L165 66 L210 54 L260 72 L300 52 L350 68 L400 80 V120 H0Z" fill={m} opacity="0.75" />
      {season === "snow" && (
        <g fill="#ffffff">
          <path d="M120 46 L112 51 L128 51Z" />
          <path d="M300 52 L292 57 L308 57Z" />
          <path d="M210 54 L203 58 L217 58Z" />
        </g>
      )}
      {/* A tower on the ridge, as seen from much of Seoul. */}
      <g fill="#8a94a6" opacity="0.8">
        <rect x="119" y="26" width="2" height="21" />
        <rect x="116" y="30" width="8" height="4" rx="1.5" />
      </g>
      {era !== "old" && (
        <g fill="#9fb0c4" opacity={era === "apartment" ? 0.45 : 0.6}>
          {(era === "apartment" ? [[150, 10, 14], [168, 12, 18], [228, 9, 12], [330, 12, 16]] : [[140, 10, 26], [154, 8, 34], [166, 12, 22], [220, 9, 30], [232, 12, 40], [330, 10, 28], [342, 8, 36], [380, 12, 24]]).map(
            ([bx, w, h], i) => (
              <rect key={i} x={bx} y={86 - h} width={w} height={h + 34} />
            ),
          )}
        </g>
      )}
    </g>
  );
}

function Mid({ x, era }: { x: number; era: Era }) {
  return <g transform={`translate(${x} 0)`}>{era === "old" ? <OldTown /> : era === "apartment" ? <Apartments /> : era === "highrise" ? <Towers /> : <Future />}</g>;
}

// 1980s: one-story houses with tiled roofs, coal briquettes stacked by the wall and smoke from the chimneys.
function OldTown() {
  const houses: [number, number, number, string][] = [
    [12, 46, 18, "#5b4a3f"],
    [80, 40, 16, "#4f6475"],
    [152, 52, 20, "#6b4f3a"],
    [234, 44, 17, "#4f6475"],
    [304, 50, 19, "#5b4a3f"],
  ];
  return (
    <>
      <g stroke="#6d5a48" strokeWidth="0.6" fill="none">
        <path d="M140 52 Q240 60 340 52" />
        <path d="M340 52 Q440 60 540 52" />
      </g>
      {[140, 340].map((px) => (
        <g key={px} fill="#7a634d">
          <rect x={px - 1} y="50" width="2" height={GROUND - 50} />
          <rect x={px - 6} y="53" width="12" height="1.5" />
        </g>
      ))}
      {houses.map(([hx, w, h, roof], i) => (
        <g key={i}>
          <rect x={hx} y={GROUND - h} width={w} height={h} fill="#efe2c8" />
          <path d={`M${hx - 5} ${GROUND - h} L${hx + 6} ${GROUND - h - 11} L${hx + w - 6} ${GROUND - h - 11} L${hx + w + 5} ${GROUND - h}Z`} fill={roof} />
          <rect x={hx + w - 14} y={GROUND - h - 18} width="4" height="10" fill="#8d8d8d" />
          <circle className="smoke" style={{ animationDelay: `${i * 0.7}s` }} cx={hx + w - 12} cy={GROUND - h - 21} r="3" fill="#ffffff" opacity="0.7" />
          <rect x={hx + 6} y={GROUND - 12} width="8" height="12" fill="#8b5a2b" />
          <rect x={hx + w - 18} y={GROUND - h + 5} width="10" height="7" fill="#9cc3d5" />
          {i % 2 === 0 && (
            <g fill="#3d3d3d">
              {[0, 1, 2].map((k) => (
                <rect key={k} x={hx + w + 1} y={GROUND - 4 - k * 4.3} width="6" height="4" rx="0.8" />
              ))}
            </g>
          )}
        </g>
      ))}
    </>
  );
}

// 1990s-2000s: rows of apartment blocks with their building numbers painted on.
function Apartments() {
  const blocks: [number, number, number, string][] = [
    [8, 64, 58, "101"],
    [86, 56, 70, "102"],
    [156, 70, 50, "103"],
    [240, 60, 74, "104"],
    [314, 72, 62, "105"],
  ];
  return (
    <>
      {blocks.map(([bx, w, h, label]) => (
        <g key={label}>
          <rect x={bx} y={GROUND - h} width={w} height={h} fill="#ece6dc" />
          <rect x={bx} y={GROUND - h} width={w} height="4" fill="#c9bfae" />
          <Windows x={bx + 5} y={GROUND - h + 12} w={w - 10} h={h - 16} cw={9} ch={8} color="#9fb7c9" />
          <text x={bx + 5} y={GROUND - h + 10} fontSize="5.5" fill="#8a7f70" fontWeight="700">
            {label}{L("동")}
          </text>
        </g>
      ))}
    </>
  );
}

// 2010s-2026: glass towers and one supertall spire.
function Towers() {
  const towers: [number, number, number][] = [
    [10, 34, 70],
    [50, 28, 56],
    [86, 40, 82],
    [134, 30, 62],
    [172, 46, 76],
    [228, 26, 52],
    [310, 32, 66],
    [350, 44, 74],
  ];
  return (
    <>
      {towers.map(([tx, w, h], i) => (
        <g key={i}>
          <rect x={tx} y={GROUND - h} width={w} height={h} fill={i % 2 ? "#8fb2cf" : "#a9c3da"} />
          <Windows x={tx + 3} y={GROUND - h + 4} w={w - 6} h={h - 6} cw={6} ch={5} color="#e3eef7" />
        </g>
      ))}
      <path d={`M262 ${GROUND} L264 22 L276 6 L288 22 L290 ${GROUND}Z`} fill="#7d9cb8" />
      <path d={`M276 6 L276 0`} stroke="#7d9cb8" strokeWidth="1.2" />
      <g stroke="#dbe8f3" strokeWidth="0.6">
        {Array.from({ length: 12 }, (_, k) => (
          <line key={k} x1="266" x2="286" y1={28 + k * 5.5} y2={28 + k * 5.5} />
        ))}
      </g>
    </>
  );
}

// 2027 onward: rounded towers, a sky bridge, light strips and drones.
function Future() {
  const towers: [number, number, number, string][] = [
    [14, 36, 80, "#8c7cf0"],
    [62, 30, 64, "#5fc6dd"],
    [120, 44, 92, "#7a8df0"],
    [196, 32, 70, "#57d0c2"],
    [250, 40, 86, "#9a7cf0"],
    [326, 36, 74, "#5fb4e6"],
  ];
  return (
    <>
      {towers.map(([tx, w, h, c], i) => (
        <g key={i}>
          <rect x={tx} y={GROUND - h} width={w} height={h + 6} rx={w / 2.4} fill={c} opacity="0.85" />
          {[0.25, 0.45, 0.65].map((f) => (
            <rect key={f} x={tx + 4} y={GROUND - h + h * f} width={w - 8} height="1.5" fill="#d9fbff" opacity="0.9" />
          ))}
        </g>
      ))}
      <rect x="164" y="34" width="86" height="4" rx="2" fill="#c7f3ff" opacity="0.9" />
      {[90, 230, 370].map((dx, i) => (
        <g key={dx} className="drone" style={{ animationDelay: `${i * 0.8}s` }}>
          <rect x={dx - 4} y={18 + i * 6} width="8" height="2.5" rx="1" fill="#3c4560" />
          <circle cx={dx} cy={21 + i * 6} r="1.2" fill="#7ff9ff" />
        </g>
      ))}
    </>
  );
}

/** A grid of windows drawn as a few rows of dashes, cheaper than one rect per window. */
function Windows({ x, y, w, h, cw, ch, color }: { x: number; y: number; w: number; h: number; cw: number; ch: number; color: string }) {
  const rows = Math.max(1, Math.floor(h / ch));
  return (
    <g stroke={color} strokeWidth={ch * 0.5} strokeDasharray={`${cw * 0.6} ${cw * 0.4}`}>
      {Array.from({ length: rows }, (_, r) => (
        <line key={r} x1={x} x2={x + w} y1={y + r * ch} y2={y + r * ch} />
      ))}
    </g>
  );
}

function Near({ x, season, era, home, store }: { x: number; season: Season; era: Era; home: boolean; store: string | null }) {
  const snow = season === "snow";
  return (
    <g transform={`translate(${x} 0)`}>
      <rect x="0" y={GROUND - 1} width="800" height="8" fill={snow ? "#f2f6fa" : "#d8d0c4"} />
      <rect x="0" y={GROUND + 7} width="800" height="16" fill={era === "future" ? "#4b4f63" : "#666a70"} />
      <g fill="#f4f4f4">
        {Array.from({ length: 20 }, (_, i) => (
          <rect key={i} x={i * 40 + 8} y={GROUND + 14} width="20" height="1.6" />
        ))}
      </g>
      {[40, 300, 520, 730].map((tx) => (
        <Tree key={tx} x={tx} season={season} />
      ))}
      {[160, 440, 660].map((lx) => (
        <Lamp key={lx} x={lx} era={era} />
      ))}
      {home ? <Home x={196} era={era} snow={snow} /> : <Bench x={222} />}
      {store ? <Store x={556} name={store} /> : <Bench x={590} />}
    </g>
  );
}

function Tree({ x, season }: { x: number; season: Season }) {
  return (
    <g>
      <rect x={x - 1.5} y={GROUND - 22} width="3" height="22" fill="#7b5a3c" />
      {season === "snow" ? (
        <g stroke="#7b5a3c" strokeWidth="1.2">
          <line x1={x} y1={GROUND - 18} x2={x - 8} y2={GROUND - 28} />
          <line x1={x} y1={GROUND - 20} x2={x + 7} y2={GROUND - 30} />
          <ellipse cx={x} cy={GROUND - 28} rx="9" ry="3" fill="#ffffff" stroke="none" />
        </g>
      ) : (
        <ellipse cx={x} cy={GROUND - 30} rx="12" ry="12" fill={CANOPY[season]} />
      )}
    </g>
  );
}

function Lamp({ x, era }: { x: number; era: Era }) {
  const future = era === "future";
  return (
    <g>
      <rect x={x - 0.8} y={GROUND - 34} width="1.6" height="34" fill={era === "old" ? "#7a634d" : "#5d6470"} />
      <rect x={x - 5} y={GROUND - 35} width="6" height="2" rx="1" fill="#5d6470" />
      <circle cx={x - 4} cy={GROUND - 32} r="2" fill={future ? "#7ff9ff" : "#ffe08a"} />
    </g>
  );
}

function Bench({ x }: { x: number }) {
  return (
    <g fill="#8b6a4a">
      <rect x={x} y={GROUND - 7} width="18" height="2" />
      <rect x={x} y={GROUND - 11} width="18" height="1.5" />
      <rect x={x + 1} y={GROUND - 5} width="1.5" height="5" />
      <rect x={x + 15.5} y={GROUND - 5} width="1.5" height="5" />
    </g>
  );
}

/** The home this person bought. It stands on the street they walk, with a sign so it reads as theirs. */
function Home({ x, era, snow }: { x: number; era: Era; snow: boolean }) {
  return (
    <g>
      <rect x={x} y={GROUND - 30} width="56" height="30" fill="#fff5e6" stroke="#e0c9a6" strokeWidth="0.8" />
      <path d={`M${x - 5} ${GROUND - 30} L${x + 28} ${GROUND - 50} L${x + 61} ${GROUND - 30}Z`} fill={snow ? "#f4f8fc" : "#e2574c"} stroke={snow ? "#c9d4df" : "none"} />
      {era === "future" && <rect x={x + 30} y={GROUND - 46} width="18" height="6" fill="#33435f" transform={`rotate(-31 ${x + 30} ${GROUND - 40})`} />}
      <rect x={x + 22} y={GROUND - 16} width="11" height="16" fill="#8b5a2b" />
      <rect x={x + 6} y={GROUND - 24} width="11" height="9" fill="#ffe08a" />
      <rect x={x + 39} y={GROUND - 24} width="11" height="9" fill="#ffe08a" />
      <rect x={x + 62} y={GROUND - 18} width="1.6" height="18" fill="#7b5a3c" />
      <rect x={x + 57} y={GROUND - 26} width="22" height="9" rx="1.5" fill="#ffffff" stroke="#e2574c" strokeWidth="0.8" />
      <text x={x + 68} y={GROUND - 19.6} fontSize="5.5" fontWeight="700" textAnchor="middle" fill="#c2372d">
        {L("우리 집")}
      </text>
    </g>
  );
}

/** The shop or office of someone who runs their own business. */
function Store({ x, name }: { x: number; name: string }) {
  return (
    <g>
      <rect x={x} y={GROUND - 38} width="74" height="38" fill="#fdfaf3" stroke="#d9cdb8" strokeWidth="0.8" />
      <rect x={x - 2} y={GROUND - 46} width="78" height="10" rx="1.5" fill="#2f5d50" />
      <text x={x + 37} y={GROUND - 39} fontSize="6.5" fontWeight="700" textAnchor="middle" fill="#ffffff">
        {name}
      </text>
      <g>
        {Array.from({ length: 8 }, (_, i) => (
          <path key={i} d={`M${x + i * 9.25} ${GROUND - 36} h9.25 l-1 7 h-7.25Z`} fill={i % 2 ? "#ffffff" : "#e2574c"} />
        ))}
      </g>
      <rect x={x + 6} y={GROUND - 24} width="34" height="16" fill="#cfe6f2" />
      <rect x={x + 48} y={GROUND - 22} width="18" height="22" fill="#8b5a2b" />
      <rect x={x + 10} y={GROUND - 19} width="16" height="5" rx="1" fill="#ffd54f" />
      <text x={x + 18} y={GROUND - 15.4} fontSize="3.6" fontWeight="700" textAnchor="middle" fill="#6b4a00">
        OPEN
      </text>
    </g>
  );
}

// ── Weather ───────────────────────────────────────────

/** Fixed pseudo-random spread so particles look scattered but render the same every time. */
const spread = (i: number, salt: number) => {
  const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

const PARTICLES: Record<Season, { n: number; cls: string; color: string; w: number; h: number; round: string; fall: [number, number] }> = {
  spring: { n: 22, cls: "fx-petal", color: "#f9b9d0", w: 6, h: 4, round: "50% 0 50% 0", fall: [5, 9] },
  sunny: { n: 8, cls: "fx-glint", color: "#fff6c2", w: 4, h: 4, round: "50%", fall: [2, 4] },
  rain: { n: 30, cls: "fx-rain", color: "#e3edf7", w: 1.5, h: 10, round: "1px", fall: [0.6, 1] },
  autumn: { n: 20, cls: "fx-leaf", color: "#e8892f", w: 7, h: 5, round: "60% 0", fall: [5, 9] },
  snow: { n: 26, cls: "fx-snow", color: "#ffffff", w: 5, h: 5, round: "50%", fall: [6, 11] },
};

// At most 30 particles, each moving by transform only.
const Weather = memo(function Weather({ season }: { season: Season }) {
  const p = PARTICLES[season];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {Array.from({ length: p.n }, (_, i) => {
        const dur = p.fall[0] + spread(i, 1) * (p.fall[1] - p.fall[0]);
        const color = season === "autumn" && i % 3 === 0 ? "#c9572b" : season === "autumn" && i % 3 === 1 ? "#f2b632" : p.color;
        return (
          <span
            key={`${season}${i}`}
            className={`fx-particle ${p.cls}`}
            style={{
              left: `${spread(i, 2) * 100}%`,
              top: p.cls === "fx-glint" ? `${10 + spread(i, 4) * 50}%` : undefined,
              width: p.w,
              height: p.h,
              background: color,
              borderRadius: p.round,
              animationDuration: `${dur}s`,
              animationDelay: `${-spread(i, 3) * dur}s`,
            }}
          />
        );
      })}
    </div>
  );
});

// ── People ────────────────────────────────────────────

const SKIN = "#f2c9a0";
const PALE = "#e4e1d6";

const TOP: Record<Outfit, string> = {
  kid: "#ffc93c",
  uniform: "#24305e",
  military: "#5b6b3a",
  suit: "#3a3f4b",
  work: "#2f4f7f",
  apron: "#f1f1f1",
  casual: "#3aa6a0",
  retired: "#cdb38a",
};
const BOTTOM: Record<Outfit, string> = {
  kid: "#3c6fd1",
  uniform: "#24305e",
  military: "#4d5c30",
  suit: "#2b2f38",
  work: "#26324a",
  apron: "#3b4a68",
  casual: "#3c5a99",
  retired: "#8c7b5c",
};

const Family = memo(
  function Family({ scene }: { scene: SceneState }) {
    // Walking right: partner, me, then the children, the stroller and the dog out in front.
    const items: { key: string; w: number; draw: (x: number) => ReactNode }[] = [];
    if (scene.spouse) {
      const sp = scene.spouse;
      items.push({ key: "spouse", w: 18, draw: (x) => <Figure p={sp} x={x} tone={sp.look === "f" ? "#e86f8a" : "#5b7bd5"} /> });
    }
    items.push({ key: "me", w: 20, draw: (x) => <Figure p={scene.me} x={x} me /> });
    for (const [i, k] of scene.kids.entries()) {
      if (k.age < 2) items.push({ key: `kid${i}`, w: 18, draw: (x) => <Stroller x={x} /> });
      else items.push({ key: `kid${i}`, w: 9 + scaleOf(k.age) * 8, draw: (x) => <Figure p={k} x={x} tone={i % 2 ? "#f28fb0" : "#7cc576"} /> });
    }
    if (scene.pet) items.push({ key: "pet", w: 16, draw: (x) => <Dog x={x} /> });
    const total = items.reduce((a, b) => a + b.w, 0);
    let cursor = 100 - total / 2;
    return (
      <svg aria-hidden viewBox="0 0 200 120" className="walk absolute bottom-0 left-1/2 h-full w-auto -translate-x-[60%]" preserveAspectRatio="xMidYMax meet">
        <ellipse cx="100" cy={GROUND + 1} rx={total / 2 + 4} ry="2" fill="#000000" opacity="0.12" />
        {items.map((it) => {
          const x = cursor + it.w / 2;
          cursor += it.w;
          return <g key={it.key}>{it.draw(x)}</g>;
        })}
      </svg>
    );
  },
  (a, b) => JSON.stringify(a.scene) === JSON.stringify(b.scene),
);

const scaleOf = (age: number) => (age >= 18 ? 1 : 0.42 + (Math.max(2, age) / 18) * 0.58);

/** A person standing on the ground at x. Size follows age; hair greys; face follows mood; skin follows health. */
function Figure({ p, x, me = false, tone }: { p: Person; x: number; me?: boolean; tone?: string }) {
  const s = scaleOf(p.age);
  const skin = p.pale ? PALE : SKIN;
  const top = tone && (p.outfit === "casual" || p.outfit === "kid") ? tone : TOP[p.outfit];
  const bottom = BOTTOM[p.outfit];
  const hair = p.age >= 80 ? "#eeeeee" : p.age >= 60 ? "#b9b9b9" : p.age >= 45 ? "#5a4a42" : "#2e2522";
  const skirt = p.look === "f" && (p.outfit === "uniform" || p.outfit === "suit");
  const old = p.age >= 72;
  return (
    <g transform={`translate(${x} ${GROUND}) scale(${s})`}>
      <g className={old ? "bob bob-slow" : "bob"}>
        {/* legs */}
        <g className="leg leg-a">
          <rect x="-3.6" y="-17" width="3.4" height="16" fill={skirt ? skin : bottom} />
          <rect x="-4.2" y="-2" width="4.6" height="2" rx="1" fill="#2b2b2b" />
        </g>
        <g className="leg leg-b">
          <rect x="0.2" y="-17" width="3.4" height="16" fill={skirt ? skin : bottom} />
          <rect x="-0.2" y="-2" width="4.6" height="2" rx="1" fill="#2b2b2b" />
        </g>
        {skirt && <path d="M-6 -18 L6 -18 L7.5 -9 L-7.5 -9Z" fill={bottom} />}
        {/* back arm */}
        <g className="arm arm-b">
          <rect x="-1.5" y="-31" width="3" height="13" rx="1.5" fill={top} />
        </g>
        {/* body */}
        <rect x="-6" y="-32" width="12" height="16" rx="3" fill={top} />
        <Outfit outfit={p.outfit} />
        {/* front arm, carrying a briefcase at work */}
        <g className="arm arm-a">
          <rect x="-1.5" y="-31" width="3" height="13" rx="1.5" fill={top} />
          <circle cx="0" cy="-17.5" r="1.7" fill={skin} />
          {p.outfit === "suit" && <rect x="-3" y="-17" width="6" height="5" rx="1" fill="#6b4226" />}
        </g>
        {old && <path d="M7 -17 L8.5 0" stroke="#6b4a2b" strokeWidth="1.4" strokeLinecap="round" />}
        {/* head */}
        {(p.look === "f" || p.look === "x") && <rect x="-7" y="-44" width="14" height={p.look === "f" ? 13 : 9} rx="5" fill={hair} />}
        <circle cx="0" cy="-39" r="6.5" fill={skin} />
        <path d="M-6.6 -40 Q-6 -47 0 -46.8 Q6 -47 6.6 -40 Q3 -43.5 -6.6 -40Z" fill={hair} />
        <Face mood={p.mood} pale={p.pale} />
        {p.outfit === "military" && <path d="M-7 -43 Q0 -50 7 -43 L8.5 -42 L-7 -42Z" fill="#4d5c30" />}
        {p.outfit === "retired" && p.age >= 65 && <path d="M-7.5 -43.5 Q0 -50 7.5 -43.5 L9 -42.5 L-9 -42.5Z" fill="#8c7b5c" />}
        {me && <path d="M0 -55 L-2.5 -59 L2.5 -59Z" fill="#6366f1" />}
      </g>
    </g>
  );
}

function Outfit({ outfit }: { outfit: Outfit }) {
  switch (outfit) {
    case "uniform":
      return (
        <>
          <path d="M-2.5 -32 L0 -26 L2.5 -32Z" fill="#ffffff" />
          <rect x="-0.7" y="-29" width="1.4" height="6" fill="#c0392b" />
        </>
      );
    case "suit":
      return (
        <>
          <path d="M-2.5 -32 L0 -25 L2.5 -32Z" fill="#ffffff" />
          <rect x="-0.6" y="-30" width="1.2" height="7" fill="#3b6fd8" />
        </>
      );
    case "military":
      return (
        <g fill="#3f4d26">
          <circle cx="-3" cy="-27" r="1.6" />
          <circle cx="2.5" cy="-22" r="1.8" />
          <circle cx="-1" cy="-19" r="1.2" />
        </g>
      );
    case "work":
      return (
        <g fill="#ff9f1c">
          <rect x="-6" y="-24" width="12" height="1.6" />
          <rect x="-6" y="-20" width="12" height="1.6" />
        </g>
      );
    case "apron":
      return <path d="M-4.5 -29 h9 v12 h-9Z M-4.5 -29 L-3 -32 M4.5 -29 L3 -32" fill="#2f5d50" stroke="#2f5d50" strokeWidth="0.8" />;
    case "retired":
      return (
        <g fill="#a68b5f">
          <rect x="-0.4" y="-32" width="0.8" height="16" />
          <circle cx="-1.6" cy="-27" r="0.6" />
          <circle cx="-1.6" cy="-23" r="0.6" />
        </g>
      );
    case "kid":
      return <rect x="-5" y="-31" width="3" height="10" rx="1" fill="#e2574c" />;
    case "casual":
      return <path d="M-3 -32 Q0 -29 3 -32" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1" fill="none" />;
  }
}

function Face({ mood, pale }: { mood: Person["mood"]; pale: boolean }) {
  const mouth = mood === "happy" ? "M-2.4 -36.2 Q0 -33.6 2.4 -36.2" : mood === "plain" ? "M-2 -35.4 L2 -35.4" : "M-2.4 -34.4 Q0 -36.8 2.4 -34.4";
  return (
    <g>
      <circle cx="-2.3" cy="-39.5" r="0.85" fill="#2b2b2b" />
      <circle cx="2.3" cy="-39.5" r="0.85" fill="#2b2b2b" />
      {mood === "sad" && (
        <g stroke="#2b2b2b" strokeWidth="0.6">
          <line x1="-3.4" y1="-42" x2="-1.4" y2="-41.2" />
          <line x1="3.4" y1="-42" x2="1.4" y2="-41.2" />
        </g>
      )}
      {mood === "happy" && !pale && (
        <g fill="#f28b82" opacity="0.6">
          <circle cx="-3.8" cy="-37" r="1.1" />
          <circle cx="3.8" cy="-37" r="1.1" />
        </g>
      )}
      {pale && <ellipse cx="4.5" cy="-41" rx="0.8" ry="1.3" fill="#8fc3e8" />}
      <path d={mouth} stroke="#2b2b2b" strokeWidth="0.8" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Stroller({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} ${GROUND})`}>
      <path d="M-7 -16 Q-7 -24 1 -24 L1 -16Z" fill="#8fb8e8" />
      <rect x="-8" y="-16" width="14" height="8" rx="2" fill="#5b8fd1" />
      <circle cx="-3" cy="-21" r="2.5" fill={SKIN} />
      <path d="M6 -14 L10 -24" stroke="#555555" strokeWidth="1" />
      <g className="wheel">
        <circle cx="-5" cy="-3" r="3" fill="none" stroke="#333333" strokeWidth="1.2" />
      </g>
      <g className="wheel">
        <circle cx="4" cy="-3" r="3" fill="none" stroke="#333333" strokeWidth="1.2" />
      </g>
    </g>
  );
}

function Dog({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} ${GROUND})`}>
      <g className="bob">
        <g className="leg leg-a">
          <rect x="-5" y="-6" width="1.6" height="6" fill="#a0703e" />
        </g>
        <g className="leg leg-b">
          <rect x="3" y="-6" width="1.6" height="6" fill="#a0703e" />
        </g>
        <ellipse cx="0" cy="-8" rx="7" ry="3.6" fill="#c68b4f" />
        <circle cx="7" cy="-11" r="3.2" fill="#c68b4f" />
        <path d="M6 -14 L5 -10 L8 -12Z" fill="#8a5a2e" />
        <circle cx="8.2" cy="-11.5" r="0.6" fill="#2b2b2b" />
        <g className="tail">
          <path d="M-7 -9 Q-10 -13 -9 -14" stroke="#c68b4f" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>
      </g>
    </g>
  );
}
