// The text pages every site with ads is expected to have: what the service is (소개) and what it does with people's
// information (개인정보 처리방침). Server-rendered in either language and linked from the footer of every public page.
// Each page's text lives here as {ko, en} pairs, so it can be read and corrected in one place.
import Link from "next/link";
import type { Lang } from "@/lib/region";

export type InfoPage = "about" | "privacy";
export const infoPath = (lang: Lang, page: InfoPage) => `${lang === "en" ? "/en" : ""}/${page}`;

type Pair = { ko: string; en: string };
type Section = { title: Pair; body: Pair[] };

/** The date the privacy text last changed. Update it with the text. */
const UPDATED = "2026-11-08";

const ABOUT: { title: Pair; lead: Pair; sections: Section[] } = {
  title: { ko: "What If 소개", en: "About What If" },
  lead: {
    ko: "그때 다른 선택을 했다면 내 인생은 어떻게 흘러갔을까요? What If는 과거의 한 순간으로 돌아가 다시 고르고, 그 인생을 끝까지 살아보는 AI 인생 시뮬레이터예요.",
    en: "What if you had chosen differently? What If takes you back to a turning point in your past, lets you choose again, and lives that life with you to the end.",
  },
  sections: [
    {
      title: { ko: "어떻게 흘러가나요", en: "How it plays" },
      body: [
        {
          ko: "프로필과 돌아가고 싶은 순간을 고르면, 그때부터 한 달 또는 몇 달씩 시간이 흐르고 입시, 취업, 결혼, 자녀 같은 갈림길마다 직접 고르며 마지막까지 살아봐요. 인생이 끝나면 회고록을 쓰고, 원하면 회고록 게시판에 올릴 수 있어요.",
          en: "Pick your profile and the moment you want to go back to. From there time moves a month or a few months at a time, and at each fork (exams, a first job, marriage, children) you choose, until the end of the life. Afterwards you can have a memoir written and, if you like, post it to the memoir board.",
        },
      ],
    },
    {
      title: { ko: "누가 정하나요", en: "Who decides what happens" },
      body: [
        {
          ko: "능력치, 돈, 성공과 실패, 수명은 규칙 엔진이 확률로 정해요. AI는 그 결과를 장면과 문장으로만 써요. 실제 사건 뉴스는 그 시절의 기록을 바탕으로 해요. 같은 선택이어도 결과는 매번 달라져요.",
          en: "A rules engine decides stats, money, successes, failures and lifespan by chance. The AI only writes the results as scenes and sentences. News of real events comes from the record of that time. The same choice can turn out differently each time.",
        },
      ],
    },
    {
      title: { ko: "무엇이 아닌가요", en: "What it is not" },
      body: [
        {
          ko: "실제 미래를 예측하거나 인생 상담을 대신하는 서비스가 아니에요. 다른 선택을 상상해 보는 놀이예요.",
          en: "It does not predict the real future or replace advice about your life. It is a game for imagining other choices.",
        },
      ],
    },
    {
      title: { ko: "무료로 운영돼요", en: "Free to play" },
      body: [
        {
          ko: "What If는 무료예요. 장면을 쓰는 AI 비용과 서버 비용은 광고로 충당해요. 광고는 이야기를 방해하지 않는 자리에만 두고, 광고라는 표시를 붙여요.",
          en: "What If is free. The cost of the AI that writes the scenes and of the servers is covered by ads. Ads go only where they do not get in the way of the story, and they are labelled as ads.",
        },
      ],
    },
  ],
};

const PRIVACY: { title: Pair; lead: Pair; sections: Section[] } = {
  title: { ko: "개인정보 처리방침", en: "Privacy policy" },
  lead: {
    ko: "What If(whatif.damoai.net)는 로그인이 없고, 입력한 정보를 최대한 이 기기에만 두도록 만들었어요. 어떤 정보가 어디에 어떻게 쓰이는지 아래에 적었어요.",
    en: "What If (whatif.damoai.net) has no sign-in and is built to keep what you enter on your own device as far as possible. This page lists what is kept where, and how it is used.",
  },
  sections: [
    {
      title: { ko: "이 기기(브라우저)에만 저장되는 정보", en: "Kept only on your device (browser)" },
      body: [
        {
          ko: "입력한 프로필과 진행 기록은 암호화해서 이 기기의 브라우저 저장소에만 두고, 서버로 보내 저장하지 않아요. 언어, 소리, 화면 설정과 회고록 게시판 이용 기록(내가 올린 글의 삭제 키, 공감하거나 신고한 글, 공감 중복을 막으려고 만든 임의의 기기 번호)도 브라우저 저장소에 있어요. 쿠키는 고른 언어를 1년 동안 기억하는 것 하나뿐이에요. 브라우저 설정에서 사이트 데이터를 지우면 모두 사라져요.",
          en: "The profile you enter and your progress are encrypted and kept only in this browser's storage; they are not sent to a server to be stored. Your language, sound and display settings and your memoir board activity (delete keys for posts you made, posts you liked or reported, and a random device number that stops repeat likes) are also in browser storage. The only cookie remembers your language for a year. Clearing the site's data in your browser removes all of it.",
        },
      ],
    },
    {
      title: { ko: "장면을 쓰는 동안 AI에 전달되는 정보", en: "What the AI receives while writing scenes" },
      body: [
        {
          ko: "장면과 회고록을 쓰는 동안 프로필(별명, 태어난 해와 달, 지역, 학교와 직장 같은 입력 내용), 돌아간 순간, 지금까지의 삶, 직접 써서 고른 선택의 내용이 외부 AI 모델 제공업체(현재 BytePlus ModelArk에서 제공하는 DeepSeek 모델)로 전달돼요. 이 내용은 글을 쓰는 데에만 쓰이고 What If 서버에는 저장하지 않아요. 실명, 연락처, 주소 같은 민감한 정보는 입력하지 말아 주세요.",
          en: "While scenes and the memoir are written, your profile (nickname, birth year and month, region, school and work you entered), the moment you went back to, the life so far, and any choice you wrote in your own words are sent to an outside AI model provider (currently DeepSeek models served through BytePlus ModelArk). It is used only to write the text and is not stored on What If's servers. Please do not enter real names, contact details, addresses or other sensitive information.",
        },
      ],
    },
    {
      title: { ko: "회고록 게시판에 올린 글", en: "Memoirs posted to the board" },
      body: [
        {
          ko: "회고록은 직접 게시를 눌렀을 때만 올라가요. 필명, 제목, 묘비문, 본문, 사망 나이, 마지막 모습, 인생 기록(자산, 기부액, 행복 수치, 배지), 지역이 저장되고 누구나 볼 수 있어요. 실명과 학교 이름은 게시 전에 가려지고, 올리기 전에 직접 고칠 수 있어요. 글은 Upstash Redis 데이터베이스(Vercel 연동)에 저장돼요. 글을 지우는 키는 해시로만 서버에 남아요. 내 글은 이 기기의 게시판 창에서 지울 수 있고, 그 기기를 쓸 수 없으면 의견 보내기로 요청해 주세요.",
          en: "A memoir is posted only when you press post. Its pen name, title, epitaph, text, age at death, last status, life records (wealth, giving, happiness, badges) and region are stored and visible to everyone. Real names and school names are masked before posting, and you can edit the text first. Posts are stored in an Upstash Redis database (through Vercel). The key that deletes a post is kept on the server only as a hash. You can delete your posts from the board window on the device that posted them; if you cannot use that device, ask through the feedback form.",
        },
        {
          ko: "도배를 막으려고 글, 공감, 신고를 올리는 접속 IP를 해시한 값을 짧은 시간 동안만 세어 둬요. 신고할 때는 같은 사람이 여러 번 신고하지 못하게 IP 해시 값 일부를 그 글의 신고 기록으로 남겨요. 원래 IP 주소는 저장하지 않아요.",
          en: "To stop spam, a hash of the IP address used to post, like or report is counted for a short time. When you report a post, part of that hash is kept with the post's reports so one person cannot report it many times. The IP address itself is not stored.",
        },
      ],
    },
    {
      title: { ko: "의견 보내기", en: "Feedback form" },
      body: [
        {
          ko: "의견 보내기를 쓰면 쓴 내용, 남긴 연락처(선택), 플레이 중이던 곳이 이메일 전송 서비스(Resend)를 거쳐 운영자에게 전달돼요. 답장과 개선에만 쓰고, 연락처를 남기지 않으면 답을 받을 수 없어요.",
          en: "If you use the feedback form, what you wrote, the contact you left (optional) and where you were in the game go to the operator through an email service (Resend). It is used only to reply and improve the service; without a contact, no reply is possible.",
        },
      ],
    },
    {
      title: { ko: "방문 통계", en: "Visit statistics" },
      body: [
        {
          ko: "Vercel Web Analytics로 방문 수와 많이 본 페이지를 집계해요. 쿠키 없이 개인을 알아볼 수 없는 형태로 처리돼요.",
          en: "Vercel Web Analytics counts visits and the pages seen most. It works without cookies and in a form that does not identify individuals.",
        },
      ],
    },
    {
      title: { ko: "광고", en: "Advertising" },
      body: [
        {
          ko: "What If는 광고로 운영돼요. 광고를 표시할 때는 Google 등 광고 사업자가 쿠키나 광고 식별자를 사용해 방문 기록을 바탕으로 광고를 보여줄 수 있어요. 맞춤 광고는 Google 광고 설정(adssettings.google.com)이나 aboutads.info에서 끌 수 있어요. 광고 사업자가 정보를 쓰는 방식은 Google의 “파트너 사이트의 데이터 사용” 안내(policies.google.com/technologies/partner-sites)에서 볼 수 있어요.",
          en: "What If is supported by ads. When ads are shown, Google and other ad providers may use cookies or advertising identifiers to show ads based on your visits. You can turn off personalised ads in Google's Ad Settings (adssettings.google.com) or at aboutads.info. How ad providers use information is described in Google's “How Google uses information from sites or apps that use our services” (policies.google.com/technologies/partner-sites).",
        },
      ],
    },
    {
      title: { ko: "어린이", en: "Children" },
      body: [
        {
          ko: "What If는 어린이를 대상으로 만든 서비스가 아니에요. 어린이의 정보를 일부러 모으지 않아요.",
          en: "What If is not made for children, and we do not knowingly collect information from them.",
        },
      ],
    },
    {
      title: { ko: "문의와 변경", en: "Questions and changes" },
      body: [
        {
          ko: "개인정보에 관한 문의나 삭제 요청은 게임 안 ⋯ 메뉴의 ‘의견 보내기’로 알려 주세요. 이 방침이 바뀌면 이 페이지의 날짜와 내용을 고쳐요.",
          en: "For questions or deletion requests about your information, use “Send feedback” in the ⋯ menu inside the game. If this policy changes, this page and its date are updated.",
        },
      ],
    },
  ],
};

const PAGES = { about: ABOUT, privacy: PRIVACY } as const;

export function InfoBody({ lang, page }: { lang: Lang; page: InfoPage }) {
  const p = PAGES[page];
  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{p.title[lang]}</h1>
        <p className="text-stone-600 dark:text-stone-400">{p.lead[lang]}</p>
        {page === "privacy" && (
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {lang === "en" ? "Last updated" : "최종 수정"} {UPDATED}
          </p>
        )}
      </header>
      {p.sections.map((s) => (
        <section key={s.title.en} className="space-y-2">
          <h2 className="text-lg font-semibold">{s.title[lang]}</h2>
          {s.body.map((b) => (
            <p key={b.en} className="leading-relaxed text-stone-700 dark:text-stone-300">
              {b[lang]}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}

/** Links to the text pages and the board, at the foot of every public page. */
export function SiteFooter({ lang }: { lang: Lang }) {
  const links: [string, string][] = [
    [lang === "en" ? "About" : "소개", infoPath(lang, "about")],
    [lang === "en" ? "Privacy policy" : "개인정보 처리방침", infoPath(lang, "privacy")],
    [lang === "en" ? "Memoir board" : "회고록 게시판", lang === "en" ? "/en/board" : "/board"],
  ];
  return (
    <footer className="mt-12 border-t border-stone-200 pt-5 dark:border-stone-800">
      <nav aria-label={lang === "en" ? "Site" : "사이트 안내"} className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-600 dark:text-stone-400">
        {links.map(([label, href]) => (
          <Link key={href} href={href} className="underline-offset-2 hover:underline">
            {label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
