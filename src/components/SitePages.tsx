/* eslint-disable @next/next/no-html-link-for-pages -- links into the game are full page loads on purpose: the reading pages load the ad script, the game screens must not keep it. */
// 이용 방법, 자주 묻는 질문, 문의: the reading pages about the service itself (Korean). Server-drawn inside ContentShell,
// so each also carries the ad script; the game screens carry none.
import Link from "next/link";
import { ContactForm } from "./ContactForm";
import { Rich } from "./GuidePages";

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

const STEPS: { title: string; body: string[] }[] = [
  {
    title: "시작 방법 고르기",
    body: [
      "첫 화면에서 **빠른 시작**과 **자세히 시작** 가운데 하나를 골라요. 빠른 시작은 생년월일과 돌아갈 해만 정하면 30초 안에 시작돼요. 자세히 시작은 2분쯤 걸리지만, 자란 곳과 학교, 성격, 돌아갈 순간의 상황까지 적을 수 있어 훨씬 나다운 인생이 펼쳐져요.",
      "입력한 내용은 이 기기의 브라우저에만 암호화해서 저장돼요. 로그인도 회원가입도 없어요.",
    ],
  },
  {
    title: "기본 정보 입력하기",
    body: [
      "한 화면에 질문이 하나씩 나와요. 생년월일은 꼭 필요하고, 나머지는 건너뛰어도 돼요. 별명, 성별, 자란 나라와 지역, 다닌 학교, MBTI와 자기소개를 적을 수 있어요. MBTI를 모르면 짧은 질문 몇 개로 가까운 유형을 찾아 줘요.",
      "성격은 어떤 일이 더 자주 찾아오는지에 영향을 줘요. 결과를 정하지는 않아요. 자세한 내용은 [MBTI는 인생의 선택을 정할까](/guide/mbti-and-choices)에서 볼 수 있어요.",
    ],
  },
  {
    title: "돌아갈 순간 고르기",
    body: [
      "돌아가고 싶은 날짜와 그 순간의 종류(진학, 입대, 첫 직장, 결혼, 이직, 내 집 마련 등)를 골라요. 나이에 맞는 종류를 먼저 보여 줘요. 그때의 상황과 실제로 했던 선택을 두세 문장으로 적으면, 이야기는 그와 다른 길에서 시작돼요.",
      "어떤 순간을 고를지 고민된다면 [돌아갈 순간 고르는 법](/guide/choose-turning-point)을 읽어 보세요.",
    ],
  },
  {
    title: "시간 흘려보내기",
    body: [
      "변곡점 직후에는 한 달씩, 평소에는 석 달씩 시간이 흘러요. 55세가 넘으면 반년, 70세가 넘으면 1년씩 넘어가요. **진행** 버튼을 누를 때마다 그 기간에 있었던 일이 이야기로 쌓이고, 화면 위쪽에서 건강·행복·지식·관계 수치와 자산이 바뀌는 것을 볼 수 있어요.",
      "진행 버튼을 **길게 누르면** 일정한 속도로 자동 진행되다가, 큰 변화가 생기면 스스로 멈춰요. 그 시절에 실제로 있었던 사건의 소식도 이야기 사이사이에 지나가요.",
    ],
  },
  {
    title: "갈림길에서 고르기",
    body: [
      "입시, 취업, 연애와 결혼, 이직, 투자 같은 순간이 오면 선택지가 나타나요. 마음에 드는 선택지가 없으면 원하는 행동을 직접 글로 써서 고를 수도 있어요. 결과는 규칙 엔진이 능력치와 시대 상황, 운을 바탕으로 정하고, AI는 그 결과를 장면으로 써요. 작동 원리는 [규칙 엔진과 AI는 어떻게 나눠 일할까](/guide/engine-and-ai)에 정리했어요.",
    ],
  },
  {
    title: "엔딩과 회고록",
    body: [
      "삶이 끝나면 인생 그래프와 지나온 길, 받은 배지를 보여 주는 엔딩 화면이 나와요. 원하면 AI가 주인공의 목소리로 회고록을 써 줘요. 회고록은 직접 게시를 누를 때만 [회고록 게시판](/board)에 올라가고, 올리기 전에 필명과 내용을 고칠 수 있어요. 자세한 내용은 [회고록과 게시판](/guide/memoir-and-board)을 참고하세요.",
    ],
  },
];

export function HowToPlay() {
  return (
    <article className="space-y-6">
      <Lead kicker="이용 방법" title="What If, 이렇게 즐겨요" lead="What If는 과거의 한 순간으로 돌아가 다른 선택을 하고, 그 인생을 끝까지 살아 보는 무료 인생 시뮬레이터예요. 처음 시작하는 방법부터 엔딩까지 순서대로 안내해요." />
      <ol className="space-y-6">
        {STEPS.map((s, i) => (
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
      <H2>알아 두면 좋은 것</H2>
      <ul className="list-disc space-y-2 pl-5 leading-[1.8] text-stone-700 dark:text-stone-300">
        <li><Rich text="**이어서 하기**: 진행 기록은 자동으로 저장돼요. 같은 기기와 브라우저로 다시 오면 첫 화면에서 이어서 할 수 있어요." /></li>
        <li><Rich text="**지우기**: 첫 화면의 '지우기'를 누르거나 브라우저에서 사이트 데이터를 지우면 입력한 정보와 기록이 모두 사라져요." /></li>
        <li><Rich text="**한국어와 영어**: 화면 언어는 첫 화면 오른쪽 위에서 바꿀 수 있고, 자란 나라로 한국이나 미국을 고를 수 있어요." /></li>
        <li><Rich text="**같은 선택, 다른 결과**: 결과에는 운이 섞여 있어서 같은 선택을 해도 매번 달라요. 여러 번 살아 보며 비교해 보세요. [더 재미있게 즐기는 7가지 방법](/guide/play-tips)도 참고하세요." /></li>
        <li><Rich text="**예측이 아니에요**: 결과는 상상해 보는 놀이일 뿐, 실제 진학·취업·투자의 근거가 될 수 없어요." /></li>
      </ul>
      <p className="pt-2">
        <a href="/" className="inline-block rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500">
          지금 시작하기
        </a>
      </p>
    </article>
  );
}

export const FAQ: { q: string; a: string }[] = [
  { q: "What If는 어떤 서비스인가요?", a: "과거의 한 순간으로 돌아가 다른 선택을 하고, 그 인생을 끝까지 살아 보는 AI 인생 시뮬레이터예요. 입시, 군대, 취업, 결혼, 이직 같은 갈림길마다 직접 고르며, 한 달에서 1년 단위로 시간이 흘러 마지막까지 이어져요. [이용 방법](/how-to-play)에서 순서대로 안내해요." },
  { q: "무료인가요? 회원가입이 필요한가요?", a: "무료이고 회원가입이나 로그인이 없어요. 운영 비용은 가이드 같은 읽을거리 페이지에 붙는 광고로 충당해요. 게임 화면에는 광고를 넣지 않아요." },
  { q: "입력한 정보는 어디에 저장되나요?", a: "프로필과 진행 기록은 이 기기의 브라우저에만 암호화해서 저장되고, 서버에는 남지 않아요. 장면을 쓰는 동안에만 필요한 내용이 AI 모델 제공업체로 전달돼요. 자세한 내용은 [개인정보 처리방침](/privacy)에 있어요." },
  { q: "AI가 인생의 결과를 정하나요?", a: "아니요. 능력치, 돈, 성공과 실패, 수명은 규칙 엔진이 확률로 정하고, AI는 그 결과를 장면과 문장으로만 써요. 그래서 이야기의 흐름과 상관없이 같은 조건에서는 비슷한 확률로 비슷한 일이 일어나요. [규칙 엔진과 AI는 어떻게 나눠 일할까](/guide/engine-and-ai)를 참고하세요." },
  { q: "같은 선택을 했는데 결과가 달라요.", a: "정상이에요. 결과에는 운이 섞여 있어서 같은 선택도 매번 다르게 풀려요. 같은 변곡점을 여러 번 살아 보면 그 선택이 대체로 어떤 방향으로 흘러가는지 감을 잡을 수 있어요." },
  { q: "MBTI를 입력하면 무엇이 달라지나요?", a: "MBTI와 자기소개로 인물의 성향(외향, 대담함, 신중함, 따뜻함)이 정해지고, 성향에 따라 어떤 사건이 더 자주 찾아오는지가 달라져요. 결과를 직접 정하지는 않고, 선택은 언제나 플레이어가 해요. 자세한 내용은 [MBTI는 인생의 선택을 정할까](/guide/mbti-and-choices)에 있어요." },
  { q: "시대 배경은 실제와 같나요?", a: "출생 연도와 나라에 맞춰 그 시절의 학교 제도, 병역, 경기 흐름, 물가를 반영하고, 실제로 있었던 사건의 소식은 기록을 바탕으로 해요. 하지만 주인공의 삶에 일어나는 일은 모두 지어낸 이야기예요. 시대별 배경은 [가이드](/guide)의 시대별 글에서 볼 수 있어요." },
  { q: "이야기가 갑자기 느려지거나 멈춰요.", a: "AI가 장면을 쓰는 데 몇 초가 걸릴 수 있어요. 오래 걸리면 미리 준비된 문장으로 이야기가 이어지니 기다리거나 다시 진행해 주세요. 계속 문제가 있다면 [문의](/contact)로 알려 주세요." },
  { q: "진행 기록을 다른 기기에서 이어서 할 수 있나요?", a: "기록이 이 기기의 브라우저에만 저장되기 때문에 다른 기기에서는 이어서 할 수 없어요. 같은 기기라도 브라우저를 바꾸거나 사이트 데이터를 지우면 기록이 사라져요." },
  { q: "회고록 게시판에 올린 글을 지우고 싶어요.", a: "글을 올린 기기의 게시판 창에서 '내 글 지우기'로 지울 수 있어요. 그 기기를 쓸 수 없다면 [문의](/contact)로 글 주소와 함께 요청해 주세요." },
  { q: "부적절한 회고록을 봤어요.", a: "글 아래의 신고 버튼을 눌러 주세요. 신고가 쌓인 글은 자동으로 숨겨지고, 운영자가 확인해 지울 수 있어요." },
  { q: "어린이도 이용할 수 있나요?", a: "What If는 어린이를 대상으로 만든 서비스가 아니에요. 인생의 다양한 일(연애, 결혼, 질병, 죽음 등)을 다루기 때문에 청소년은 보호자와 함께 이용하기를 권해요." },
  { q: "토스 앱에서도 할 수 있나요?", a: "네. 토스 앱 안의 미니앱 '왓 이프'에서도 같은 게임을 할 수 있어요. 토스 로그인을 쓰면 생년월일과 성별이 처음 질문에 미리 채워져요." },
  { q: "의견이나 제휴 문의는 어디로 하나요?", a: "[문의](/contact) 페이지나 게임 안 ⋯ 메뉴의 '의견 보내기'로 남겨 주세요. 답장을 받으려면 이메일 주소를 함께 적어 주세요." },
];

const strip = (t: string) => t.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

export function FaqPage() {
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: strip(f.a) } })),
  };
  return (
    <article className="space-y-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <Lead kicker="자주 묻는 질문" title="What If FAQ" lead="처음 이용하는 분들이 자주 묻는 질문을 모았어요. 여기에 없는 내용은 문의 페이지로 알려 주세요." />
      <div className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900">
        {FAQ.map((f) => (
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

export function ContactPage() {
  return (
    <article className="space-y-6">
      <Lead kicker="문의" title="문의하기" lead="버그 제보, 이상한 이야기, 바라는 기능, 게시물 삭제 요청, 제휴 제안까지 무엇이든 알려 주세요. 보내 주신 내용은 운영자가 직접 읽어요." />
      <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-lg font-bold">문의 남기기</h2>
        <P t="아래 버튼을 누르면 문의 창이 열려요. 답장을 받으려면 이메일 주소를 함께 적어 주세요. 이메일은 답장을 보내는 데에만 써요." />
        <ContactForm />
      </section>
      <H2>문의 전에 확인해 주세요</H2>
      <ul className="list-disc space-y-2 pl-5 leading-[1.8] text-stone-700 dark:text-stone-300">
        <li><Rich text="이용 방법과 자주 묻는 질문은 [이용 방법](/how-to-play)과 [FAQ](/faq)에 정리해 두었어요." /></li>
        <li><Rich text="**게시물 삭제 요청**: 글 주소(예: whatif.host/board/…)와 삭제를 원하는 이유를 함께 적어 주세요." /></li>
        <li><Rich text="**버그 제보**: 어떤 화면에서 무엇을 눌렀을 때 문제가 생겼는지, 사용한 기기와 브라우저를 적어 주시면 빨리 고칠 수 있어요." /></li>
        <li><Rich text="**개인정보 관련 문의**: 처리 방식은 [개인정보 처리방침](/privacy)에, 이용 규칙은 [이용약관](/terms)에 있어요." /></li>
      </ul>
      <H2>운영 정보</H2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 rounded-2xl bg-stone-50 px-5 py-4 text-sm dark:bg-stone-800/60">
        <dt className="text-stone-500 dark:text-stone-400">서비스</dt>
        <dd>What If (whatif.host)</dd>
        <dt className="text-stone-500 dark:text-stone-400">토스 미니앱</dt>
        <dd>왓 이프</dd>
        <dt className="text-stone-500 dark:text-stone-400">문의 방법</dt>
        <dd>이 페이지의 문의 창, 또는 게임 안 ⋯ 메뉴의 ‘의견 보내기’</dd>
      </dl>
      <p className="text-sm text-stone-500 dark:text-stone-400">
        서비스 소개는 <Link href="/about" className="underline underline-offset-2">What If 소개</Link>에서 볼 수 있어요.
      </p>
    </article>
  );
}
