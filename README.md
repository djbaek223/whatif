# What If

AI 인생 시뮬레이터. 과거의 한 변곡점으로 돌아가 다른 선택을 했다면 내 인생이 어떻게 흘러갔을지 사망까지 살아봅니다.

서비스 주소(예정): https://whatif.damoai.net · 기획서: [What If 인생 시뮬레이터 기획서](https://claude.ai/code/artifact/aa7b9cf1-ec73-437f-a78f-31b39db0f41b)

## 실행

```bash
npm install
cp .env.example .env.local   # DEEPSEEK_API_KEY를 넣으면 AI 내레이션이 켜집니다
npm run dev                   # http://localhost:3000
```

API 키가 없어도 기본 문장으로 한 판을 끝까지 플레이할 수 있습니다.

## 구조

| 위치 | 역할 |
| --- | --- |
| `src/lib/engine.ts` | 규칙 엔진: 턴 길이(월·분기·반년·년), 능력치 변화, 돈, 사망 확률, 선택 적용 |
| `src/lib/events.ts` | 인생 이벤트 목록 (입시, 입대, 취업, 이직, 창업, 연애, 결혼, 출산, 집, 투자, 건강, 은퇴 등) |
| `src/lib/era.ts` | 연도별 한국 시대 메모 (서술 힌트) |
| `src/lib/narrator/` | DeepSeek 서술(`deepseek.ts`, 서버 전용, 기본 모델 `deepseek-flash`), 키가 없을 때의 기본 문장(`fallback.ts`), 응답 스키마 |
| `src/app/api/narrate/route.ts` | 서술 API. 키가 없으면 `no-key`를 돌려주고 화면은 기본 문장을 씁니다 |
| `src/components/` | 프로필 입력, 변곡점, 플레이, 엔딩 화면 |

숫자(능력치, 돈, 성공 여부, 사망)는 엔진이 정하고, AI(DeepSeek)는 시대 배경, 장면, 선택지 문장, 회고록만 씁니다. 게임 기록은 브라우저 localStorage에만 저장됩니다.

## 밸런스 확인

```bash
npm run simulate -- 500   # 자동 선택으로 500판을 돌려 평균 수명, 선택 수, 결혼·자녀·자산 분포를 출력
```
