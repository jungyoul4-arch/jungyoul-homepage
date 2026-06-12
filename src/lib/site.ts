// 사이트 정규 도메인 단일 소스(SSOT).
// sitemap·robots·JSON-LD·metadata 가 모두 이 상수를 참조해야 한다.
// 라이브 도메인은 news.jung-youl.com (www.jungyoul.net 은 별개 레거시 사이트).
// 도메인 변경 시 이 한 곳만 수정한다.
export const SITE_URL = "https://news.jung-youl.com";

// 카카오톡 채널(플러스친구) 상담 링크 — 상담 페이지·푸터·메인 우하단 플로팅 버튼이 공유한다.
// site_settings 의 kakao_channel_url 값으로 덮어쓸 수 있고, 미설정 시 이 상수가 폴백.
export const KAKAO_CHANNEL_URL = "http://pf.kakao.com/_xiqxhxlxb";
