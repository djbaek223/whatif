// Short Korean era notes used as hints for narration. Not exhaustive; the LLM fills in texture.
import { newsHints } from "./news";

const ERA: Record<number, string> = {
  1980: "컬러 TV 방송이 시작되었다.",
  1986: "서울 아시안게임이 열렸다.",
  1987: "6월 민주항쟁으로 대통령 직선제 개헌이 이루어졌다.",
  1988: "서울 올림픽이 열리고 '호돌이'가 어디에나 있었다.",
  1993: "금융실명제가 전격 시행되었고, 첫 대학수학능력시험이 치러졌다.",
  1997: "외환위기로 IMF 구제금융을 받게 되었고, 정리해고와 금 모으기 운동이 이어졌다.",
  1998: "외환위기의 여파로 취업난이 심했다.",
  1999: "PC방과 스타크래프트, 초고속 인터넷이 퍼져 나갔다.",
  2000: "닷컴 열풍이 불었다가 꺼졌다.",
  2002: "한일 월드컵 4강 신화로 거리가 붉게 물들었다.",
  2003: "신용카드 대란으로 신용불량자가 크게 늘었다.",
  2004: "KTX가 개통되었다.",
  2008: "글로벌 금융위기로 주가와 환율이 요동쳤다.",
  2009: "아이폰이 국내에 출시되며 스마트폰 시대가 열렸다.",
  2012: "'강남스타일'이 세계적으로 유행했다.",
  2016: "알파고와 이세돌의 대국이 있었고, 겨울에는 촛불집회가 이어졌다.",
  2017: "대통령 탄핵 이후 조기 대선이 치러졌다.",
  2018: "평창 동계올림픽이 열렸다.",
  2020: "코로나19 팬데믹으로 재택근무와 마스크가 일상이 되었다.",
  2021: "집값과 코인 가격이 크게 올랐다.",
  2022: "금리가 빠르게 오르며 부동산 시장이 얼어붙었다.",
  2023: "생성형 AI가 빠르게 퍼지기 시작했다.",
};

export function eraHints(year: number): string[] {
  const headlines = newsHints(year);
  return Object.entries(ERA)
    .map(([y, text]) => [Number(y), text] as const)
    // The year itself is covered by its headlines when there are any.
    .filter(([y]) => Math.abs(y - year) <= 2 && !(y === year && headlines.length))
    .map(([y, text]) => `${y}년: ${text}`)
    .concat(headlines);
}
