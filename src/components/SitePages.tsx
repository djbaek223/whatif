/* links into the game are full page loads on purpose: the reading pages load the ad script, the game screens must not keep it. */
// 이용 방법, 자주 묻는 질문, 문의: the reading pages about the service itself, in Korean (/how-to-play, /faq, /contact) and
// English (/en/...). Server-drawn inside ContentShell, so each also carries the ad script; the game screens carry none.
// The texts describe the game as it is: keep them in step with Forms.tsx (the questions), Decision.tsx (the play
// controls), Ending.tsx and Board.tsx when those change.
import Link from "next/link";
import type { Lang } from "@/lib/region";
import { ContactForm } from "./ContactForm";
import { Rich } from "./GuidePages";
import { infoPath } from "./InfoPages";

function Lead({ kicker, title, lead }: { kicker: string; title: string; lead: string }) {
  return (
    <header className="space-y-3">
      <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">{kicker}</p>
      <h1 className="text-3xl font-bold text-balance">{title}</h1>
      <p className="leading-relaxed text-stone-600 dark:text-stone-400">{lead}</p>
    </header>
  );
}

const P = ({ t }: { t: string }) => (
  <p className="leading-[1.85] text-stone-700 dark:text-stone-300">
    <Rich text={t} />
  </p>
);
const H2 = ({ children, id }: { children: React.ReactNode; id?: string }) => (
  <h2 id={id} className="scroll-mt-6 pt-4 text-xl font-bold">
    {children}
  </h2>
);
const Bullets = ({ items }: { items: string[] }) => (
  <ul className="list-disc space-y-2 pl-5 leading-[1.8] text-stone-700 dark:text-stone-300">
    {items.map((t) => (
      <li key={t}>
        <Rich text={t} />
      </li>
    ))}
  </ul>
);

/** Where the help pages live in each language. */
export const helpPath = (lang: Lang, page: "how-to-play" | "faq" | "contact") => `${lang === "en" ? "/en" : ""}/${page}`;
const homePath = (lang: Lang) => (lang === "en" ? "/en" : "/");

type Steps = { title: string; body: string[] }[];

const HOW: Record<Lang, { kicker: string; title: string; lead: string; steps: Steps; extraTitle: string; extra: string[]; cta: string }> = {
  ko: {
    kicker: "이용 방법",
    title: "What If, 이렇게 즐겨요",
    lead: "What If는 과거의 한 순간으로 돌아가 다른 선택을 하고, 그 인생을 끝까지 살아 보는 무료 인생 시뮬레이터예요. 처음 시작하는 방법부터 엔딩까지 순서대로 안내해요.",
    steps: [
      {
        title: "시작 방법 고르기",
        body: [
          "첫 화면에서 **바로 되돌리기**와 **내 이야기로 시작** 가운데 하나를 골라요. 바로 되돌리기는 기본 정보와 돌아갈 해만 정하면 30초 안에 시작돼요. 내 이야기로 시작은 2분쯤 걸리지만, 돌아갈 날짜와 그때의 상황, 실제로 했던 선택까지 적을 수 있어 훨씬 나다운 인생이 펼쳐져요.",
          "로그인도 회원가입도 없어요. 입력한 내용은 암호화해서 이 브라우저에만 두고 서버에는 저장하지 않아요.",
        ],
      },
      {
        title: "기본 정보 적기",
        body: [
          "첫 질문에서 별명, 생년월일, 성별, 자란 곳(한국이나 미국, 그리고 지역)을 적어요. 네 가지 모두 필요해요. 별명은 주인공을 부를 때만 쓰이니 실명 대신 별명을 써 주세요. 생년월일은 나이와 그 시절 이야기를, 성별은 입대 같은 일부 사건을, 자란 곳은 학교와 병역, 뉴스와 사건을 맞추는 데 써요.",
          "토스 앱 안의 미니앱에서는 생년월일과 성별을 토스 로그인으로 불러와요.",
        ],
      },
      {
        title: "돌아갈 순간 고르기",
        body: [
          "내 이야기로 시작에서는 먼저 **그때**(연도와 달)를 고르고, 그 나이에 맞는 **갈림길** 종류를 골라요. 어른이라면 입시, 취업, 연애·결혼, 이직·창업, 이사·이민, 투자, 기타가 나오고, 초등학생이나 10대 시절이라면 학교, 친구, 꿈 같은 종류가 나와요. 날짜를 고를 때 '혹시 이때였나요?'에 많은 사람이 지나는 순간이 추천돼요.",
          "**상황**은 '○○와 ○○ 사이에서 고민했다'는 문장의 빈칸만 채워도 되고, 자유롭게 써도 돼요. 그때 실제로 고른 쪽을 적으면, 이야기는 그와 다른 길에서 시작돼요. 어떤 순간을 고를지 고민된다면 [돌아갈 순간 고르는 법](/guide/choose-turning-point)을 읽어 보세요.",
        ],
      },
      {
        title: "더 알려주기 (선택)",
        body: [
          "마지막 확인 화면의 **더 알려주기**에서 가족(어떤 집에서 자랐는지), 성격(나는 어떤 사람인지), 지금의 나(지금 어떻게 살고 있는지), 아쉬움(무엇이 아쉬웠는지)을 더 적을 수 있어요. 모두 건너뛰어도 돼요.",
          "성격 묘사는 어떤 일이 더 자주 찾아오는지에 영향을 줘요. 결과를 정하지는 않아요. 지금의 나를 적으면 엔딩에서 실제 삶과 비교해 줘요. 자세한 내용은 [MBTI는 인생의 선택을 정할까](/guide/mbti-and-choices)에서 볼 수 있어요.",
        ],
      },
      {
        title: "시간 흘려보내기",
        body: [
          "변곡점 직후에는 한 달씩, 평소에는 석 달씩 시간이 흘러요. 55세가 넘으면 반년, 70세가 넘으면 1년씩 넘어가요. **다음 달로**(시기에 따라 '3개월 뒤로', '1년 뒤로') 버튼을 누를 때마다 그 기간에 있었던 일이 이야기로 쌓이고, 화면 위쪽에서 건강·행복·지식·관계 수치와 자산이 바뀌는 것을 볼 수 있어요.",
          "그 버튼을 **길게 누르면** 일정한 속도로 계속 진행되다가, 큰 변화가 생기면 스스로 멈춰요. **선택까지 진행**을 누르면 다음 선택이 나올 때까지 이어서 흘러요. 그 시절에 실제로 있었던 사건의 소식도 이야기 사이사이에 지나가요.",
        ],
      },
      {
        title: "갈림길에서 고르기",
        body: [
          "입시, 취업, 연애와 결혼, 이직, 투자 같은 순간이 오면 선택지가 나타나요. 마음에 드는 선택지가 없으면 **내 선택 직접 만들기**로 원하는 행동을 글로 써서 고를 수도 있어요. 결과는 규칙 엔진이 능력치와 상황, 운을 바탕으로 정하고, AI는 그 결과를 장면으로 써요. 작동 원리는 [규칙 엔진과 AI는 어떻게 나눠 일할까](/guide/engine-and-ai)에 정리했어요.",
          "**작은 선택은 맡기기**가 처음부터 켜져 있어서, 작은 선택은 인물이 자기 성향대로 알아서 고르고 큰 갈림길과 희귀한 순간에서만 멈춰요. 모든 선택을 직접 하고 싶다면 끄면 돼요.",
        ],
      },
      {
        title: "엔딩과 회고록",
        body: [
          "삶이 끝나면 회고록을 쓸지 골라요. 회고록을 고르면 AI가 주인공의 목소리로 회고록을 써 주고, 쓰지 않고 돌아봐도 나중에 엔딩 화면에서 쓸 수 있어요. 엔딩 화면에는 게시판 사람들과의 비교, 받은 배지, 인생 그래프, 내가 한 선택들이 함께 나와요.",
          "회고록은 직접 게시를 누를 때만 [회고록 게시판](/board)에 올라가고, 올리기 전에 필명과 제목, 내용을 고칠 수 있어요. 자세한 내용은 [회고록과 게시판](/guide/memoir-and-board)을 참고하세요.",
        ],
      },
    ],
    extraTitle: "알아 두면 좋은 것",
    extra: [
      "**이어서 하기**: 진행 기록은 처음에는 지금 탭에만 저장돼서, 탭을 닫으면 사라져요. 시작하기 전 확인 화면에서 '이 기기에 저장하기'를 고르면 같은 기기와 브라우저로 다시 왔을 때 첫 화면의 '이어하기'로 이어서 할 수 있어요. 저장한 기본 정보는 180일 동안 쓰지 않으면 자동으로 지워져요.",
      "**지우기**: 첫 화면의 '지우기'(저장된 기본 정보 옆)나 '진행 기록 지우기'를 누르거나, 브라우저에서 사이트 데이터를 지우면 입력한 정보와 기록이 모두 사라져요.",
      "**한국어와 영어**: 화면 언어는 첫 화면 오른쪽 위에서 바꿀 수 있고, 자란 나라는 첫 질문의 '자란 곳'에서 한국이나 미국으로 따로 고를 수 있어요.",
      "**같은 선택, 다른 결과**: 결과에는 운이 섞여 있어서 같은 선택을 해도 매번 달라요. 여러 번 살아 보며 비교해 보세요. [더 재미있게 즐기는 7가지 방법](/guide/play-tips)도 참고하세요.",
      "**예측이 아니에요**: 결과는 상상해 보는 놀이일 뿐, 실제 진학·취업·투자의 근거가 될 수 없어요.",
    ],
    cta: "지금 시작하기",
  },
  en: {
    kicker: "How to play",
    title: "How What If works",
    lead: "What If is a free life simulator: go back to a moment in your past, make a different choice, and live that life all the way to the end. Here is how it goes, from the first screen to the ending.",
    steps: [
      {
        title: "Pick how to start",
        body: [
          "On the first screen, choose **Rewind now** or **Start from my story**. Rewind now asks for the basics and the year to go back to, and you are playing in about 30 seconds. Start from my story takes about two minutes, but lets you name the exact month, describe the situation and say what you actually chose, so the life that unfolds feels much more like yours.",
          "There is no sign-in and no account. What you type is encrypted and kept only in this browser; it is not stored on a server.",
        ],
      },
      {
        title: "Enter the basics",
        body: [
          "The first question asks for a nickname, your birthday, your gender and where you grew up (the United States or Korea, and the town or region). All four are needed. The nickname is only used to address the main character, so please use a nickname, not your real name. The birthday sets the age and the era, gender matters for a few events such as the draft, and where you grew up decides the schools, the news and the events of that life.",
        ],
      },
      {
        title: "Pick the moment to go back to",
        body: [
          "In Start from my story you first choose **When** (the year and month) and then the kind of **fork** that fits that age. For an adult the kinds are School, First job, Love & marriage, Career change, Moving, Money & home and Other; for a child or a teenager they are school, friends, dreams and the like. While you pick the date, “Was it one of these?” suggests moments many people go through, such as college applications or buying a first house.",
          "For the **Situation**, you can fill in the blanks of “I was torn between ___ and ___” or write freely. If you also say which way you actually went, the story starts down the other road. Not sure which moment to choose? Read [how to choose a turning point](/en/guide/choose-turning-point).",
        ],
      },
      {
        title: "Tell more (optional)",
        body: [
          "On the summary screen, **Tell more** lets you add your family (the home you grew up in), your personality (what kind of person you are), Me today (how you live now) and your regret (what still bothers you about that moment). You can skip all of them.",
          "The personality you describe changes which moments come up more often; it never decides the outcome. If you fill in Me today, the ending compares the imagined life with your real one. More in [does personality decide your choices?](/en/guide/personality-and-choices)",
        ],
      },
      {
        title: "Let time pass",
        body: [
          "Right after the turning point time moves a month at a time, and usually three months at a time after that. After 55 it moves six months at a time, and after 70 a year at a time. Each press of **Next month** (or “3 months on” and “One year on”, depending on the stage of life) adds what happened in that stretch to the story, and the bar at the top shows health, happiness, knowledge, relationships and net worth as they change.",
          "**Hold** that button and time keeps moving at a steady pace until something big happens, then it stops by itself. **Play to next choice** runs on until the next decision. News of real events from those years passes by between the scenes.",
        ],
      },
      {
        title: "Choose at the forks",
        body: [
          "When a fork comes (college, a job offer, love and marriage, a move, money), choices appear. If none fits, **Make my own choice** lets you write what you would do in your own words. A rules engine decides what happens from your stats, your situation and chance; the AI only writes the scene. How the two split the work is explained in [the rules engine and the AI](/en/guide/engine-and-ai).",
          "**Let it make small choices** is on from the start: small decisions are made by the character in keeping with their temperament, and the game stops only at big forks and rare moments. Turn it off if you want to make every choice yourself.",
        ],
      },
      {
        title: "The ending and the memoir",
        body: [
          "When the life ends, you choose whether to have a memoir written. If you do, the AI writes it in the main character's voice; if you skip it, you can still write it later from the ending screen. The ending also shows how the life compares with the memoir board, the badges earned, the life graph and the choices you made.",
          "A memoir goes on the [memoir board](/en/board) only when you press post, and you can change the pen name, title and text before posting. More in [memoirs and the board](/en/guide/memoir-and-board).",
        ],
      },
    ],
    extraTitle: "Good to know",
    extra: [
      "**Continuing later**: at first your progress is kept only in the current tab, and closing the tab clears it. If you tick “Save on this device” on the summary screen before you start, you can come back on the same device and browser and pick up with Continue on the first screen. Saved basics are deleted automatically after 180 days without use.",
      "**Erasing**: press Erase (next to Saved profile) or Erase progress on the first screen, or clear this site's data in your browser, and everything you entered is gone.",
      "**English and Korean**: the display language is in the top-right corner of the first screen, and the country you grew up in (the United States or Korea) is chosen separately in the first question.",
      "**Same choice, different result**: chance is part of every outcome, so the same choice plays out differently each time. Live it a few times and compare. See also [seven ways to get more out of What If](/en/guide/play-tips).",
      "**Not a prediction**: the results are a game of imagination and are no basis for real decisions about school, work or money.",
    ],
    cta: "Start now",
  },
};

export function HowToPlay({ lang = "ko" }: { lang?: Lang }) {
  const h = HOW[lang];
  return (
    <article className="space-y-6">
      <Lead kicker={h.kicker} title={h.title} lead={h.lead} />
      <ol className="space-y-6">
        {h.steps.map((s, i) => (
          <li key={s.title} className="space-y-2">
            <h2 className="flex items-center gap-3 text-xl font-bold">
              <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm text-white">
                {i + 1}
              </span>
              {s.title}
            </h2>
            {s.body.map((t) => (
              <P key={t} t={t} />
            ))}
          </li>
        ))}
      </ol>
      <H2>{h.extraTitle}</H2>
      <Bullets items={h.extra} />
      <p className="pt-2">
        <a href={homePath(lang)} className="inline-block rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500">
          {h.cta}
        </a>
      </p>
    </article>
  );
}

const FAQ: Record<Lang, { q: string; a: string }[]> = {
  ko: [
    { q: "What If는 어떤 서비스인가요?", a: "과거의 한 순간으로 돌아가 다른 선택을 하고, 그 인생을 끝까지 살아 보는 AI 인생 시뮬레이터예요. 입시, 군대, 취업, 결혼, 이직 같은 갈림길마다 직접 고르며, 한 달에서 1년 단위로 시간이 흘러 마지막까지 이어져요. [이용 방법](/how-to-play)에서 순서대로 안내해요." },
    { q: "무료인가요? 회원가입이 필요한가요?", a: "무료이고 웹사이트에는 회원가입이나 로그인이 없어요. 운영 비용은 가이드 같은 읽을거리 페이지에 붙는 광고로 충당하고, 웹사이트의 게임 화면(입력, 플레이, 엔딩)에는 광고를 넣지 않아요. 토스 앱 안의 미니앱에서는 토스 광고가 이야기 사이나 회고록을 쓰는 동안 나올 수 있어요." },
    { q: "입력한 정보는 어디에 저장되나요?", a: "프로필과 진행 기록은 암호화해서 이 브라우저에만 두고, 서버에는 남지 않아요. 기본으로는 탭을 닫으면 사라지고, 시작 전 확인 화면에서 '이 기기에 저장하기'를 고르면 이 기기에 남아요(180일 동안 쓰지 않으면 자동 삭제). 장면을 쓰는 동안에만 필요한 내용이 AI 모델 제공업체로 전달돼요. 자세한 내용은 [개인정보 처리방침](/privacy)에 있어요." },
    { q: "AI가 인생의 결과를 정하나요?", a: "아니요. 능력치, 돈, 성공과 실패, 수명은 규칙 엔진이 확률로 정하고, AI는 그 결과를 장면과 문장으로만 써요. 그래서 이야기의 흐름과 상관없이 같은 조건에서는 비슷한 확률로 비슷한 일이 일어나요. [규칙 엔진과 AI는 어떻게 나눠 일할까](/guide/engine-and-ai)를 참고하세요." },
    { q: "같은 선택을 했는데 결과가 달라요.", a: "정상이에요. 결과에는 운이 섞여 있어서 같은 선택도 매번 다르게 풀려요. 같은 변곡점을 여러 번 살아 보면 그 선택이 대체로 어떤 방향으로 흘러가는지 감을 잡을 수 있어요." },
    { q: "MBTI는 입력하지 않나요? 성격은 어떻게 반영되나요?", a: "지금은 MBTI를 따로 묻지 않아요. 대신 '더 알려주기'의 '나는 어떤 사람인가요?'에 쓴 성격 묘사로 인물의 성향(외향, 대담함, 신중함, 따뜻함)이 정해지고, 성향에 따라 어떤 사건이 더 자주 찾아오는지와 맡겨 둔 작은 선택이 달라져요. 묘사에 MBTI 유형을 적어도 네 글자 자체는 성향 계산에 쓰이지 않아요. 결과를 직접 정하지는 않고, 큰 선택은 언제나 플레이어가 해요. 자세한 내용은 [MBTI는 인생의 선택을 정할까](/guide/mbti-and-choices)에 있어요." },
    { q: "시대 배경은 실제와 같나요?", a: "출생 연도와 나라에 맞춰 그 시절의 학교 제도와 시험 이름, 병역, 그때 있던 회사와 물건을 맞추고, 실제로 있었던 사건의 소식은 기록을 바탕으로 해요. 외환위기나 팬데믹 같은 큰 사건은 살림에도 영향을 줘요. 다만 월급과 집값 같은 금액은 시대와 상관없이 지금 돈의 가치로 보여 줘요. 주인공의 삶에 일어나는 일은 모두 지어낸 이야기예요. 시대별 배경은 [가이드](/guide)의 시대별 글에서 볼 수 있어요." },
    { q: "이야기가 갑자기 느려지거나 멈춰요.", a: "AI가 장면을 쓰는 데 몇 초가 걸릴 수 있어요. 오래 걸리면 미리 준비된 기본 이야기로 이어지니 기다리거나 다시 진행해 주세요. 계속 문제가 있다면 [문의](/contact)로 알려 주세요." },
    { q: "진행 기록을 다른 기기에서 이어서 할 수 있나요?", a: "기록이 이 브라우저에만 저장되기 때문에 다른 기기에서는 이어서 할 수 없어요. 같은 기기라도 '이 기기에 저장하기'를 고르지 않았거나, 브라우저를 바꾸거나, 사이트 데이터를 지우면 기록이 사라져요." },
    { q: "회고록 게시판에 올린 글을 지우고 싶어요.", a: "글을 올린 기기와 브라우저에서 게임 안의 게시판 창(플레이 화면의 ⋯ 메뉴나 엔딩 화면에서 열 수 있어요)을 열고 내 글의 '내 글 지우기'를 누르면 돼요. 그 기기를 쓸 수 없다면 [문의](/contact)로 글 주소와 함께 요청해 주세요." },
    { q: "부적절한 회고록을 봤어요.", a: "글 아래의 신고 버튼을 눌러 주세요. 신고가 쌓인 글은 자동으로 숨겨지고, 운영자가 확인해 지울 수 있어요." },
    { q: "어린이도 이용할 수 있나요?", a: "What If는 어린이를 대상으로 만든 서비스가 아니에요. 인생의 다양한 일(연애, 결혼, 질병, 죽음 등)을 다루기 때문에 청소년은 보호자와 함께 이용하기를 권해요." },
    { q: "토스 앱에서도 할 수 있나요?", a: "네. 토스 앱 안의 미니앱 '왓 이프'에서도 같은 게임을 할 수 있어요. 토스 로그인으로 생년월일과 성별을 불러와 첫 질문에 채워요." },
    { q: "의견이나 제휴 문의는 어디로 하나요?", a: "[문의](/contact) 페이지나 게임 안 ⋯ 메뉴의 '의견 보내기'로 남겨 주세요. 답장을 받으려면 이메일 주소를 함께 적어 주세요." },
  ],
  en: [
    { q: "What is What If?", a: "An AI life simulator: you go back to a moment in your past, make a different choice, and live that life to the end. You choose at forks like college, a first job, marriage and career changes, while time moves a month to a year at a time until the very end. [How to play](/en/how-to-play) walks through it step by step." },
    { q: "Is it free? Do I need an account?", a: "It is free, and the website has no sign-in or account. Costs are covered by ads on reading pages such as the guide; the game screens on the website (setup, play and the ending) carry no ads." },
    { q: "Where is what I enter stored?", a: "Your profile and progress are encrypted and kept only in this browser, never on a server. By default they disappear when you close the tab; if you tick “Save on this device” on the summary screen, they stay on this device (and are deleted automatically after 180 days without use). Only what is needed to write a scene is sent to the AI model provider while it writes. The [privacy policy](/en/privacy) has the details." },
    { q: "Does the AI decide how my life turns out?", a: "No. A rules engine decides stats, money, successes and failures and lifespan by chance; the AI only turns those results into scenes and sentences. So whatever the story says, the same conditions give the same odds. See [the rules engine and the AI](/en/guide/engine-and-ai)." },
    { q: "I made the same choice and got a different result.", a: "That is expected. Chance is part of every outcome, so the same choice plays out differently each time. Living the same turning point a few times gives you a feel for where a choice usually leads." },
    { q: "Does it ask for my Myers-Briggs type? How is personality used?", a: "It doesn't ask for a type. Instead, what you write under “What kind of person are you?” in Tell more sets four leanings (outgoing, bold, careful, warm), which change which moments come up more often and how the small choices you leave to the character are made. A four-letter type typed into that box is not read on its own; the words around it are. It never decides outcomes, and the big choices are always yours. More in [does personality decide your choices?](/en/guide/personality-and-choices)" },
    { q: "Is the historical background accurate?", a: "The birth year and country set the schools, the tests, the draft, the companies and things that existed then, and news of real events comes from the record. Big shocks such as the 2008 financial crisis or the pandemic touch the character's finances too. Money, though, is always shown in today's dollars, whatever the year. Everything that happens to the main character is fiction. The era articles in the [guide](/en/guide) cover the background." },
    { q: "The story slowed down or stopped.", a: "The AI can take a few seconds to write a scene. If it takes too long, the game carries on with a prepared version of the story, so wait a moment or step forward again. If it keeps happening, tell us through [contact](/en/contact)." },
    { q: "Can I continue on another device?", a: "No. Progress is kept only in this browser, so another device cannot see it. Even on the same device it is lost if you did not tick “Save on this device”, switch browsers or clear the site's data." },
    { q: "How do I delete a memoir I posted?", a: "On the device and browser you posted from, open the board inside the game (from the ⋯ menu on the play screen or from the ending screen) and press “Take down my memoir” on your post. If you can't use that device, send the post's address through [contact](/en/contact)." },
    { q: "I saw an inappropriate memoir.", a: "Press the report button under the post. Posts that collect reports are hidden automatically, and the operator can review and remove them." },
    { q: "Can children use it?", a: "What If is not made for children. It deals with the whole of a life, including dating, marriage, illness and death, so we suggest teenagers play with a parent or guardian." },
    { q: "Is there an app?", a: "The website works on any phone or computer browser, with nothing to install. There is also a mini-app inside the Korean app Toss, for players in Korea." },
    { q: "Where do I send feedback or business inquiries?", a: "Use the [contact](/en/contact) page or “Send feedback” in the game's ⋯ menu. Leave an email address if you would like a reply." },
  ],
};

const strip = (t: string) => t.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

export function FaqPage({ lang = "ko" }: { lang?: Lang }) {
  const items = FAQ[lang];
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: lang,
    mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: strip(f.a) } })),
  };
  return (
    <article className="space-y-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      {lang === "en" ? (
        <Lead kicker="FAQ" title="Frequently asked questions" lead="Answers to what new players ask most. If your question isn't here, let us know through the contact page." />
      ) : (
        <Lead kicker="자주 묻는 질문" title="What If FAQ" lead="처음 이용하는 분들이 자주 묻는 질문을 모았어요. 여기에 없는 내용은 문의 페이지로 알려 주세요." />
      )}
      <div className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900">
        {items.map((f) => (
          <details key={f.q} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 font-semibold">
              {f.q}
              <span aria-hidden className="mt-0.5 text-stone-400 transition group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-2 leading-[1.8] text-stone-700 dark:text-stone-300">
              <Rich text={f.a} />
            </p>
          </details>
        ))}
      </div>
    </article>
  );
}

const CONTACT: Record<Lang, { kicker: string; title: string; lead: string; formTitle: string; form: string; checkTitle: string; check: string[]; infoTitle: string; info: [string, string][]; about: [string, string, string] }> = {
  ko: {
    kicker: "문의",
    title: "문의하기",
    lead: "버그 제보, 이상한 이야기, 바라는 기능, 게시물 삭제 요청, 제휴 제안까지 무엇이든 알려 주세요. 보내 주신 내용은 운영자가 직접 읽어요.",
    formTitle: "문의 남기기",
    form: "아래 버튼을 누르면 문의 창이 열려요. 답장을 받으려면 이메일 주소를 함께 적어 주세요. 이메일은 답장을 보내는 데에만 써요.",
    checkTitle: "문의 전에 확인해 주세요",
    check: [
      "이용 방법과 자주 묻는 질문은 [이용 방법](/how-to-play)과 [FAQ](/faq)에 정리해 두었어요.",
      "**게시물 삭제 요청**: 글 주소(예: whatif.host/board/…)와 삭제를 원하는 이유를 함께 적어 주세요.",
      "**버그 제보**: 어떤 화면에서 무엇을 눌렀을 때 문제가 생겼는지, 사용한 기기와 브라우저를 적어 주시면 빨리 고칠 수 있어요.",
      "**개인정보 관련 문의**: 처리 방식은 [개인정보 처리방침](/privacy)에, 이용 규칙은 [이용약관](/terms)에 있어요.",
    ],
    infoTitle: "운영 정보",
    info: [
      ["서비스", "What If (whatif.host)"],
      ["토스 미니앱", "왓 이프"],
      ["문의 방법", "이 페이지의 문의 창, 또는 게임 안 ⋯ 메뉴의 ‘의견 보내기’"],
    ],
    about: ["서비스 소개는 ", "What If 소개", "에서 볼 수 있어요."],
  },
  en: {
    kicker: "Contact",
    title: "Contact us",
    lead: "Bug reports, strange stories, features you'd like, requests to take down a post, partnership ideas: tell us anything. The operator reads every message personally.",
    formTitle: "Send a message",
    form: "The button below opens the message form. Leave an email address if you would like a reply; it is used only to answer you.",
    checkTitle: "Before you write",
    check: [
      "How the game works and common questions are covered in [How to play](/en/how-to-play) and the [FAQ](/en/faq).",
      "**Taking down a post**: include the post's address (for example whatif.host/en/board/…) and why you would like it removed.",
      "**Bug reports**: tell us which screen you were on, what you pressed, and your device and browser, and we can fix it faster.",
      "**Privacy questions**: how information is handled is in the [privacy policy](/en/privacy), and the rules of use are in the [terms](/en/terms).",
    ],
    infoTitle: "About this site",
    info: [
      ["Service", "What If (whatif.host)"],
      ["How to reach us", "The form on this page, or “Send feedback” in the game's ⋯ menu"],
    ],
    about: ["Read more ", "about What If", "."],
  },
};

export function ContactPage({ lang = "ko" }: { lang?: Lang }) {
  const c = CONTACT[lang];
  return (
    <article className="space-y-6">
      <Lead kicker={c.kicker} title={c.title} lead={c.lead} />
      <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-lg font-bold">{c.formTitle}</h2>
        <P t={c.form} />
        <ContactForm lang={lang} />
      </section>
      <H2>{c.checkTitle}</H2>
      <Bullets items={c.check} />
      <H2>{c.infoTitle}</H2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 rounded-2xl bg-stone-50 px-5 py-4 text-sm dark:bg-stone-800/60">
        {c.info.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-stone-500 dark:text-stone-400">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-stone-500 dark:text-stone-400">
        {c.about[0]}
        <Link href={infoPath(lang, "about")} className="underline underline-offset-2">
          {c.about[1]}
        </Link>
        {c.about[2]}
      </p>
    </article>
  );
}
