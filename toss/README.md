# What If · 앱인토스 미니앱

웹사이트와 같은 게임 코드(`../src`)를 앱인토스 WebView 미니앱(비게임)으로 빌드하는 폴더예요.
게임 엔진, 이벤트, 화면은 웹과 공유하고, 여기에는 토스용 껍데기만 있어요.

## 구조

- `src/main.tsx` 게임을 한국어 전용으로 띄워요.
- `src/toss.ts` Safe Area(홈 인디케이터 여백)를 맞춰요.
- `src/tossAds.ts` 토스 인앱 광고를 기존 광고 자리에 연결해요. 이야기 피드 배너, 회고록 쓰는 동안 전면 광고.
- `src/shims/next-link.tsx` 웹사이트 페이지(게시판, 소개, 개인정보) 링크를 글자로만 보여줘요. 미니앱에서 외부 사이트로 몰래 나가지 않게요.
- `apps-in-toss.config.ts` 앱 ID(`whatif-host`, 표시 이름은 "왓 이프"), 내비게이션 바, WebView 설정.

미니앱에는 서버가 없어서 AI 내레이션, 회고록 게시판, 피드백은 웹사이트 API(`WHATIF_API_BASE`, 기본 https://whatif.host)를 불러요.
웹사이트의 `src/proxy.ts`가 이 미니앱 주소(`https://whatif-host.apps.tossmini.com`, QR 테스트용 `https://whatif-host.private-apps.tossmini.com`)만 CORS로 허용해요.
콘솔에 등록한 앱 ID가 `whatif-host`가 아니게 되면 `apps-in-toss.config.ts`와 Vercel 환경 변수 `TOSS_APP_NAME`을 같이 바꿔 주세요.

## 실행

```bash
cd toss
npm install
cp .env.example .env   # 광고 그룹 ID를 넣어요 (없으면 광고 없이 동작)
npm run dev            # 같은 와이파이에서 샌드박스 앱으로 QR 테스트
npm run build          # vite build 후 ait build → .ait 파일
npm run deploy         # 콘솔에 업로드 (ait deploy, API 키 필요)
```

## 출시 전 확인

- 출시 번들에는 테스트 광고 그룹 ID가 아닌 실제 ID만 넣어요. 테스트 ID가 남아 있으면 반려돼요.
- 웹사이트(Vercel)를 이 브랜치 이후 버전으로 배포해야 CORS가 열려요.
