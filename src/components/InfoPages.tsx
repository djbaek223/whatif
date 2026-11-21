// The text pages every site with ads is expected to have: what the service is (소개) and what it does with people's
// information (개인정보 처리방침). Server-rendered in either language and linked from the footer of every public page.
// Each page's text lives here as {ko, en} pairs, so it can be read and corrected in one place.
import type { Lang } from "@/lib/region";

export type InfoPage = "about" | "privacy" | "terms";
export const infoPath = (lang: Lang, page: InfoPage) => `${lang === "en" ? "/en" : ""}/${page}`;

type Pair = { ko: string; en: string };
type Section = { title: Pair; body: Pair[] };

/** The date the privacy text last changed. Update it with the text. */
const UPDATED = "2026-11-21";

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
      title: { ko: "왜 만들었나요", en: "Why we made it" },
      body: [
        {
          ko: "누구에게나 '그때 다른 선택을 했다면'이라는 질문이 하나쯤 있어요. 재수를 했다면, 다른 회사에 갔다면, 그 사람에게 고백했다면. 이 질문은 머릿속에서는 한 장면으로 끝나지만, 실제 인생에서는 그 뒤로 수십 년이 이어져요. What If는 그 수십 년을 직접 살아 보며, 가 보지 않은 길에도 그만의 기쁨과 어려움이 있다는 것을 느껴 보도록 만들었어요.",
          en: "Most people carry one question: what if I had chosen differently? Retaken the exam, joined another company, said it to that person. In the head the question ends in a single scene, but in a real life decades follow. What If lets you live those decades and see that the road not taken had its own joys and troubles too.",
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
      title: { ko: "시대와 나라를 반영해요", en: "Built on real eras and countries" },
      body: [
        {
          ko: "주인공이 태어난 해와 자란 나라에 따라 학교 제도와 대학 입시, 병역, 그 시절에 있던 회사와 물건, 그리고 뉴스가 달라져요. 한국 인생에서는 학력고사와 수능, 병역판정검사와 입영, 외환위기 같은 시대의 흐름이 이야기에 반영되고, 미국 인생에서는 미국의 대학 지원과 학자금 대출, 징병 추첨과 입대, 직장과 사회보장 제도를 따라요. 금액은 시대와 상관없이 지금 돈의 가치로 보여 줘요.",
          en: "The year the hero was born and the country they grew up in change the schools, college admissions, military service, the companies and things that existed, and the news of the time. A Korean life follows Korea's entrance exams, the draft and the 1997 crisis; an American life follows college applications and student loans, the draft lottery and enlistment, American work and Social Security. Money is always shown in today's value, whatever the year.",
        },
      ],
    },
    {
      title: { ko: "읽을거리도 있어요", en: "Reading" },
      body: [
        {
          ko: "가이드(whatif.host/guide)에는 1970년대부터 2010년대까지의 한국 생활상, 입시·군대·취업·결혼·집 같은 인생의 갈림길, 후회와 '만약'에 관한 칼럼, 게임을 더 깊게 즐기는 방법을 정리한 글이 있어요. 영어 가이드(whatif.host/en/guide)는 같은 구성으로 미국의 생활상과 갈림길을 다뤄요. 모든 글은 기록된 사실과 연구를 바탕으로 직접 썼어요.",
          en: "The guide (whatif.host/en/guide) has articles on everyday American life from the 1970s to the 2010s, the turning points most people meet (college, the military, work, marriage, a home), columns on regret and 'what if', and ways to get more out of the game. A Korean guide with the same sections covers life in Korea. Every article is written by hand from the historical record and published research.",
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
          ko: "What If는 무료이고 웹사이트에는 회원가입도 없어요. 장면을 쓰는 AI 비용과 서버 비용은 광고로 충당해요. 웹사이트에서는 광고를 가이드와 소개 같은 읽을거리 페이지에만 두고, 입력과 플레이, 엔딩 같은 게임 화면에는 넣지 않아요. 토스 앱 안의 미니앱에서는 토스 광고를 써요.",
          en: "What If is free and needs no account. The cost of the AI that writes the scenes and of the servers is covered by ads. Ads appear only on reading pages such as the guide and this page, never on the game screens (setup, play, ending).",
        },
      ],
    },
    {
      title: { ko: "문의", en: "Contact" },
      body: [
        {
          ko: "버그 제보, 기능 제안, 게시물 삭제 요청은 문의 페이지(whatif.host/contact)나 게임 안 ⋯ 메뉴의 ‘의견 보내기’로 남겨 주세요. 보내 주신 내용은 운영자가 직접 읽어요.",
          en: "For bug reports, ideas or post removal, use the contact page (whatif.host/en/contact) or “Send feedback” in the game's ⋯ menu. The operator reads every message.",
        },
      ],
    },
  ],
};

const PRIVACY: { title: Pair; lead: Pair; sections: Section[] } = {
  title: { ko: "개인정보 처리방침", en: "Privacy policy" },
  lead: {
    ko: "What If(whatif.host)는 웹에서는 로그인이 없고, 입력한 정보를 최대한 이 기기에만 두도록 만들었어요. 어떤 정보가 어디에 어떻게 쓰이는지 아래에 적었어요.",
    en: "What If (whatif.host) has no sign-in on the web and is built to keep what you enter on your own device as far as possible. This page lists what is kept where, and how it is used.",
  },
  sections: [
    {
      title: { ko: "이 기기(브라우저)에만 저장되는 정보", en: "Kept only on your device (browser)" },
      body: [
        {
          ko: "입력한 프로필과 진행 기록은 암호화해서 이 기기의 브라우저 저장소에만 두고, 서버로 보내 저장하지 않아요. 기본으로는 지금 탭에만 두어 탭을 닫으면 사라지고, ‘이 기기에 저장하기’를 고르면 이 브라우저에 남아 180일 동안 쓰지 않으면 자동으로 지워져요. 언어, 소리, 화면 설정과 회고록 게시판 이용 기록(내가 올린 글의 삭제 키, 공감하거나 신고한 글, 공감 중복을 막으려고 만든 임의의 기기 번호)도 브라우저 저장소에 있어요. 이 사이트가 직접 만드는 쿠키는 고른 언어를 1년 동안 기억하는 것 하나뿐이에요(방문 통계와 광고에 쓰이는 Google 쿠키는 아래에 적었어요). 브라우저 설정에서 사이트 데이터를 지우면 모두 사라져요.",
          en: "The profile you enter and your progress are encrypted and kept only in this browser's storage; they are not sent to a server to be stored. By default they are kept for the current tab only and disappear when it closes; if you choose “Save on this device”, they stay in this browser and are deleted automatically after 180 days without use. Your language, sound and display settings and your memoir board activity (delete keys for posts you made, posts you liked or reported, and a random device number that stops repeat likes) are also in browser storage. The only cookie this site sets itself remembers your language for a year (Google cookies used for visit statistics and ads are described below). Clearing the site's data in your browser removes all of it.",
        },
      ],
    },
    {
      title: { ko: "장면을 쓰는 동안 AI에 전달되는 정보", en: "What the AI receives while writing scenes" },
      body: [
        {
          ko: "장면과 회고록을 쓰는 동안 프로필(별명, 태어난 해와 달, 성별, 자란 지역, 직접 적은 가족·성격·지금의 삶 같은 입력 내용), 돌아간 순간과 그때의 상황, 지금까지의 삶, 직접 써서 고른 선택의 내용이 외부 AI 모델 제공업체(현재 BytePlus ModelArk에서 제공하는 DeepSeek 모델)로 전달돼요. 이 내용은 글을 쓰는 데에만 쓰이고 What If 서버에는 저장하지 않아요. 실명, 연락처, 주소 같은 민감한 정보는 입력하지 말아 주세요.",
          en: "While scenes and the memoir are written, your profile (nickname, birth year and month, gender, where you grew up, and the family, personality and present life you described), the moment you went back to and its situation, the life so far, and any choice you wrote in your own words are sent to an outside AI model provider (currently DeepSeek models served through BytePlus ModelArk). It is used only to write the text and is not stored on What If's servers. Please do not enter real names, contact details, addresses or other sensitive information.",
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
      title: { ko: "토스 로그인(토스 앱 안의 미니앱)", en: "Toss login (the mini-app inside Toss)" },
      body: [
        {
          ko: "토스 앱 안의 ‘왓 이프’에서 토스 로그인을 쓰면, 토스가 이 서비스용으로 만든 사용자 식별값과 동의 화면에서 허락한 정보만 받아요. 로그인 유지와 이용자 구분에만 쓰고, 다른 곳에 팔거나 넘기지 않아요.",
          en: "If you use Toss login in the What If mini-app inside Toss, we receive only the user identifier Toss issues for this service and the information you allowed on the consent screen. It is used only to keep you signed in and tell users apart, and is never sold or passed on.",
        },
        {
          ko: "그중 게임에 쓰는 건 생년월일과 성별뿐이에요. 주인공의 나이와 시대, 입대 같은 사건을 맞추려고 처음 질문에 채워 넣고, 서버에는 저장하지 않아요. 이름 등 다른 항목은 쓰지 않아요.",
          en: "Of that, the game uses only your date of birth and gender, filled into the first question to set the hero's age, era and events like military service. They are not stored on the server. Your name and other items are not used.",
        },
        {
          ko: "토스 앱에서 연결을 끊거나 동의를 철회하거나 토스를 탈퇴하면 토스가 그 사실을 알려 주고, 그때 로그인을 끝내고 그 계정으로 서버에 저장한 정보를 지워요.",
          en: "If you disconnect, withdraw consent or leave Toss, Toss tells us, and we end the sign-in and delete what was stored on the server for that account.",
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
        {
          ko: "Google 태그(Google 태그 관리자)로 Google 애널리틱스 같은 Google 분석 도구에 방문 정보(본 페이지, 머문 시간, 기기와 브라우저 종류, 대략적인 지역 등)를 보내 서비스 이용 방식을 분석해요. 이때 Google이 쿠키나 비슷한 기술을 쓸 수 있어요. 입력한 프로필과 인생 기록은 보내지 않아요. 브라우저에서 쿠키를 막거나 Google 애널리틱스 차단 부가기능(tools.google.com/dlpage/gaoptout)을 쓰면 수집을 거부할 수 있어요.",
          en: "A Google tag (Google Tag Manager) sends visit information (pages seen, time spent, device and browser type, approximate region and similar) to Google analytics tools such as Google Analytics to understand how the service is used. Google may use cookies or similar technology for this. The profile you enter and your life records are not sent. You can refuse by blocking cookies in your browser or with the Google Analytics opt-out add-on (tools.google.com/dlpage/gaoptout).",
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
          ko: "개인정보에 관한 문의나 삭제 요청은 문의 페이지(whatif.host/contact)나 게임 안 ⋯ 메뉴의 ‘의견 보내기’로 알려 주세요. 이 방침이 바뀌면 이 페이지의 날짜와 내용을 고쳐요.",
          en: "For questions or deletion requests about your information, use the contact page (whatif.host/en/contact) or “Send feedback” in the ⋯ menu inside the game. If this policy changes, this page and its date are updated.",
        },
      ],
    },
  ],
};

/** The date the terms last changed. Update it with the text. */
const TERMS_UPDATED = "2026-11-17";

// Plain-language terms of service. Also the page registered as the 서비스 이용약관 URL for 토스 로그인 in the 앱인토스 console.
const TERMS: { title: Pair; lead: Pair; sections: Section[] } = {
  title: { ko: "서비스 이용약관", en: "Terms of service" },
  lead: {
    ko: "What If(whatif.host와 토스 앱 안의 ‘왓 이프’ 미니앱, 이하 ‘서비스’)를 쓰기 전에 아래 내용을 읽어 주세요. 서비스를 쓰면 이 약관에 동의한 것으로 봐요.",
    en: "Please read this before using What If (whatif.host and the What If mini-app inside the Toss app, the “service”). Using the service means you agree to these terms.",
  },
  sections: [
    {
      title: { ko: "제1조 목적", en: "1. Purpose" },
      body: [
        {
          ko: "이 약관은 What If 운영자(이하 ‘운영자’)가 제공하는 AI 인생 시뮬레이션 서비스를 이용할 때 운영자와 이용자 사이의 권리, 의무, 책임을 정해요.",
          en: "These terms set out the rights, duties and responsibilities between the operator of What If (the “operator”) and the people who use its AI life simulation service.",
        },
      ],
    },
    {
      title: { ko: "제2조 서비스 내용", en: "2. What the service is" },
      body: [
        {
          ko: "서비스는 이용자가 입력한 프로필과 과거의 한 순간을 바탕으로, 규칙 엔진과 AI가 다른 선택을 한 가상의 인생을 끝까지 그려 보는 놀이예요. 결과를 정리한 회고록을 만들고, 원하면 회고록 게시판에 올릴 수 있어요.",
          en: "From the profile you enter and a moment in your past, a rules engine and an AI play out an imagined life in which you chose differently, to its end. You can have a memoir written and, if you like, post it to the memoir board.",
        },
        {
          ko: "서비스에 나오는 인물, 사건, 금액, 결과는 모두 지어낸 이야기예요. 실제 미래를 예측하지 않고, 투자, 진학, 취업, 건강, 법률 같은 실제 결정의 근거가 될 수 없어요.",
          en: "The people, events, amounts and outcomes in the service are fiction. It does not predict the real future and is not a basis for real decisions about money, school, work, health, law or anything else.",
        },
      ],
    },
    {
      title: { ko: "제3조 이용 요금과 광고", en: "3. Price and ads" },
      body: [
        {
          ko: "서비스는 무료예요. 운영 비용은 광고로 충당하며, 서비스 화면에 광고가 나올 수 있어요. 유료 기능을 새로 만들면 미리 알리고 이용자가 따로 고를 때만 요금이 생겨요.",
          en: "The service is free. Its costs are covered by ads, which may appear in the service. If a paid feature is ever added, it will be announced first and charged only when you choose it.",
        },
      ],
    },
    {
      title: { ko: "제4조 토스 로그인", en: "4. Toss login" },
      body: [
        {
          ko: "토스 앱 안에서는 토스 로그인으로 서비스를 쓸 수 있어요. 이때 운영자는 이용자가 토스의 동의 화면에서 허락한 정보만 받아요. 받은 정보는 개인정보 처리방침에 따라 다뤄요.",
          en: "Inside the Toss app you can use the service with Toss login. The operator then receives only what you allowed on Toss's consent screen, handled as described in the privacy policy.",
        },
        {
          ko: "이용자는 언제든 토스 앱에서 연결을 끊거나 동의를 철회할 수 있어요. 연결이 끊기거나 토스를 탈퇴하면 운영자는 그 사실을 전달받아 로그인을 끝내고, 그 계정으로 서버에 저장한 정보를 지워요. 이 기기에만 저장된 기록은 기기에서 직접 지울 수 있어요.",
          en: "You can disconnect or withdraw consent in the Toss app at any time. When you disconnect or leave Toss, the operator is told, ends the sign-in and deletes what was stored on the server for that account. Records kept only on your device can be cleared on that device.",
        },
      ],
    },
    {
      title: { ko: "제5조 이용자가 지킬 것", en: "5. What you agree not to do" },
      body: [
        {
          ko: "다음 행동은 하지 말아 주세요. 다른 사람의 실명, 연락처, 주소 같은 개인정보를 입력하거나 게시하는 것, 욕설, 혐오, 음란, 폭력을 부추기는 내용이나 불법적인 내용을 쓰는 것, 다른 사람의 권리를 침해하는 것, 자동화 도구로 서비스를 과도하게 호출하거나 운영을 방해하는 것, 광고를 부정하게 누르거나 조작하는 것.",
          en: "Please do not: enter or post anyone else's real name, contact details, address or other personal information; write abusive, hateful, sexual, violent or unlawful content; infringe anyone's rights; call the service excessively with automated tools or disrupt it; or click or manipulate ads dishonestly.",
        },
        {
          ko: "이를 어기면 운영자는 해당 입력을 막거나 게시물을 지우고, 서비스 이용을 제한할 수 있어요.",
          en: "If you do, the operator may block the input, remove posts and limit your use of the service.",
        },
      ],
    },
    {
      title: { ko: "제6조 회고록 게시물", en: "6. Memoir posts" },
      body: [
        {
          ko: "회고록 게시판에 올린 글은 누구나 볼 수 있어요. 글에 대한 책임은 올린 이용자에게 있고, 이용자는 서비스 안에서 글을 보여 주고 소개하는 데 필요한 범위에서 운영자가 글을 쓰도록 허락해요. 이용자는 자기 글을 언제든 지울 수 있어요.",
          en: "Posts on the memoir board are public. The person who posts is responsible for the post and lets the operator use it as needed to show and present it within the service. You can delete your own posts at any time.",
        },
        {
          ko: "신고가 쌓이거나 제5조에 어긋나는 글은 운영자가 알리지 않고 숨기거나 지울 수 있어요.",
          en: "Posts that are reported repeatedly or break section 5 may be hidden or removed without notice.",
        },
      ],
    },
    {
      title: { ko: "제7조 권리", en: "7. Ownership" },
      body: [
        {
          ko: "서비스의 디자인, 프로그램, 이벤트 문구, 이미지 같은 저작물의 권리는 운영자에게 있어요. 서비스가 이용자를 위해 만든 장면과 회고록은 개인적으로 보관하고 공유해도 돼요.",
          en: "The rights to the service's design, software, event text, images and other works belong to the operator. You may keep and share the scenes and memoirs the service writes for you.",
        },
      ],
    },
    {
      title: { ko: "제8조 서비스 변경과 중단", en: "8. Changes and interruptions" },
      body: [
        {
          ko: "운영자는 서비스 내용을 바꾸거나, 점검이나 장애, AI 제공업체 사정으로 서비스를 잠시 멈출 수 있어요. 서비스를 완전히 끝낼 때는 30일 전에 서비스 화면으로 알려요.",
          en: "The operator may change the service or pause it for maintenance, outages or reasons on the AI provider's side. If the service is closed for good, this is announced in the service 30 days ahead.",
        },
      ],
    },
    {
      title: { ko: "제9조 책임의 한계", en: "9. Limits of responsibility" },
      body: [
        {
          ko: "서비스는 무료로 있는 그대로 제공돼요. AI가 쓴 문장은 틀리거나 어색할 수 있고, 운영자는 그 내용을 믿고 내린 결정이나 이용자가 입력하고 게시한 내용으로 생긴 손해를 책임지지 않아요. 다만 운영자의 고의나 중대한 과실로 생긴 손해는 법에 따라 책임져요.",
          en: "The service is free and provided as it is. Text written by the AI can be wrong or odd, and the operator is not responsible for decisions made by relying on it or for harm caused by what users enter or post. The operator remains responsible as the law requires for harm caused intentionally or by gross negligence.",
        },
      ],
    },
    {
      title: { ko: "제10조 약관 변경과 문의", en: "10. Changes to these terms and questions" },
      body: [
        {
          ko: "약관을 바꾸면 이 페이지의 날짜와 내용을 고치고, 이용자에게 불리한 변경은 적용 7일 전부터 서비스 화면으로 알려요. 문의는 게임 안 ⋯ 메뉴의 ‘의견 보내기’로 해 주세요.",
          en: "When these terms change, this page and its date are updated; changes that work against users are announced in the service at least 7 days before they apply. For questions, use “Send feedback” in the ⋯ menu in the game.",
        },
        {
          ko: "이 약관은 대한민국 법에 따르고, 분쟁이 생기면 민사소송법에 따른 관할 법원에서 다뤄요.",
          en: "These terms are governed by the laws of the Republic of Korea, and disputes go to the court with jurisdiction under the Civil Procedure Act.",
        },
      ],
    },
  ],
};

const PAGES = { about: ABOUT, privacy: PRIVACY, terms: TERMS } as const;

export function InfoBody({ lang, page }: { lang: Lang; page: InfoPage }) {
  const p = PAGES[page];
  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{p.title[lang]}</h1>
        <p className="text-stone-600 dark:text-stone-400">{p.lead[lang]}</p>
        {page !== "about" && (
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {lang === "en" ? "Last updated" : "최종 수정"} {page === "terms" ? TERMS_UPDATED : UPDATED}
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

/**
 * Links to the reading pages, the text pages and the board, at the foot of every public page. Plain <a> links (full page
 * loads), because the reading pages load the ad script and the game's start screen must not carry it along.
 */
export function SiteFooter({ lang }: { lang: Lang }) {
  const links: [string, string][] =
    lang === "en"
      ? [
          ["About", infoPath(lang, "about")],
          ["Guide", "/en/guide"],
          ["How to play", "/en/how-to-play"],
          ["FAQ", "/en/faq"],
          ["Contact", "/en/contact"],
          ["Terms", infoPath(lang, "terms")],
          ["Privacy policy", infoPath(lang, "privacy")],
          ["Memoir board", "/en/board"],
        ]
      : [
          ["소개", infoPath(lang, "about")],
          ["가이드", "/guide"],
          ["이용 방법", "/how-to-play"],
          ["자주 묻는 질문", "/faq"],
          ["문의", "/contact"],
          ["이용약관", infoPath(lang, "terms")],
          ["개인정보 처리방침", infoPath(lang, "privacy")],
          ["회고록 게시판", "/board"],
        ];
  return (
    <footer className="mt-12 border-t border-stone-200 pt-5 dark:border-stone-800">
      <nav aria-label={lang === "en" ? "Site" : "사이트 안내"} className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-600 dark:text-stone-400">
        {links.map(([label, href]) => (
          <a key={href} href={href} className="underline-offset-2 hover:underline">
            {label}
          </a>
        ))}
      </nav>
      <p className="mt-4 text-xs text-stone-500 dark:text-stone-400">© What If · whatif.host</p>
    </footer>
  );
}
