// Investments the player makes in their own words ("비트코인에 투자한다", "삼성전자 주식을 산다", "buy an index fund").
// A stake is bought at that month's real price (Bitcoin, KOSPI, S&P 500) and held until the player sells it at a later
// fork (invest-check), at that later month's price. So 1,000만원 of Bitcoin bought in January 2013 is worth what Bitcoin
// was worth when it is sold, and a loss is never more than what was put in.
// Prices past the last known month are a seeded random walk of the life, so a life replays the same.
import type { EventDef } from "./events";
import { formatWealth } from "./format";
import { L, V } from "./i18n";
import { isEn, isUS } from "./region";
import { Rng } from "./rng";
import type { Holding, InvestAsset, LifeState } from "./types";

export interface Bet {
  asset: InvestAsset;
  name: string; // Korean key, shown with V(): "비트코인", "주식", "삼성전자 주식", "펀드"
  ticker?: string; // a listed company with its own prices (TICKERS)
}

// What the player bought, read from their words. Saving (적금, 예금) is not an investment here.
const BUY = /투자|사[는다자고서기]|산다|샀|살래|매수|넣|올인|묻[는어고]|담[는다아]|굴리|한다|해\s?본다|시작|\b(buy|bought|invest|put|go all in|all in|get into|try)\b/i;
const NOT_BUY = /공부|강의|배우|책을|study|learn|read about/i;
const NEGATED = /(않|안\s|안 한|못\s|말자|말고|포기|접어\s?두|팔[아고는]|판다|매도)|\b(not|don't|won't|never|sell|sold)\b/i;

const KINDS: [InvestAsset, RegExp, (m: RegExpMatchArray) => string][] = [
  ["crypto", /비트\s?코인|bitcoin|\bBTC\b/i, () => "비트코인"],
  ["altcoin", /이더리움|ethereum/i, () => "이더리움"],
  ["altcoin", /가상\s?화폐|암호\s?화폐|코인(?!\s?노래|\s?세탁|\s?빨래)|\bcrypto(currency|currencies)?\b|\bcoins?\b/i, () => "가상화폐"],
  ["fund", /펀드|\bETF\b|인덱스|index fund|mutual fund|S&P|\b401\(?k\)?/i, () => "펀드"],
  ["stock", /([가-힣A-Za-z]{2,10})\s?주식|주식|종목|\bstocks?\b|\bshares\b/i, (m) => (m[1] && !/^(국내|해외|미국|우량|성장|가치|소형|대형|개별|테마|급등|그|이|내|모든)$/.test(m[1]) ? `${m[1]} 주식` : "주식")],
];

/** The asset the player's words buy, or null when they don't buy one. */
export function investIn(text: string | undefined): Bet | null {
  const t = text?.trim();
  if (!t || NEGATED.test(t) || NOT_BUY.test(t) || /적금|예금|저축|savings account|\bCDs?\b/i.test(t) && !/주식|펀드|코인|stock|fund|crypto|bitcoin/i.test(t)) return null;
  // A company with its own price table, named with a word about buying its shares ("삼성전자 주식을 산다", "테슬라에 투자한다").
  if (STOCK_TALK.test(t)) {
    const tk = TICKERS.find((x) => x.re.test(t));
    if (tk) return { asset: "stock", name: `${tk.ko} 주식`, ticker: tk.id };
  }
  for (const [asset, re, name] of KINDS) {
    const m = t.match(re);
    if (m && BUY.test(t)) return { asset, name: name(m) };
  }
  return null;
}

/** The listed company's own name in the text, if its shares could be bought that month; else the market's shares. */
export function tradable(bet: Bet, mi: number): Bet {
  const tk = bet.ticker ? TICKERS.find((x) => x.id === bet.ticker) : undefined;
  return !tk || mi >= mo(tk.points[0]) ? bet : { asset: "stock", name: "주식" };
}

/** An amount of money named in a text, in engine units (만원; ten dollars in an American life). */
export function amountIn(text: string | undefined): number | undefined {
  if (!text) return undefined;
  const ko = text.match(/(\d[\d,.]*)\s*(억|천만|백만|천|만)\s*원?/);
  if (ko) {
    const n = Number(ko[1].replace(/,/g, ""));
    const unit = { 억: 10000, 천만: 1000, 백만: 100, 천: 0.1, 만: 1 }[ko[2] as "억"];
    if (n > 0) return Math.round(n * unit);
  }
  const en = text.match(/\$\s?(\d[\d,.]*)\s*(k|thousand|million|m)?\b/i);
  if (en) {
    const n = Number(en[1].replace(/,/g, ""));
    const mult = /^(m|million)$/i.test(en[2] ?? "") ? 1_000_000 : /^(k|thousand)$/i.test(en[2] ?? "") ? 1000 : 1;
    if (n > 0) return Math.round((n * mult) / 10);
  }
  return undefined;
}

/**
 * How much goes in: what the player wrote ("1000만원", "전 재산", "절반"), else the amount the scene was about,
 * else about a third of the savings. Never more than the savings (a little pocket money when there are none).
 */
export function stakeFor(s: Pick<LifeState, "wealth">, text: string, scene = ""): number {
  const have = Math.max(0, s.wealth);
  let want: number;
  if (/전\s?재산|올인|몽땅|전부|모두|\b(everything|all (of )?my (money|savings)|all in)\b/i.test(text)) want = have;
  else if (/절반|반을|\bhalf\b/i.test(text)) want = have / 2;
  else want = amountIn(text) ?? amountIn(scene) ?? have * 0.3;
  const stake = Math.min(want, have);
  return Math.max(stake >= 100 ? Math.round(stake / 10) * 10 : Math.round(stake), Math.min(50, have || 50));
}

// ── Prices ────────────────────────────────────────────

type Point = [year: number, month: number, value: number];

// Month-end levels, rounded; between two points the price moves evenly (in percent terms).
const BTC: Point[] = [
  [2010, 7, 0.08], [2011, 6, 15], [2011, 11, 3], [2012, 12, 13], [2013, 4, 130], [2013, 11, 1100], [2013, 12, 750],
  [2014, 12, 320], [2015, 8, 230], [2015, 12, 430], [2016, 12, 960], [2017, 12, 14000], [2018, 12, 3700], [2019, 6, 11000],
  [2019, 12, 7200], [2020, 3, 6400], [2020, 12, 29000], [2021, 4, 58000], [2021, 7, 33000], [2021, 11, 64000],
  [2022, 11, 16500], [2023, 12, 42000], [2024, 3, 70000], [2024, 12, 94000], [2025, 10, 110000],
];
const KOSPI: Point[] = [
  [1980, 1, 100], [1985, 1, 140], [1987, 12, 525], [1989, 4, 1000], [1992, 8, 460], [1994, 11, 1140], [1997, 12, 380],
  [1998, 6, 290], [1999, 12, 1030], [2000, 12, 500], [2001, 9, 470], [2002, 4, 940], [2003, 3, 520], [2005, 12, 1380],
  [2007, 10, 2060], [2008, 10, 940], [2009, 12, 1680], [2011, 4, 2230], [2011, 9, 1770], [2013, 1, 1960], [2015, 12, 1960],
  [2017, 12, 2470], [2018, 12, 2040], [2019, 12, 2200], [2020, 3, 1450], [2020, 12, 2870], [2021, 6, 3300], [2022, 9, 2150],
  [2023, 12, 2650], [2024, 12, 2400], [2025, 6, 3070], [2025, 10, 4100],
];
const SP500: Point[] = [
  [1970, 1, 90], [1973, 1, 118], [1974, 10, 63], [1980, 1, 115], [1982, 8, 107], [1987, 8, 330], [1987, 12, 247],
  [1990, 1, 330], [1995, 1, 470], [2000, 3, 1500], [2002, 10, 800], [2007, 10, 1550], [2009, 3, 700], [2013, 1, 1500],
  [2015, 12, 2040], [2018, 1, 2820], [2018, 12, 2500], [2020, 2, 3380], [2020, 3, 2580], [2021, 12, 4770], [2022, 10, 3600],
  [2023, 12, 4770], [2024, 12, 5880], [2025, 4, 5500], [2025, 10, 6800],
];

// Single companies, priced in their own currency and adjusted for splits; the first point is when it can be bought here.
// Rough on purpose: year-end levels and the big turns, so a 2013 Samsung or a 2019 Tesla plays out as it did.
// Only words about shares: "애플 노트북을 산다" buys a laptop, not Apple.
const STOCK_TALK = /주식|주주|종목|투자|매수|\b(stocks?|shares|invest\w*)\b/i;
const TICKERS: { id: string; ko: string; re: RegExp; points: Point[] }[] = [
  { id: "samsung", ko: "삼성전자", re: /삼성전자|삼전|samsung/i, points: [
    [1990, 1, 600], [1995, 12, 2400], [1997, 12, 940], [1999, 12, 6000], [2000, 12, 3600], [2002, 12, 6400], [2004, 12, 9000],
    [2007, 12, 11000], [2008, 10, 8500], [2010, 12, 19000], [2012, 12, 30400], [2014, 12, 26600], [2016, 12, 36000], [2017, 12, 51000],
    [2018, 12, 38700], [2019, 12, 55800], [2020, 12, 81000], [2021, 1, 89000], [2022, 9, 53000], [2023, 12, 78500], [2024, 11, 50000],
    [2025, 10, 98000]] },
  { id: "hynix", ko: "SK하이닉스", re: /하이닉스|hynix/i, points: [
    [2012, 3, 27000], [2012, 12, 26000], [2014, 12, 47000], [2016, 12, 44000], [2017, 12, 76000], [2018, 12, 59000], [2020, 12, 118000],
    [2022, 12, 75000], [2023, 12, 141000], [2024, 6, 230000], [2024, 12, 172000], [2025, 10, 500000]] },
  { id: "hyundai", ko: "현대자동차", re: /현대\s?자동차|현대차|hyundai/i, points: [
    [2000, 12, 13000], [2002, 12, 30000], [2005, 12, 90000], [2008, 10, 45000], [2010, 12, 180000], [2012, 4, 270000], [2014, 12, 170000],
    [2016, 12, 146000], [2019, 12, 122000], [2020, 12, 192000], [2021, 1, 255000], [2022, 12, 152000], [2024, 6, 280000], [2025, 10, 260000]] },
  { id: "naver", ko: "네이버", re: /네이버|naver/i, points: [
    [2013, 12, 145000], [2016, 12, 155000], [2018, 12, 120000], [2020, 12, 290000], [2021, 7, 450000], [2022, 12, 177000],
    [2023, 12, 224000], [2024, 12, 213000], [2025, 10, 250000]] },
  { id: "kakao", ko: "카카오", re: /카카오|kakao/i, points: [
    [2014, 12, 26000], [2017, 12, 27000], [2019, 12, 31000], [2020, 12, 78000], [2021, 6, 160000], [2022, 12, 53000], [2023, 12, 54000],
    [2024, 12, 38000], [2025, 10, 60000]] },
  { id: "apple", ko: "애플", re: /애플|apple/i, points: [
    [1990, 1, 0.3], [1997, 12, 0.12], [2000, 3, 1.0], [2003, 4, 0.23], [2007, 12, 7], [2009, 1, 3], [2012, 9, 25], [2013, 4, 14],
    [2015, 5, 33], [2016, 5, 23], [2018, 10, 55], [2019, 1, 38], [2020, 12, 132], [2022, 12, 129], [2023, 12, 192], [2024, 12, 250],
    [2025, 4, 200], [2025, 10, 260]] },
  { id: "microsoft", ko: "마이크로소프트", re: /마이크로소프트|마소|microsoft|\bMSFT\b/i, points: [
    [1990, 1, 1], [1999, 12, 58], [2002, 7, 22], [2008, 12, 19], [2012, 12, 27], [2016, 12, 62], [2019, 12, 158], [2021, 12, 336],
    [2022, 12, 240], [2023, 12, 376], [2024, 12, 421], [2025, 10, 520]] },
  { id: "amazon", ko: "아마존", re: /아마존|amazon/i, points: [
    [1998, 1, 0.25], [1999, 12, 4.4], [2001, 9, 0.3], [2007, 12, 4.6], [2008, 11, 2.4], [2013, 12, 20], [2018, 8, 100], [2018, 12, 75],
    [2020, 12, 163], [2022, 12, 84], [2023, 12, 152], [2024, 12, 220], [2025, 10, 220]] },
  { id: "google", ko: "구글", re: /구글|알파벳|google|alphabet/i, points: [
    [2004, 8, 2.5], [2007, 11, 17], [2008, 11, 7], [2013, 12, 28], [2018, 12, 52], [2020, 12, 87], [2021, 11, 148], [2022, 12, 88],
    [2023, 12, 140], [2024, 12, 190], [2025, 4, 150], [2025, 10, 260]] },
  { id: "nvidia", ko: "엔비디아", re: /엔비디아|nvidia/i, points: [
    [2000, 1, 0.1], [2002, 1, 0.5], [2002, 10, 0.06], [2007, 10, 0.9], [2008, 11, 0.15], [2015, 12, 0.8], [2018, 9, 7], [2018, 12, 3.3],
    [2020, 12, 13], [2021, 11, 33], [2022, 10, 11], [2023, 12, 49], [2024, 12, 135], [2025, 4, 95], [2025, 10, 200]] },
  { id: "tesla", ko: "테슬라", re: /테슬라|tesla/i, points: [
    [2010, 7, 1.3], [2013, 12, 10], [2016, 12, 14], [2019, 6, 15], [2020, 12, 235], [2021, 11, 400], [2022, 12, 123], [2023, 7, 270],
    [2024, 4, 145], [2024, 12, 400], [2025, 4, 250], [2025, 10, 450]] },
];

// Yearly drift and swing (log) for months outside the known prices.
const WALK: Record<InvestAsset, [number, number]> = { crypto: [0.15, 0.6], altcoin: [0.05, 0.8], stock: [0.05, 0.2], fund: [0.06, 0.16] };
// How far one holding wanders from its market each year: one company's shares, one coin, or a fund's fees.
const OWN: Record<InvestAsset, number> = { crypto: 0, altcoin: 0.5, stock: 0.3, fund: 0.05 };

const mo = ([y, m]: Point) => y * 12 + m - 1;

/** A normal draw from a seed (Box-Muller), the same every time for the same seed. */
function z(seed: number): number {
  const r = new Rng(seed);
  const a = Math.max(1e-9, r.next());
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * r.next());
}

/** A seeded yearly random walk, in log terms, from month a to month b (b may be before a). */
function walk(asset: InvestAsset, seed: number, a: number, b: number): number {
  const [mu, sigma] = WALK[asset];
  const dir = Math.sign(b - a);
  let x = 0;
  for (let m = a; m !== b; m += dir) {
    const year = Math.floor(m / 12);
    x += dir * (mu / 12 + (sigma / Math.sqrt(12)) * z(seed * 7919 + year * 131 + (m % 12) * 17));
  }
  return x;
}

/** The market's level in month mi (log), from the known prices or the life's own walk past them. */
function market(asset: InvestAsset, mi: number, seed: number, ticker?: string): number {
  const pts = (ticker && TICKERS.find((x) => x.id === ticker)?.points) || (asset === "crypto" || asset === "altcoin" ? BTC : isUS() ? SP500 : KOSPI);
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (mi <= mo(first)) return Math.log(first[2]) + walk(asset, seed, mo(first), mi);
  if (mi >= mo(last)) return Math.log(last[2]) + walk(asset, seed, mo(last), mi);
  const i = pts.findIndex((p) => mo(p) > mi);
  const [a, b] = [pts[i - 1], pts[i]];
  const f = (mi - mo(a)) / (mo(b) - mo(a));
  return Math.log(a[2]) + f * (Math.log(b[2]) - Math.log(a[2]));
}

/** This holding's own price in month mi (log): the market's, plus how the one stock or coin did. */
function price(h: Pick<Holding, "asset" | "seed" | "since" | "ticker">, mi: number): number {
  // A company with its own prices already moves on its own; only past them does it wander like one stock.
  const own = h.ticker ? 0 : OWN[h.asset];
  let x = market(h.asset, mi, h.seed, h.ticker);
  if (own) {
    const years = (mi - h.since) / 12;
    const step = Math.floor(years);
    for (let k = 0; k < step; k++) x += own * z(h.seed * 31 + k);
    x += (years - step) * own * z(h.seed * 31 + step);
  }
  return x;
}

/** Bitcoin's exchanges were hacked or went under now and then, worst in the early years: the month it hits this holding, if it does. */
function hackAt(h: Holding): number | undefined {
  if (h.asset !== "crypto" && h.asset !== "altcoin") return undefined;
  const r = new Rng(h.seed ^ 0x5bd1e995);
  const year = Math.floor(h.since / 12);
  return r.chance(year < 2018 ? 0.12 : 0.05) ? h.since + 6 + Math.floor(r.next() * 30) : undefined;
}

/** What the holding is worth in month mi, in engine units. */
export function worth(h: Holding, mi: number): number {
  const v = h.units * Math.exp(price(h, mi));
  const hit = hackAt(h);
  return Math.round(hit !== undefined && mi >= hit ? v * 0.1 : v);
}

export const hacked = (h: Holding, mi: number) => {
  const hit = hackAt(h);
  return hit !== undefined && mi >= hit;
};

/** Buys into a holding (or adds to the same one). Returns the new holding. */
export function buy(prev: Holding | undefined, bet: Bet, stake: number, mi: number, seed: number): Holding {
  const base: Holding = prev && prev.name === bet.name ? prev : { asset: bet.asset, name: bet.name, ...(bet.ticker ? { ticker: bet.ticker } : {}), cost: 0, units: 0, since: mi, seed: seed || 1 };
  return { ...base, cost: base.cost + stake, units: base.units + stake / Math.exp(price(base, mi)) };
}

const won = (v: number) => formatWealth(Math.round(v));

/** A Korean noun with 을 or 를; an English text takes the word as it is. */
function obj(word: string): string {
  if (isEn()) return word;
  const code = (word.at(-1) ?? "").charCodeAt(0) - 0xac00;
  return code >= 0 && code <= 11171 ? `${word}${code % 28 === 0 ? "를" : "을"}` : `${word}을(를)`;
}

/** "1년 3개월", "8개월": how long the holding has been kept. */
function heldFor(months: number): string {
  const y = Math.floor(months / 12);
  const m = y ? months % 12 : Math.max(1, months);
  if (isEn()) return [y ? `${y} year${y > 1 ? "s" : ""}` : "", m ? `${m} month${m > 1 ? "s" : ""}` : ""].filter(Boolean).join(" and ");
  return [y ? `${y}년` : "", m ? `${m}개월` : ""].filter(Boolean).join(" ");
}

/** The holding as the narrator reads it in the facts. */
export function holdingFact(h: Holding, mi: number): string {
  return L`${V(h.name)} 보유 중 (${heldFor(mi - h.since)} 전부터 ${won(h.cost)} 투자, 지금 평가액 약 ${won(worth(h, mi))}). 아직 팔지 않았으므로 번 돈이나 잃은 돈은 순자산에 들어가지 않았음`;
}

/** What selling it says, with the gain or loss. */
export function saleText(h: Holding, mi: number): string {
  const v = worth(h, mi);
  const r = v / h.cost;
  const name = V(h.name);
  const lead = hacked(h, mi)
    ? L`거래하던 거래소가 해킹을 당해 ${name} 대부분이 사라졌다. 남은 것을 모두 팔았다.`
    : r >= 10
      ? L`${obj(name)} 모두 팔았다. 믿기지 않는 숫자였다.`
      : r >= 1.3
        ? L`${obj(name)} 모두 팔아 수익을 냈다.`
        : r >= 0.9
          ? L`${obj(name)} 모두 팔았다. 크게 벌지도 잃지도 않았다.`
          : L`손해를 보고 ${obj(name)} 모두 팔았다.`;
  return L`${lead} ${won(h.cost)} → ${won(v)}.`;
}

// ── The fork that follows a holding ───────────────────

const held = (s: LifeState) => (s.flags.holding ? s.mi - s.flags.holding.since : -1);

export const INVEST_EVENTS: EventDef[] = [
  // 직접 쓴 투자(엔진: invest) → 몇 달 뒤부터 팔지, 더 들고 갈지 정한다
  {
    id: "invest-check",
    get title() { return L("투자의 갈림길"); },
    category: "money",
    get keywords() { return [L("투자"), L("수익")]; },
    minAge: 15,
    maxAge: 100,
    perYear: 1.5,
    repeatable: true,
    cooldown: 10,
    when: (s) => held(s) >= 8,
    intro: (s) => {
      const h = s.flags.holding!;
      const v = worth(h, s.mi);
      const r = v / h.cost;
      const name = V(h.name);
      const was = L`${heldFor(s.mi - h.since)} 전 ${name}에 넣은 ${won(h.cost)}이 지금 ${won(v)}이다.`;
      const mood = hacked(h, s.mi)
        ? L("쓰던 거래소가 해킹을 당했다는 뉴스가 떴다. 남은 게 얼마 되지 않는다.")
        : r >= 5
          ? L("주변에서는 꿈같은 이야기라며 부러워한다. 여기서 더 오를지, 꺾일지는 아무도 모른다.")
          : r >= 1.3
            ? L("수익이 꽤 났다. 지금 팔면 확실하지만, 더 오를 것 같기도 하다.")
            : r >= 0.9
              ? L("제자리걸음이다. 계속 들고 있을 이유를 다시 생각해 본다.")
              : L("손실이 났다. 밤마다 시세를 확인하게 된다.");
      return `${was} ${mood}`;
    },
    choices: [
      {
        id: "sell",
        get label() { return L("지금 판다"); },
        effect: { text: "", cashOut: true },
      },
      {
        id: "hold",
        get label() { return L("더 들고 간다"); },
        effect: { get text() { return L("조금 더 들고 가기로 했다."); }, stats: { happiness: -1 } },
      },
    ],
  },
];
