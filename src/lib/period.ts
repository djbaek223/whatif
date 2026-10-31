// What a year had and didn't have, so a life in 1967 doesn't meet a laptop or 삼성전자's Giheung plant.
// Three uses:
// - anachronism(text, year): the first thing in a text that didn't exist yet (or anymore). The hybrid check
//   (conflictIn) drops a narrator's moment that names one, and the engine skips pool events and lines that do.
// - periodize(text, year): renames what had another name then (수능 → 학력고사, 초등학교 → 국민학교, 포스코 → 포항제철).
// - periodFacts(year): the "시대:" line handed to the narrator: what is not there yet, and how people lived then.
import { datedCompanies, SCHOOL_SINCE } from "./catalog";
import { V } from "./i18n";
import { inRegion, isEn, isUS, langFor, region } from "./region";

interface Thing {
  re: RegExp; // Korean and English words for it
  kr: number; // first year it was part of ordinary life in Korea
  us?: number; // ...in America, when different
  until?: number; // last year (a company under an old name)
  label: string; // shown to the narrator in the "not yet" list (Korean)
  en: string; // ...in English
  hint?: boolean; // listed to the narrator while it doesn't exist yet
}

const t = (re: RegExp, kr: number, label: string, en: string, more: Partial<Thing> = {}): Thing => ({ re, kr, label, en, ...more });

// Years are when an ordinary person would have one or use it, not the first one sold. Rough on purpose:
// a story set a year or two early reads fine; one set twenty years early is what this guards against.
const THINGS: Thing[] = [
  // Phones and messages
  t(/스마트\s?폰|아이폰|smart\s?phones?|iPhones?/i, 2009, "스마트폰", "smartphones", { us: 2007, hint: true }),
  t(/휴대\s?폰|핸드폰|휴대\s?전화|cell\s?phones?|mobile phones?|cellphones?/i, 1996, "휴대폰", "cell phones", { us: 1993, hint: true }),
  t(/삐삐|호출기|\bpagers?\b|\bbeepers?\b/i, 1988, "삐삐", "pagers", { us: 1984 }),
  t(/문자\s?메시지|문자(를|가) (보내|받|왔|남겼)|문자로 (보내|알려|연락)|\btext(ed|ing)?\s(message|him|her|me|you|them)|\btexts? from\b/i, 1998, "문자 메시지", "text messages", { us: 2000, hint: true }),
  t(/카톡|카카오톡|단톡|단체\s?톡|KakaoTalk|group chats?/i, 2010, "카카오톡·단톡방", "group chats", { us: 2010, hint: true }),
  t(/메신저|\bmessenger\b|\bMSN\b|네이트온/i, 1999, "메신저", "messengers", { us: 1997 }),
  t(/화상\s?(회의|통화)|영상\s?통화|video\s?(call|chat)s?|FaceTime|\bZoom\b|줌 회의/i, 2010, "영상 통화·화상 회의", "video calls", { us: 2010, hint: true }),
  t(/팩스|\bfax(ed|es)?\b/i, 1986, "팩스", "fax", { us: 1975 }),
  // Computers and the internet
  t(/노트북|랩톱|laptops?|notebook computers?/i, 1993, "노트북", "laptops", { us: 1990, hint: true }),
  t(/태블릿|아이패드|iPads?|tablet computers?/i, 2010, "태블릿", "tablets", { hint: true }),
  t(/컴퓨터|데스크톱|\bPCs?\b(?!방)|computers?|desktops?/i, 1981, "개인 컴퓨터", "personal computers", { us: 1978, hint: true }),
  t(/인터넷|온라인|이메일|메일함|(?<![가-힣])메일|웹사이트|홈페이지|검색창|internet|\bonline\b|e-?mails?|websites?|web pages?/i, 1996, "인터넷·이메일", "the internet and email", { us: 1995, hint: true }),
  t(/PC방|피시방|internet caf[eé]s?/i, 1998, "PC방", "internet cafés", { us: 1996 }),
  t(/파워포인트|\bPPT\b|엑셀\s?(파일|시트|표|작업)|PowerPoint|Excel|spreadsheets?/i, 1993, "파워포인트·엑셀", "PowerPoint and Excel", { us: 1990 }),
  t(/와이파이|Wi-?Fi/i, 2009, "와이파이", "Wi-Fi", { us: 2004 }),
  t(/블로그|\bblogs?\b|blogging/i, 2003, "블로그", "blogs", { us: 2000 }),
  t(/싸이월드|미니홈피/i, 2001, "싸이월드", "Cyworld"),
  t(/\bSNS\b|소셜\s?미디어|social media/i, 2009, "SNS", "social media", { us: 2005, hint: true }),
  t(/인스타|Instagram/i, 2011, "인스타그램", "Instagram", { us: 2010 }),
  t(/페이스북|Facebook/i, 2008, "페이스북", "Facebook", { us: 2004 }),
  t(/트위터|Twitter/i, 2009, "트위터", "Twitter", { us: 2006 }),
  t(/유튜브|유튜버|YouTube(rs?)?/i, 2008, "유튜브", "YouTube", { us: 2005, hint: true }),
  t(/넷플릭스|Netflix/i, 2016, "넷플릭스", "Netflix", { us: 1998 }),
  t(/스트리밍|streaming/i, 2012, "스트리밍", "streaming", { us: 2008 }),
  t(/(?<![가-힣])앱(?!솔)|\bapps?\b/i, 2009, "스마트폰 앱", "apps", { us: 2008, hint: true }),
  t(/배달\s?앱|배민|배달의민족|쿠팡이츠|요기요|delivery apps?|DoorDash|Uber Eats|Grubhub/i, 2011, "배달앱", "delivery apps", { us: 2014 }),
  t(/배달\s?라이더|delivery riders?/i, 2015, "배달 라이더", "delivery riders", { us: 2015 }),
  t(/카카오\s?택시|택시\s?앱|\bUber\b|\bLyft\b|ride-?shar(e|ing)/i, 2015, "택시 앱", "ride-hailing apps", { us: 2010 }),
  t(/웹툰|webtoons?/i, 2004, "웹툰", "webtoons", { us: 2014 }),
  t(/인강|인터넷 강의|온라인 강의|online (class|course|lecture)s?/i, 2002, "인터넷 강의", "online classes", { us: 2010 }),
  t(/코인\s?노래방/i, 2015, "코인노래방", "coin karaoke"),
  t(/비트코인|가상\s?화폐|암호\s?화폐|코인(?!\s?노래|\s?세탁|\s?빨래)|bitcoin|crypto(currency)?/i, 2017, "코인", "crypto", { us: 2013, hint: true }),
  t(/생성형\s?AI|챗\s?GPT|ChatGPT|AI 챗봇|chatbots?|generative AI/i, 2023, "생성형 AI", "generative AI", { hint: true }),
  t(/\bAI\b|인공지능/i, 2016, "AI", "AI", { us: 2011 }),
  t(/재택\s?근무|remote work|work(ing|ed)? from home|\bWFH\b/i, 2020, "재택근무", "working from home", { hint: true }),
  t(/코로나|COVID|팬데믹|pandemic/i, 2020, "코로나", "COVID"),
  // Things at home and on the street
  t(/\bTV\b|텔레비전|television/i, 1966, "TV", "TV", { us: 1950 }),
  t(/컬러\s?(TV|텔레비전)|colou?r TV/i, 1980, "컬러 TV", "color TV", { us: 1965 }),
  t(/냉장고|refrigerators?|fridges?/i, 1970, "냉장고", "refrigerators", { us: 1935 }),
  t(/세탁기|washing machines?/i, 1975, "세탁기", "washing machines", { us: 1945 }),
  t(/전자레인지|microwave/i, 1982, "전자레인지", "microwaves", { us: 1975 }),
  t(/비디오\s?(테이프|가게|대여점)|\bVCRs?\b|video\s?(store|tape)s?|videotapes?/i, 1983, "비디오", "VCRs", { us: 1978 }),
  t(/워크맨|Walkman/i, 1981, "워크맨", "the Walkman", { us: 1980 }),
  t(/\bCDs?\b|CD\s?플레이어/i, 1988, "CD", "CDs", { us: 1985 }),
  t(/\bMP3\b|아이팟|iPods?/i, 2000, "MP3", "MP3 players", { us: 2001 }),
  t(/\bDVDs?\b/i, 1999, "DVD", "DVDs", { us: 1998 }),
  t(/디카|디지털\s?카메라|digital cameras?/i, 2000, "디지털카메라", "digital cameras", { us: 1999 }),
  t(/셀카|셀피|selfies?/i, 2005, "셀카", "selfies", { us: 2010 }),
  t(/내비게이션|내비|\bGPS\b/i, 2004, "내비게이션", "GPS", { us: 2005 }),
  t(/에어팟|무선\s?이어폰|AirPods|wireless earbuds/i, 2016, "무선 이어폰", "wireless earbuds"),
  t(/전기차|테슬라|electric cars?|\bEVs?\b|Tesla/i, 2015, "전기차", "electric cars", { us: 2012 }),
  t(/드론|\bdrones?\b/i, 2015, "드론", "drones", { us: 2013 }),
  t(/신용\s?카드|credit cards?/i, 1982, "신용카드", "credit cards", { us: 1960 }),
  t(/체크\s?카드|debit cards?/i, 2000, "체크카드", "debit cards", { us: 1995 }),
  t(/교통\s?카드|버스\s?카드|MetroCard/i, 1996, "교통카드", "transit cards", { us: 1994 }),
  t(/현금\s?인출기|\bATMs?\b/i, 1984, "ATM", "ATMs", { us: 1972 }),
  t(/KTX|SRT/i, 2004, "KTX", "the KTX", { us: 2004 }),
  t(/지하철|subway/i, 1974, "지하철", "the subway", { us: 1900 }),
  t(/고속도로|expressway|interstate/i, 1968, "고속도로", "expressways", { us: 1956 }),
  t(/편의점|convenience stores?/i, 1989, "편의점", "convenience stores", { us: 1950 }),
  t(/대형\s?마트|이마트|홈플러스|코스트코|Costco|warehouse club/i, 1993, "대형마트", "warehouse stores", { us: 1983 }),
  t(/택배/i, 1992, "택배", "parcel delivery", { us: 1900 }),
  t(/노래방|karaoke/i, 1991, "노래방", "karaoke", { us: 1985 }),
  t(/스타벅스|Starbucks/i, 1999, "스타벅스", "Starbucks", { us: 1987 }),
  t(/아메리카노|카페\s?라테|라테|테이크\s?아웃 커피|americanos?|lattes?/i, 1999, "아메리카노·라테", "lattes", { us: 1990 }),
  t(/카페(?!인)/i, 1985, "카페 (그 전에는 다방)", "cafés"),
  t(/맥도날드|McDonald'?s/i, 1988, "맥도날드", "McDonald's", { us: 1955 }),
  t(/피자|pizza/i, 1985, "피자", "pizza", { us: 1950 }),
  t(/햄버거|hamburgers?/i, 1979, "햄버거", "hamburgers", { us: 1920 }),
  t(/치킨|fried chicken/i, 1977, "치킨집", "fried chicken", { us: 1900 }),
  t(/치맥/i, 2002, "치맥", "chimaek"),
  t(/해외\s?여행|trips? abroad|overseas (trip|travel|vacation)s?|travel(l?ed|ing)? abroad/i, 1989, "해외여행 (1989년 자유화)", "trips abroad", { us: 1950, hint: true }),
  t(/오피스텔/i, 1985, "오피스텔", "officetels"),
  t(/원룸|studio apartments?/i, 1992, "원룸", "studio apartments", { us: 1950 }),
  t(/신도시|분당|일산|new towns?/i, 1991, "1기 신도시", "the new towns", { us: 1950 }),
  t(/필라테스|Pilates/i, 2005, "필라테스", "Pilates", { us: 1995 }),
  t(/요가|\byoga\b/i, 1999, "요가", "yoga", { us: 1970 }),
  t(/헬스장|피트니스|\bgyms?\b|fitness (club|center)s?/i, 1985, "헬스장", "gyms", { us: 1970 }),
  t(/아이돌|K-?pop|케이팝/i, 1996, "아이돌", "K-pop idols", { us: 2012 }),
  t(/로또|\blotto\b|Powerball/i, 2002, "로또 (그 전에는 주택복권)", "lotto", { us: 1988 }),
  // Work and school words
  t(/스타트업|\b(a|the|tech) start-?ups?\b|start-?up (founder|company|companies|scene)s?/i, 2000, "스타트업", "startups", { us: 1995, hint: true }),
  t(/벤처\s?(기업|회사|캐피털)|venture (capital|firm)/i, 1995, "벤처기업", "venture firms", { us: 1975 }),
  t(/불금|불타는 금요일/i, 2010, "불금", "TGIF slang"),
  t(/주\s?5일|토요\s?휴무/i, 2004, "주 5일 근무", "the five-day week"),
  t(/주\s?52시간/i, 2018, "주 52시간제", "the 52-hour week"),
  t(/워라밸|work-life balance/i, 2017, "워라밸", "work-life balance", { us: 1990 }),
  t(/육아\s?휴직|parental leave|maternity leave|paternity leave/i, 1995, "육아휴직", "parental leave", { us: 1993, hint: true }),
  t(/취준생|취준|스펙 쌓|흙수저|금수저/i, 2005, "취준·스펙", "job-hunting slang"),
  t(/콜센터|call cent(er|re)s?/i, 1995, "콜센터", "call centers", { us: 1985 }),
  t(/반도체/i, 1975, "반도체 공장", "chip plants", { us: 1960 }),
  t(/기흥\s?(공장|반도체|캠퍼스)|Giheung/i, 1984, "삼성전자 기흥공장", "the Giheung plant", { us: 1984 }),
  // Schools that opened later
  t(/포항공대|포항공과대학교|POSTECH/i, 1987, "포항공대", "POSTECH"),
  t(/KAIST|카이스트/i, 1971, "KAIST", "KAIST"),
  t(/UNIST|DGIST|울산과학기술원/i, 2009, "UNIST", "UNIST"),
  t(/경상국립대/i, 2021, "경상국립대", "Gyeongsang National University"),
];

/** Employers in the catalog that opened, or changed name, within the game's years. */
let companyThings: Thing[] | null = null;
let companyKey = "";
function companies(): Thing[] {
  const key = `${isUS()}${isEn()}`;
  if (companyThings && companyKey === key) return companyThings;
  companyKey = key;
  const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  companyThings = datedCompanies().map((c) => {
    const names = [c.name, String(V(c.name))].filter((n, i, all) => n && all.indexOf(n) === i).map(esc);
    // Whole names only: "KB국민은행" is not "국민은행", "Metaphor" is not "Meta". Korean particles may follow.
    // An American "until" is the last year it hired, not the last year anyone said its name, so only Korea's old names expire.
    return { re: new RegExp(`(?<![가-힣A-Za-z])(${names.join("|")})(?![A-Za-z])`), kr: c.since ?? 0, until: isUS() ? undefined : c.until, label: c.name, en: String(V(c.name)) };
  });
  return companyThings;
}

const firstYear = (x: Thing) => (isUS() ? (x.us ?? x.kr) : x.kr);

/** Whether a thing is from another time than this year. */
const outOfTime = (x: Thing, year: number) => year < firstYear(x) || (x.until !== undefined && year > x.until);

/**
 * The first thing in the text that didn't exist yet (or anymore) in that year, as a short label, or null.
 * Checked after renaming, so "수능" in 1985 (shown as 학력고사) is fine.
 */
export function anachronism(text: string, year: number): string | null {
  if (!text) return null;
  const s = periodize(text, year);
  for (const x of THINGS) if (outOfTime(x, year) && x.re.test(s)) return isEn() ? x.en : x.label;
  for (const x of companies()) if (outOfTime(x, year) && x.re.test(s)) return isEn() ? x.en : x.label;
  return null;
}

/**
 * Runs fn in the life's own language (Korean for a Korean life, English for an American one). The engine decides
 * what fits the year on these words, so the same life plays the same in either display language.
 */
export const canon = <T>(fn: () => T): T => inRegion(region(), fn, langFor(region()));

/** Whether a school or company name the narrator or the player gave existed that year. */
export function existedIn(name: string | undefined, year: number): boolean {
  if (!name?.trim()) return true;
  const since = SCHOOL_SINCE[name.trim()];
  if (since !== undefined && year < since) return false;
  return !anachronism(name, year);
}

// ── Old names ─────────────────────────────────────────

type Rename = [RegExp, (year: number) => string | null];

// Korean text. Each returns the word for that year, or null to leave it.
const KO_RENAMES: Rename[] = [
  // The college entrance exam: 예비고사 (1969-81), 학력고사 (1982-93), 수능 from 1994's entrance (exam in 1993).
  [/대학수학능력시험|수학능력시험|수능/g, (y) => (y >= 1993 ? null : y >= 1982 ? "학력고사" : y >= 1969 ? "예비고사" : "입학시험")],
  [/초등학교/g, (y) => (y < 1996 ? "국민학교" : null)],
  [/초등학생/g, (y) => (y < 1996 ? "국민학생" : null)],
  [/포스코/g, (y) => (y < 2002 ? "포항제철" : null)],
  [/LG전자/g, (y) => (y < 1995 ? "금성사" : null)],
  [/LG화학/g, (y) => (y < 1995 ? "럭키" : null)],
  [/KB국민은행/g, (y) => (y < 2001 ? "국민은행" : null)],
  [/SK하이닉스/g, (y) => (y < 2001 ? "현대전자" : y < 2012 ? "하이닉스" : null)],
  [/CJ제일제당/g, (y) => (y < 1996 ? "제일제당" : null)],
  [/삼성생명/g, (y) => (y < 1989 ? "동방생명" : null)],
  [/로또/g, (y) => (y < 2002 ? "주택복권" : null)],
  [/스타트업/g, (y) => (y < 1998 ? "작은 회사" : null)],
  // Employers that took a new name while someone worked there, and the old names going back.
  [/한국전력주식회사/g, (y) => (y >= 1982 ? "한국전력공사" : null)],
  [/한국전력공사/g, (y) => (y < 1982 ? "한국전력주식회사" : null)],
  [/전주제지/g, (y) => (y >= 1991 ? "한솔제지" : null)],
  [/한솔제지/g, (y) => (y < 1991 ? "전주제지" : null)],
  [/금성사/g, (y) => (y >= 1995 ? "LG전자" : null)],
  [/럭키화학/g, (y) => (y >= 1995 ? "LG화학" : null)],
  [/포항종합제철|포항제철/g, (y) => (y >= 2002 ? "포스코" : null)],
  [/(?<!CJ\s?)제일제당/g, (y) => (y >= 1996 ? "CJ제일제당" : null)],
  [/동방생명/g, (y) => (y >= 1989 ? "삼성생명" : null)],
  [/삼성데이타시스템/g, (y) => (y >= 1997 ? "삼성SDS" : null)],
  [/데이콤/g, (y) => (y >= 2010 ? "LG유플러스" : null)],
  [/철도청/g, (y) => (y >= 2005 ? "한국철도공사" : null)],
  [/전매청/g, (y) => (y >= 1987 ? "한국담배인삼공사" : null)],
  [/미도파백화점/g, (y) => (y >= 2003 ? "롯데백화점" : null)],
  [/구로공단/g, (y) => (y >= 2000 ? "구로디지털단지" : null)],
  [/대우그룹/g, (y) => (y >= 2000 ? "대우인터내셔널" : null)],
  [/(?<!SC)제일은행/g, (y) => (y >= 2005 ? "SC제일은행" : null)],
  [/반려(동물|견)/g, (y) => (y < 2000 ? "애완$1" : null)],
];

const EN_RENAMES: Rename[] = [
  [/\b(the )?suneung( college entrance exam)?|\bCSAT\b/gi, (y) => (isUS() || y >= 1993 ? null : y >= 1982 ? "the national college exam (hakryeok gosa)" : "the college entrance exam")],
  [/\bPOSCO\b/g, (y) => (y < 2002 ? "Pohang Iron and Steel" : null)],
  [/\bLG Electronics\b/g, (y) => (y < 1995 ? "GoldStar" : null)],
  [/\blotto\b/gi, (y) => (!isUS() && y < 2002 ? "housing lottery" : null)],
  [/\bstartup founder\b/g, (y) => (y < (isUS() ? 1995 : 1998) ? "small business owner" : null)],
  [/\b(a )?startup\b/g, (y) => (y < (isUS() ? 1995 : 1998) ? "$1small company" : null)],
];

/** Text with names as they were in that year: 수능 → 학력고사 before 1993, 초등학교 → 국민학교 before 1996. */
export function periodize(text: string, year: number): string {
  if (!text) return text;
  let out = text;
  for (const [re, to] of /[가-힣]/.test(text) ? KO_RENAMES : EN_RENAMES) {
    const word = to(year);
    if (word !== null) out = out.replace(re, (m, g1) => word.replace("$1", g1 ?? ""));
  }
  return out;
}

// ── For the narrator ──────────────────────────────────

const KR_DECADE: [number, string, string][] = [
  [1950, "전후 복구기. 판잣집, 미군 물자, 라디오, 국민학교, 보릿고개, 버스보다 걷기.", "Post-war rebuilding: shacks, US Army surplus, radio, barley-hungry springs, walking more than riding."],
  [1960, "라디오와 흑백 TV(1966년부터 보급), 연탄, 공중전화와 편지·전보, 버스 안내양, 국민학교, 다방, 통행금지, 공장 취업과 상경.", "Radio and black-and-white TV (from 1966), coal briquettes, pay phones, letters and telegrams, bus girls, tea rooms (dabang), the night curfew, moving to Seoul for factory work."],
  [1970, "흑백 TV, 연탄, 집 전화는 드물어 공중전화·편지, 다방, 통행금지, 새마을운동, 구로공단·마산 수출공단, 중동 건설 붐, 예비고사.", "Black-and-white TV, coal briquettes, few home phones (pay phones and letters), tea rooms, the curfew, the New Village Movement, export factories, construction jobs in the Middle East."],
  [1980, "컬러 TV(1980), 통금 해제(1982), 집 전화 보급, 삐삐는 후반, 학력고사, 과외 금지, 프로야구(1982), 마이카 시대, 1989년 해외여행 자유화.", "Color TV (1980), the curfew lifted (1982), home phones spreading, pagers late in the decade, the hakryeok exam, a ban on private tutoring, pro baseball (1982), first family cars, overseas travel opened in 1989."],
  [1990, "삐삐와 공중전화, 1990년대 중반부터 PCS 휴대폰, PC통신(천리안·하이텔), 노래방, 1998년 무렵 PC방과 초고속 인터넷, 1996년 초등학교로 이름이 바뀜, 1997년 외환위기.", "Pagers and pay phones, cell phones from the mid-90s, dial-up PC networks, karaoke rooms, internet cafés and broadband around 1998, the 1997 financial crisis."],
  [2000, "휴대폰 문자, 싸이월드, 인터넷 강의, MP3, 디카, 2004년 KTX, 2009년 말 스마트폰.", "Cell phone texting, Cyworld, online lectures, MP3 players, digital cameras, the KTX (2004), smartphones from late 2009."],
];

const US_DECADE: [number, string][] = [
  [1950, "Radio and early TV, rotary phones, letters, drive-ins, the new interstates."],
  [1960, "Black-and-white then color TV, rotary phones, typewriters, letters, transistor radios."],
  [1970, "Color TV, rotary and push-button phones, typewriters, carbon copies, 8-track and cassette tapes, gas lines."],
  [1980, "Cable TV, the Walkman, VCRs and video stores, answering machines, early PCs at work, pagers late in the decade."],
  [1990, "Pagers, cordless phones, cell phones by mid-decade, dial-up AOL and email from about 1995, CDs, Blockbuster."],
  [2000, "Flip phones and texting, Google, iPods, DVDs, Facebook from 2004, the iPhone in 2007."],
];

/** The "시대:" fact line: the year, how people lived then, and what doesn't exist yet. */
export function periodFacts(year: number): string {
  const en = isEn();
  const decade = Math.floor(year / 10) * 10;
  const life = isUS() ? US_DECADE.find(([d]) => d === decade)?.[1] : (([, ko, e]) => (en ? e : ko))(KR_DECADE.find(([d]) => d === decade) ?? [0, "", ""]);
  const missing = THINGS.filter((x) => x.hint && year < firstYear(x))
    .sort((a, b) => firstYear(a) - firstYear(b))
    .map((x) => (en ? `${x.en} (${firstYear(x)}~)` : `${x.label}(${firstYear(x)}년~)`));
  if (en)
    return [`${year}.`, life ? `Everyday life then: ${life}` : "", missing.length ? `Not around yet, never mention: ${missing.join(", ")}.` : "", "Companies, schools, jobs and things must have existed under that name that year."]
      .filter(Boolean)
      .join(" ");
  return [`${year}년.`, life ? `그 시절 생활: ${life}` : "", missing.length ? `아직 없는 것(쓰지 말 것): ${missing.join(", ")}.` : "", "회사·학교·직업·물건은 그해에 그 이름으로 있던 것만 씁니다."]
    .filter(Boolean)
    .join(" ");
}

/** periodFacts for a turning point ({ date: "YYYY-MM" }) passed to the opening, or "" without a date. */
export function turningPeriod(tp: unknown): string {
  const year = Number(String((tp as { date?: string } | null)?.date ?? "").slice(0, 4));
  return year > 1900 ? periodFacts(year) : "";
}
