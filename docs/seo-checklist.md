# SEO/AEO 체크리스트

## 페이지 추가 시
- [ ] `<head>` metadata 작성 (title/description/keywords/openGraph)
- [ ] JSON-LD 구조화 데이터 삽입 (Article/Organization/BreadcrumbList/CollectionPage 등)
- [ ] `src/app/sitemap.ts` 에 새 경로 추가 (catch-all 자동 라우트의 경우도 sitemap 에는 명시 등록 필요 — sitemap 자동 갱신은 [`categories.md`](categories.md) 의 후속 작업)
- [ ] `src/app/robots.ts` 정책 확인
- [ ] metadata `alternates.canonical` 지정

## 부모 메뉴(네비게이션) 추가 시
- 어드민 `/admin/nav-menus` 에 부모 행만 등록하면 catch-all `src/app/(main)/[slug]/page.tsx` 가 자동으로 인덱스 페이지를 렌더한다. 별도 hero/콘텐츠가 필요 없으면 코드 변경 0 줄
- 별도 hero/콘텐츠/카테고리 필터가 필요한 경우(예: `/exam`) 에만 명시 페이지를 만든다 — 절차는 [`categories.md`](categories.md) "B 고급 시나리오"
- 자세한 라우팅 모델은 [`README.md`](../README.md) "라우팅 모델" 섹션

## 카테고리 게시판 추가 시
- [ ] `src/lib/data.ts` 의 `Category` 유니온 + `categories` 배열 확장 (단일 소스)
- [ ] `seed.sql` CHECK 제약 갱신 (fresh-seed 보호)
- [ ] 홈/`/articles` 탭에 노출할지 결정 — 미노출이면 `latest-articles.tsx`/`article-list.tsx` 에서 filter
- [ ] 별도 라우트면 `<ArticleList hideTabs />` 사용
- [ ] 어드민 `nav_menus` UI 에서 메뉴 행 추가
- [ ] 슬라이드 메인에도 노출할지 결정 — 제외하려면 `/admin/slides` 의 `categoryOptions` filter 갱신 (`src/lib/data.ts` 기반)
- 자세한 절차: [`categories.md`](categories.md)

## 링크 추가 시
- [ ] 대상 페이지 존재 여부 확인 — 데드링크 금지
- catch-all 이 `nav_menus` 부모 행과 일치하는 슬러그만 200 응답하므로, 자식 메뉴 href 가 부모 슬러그로 향할 때는 부모 행이 실제 DB 에 있는지 확인

## XSS 방지
- **모든 JSON-LD 직렬화: `.replace(/</g, "\\u003c")` 적용 필수**. 12 곳의 인라인 패턴 중 한 곳(`src/app/location/page.tsx`)에서 누락되어 mistake-log 2026-05-11 회고에 기록됨. 새 JSON-LD 작성 시 grep 으로 적용 여부 자가 점검
  ```bash
  grep -L "replace(/</g" $(grep -rl "application/ld+json" src/app)
  # 출력 0 줄이어야 함
  ```
- 본문 콘텐츠는 저장 시 `src/lib/sanitize.ts` `sanitizeContent()` 통과 (어드민 API 에서 자동 적용)
- sanitize 화이트리스트 확장 시 정규식으로 값 제한 — [`editor.md`](editor.md) 참조

## 자산 규격
- OG 이미지: `/public/og-image.png` (1200×630)
- 로고: `/public/logo.png` (최소 112×112)

## 도메인 일관성 (주의)
현재 `src/app/layout.tsx` 의 `metadataBase`/`alternates`/`openGraph.url` 과 EducationalOrganization JSON-LD 의 `url`/`logo` 가 `https://news.jung-youl.com` 으로, sitemap/robots/개별 페이지 JSON-LD 는 `https://www.jungyoul.net` 으로 분기되어 있다. 도메인 통일은 별도 작업 — 새 페이지 추가 시 기존 페이지가 사용하는 도메인을 그대로 따를 것 (대부분 `https://www.jungyoul.net`).

## 검색엔진 인증
- `src/app/layout.tsx` 본문의 `<head>` 안 `<meta name="naver-site-verification">`, `<meta name="google-site-verification">` 직접 태그가 단일 소스. `metadata.verification` 객체는 사용하지 않음 (placeholder 잔존 문제로 제거됨 — mistake-log 2026-05-11)
- 인증 코드 교체는 본문 meta 태그 2 줄에서만 수행
