# SEO/AEO 체크리스트

## 페이지 추가 시
- [ ] `<head>` metadata 작성 (title/description/keywords/openGraph)
- [ ] JSON-LD 구조화 데이터 삽입 (Article/Organization/BreadcrumbList/CollectionPage 등)
- [ ] `src/app/sitemap.ts` 에 새 경로 추가
- [ ] `src/app/robots.ts` 정책 확인
- [ ] metadata `alternates.canonical` 지정

## 카테고리 게시판 추가 시
- [ ] `src/lib/data.ts` 의 `Category` 유니온 + `categories` 배열 확장 (단일 소스)
- [ ] `seed.sql` CHECK 제약 갱신 (fresh-seed 보호)
- [ ] 홈/`/articles` 탭에 노출할지 결정 — 미노출이면 `latest-articles.tsx`/`article-list.tsx` 에서 filter
- [ ] 별도 라우트면 `<ArticleList hideTabs />` 사용
- [ ] 어드민 `nav_menus` UI 에서 메뉴 행 추가
- 자세한 절차: [`categories.md`](categories.md)

## 링크 추가 시
- [ ] 대상 페이지 존재 여부 확인 — 데드링크 금지

## XSS 방지
- 모든 JSON-LD 직렬화: `.replace(/</g, "\\u003c")` 적용 필수
- 본문 콘텐츠는 저장 시 `src/lib/sanitize.ts` `sanitizeContent()` 통과 (어드민 API 에서 자동 적용)
- sanitize 화이트리스트 확장 시 정규식으로 값 제한 — [`editor.md`](editor.md) 참조

## 자산 규격
- OG 이미지: `/public/og-image.png` (1200×630)
- 로고: `/public/logo.png` (최소 112×112)

## 인증 코드 교체
- `src/app/layout.tsx` 에서 `REPLACE_WITH_` 접두사 검색 → Google/Naver 인증 코드로 교체
