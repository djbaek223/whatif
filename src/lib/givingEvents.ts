// Big gifts later in life: a scholarship fund, sponsoring a child, a disaster fund and a bequest. They give the memoir
// board's 기부 record something to count (Effect.donate adds the money to LifeState.donated), so they always play
// from the pool as written (hybrid.ts POOL_ONLY), and only come to a life with money to give.
import type { EventDef } from "./events";
import { L } from "./i18n";

export const GIVING_EVENTS: EventDef[] = [
  {
    id: "give-scholarship",
    get title() { return L("모교의 장학 기금"); },
    category: "values",
    theme: "love",
    get keywords() { return [L("기부"), L("장학금"), L("모교")]; },
    temper: { warm: 0.3 },
    minAge: 45,
    maxAge: 80,
    perYear: 0.06,
    once: true,
    when: (s) => s.wealth >= 30000,
    get intro() { return L("모교에서 편지가 왔다. 형편이 어려운 후배들을 위한 장학 기금을 모은다고 한다."); },
    choices: [
      { id: "fund", get label() { return L("내 이름을 건 장학 기금을 만든다"); }, effect: { get text() { return L("내 이름이 붙은 장학 기금이 생겼다. 첫 장학생이 보낸 손편지를 오래 들여다봤다."); }, stats: { happiness: 7, relationships: 3 }, wealthPct: -0.05, donate: true, get note() { return L("장학 기금"); } } },
      { id: "some", get label() { return L("동문들과 함께 조금 보탠다"); }, effect: { get text() { return L("동문 모임에서 함께 모은 돈을 보냈다. 이름 없는 한 줄로 남았지만 마음이 따뜻했다."); }, stats: { happiness: 3, relationships: 2 }, wealth: -300, donate: true, get note() { return L("장학금"); } } },
      { id: "later", get label() { return L("지금은 우리 집 형편을 먼저 챙긴다"); }, effect: { get text() { return L("답장을 미뤘다. 언젠가 여유가 생기면 하자고 생각했다."); }, stats: { happiness: -1 } } },
    ],
  },
  {
    id: "give-sponsor",
    get title() { return L("한 아이의 후원자"); },
    category: "values",
    theme: "love",
    get keywords() { return [L("후원"), L("아이"), L("나눔")]; },
    temper: { warm: 0.4 },
    minAge: 40,
    maxAge: 75,
    perYear: 0.07,
    once: true,
    when: (s) => s.wealth >= 10000 && s.income > 0,
    get intro() { return L("구호단체 광고 속 아이의 눈이 자꾸 떠오른다. 한 아이가 어른이 될 때까지 후원할 수 있다고 한다."); },
    choices: [
      { id: "ten", get label() { return L("그 아이가 어른이 될 때까지 후원한다"); }, effect: { get text() { return L("10년 동안 한 아이를 후원하기로 했다. 해마다 오는 사진 속 아이가 조금씩 자랐다."); }, stats: { happiness: 6, relationships: 2 }, wealth: -600, donate: true, get note() { return L("10년 후원금"); } } },
      { id: "year", get label() { return L("우선 1년만 해 본다"); }, effect: { get text() { return L("1년 정기 후원을 시작했다. 통장에서 빠져나가는 작은 돈이 생각보다 뿌듯했다."); }, stats: { happiness: 3 }, wealth: -60, donate: true, get note() { return L("1년 후원금"); } } },
      { id: "pass", get label() { return L("마음만 보내고 넘긴다"); }, effect: { get text() { return L("광고를 넘겼다. 그 눈빛은 한동안 남았다."); }, stats: { happiness: -1 } } },
    ],
  },
  {
    id: "give-disaster",
    get title() { return L("큰 재난과 성금"); },
    category: "values",
    theme: "love",
    get keywords() { return [L("성금"), L("재난"), L("기부")]; },
    temper: { warm: 0.3, bold: 0.2 },
    minAge: 45,
    maxAge: 85,
    perYear: 0.05,
    once: true,
    when: (s) => s.wealth >= 50000,
    get intro() { return L("큰 재난으로 삶터를 잃은 사람들 소식이 연일 이어진다. 내가 낼 수 있는 돈이 생각보다 크다는 걸 안다."); },
    choices: [
      { id: "big", get label() { return L("크게 성금을 낸다"); }, effect: { get text() { return L("꽤 큰 성금을 보냈다. 이름은 밝히지 않았다. 뉴스 속 임시 주택에 불이 켜지는 걸 봤다."); }, stats: { happiness: 6, relationships: 2 }, wealthPct: -0.08, donate: true, get note() { return L("재난 성금"); } } },
      { id: "together", get label() { return L("모임에서 함께 모아 보낸다"); }, effect: { get text() { return L("친구들과 돈을 모아 보냈다. 단체 사진 한 장이 남았다."); }, stats: { happiness: 3, relationships: 3 }, wealth: -200, donate: true, get note() { return L("성금"); } } },
      { id: "watch", get label() { return L("뉴스만 지켜본다"); }, effect: { get text() { return L("채널을 돌렸다. 마음 한쪽이 무거웠다."); }, stats: { happiness: -2 } } },
    ],
  },
  {
    id: "give-bequest",
    get title() { return L("재산의 쓰임"); },
    category: "values",
    theme: "family",
    get keywords() { return [L("유산"), L("기부"), L("재단")]; },
    temper: { warm: 0.2, careful: 0.2 },
    minAge: 65,
    maxAge: 95,
    perYear: 0.07,
    once: true,
    when: (s) => s.wealth >= 50000,
    get intro() { return L("변호사가 재산을 어떻게 남길지 미리 정해 두라고 권했다. 모은 것의 일부를 세상에 돌려줄 수도 있다."); },
    choices: [
      { id: "fifth", get label() { return L("재산의 5분의 1을 재단에 맡긴다"); }, effect: { get text() { return L("재산의 5분의 1을 복지 재단에 맡겼다. 가족들도 고개를 끄덕여 주었다."); }, stats: { happiness: 8, relationships: 2 }, wealthPct: -0.2, donate: true, get note() { return L("재단 기부"); } } },
      { id: "tenth", get label() { return L("10분의 1만 기부한다"); }, effect: { get text() { return L("재산의 10분의 1을 기부하기로 했다. 나머지는 가족에게 남긴다."); }, stats: { happiness: 5, relationships: 1 }, wealthPct: -0.1, donate: true, get note() { return L("기부"); } } },
      { id: "family", get label() { return L("모두 가족에게 남긴다"); }, effect: { get text() { return L("모두 가족에게 남기기로 했다. 아이들이 조금 더 편하게 살았으면 했다."); }, stats: { relationships: 2 } } },
    ],
  },
];
