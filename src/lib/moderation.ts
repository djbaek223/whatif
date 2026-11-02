/**
 * Words the player types (their own choice, the turning point, the profile, a memoir going on the board) may not
 * describe violence or sex. This is the first, deterministic layer: it runs in the browser before anything is sent,
 * and again on the server. The narrator's rules are the second layer (prompts.ts, and classify's `unsafe`).
 *
 * It aims at the act, not the topic: 군대, 격투기, 수술, 말다툼, 연애·결혼·출산, 성교육, 'kill time' and a
 * victim reporting harassment stay allowed. `npm run check:moderation` lists what must and must not be blocked.
 */

export type BlockedKind = "violence" | "sexual";

interface Rule {
  re: RegExp;
  kind: BlockedKind;
  /** Words that make it about stopping or surviving the act, not doing it (신고, 피해자, prevention...). */
  guard?: RegExp;
}

// ── Normalising: undo the usual tricks (spacing, symbols, jamo, full-width, leetspeak, stretched letters) ──

const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
const JONG = " ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ"; // index 0: no final
const isSyllable = (c: string) => c >= "가" && c <= "힣";

/** Joins loose jamo back into syllables: "ㅅㅔㄱㅅㅡ" → "섹스", "세ㄱ스" → "섹스". */
export function composeJamo(text: string): string {
  const out: string[] = [];
  const cs = [...text];
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i];
    const cho = CHO.indexOf(c);
    const jung = i + 1 < cs.length ? JUNG.indexOf(cs[i + 1]) : -1;
    if (cho >= 0 && jung >= 0) {
      let jong = 0;
      const j = i + 2 < cs.length ? JONG.indexOf(cs[i + 2]) : -1;
      if (j > 0 && !(i + 3 < cs.length && JUNG.includes(cs[i + 3]))) jong = j;
      out.push(String.fromCharCode(0xac00 + (cho * 21 + jung) * 28 + jong));
      i += jong ? 2 : 1;
      continue;
    }
    // A syllable with no final, then a lone consonant that doesn't start the next syllable: it is the final.
    const last = out[out.length - 1];
    const f = JONG.indexOf(c);
    if (f > 0 && last && isSyllable(last) && (last.charCodeAt(0) - 0xac00) % 28 === 0 && !(i + 1 < cs.length && JUNG.includes(cs[i + 1]))) {
      out[out.length - 1] = String.fromCharCode(last.charCodeAt(0) + f);
      continue;
    }
    out.push(c);
  }
  return out.join("");
}

const LEET: Record<string, string> = { "0": "o", "1": "i", "!": "i", "3": "e", "4": "a", "@": "a", "5": "s", "$": "s", "7": "t", "+": "t" };

/** Runs of single letters split by spaces are one word spelled out: "s e x" → "sex", "살 해" → "살해". */
function joinSpelled(text: string): string {
  const words = text.split(" ").filter(Boolean);
  const out: string[] = [];
  let run = "";
  for (const w of words) {
    if ([...w].length === 1 && /\p{L}/u.test(w)) {
      run += w;
      continue;
    }
    if (run) out.push(run);
    run = "";
    out.push(w);
  }
  if (run) out.push(run);
  return out.join(" ");
}

/** The text as the rules read it: Korean and English forms (the English one with leetspeak undone). */
export function normalizeForModeration(text: string): { ko: string; en: string } {
  const base = composeJamo(
    text
      .normalize("NFKC") // full-width letters; it also turns lone jamo (ㅅ) into conjoining ones (ᄉ), undone next
      .replace(/[\u1100-\u1112]/g, (c) => CHO[c.charCodeAt(0) - 0x1100])
      .replace(/[\u1161-\u1175]/g, (c) => JUNG[c.charCodeAt(0) - 0x1161])
      .toLowerCase()
      .replace(/[\u200B-\u200F\u2060\uFEFF\u00AD\u3164\u115F\u1160]/g, ""), // invisible characters
  ).normalize("NFC");
  const tidy = (s: string) =>
    joinSpelled(
      s
        .replace(/[^\p{L}\p{N}'\s]/gu, " ") // symbols between letters split nothing: "섹.스", "k-i-l-l"
        .replace(/\s+/g, " ")
        .trim(),
    ).replace(/(\p{L})\1{2,}/gu, "$1"); // "kiiiill", "섹스스스"
  const ko = tidy(base.replace(/(?<=[가-힣])[0-9]+(?=[가-힣])/g, "")); // "섹1스"
  const en = tidy(base.replace(/[0134@57$!+]/g, (c, i: number) => (/[a-z]/.test(base[i - 1] ?? "") || /[a-z]/.test(base[i + 1] ?? "") ? LEET[c] : c)));
  return { ko, en };
}

// ── Korean ──

// Someone who could be hurt: people the story knows, and the rude words for them.
const KO_WHO =
  "(?:사람|사람들|그놈|그년|걔|걔네|그녀|그|상사|팀장|부장|사장|과장|대리|남편|아내|와이프|부인|엄마|아빠|어머니|아버지|부모님?|애인|여친|남친|여자\\s?친구|남자\\s?친구|친구|친구들|동료|선배|후배|교수|선생님?|직원|손님|이웃|가족|형|누나|오빠|언니|동생|아이|아기|새끼|녀석|모두|전부|다들|경쟁자|전\\s?여친|전\\s?남친|시어머니|장모|학생)";
// Short words that are also parts of other words (그때, 1년, 연애) count only with a particle: 그를, 걔한테.
const KO_WHO_SHORT = "(?:그|그녀|걔|애|놈|년)(?:을|를|에게|한테)";
// 하다 in its usual endings: 한다, 해, 했다, 할, 하고.
const DO = "(?:하|한|해|했|할|함)";
const KO_PARTICLE = "(?:을|를|도|들을|만|에게|한테)?";
// (Not 쏴: "친구들한테 쏜다/쏴" is treating them. A gun is its own rule.) Being on the receiving end (폭행당했다) is not doing it.
const KO_HURT = "(?:죽이|죽여|죽인|죽일|죽였|살해|찔러|찌르|찔렀|찌른|패(?:고|서|자|야|겠|버|줬|준|죽)|팼|팬다|팰|때리|때려(?!\\s?치|쳐)|때린|때렸|두들겨|폭행|구타|목\\s?을?\\s?졸|납치|고문|강간|성폭행|추행)(?!\\s?당)";

// Talking about stopping it, surviving it, or the job of dealing with it.
const KO_GUARD = /(신고|고발|고소|예방|방지|피해자|피해를|당했|당한|당하|당해|도와|돕|막아|막으|막는|반대|처벌|수사|변호|상담|재판|근절|캠페인|뉴스|기사|형사|경찰|검사|판사|기자|다큐)/;

const KO_RULES: Rule[] = [
  // Hurting a person
  { kind: "violence", re: new RegExp(`(?:${KO_WHO}\\s?${KO_PARTICLE}|${KO_WHO_SHORT})\\s?(?:다\\s?)?${KO_HURT}`) },
  { kind: "violence", re: /살해|살인(?!적|미소|사건|범|자|마|더위|진드기|벌)|청부\s?살인|난도질|칼부림|토막\s?(?:내|낸|살인|시체)|시체\s?(?:를|유기)/ },
  // Words that history and the news use too (5·18 학살, 인질 사건): fine when it is about remembering or stopping it.
  { kind: "violence", guard: /(진상|역사|추모|기념|희생|유족|규명|민주화|영화|소설|다큐|뉴스|기사|기자|경찰|형사|구조|신고|피해)/, re: /학살|참수|흉기|인질/ },
  { kind: "violence", re: /죽여\s?(?:버리|버린|버릴|버려|야지|야겠|놓|서|라|버렸)|(?:때려|패|찔러|쏴|목\s?졸라|두들겨\s?패|굶겨|태워|밟아|묻어)\s?죽|묻어\s?버리/ },
  { kind: "violence", re: /칼\s?(?:로|을)\s?[가-힣\s]{0,8}(?:찌르|찔러|찔렀|찌른|휘두르|휘둘)|총\s?으로\s?[가-힣\s]{0,6}(?:쏴|쏘|죽)|(?:총기|총)\s?(?:을\s?)?난사|목\s?을\s?베/ },
  { kind: "violence", re: /테러\s?(?:를\s?(?:저지|일으|계획)|하|해|공격을\s?(?:하|계획))|폭탄\s?(?:을|으로)?\s?(?:터뜨|터트|던지|설치)|불\s?을?\s?(?:질러|지르|지른|질렀)|방화\s?(?:하|한|를|해|했)/ },
  { kind: "violence", re: /(?:납치|고문|폭행|구타)\s?(?:하|해|했|할|한|을\s?(?:하|한|가하|가한|저지|계획))|(?:집단|학교)\s?폭력\s?을\s?(?:하|저지|가하)|린치|피\s?(?:투성이|범벅|칠갑)|유혈\s?낭자/ },
  // Hurting oneself
  { kind: "violence", re: new RegExp(`자살\\s?(?:${DO}|을\\s?(?:${DO}|시도|결심)|시도|기도)|자해\\s?(?:${DO}|를)|목숨\\s?을?\\s?끊|(?:손목|동맥)\\s?을?\\s?(?:긋|그어|그은)|투신\\s?${DO}`) },
  // Sex
  { kind: "sexual", re: /(?:섹|쎅|섻|쌕)\s?(?:스|쓰|쑤)|색\s?쓰|(?:^|[^ㅅ])ㅅㅅ(?!ㅅ)|성\s?관계|성교\s?(?:를|하|한|했|해|행위)|잠자리\s?를?\s?(?:같이|함께|가지|갖)|원\s?나(?:잇|이트)/ },
  { kind: "sexual", re: /야동|야설|포르노|음란\s?(?:물|행위|채팅|사이트)|자위\s?(?:하|한|를|행위|해|했)|오르가(?:즘|슴)|애무|빠구리|딸딸이|딸\s?(?:치|쳤)|질싸|노콘|좆|음경|음부|성기\s?를|떡\s?(?:치(?!기)|쳤|칠)/ },
  { kind: "sexual", re: /(?:가슴|엉덩이|허벅지|사타구니|중요\s?부위)\s?(?:을|를)?\s?(?:만지|만진|만져|만졌|주무르|주물|핥|빨아|빨고)|(?:옷|속옷|팬티|브라)\s?(?:을|를)?\s?(?:벗기|벗긴|벗겨|벗겼)|알몸|나체|(?:여자|남자|그녀|걔|애|년)\s?(?:를|을)?\s?따\s?먹/ },
  // Doing a sex crime is always out; the words alone are fine when it's about stopping or surviving one.
  {
    kind: "sexual",
    re: /(?:강간|윤간|성\s?폭행|성\s?추행|성\s?폭력|성\s?희롱|성\s?범죄|성\s?착취|몰카|몰래\s?카메라|성\s?매매|성\s?매수|매춘|원조\s?교제|성\s?노예)\s?(?:하|해|했|할|한(?!\s?(?:사람|사건|혐의))|[을를]\s?(?:하|한|저지|시도|계획|찍|즐기))/,
  },
  { kind: "sexual", guard: KO_GUARD, re: /강간|윤간|성\s?폭행|성\s?추행|성\s?폭력|성\s?범죄|성\s?착취|몰카|몰래\s?카메라|성\s?매매|성\s?매수|매춘|원조\s?교제|성\s?노예/ },
];

// ── English ──

const EN_KIN =
  "(?:boss|wife|husband|partner|girlfriend|boyfriend|gf|bf|ex|mom|mother|dad|father|parents?|brother|sister|friends?|teacher|professor|classmates?|coworkers?|co workers?|colleagues?|neighbou?rs?|family|kids?|children|son|daughter|baby|students?|manager|teammates?|roommates?|guy|girl|man|woman|wife's|husband's|landlord|enemy|enemies|cop|police officer|bully|bullies)";
const EN_WHO = `(?:him|her|them|himself|herself|themselves|someone|somebody|anyone|anybody|everyone|everybody|people|a stranger|strangers|(?:a|my|the|his|her|their|our|that|this|your)\\s(?:\\w+\\s)?${EN_KIN}(?!'s))`;

const EN_GUARD = /\b(survivors?|victims?|report(ed|ing)?|prevent(ion|ing)?|against|help(ing)?|support(ing)?|counsel(l?or|ing)?|lawyer|prosecutor|detective|police|awareness|charity|crisis|hotline|activist|campaign|stop(ped|ping)?|news|documentary)\b/;

const EN_RULES: Rule[] = [
  // Hurting a person
  { kind: "violence", re: new RegExp(`\\b(?:kill|kills|killed|killing|murder|murders|murdered|murdering|stab|stabs|stabbed|stabbing|shoot|shoots|shot|shooting|strangle\\w*|torture\\w*|kidnap\\w*|behead\\w*|poison\\w*|punch|punches|punched|punching|slap|slaps|slapped|attack|attacks|attacked|attacking|assault|assaults|assaulted|assaulting|hit|hits|hitting|choke|choked|choking|rape|rapes|raped|raping|molest\\w*|abuse|abused|abusing)\\s${EN_WHO}\\b(?!\\s(?:up|back|a|an)\\b)`) },
  { kind: "violence", re: /\b(?:kill|killing|shoot|shooting|hang|hanging|harm|harming)\s(?:myself|yourself)\b/ },
  { kind: "violence", re: new RegExp(`\\b(?:beat|beats|beating|bash)\\s${EN_WHO}\\s(?:up|to death|senseless|bloody)\\b|\\bbeat up\\s${EN_WHO}\\b`) },
  { kind: "violence", re: /\b(?:murder|murdering|massacre\w*|slaughter\w*|homicide|bloodbath|blood bath)\b(?!\s(?:mystery|mysteries|novel|novels|case|cases|trial|podcast|documentary|show|series|scene in))/ },
  { kind: "violence", re: /\b(?:killing|shooting) spree\b|\bgo on a rampage\b|\bslit (?:his|her|their|my|your) throat\b|\bstab\w* (?:him|her|them|someone) to death\b/ },
  { kind: "violence", guard: EN_GUARD, re: /\b(?:mass|school) shooting\b|\bterror(?:ist)? attack\b|\bshoot up (?:a|the|my|our)\b/ },
  { kind: "violence", re: /\b(?:bomb|blow up)\s(?:the|a|my|our|his|her|their)\s(?:\w+\s)?(?:school|office|building|house|church|mosque|temple|station|plane|car|company|city|mall)\b|\bset fire to (?:the|a|my|his|her|their)\b|\bset (?:the|a|my|his|her|their)\s(?:\w+\s)?(?:house|school|office|building|car) on fire\b|\bburn down (?:the|a|my|his|her|their)\s(?:\w+\s)?(?:house|school|office|building|church)\b/ },
  // Hurting oneself
  { kind: "violence", guard: EN_GUARD, re: /\bsuicide\b|\bself harm\b|\bselfharm\b/ },
  { kind: "violence", re: /\b(?:commit|attempt) suicide\b|\b(?:slit|cut) my wrists?\b|\bhang myself\b|\bend my (?:own )?life\b|\bunalive\b/ },
  // Sex
  { kind: "sexual", re: /\bsex\b(?<!\b(?:same|opposite|biological) sex)(?!\s(?:education|ed|discrimination|and the city|offender registry|worker rights))|\bsexual(?:ly)?\s(?:intercourse|relations|act|acts|fantas\w+|favou?rs?|experience|encounter)\b|\bhave sex\b|\bhaving sex\b/ },
  { kind: "sexual", re: /\b(?:porn\w*|xxx|nsfw|hentai|onlyfans|nudes|blowjobs?|handjobs?|rimjob|orgasm\w*|masturbat\w*|jerk(?:ing|ed)? off|cum|cumming|cumshot|horny|threesomes?|orgy|orgies|gangbang\w*|deepthroat\w*|dildos?|erotic\w*|bdsm|fetish\w*|strippers?|strip club|prostitut\w*|hookers?|brothels?|one night stands?|make love|making love|made love|boobs|tits|titties|pussy|cock|cocks|penis|vagina|clitoris|anal|creampie|grop(?:e|ed|es|ing)|incest|pedophil\w*|dick pics?|naked (?:photos?|pics?|pictures?|selfies?)|send nudes)\b(?!\s?laude)/ },
  { kind: "sexual", re: new RegExp(`\\b(?:fuck|fucks|fucked|fucking|bang|banged|banging|seduce\\w*|undress\\w*)\\s${EN_WHO}\\b|\\bsleep(?:ing|s)? with (?:him|her|them|someone|a stranger|strangers|(?:my|the|his|her) (?:boss|teacher|professor|coworker|colleague|best friend's \\w+|friend's \\w+|brother's \\w+|sister's \\w+|wife|husband))\\b`) },
  { kind: "sexual", guard: EN_GUARD, re: /\b(?:rape|raped|raping|rapist|rapists|molest\w*|sexual(?:ly)? assault\w*|sexual(?:ly)? abuse\w*|child porn\w*)\b/ },
];

/** Whether the text describes violence or sex (and which), or null when it is fine. */
export function moderate(text: string | null | undefined): BlockedKind | null {
  if (!text || !text.trim()) return null;
  const { ko, en } = normalizeForModeration(text);
  for (const r of KO_RULES) if (r.re.test(ko) && !(r.guard && r.guard.test(ko))) return r.kind;
  for (const r of EN_RULES) if (r.re.test(en) && !(r.guard && r.guard.test(en))) return r.kind;
  return null;
}

/** The first of several texts that is blocked, for a form with many boxes. */
export function moderateAll(texts: (string | null | undefined)[]): BlockedKind | null {
  for (const t of texts) {
    const k = moderate(t);
    if (k) return k;
  }
  return null;
}

/** Every string inside a value (a profile, a turning point), for a check on the server. */
export function stringsIn(value: unknown, out: string[] = [], depth = 0): string[] {
  if (depth > 4) return out;
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const v of value) stringsIn(v, out, depth + 1);
  else if (value && typeof value === "object") for (const v of Object.values(value)) stringsIn(v, out, depth + 1);
  return out;
}
