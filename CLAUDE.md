# 정율 교육정보 홈페이지

## 프로젝트 정체성
- 포지셔닝: "교육 정보 미디어" — 학원 홍보 아님
- 레이아웃 기준: https://news.samsung.com/kr/ (구조/계층 재현 대상)
- 배포: Cloudflare Pages + OpenNext (https://www.jungyoul.net)
- 라이트 모드 전용 (다크 미지원)

## Git 작업 규칙 (필수)
- **`main` 브랜치에서만 작업·커밋한다.** 기능/수정/문서 등 모든 작업을 `main`에 직접 커밋.
- **임의로 feature 브랜치를 생성하지 않는다** (예: `feat/*`, `fix/*` 등 금지). 별도 브랜치가 필요하면 반드시 사용자에게 먼저 확인.
- 기본 환경 정책상 "기본 브랜치면 브랜치를 먼저 만들라"는 일반 지침이 있더라도, 이 저장소에서는 위 규칙이 우선한다.

## 항상 적용 (보안 필수)
- JSON-LD 출력 시 `.replace(/</g, "\\u003c")` XSS escape — 누락 금지 (location 페이지에서 누락된 적 있음, mistake-log 2026-05-11)
- 어드민 API는 `requireAdmin()` (`src/lib/admin-auth.ts`) 게이트 통과
- 사용자 입력 콘텐츠는 `sanitize-html` 통과 후 저장

## 라우팅 모델
- **라우트 그룹**: 메인 사이트 → `src/app/(main)/`, 익명 커뮤니티 → `src/app/(community)/` (URL 비반영)
- 부모 메뉴 catch-all: `src/app/(main)/[slug]/page.tsx` 가 `nav_menus` DB 기반으로 부모/자식을 조회해 인덱스 페이지(HeroBanner + H1 + NavTabs + JSON-LD)를 자동 렌더. **어드민 `/admin/nav-menus` 에 부모 행만 등록하면 코드 변경 없이 새 라우트가 동작**
- 명시 라우트(`/articles`, `/exam`, `/story`, `/teachers`, `/faq`, `/about`, `/contact`, `/location`, ...)는 `(main)/` 아래에 위치. Next.js 우선순위에 의해 catch-all 보다 먼저 매칭. 별도 hero/콘텐츠/카테고리 필터가 필요할 때만 명시 페이지를 추가 → 절차 [`docs/categories.md`](docs/categories.md). `/story` 는 `category="success"` 재사용 + 별도 라우트 변형 사례 (코드 참조)

## 헤더 링크 버튼 (외부/내부)
- `nav_menus` 와 별개. 헤더 우측 상단 돋보기 왼편(`lg≥`) / 상단 바 아래 **좌측** 행(`<lg`)에 N개 노출, 모두 `target="_blank"` 새 탭
- 시안: 투명 배경 + `border-gray-200` 옅은 테두리 + `text-text-primary`. 호버 시 테두리 진해지고 옅은 회색 배경. **파란 배경 캡슐은 사용하지 않음**
- 데이터: `header_links` (label, href, **image_url**, icon[레거시], sort_order) — `src/db/schema.ts` (drizzle 마이그 `0006_huge_purple_man.sql`)
- 어드민: `/admin/header-links` (CRUD + Up/Down reorder), 사이드바 "헤더 링크 버튼"
- 공개 API: `GET /api/header-links` (인증 없음, sort_order ASC)
- **버튼 글리프(라벨 왼쪽)**: `imageUrl` 우선(어드민에서 직접 업로드), 비어 있으면 레거시 lucide 아이콘 폴백(`src/lib/header-link-icons.ts` 화이트리스트). 어드민 신규 입력 UI 는 이미지 업로드만 노출 — lucide 이름 입력은 deprecated
- 이미지 업로드: 어드민 폼에서 `<input type="file">` → `/api/admin/upload` → R2 (`/api/admin/upload/{key}` 응답). 권장 크기 40×40 png/svg/webp
- 헤더 컴포넌트(`src/components/header.tsx`)는 lucide 아이콘을 `createElement` + ReactNode 헬퍼(`renderHeaderLinkGlyph`)로 렌더 — ESLint `react-hooks/static-components` 룰(렌더 중 컴포넌트 변수 생성 금지) 회피
- href 검증: `/` 또는 `http(s)://` 만 허용 (`hrefRefine` 재사용). `imageUrl` 은 max 500자 optional
- **SSR 선 렌더**: `src/components/header-server.tsx` (RSC)가 `nav_menus`·`header_links`를 D1에서 직접 fetch해 `<Header initialNavGroups initialHeaderLinks>`에 prop으로 전달 → 첫 paint에 실제 DB 데이터 포함, FOUC 없음. `src/app/(main)/layout.tsx`가 `<HeaderServer />`를 렌더. `/api/nav-menus`·`/api/header-links` API는 어드민 페이지용으로 유지되지만 공개 헤더에서는 더 이상 사용하지 않음
- **캡슐 버튼 노출 범위**: `header_links` 버튼은 `(main)/layout.tsx` 의 헤더에서만 노출. `/community` 내부(`(community)/layout.tsx`)에서는 미니 헤더만 표시됨

## 메인 헤더 '액자' 풀스크린 슬라이드쇼
- `header_links` 와 별개의 **헤더 내장 전용 액션 버튼**(데이터 주도 링크 아님). 헤더 링크 버튼(예: qa튜터링) **왼쪽**에 노출, `picture_frame_items` 가 1개 이상일 때만 표시
- 클릭 시 풀스크린 오버레이(`fixed inset-0`)로 이미지·유튜브를 sort_order 순 무한 재생. 이미지=항목별 `durationSec`(초) 타이머, **유튜브=영상 종료(`ENDED`) 시 전환**(YouTube IFrame Player API)
- 데이터: `picture_frame_items` (drizzle 마이그 `0010_magical_ink.sql`). 전역 기본 시간은 `site_settings` key `picture_frame_default_interval` (로고 전용 부수효과 있는 `/api/admin/settings` 와 분리한 `/api/admin/picture-frames/settings` 로 관리)
- 어드민: `/admin/picture-frames` (사이드바 "콘텐츠 관리"). 유튜브는 URL 입력 → `parseYouTubeId`(`src/lib/youtube.ts`)로 11자 ID 추출 후 저장. 이미지 업로드는 `/api/admin/upload` 재사용
- SSR: `header-server.tsx` 가 개수만 조회해 `<Header hasPictureFrame>` 전달(버튼 노출 결정), 슬라이드 데이터는 오버레이 오픈 시 `/api/picture-frames` 지연 fetch. 오버레이: `src/components/picture-frame-overlay.tsx`. 절차·주의 → [`docs/picture-frame.md`](docs/picture-frame.md)

## /community — 익명 커뮤니티
- 고등학생 위주 익명 게시판. 가입 X — `anon_session` 쿠키로 닉네임 영속화 (`src/lib/anon-session.ts`, `src/lib/community-nickname.ts`). 어드민 `admin_token` 과 별도 쿠키, 같은 `JWT_SECRET` 공유하지만 페이로드 키(`{ sid }` vs `{ username }`)로 구분
- 데이터: `community_sessions`/`community_tags`/`community_posts`/`community_post_likes`/`community_comments` (drizzle 마이그 `0008_add_community.sql`, 6개 기본 태그 시드 포함)
- 페이지: `/community` (단일 피드 + 태그필터, 무한스크롤), `/community/new` (글쓰기), `/community/[id]` (상세 + 평면 댓글 + 좋아요)
- 어드민: `/admin/community/posts` (모더레이션 — soft-deleted 포함 표시), `/admin/community/tags` (태그 CRUD). 사이드바 "커뮤니티" 그룹
- API: 공개 13개 `/api/community/*` (session/me/tags/posts/posts-detail/like/comments/upload) + 어드민 3개 `/api/admin/community/*`
- 이미지: 1장 첨부, R2 키 prefix `community/YYYY/MM/...` (`/api/community/upload`). 검증·MIME·크기 규약은 `/api/admin/upload` 동일
- 본문(`title`은 평문, `body`는 HTML)·댓글: `sanitizeContent()` (`src/lib/sanitize.ts`) 필수. JSON-LD 는 `renderJsonLd()` 로 `<` → `<` escape
- 본인 식별: `session_id` 일치. soft-delete 통일(`isDeleted=true`) — 좋아요·댓글 정합성 보장. 본인 글/댓글만 삭제 가능, 어드민은 강제 삭제
- cursor 페이지네이션: `src/lib/community-cursor.ts` — base64(`createdAt|id`). `community-feed.tsx` 에서 IntersectionObserver 무한스크롤
- 댓글 카운터: `src/lib/community-helpers.ts` 의 `bumpCommentCount`/`bumpLikeCount` — SQL UPDATE `MAX(0, ...)` 로 음수 방지
- **스타일링 (러프 v1)**: `globals.css` 의 `--color-community-*` 4종(surface/border/accent/muted) 만 사용. hex/arbitrary 금지. 디자인 변경 시 4줄 토큰만 손보면 전체 갱신. 각 컴포넌트 최상단에 `// STYLING: rough v1 — community tokens only` 주석 (핫스팟 표시)
- **chrome 분리**: `src/app/(community)/layout.tsx` 가 미니 헤더(로고 + "커뮤니티" 타이틀 + "글쓰기" CTA + "메인 ←" 링크) + 축소 푸터(회사정보 + SNS 만)를 제공. 카테고리 메뉴·검색·헤더 링크 캡슐·풀 푸터는 노출되지 않음
- 헤더 링크 등록: 배포 후 `/admin/header-links` 에 행만 추가(label="커뮤니티", href=`/community`) — 코드 변경 불필요. 단, 이 버튼은 메인 사이트 헤더(`(main)/layout.tsx`)에서만 노출됨
- v2 로 미룬 항목: Turnstile, 레이트리밋, 신고, 이미지 다중, 댓글 좋아요, 검색, 알림 — 절차 [`docs/community.md`](docs/community.md)

## /exam 페이지 태깅 시스템
- `category = "exam"` 기사에만 적용되는 별도 메타데이터 레이어. 카테고리 enum 과 무관
- 태그 3차원: **연도**(exam_year), **학년**(exam_grade, 고1/고2/고3), **과목**(exam_subject, 국어/영어/수학/과학)
- 옵션 목록은 DB-driven — `exam_tag_options` 테이블에서 어드민이 관리 (drizzle 마이그 `0007_add_exam_tags.sql`)
- 어드민: `/admin/exam-tag-options` (3개 tagType 별 섹션, add/delete/reorder), 사이드바 "시험 태그 옵션"
- 공유 컴포넌트: `<ExamTagSelects>` — `/api/exam-tag-options` 에서 **DB 옵션만** fetch 해 노출(builtin 폴백 없음, `<ExamArticleFilter>` 와 동일하게 어드민이 SSOT). 옵션이 0개인 tagType 의 select 는 disabled + "어드민 → 시험 태그 옵션에서 먼저 등록하세요" 안내. `/admin/exam-tag-options` 에 최소 1개 이상 옵션 등록이 셋업 필수. **`form.category === "exam"` 일 때만 렌더** (어드민 글 작성/수정, 빠른편집 모달 3곳 공통)
- `/exam` 페이지 필터 UI: `<ExamArticleFilter>` — URL 쿼리 `?year=&grade=&subject=` 와 동기화되는 select 3개
- 공개 API: `GET /api/exam-tag-options` (인증 없음, 선택적 `?type=` 필터)
- strategy/news 등 다른 카테고리 기사는 `exam_*` 컬럼이 NULL — UI 노출 없음

## 독립 HTML 페이지 (`/p/[slug]`)
- 기사와 **별개 엔티티** `html_pages` (drizzle 마이그 `0013_happy_jack_power.sql`). 어드민이 원본 HTML 을 통째로 등록 → `content` 컬럼에 **verbatim 저장**(정화·스코프 안 함)
- 공개 라우트 `src/app/p/[slug]/page.tsx` 는 **`(main)` 그룹 밖**(루트 `app/layout.tsx` 만 적용 → 사이트 헤더/푸터 없음). 등록 HTML 을 **sandbox iframe**(`srcDoc`)으로 전체화면 렌더. `sandbox` 에 **`allow-same-origin` 미부여** → iframe 이 opaque origin 으로 실행되어 부모(메인 사이트) 쿠키·DOM 접근 불가 = 임의 `<script>` 를 안전하게 허용(어드민 전용 작성 + 격리). SEO 트레이드오프: iframe 내부는 본문 색인 안 됨(title/excerpt 메타만)
- 어드민: `/admin/html-pages` (목록 + "새 HTML 추가"), 사이드바 "콘텐츠 관리" 그룹. 폼 = title/slug(자동생성)/date/카드라벨/excerpt/`ThumbnailUploader aspect="16:9"`/원본 HTML textarea. API `/api/admin/html-pages`(+`[id]`) `requireAdmin` 게이트, 유니크 slug 409, `content` 는 `processArticleHtml` **미적용**(iframe verbatim 렌더이므로)
- 메인/목록 노출: `toHtmlPageCard`(`mappers.ts`) 가 HTML 페이지를 `kind:"html"` + **어드민이 지정한 `category`**(미지정 시 `"html"` 폴백)로 매핑. 기사와 **동일하게 "설정한 카테고리"로 필터**됨 — 홈 `(main)/page.tsx` 는 전체 HTML 을 "최신 교육정보" 피드에 date 순 병합하고, **`/articles`·`/exam`·`/story` 도 각자 범위(`allowed` 카테고리 / `exam` / `growth`)에 해당하는 HTML 을 함께 병합**(절차·근거 → 이 저장소 plan). 카드(`latest-articles.tsx`·`article-list.tsx` 공통)는 `kind==="html"` 이면 `/p/{slug}` 링크 + 빠른편집(기사 전용) 버튼 숨김. `category="html"`(레거시 빈 값 폴백) 은 `categories` 탭 배열에 없어 탭 미생성 — "전체" 탭에서만 노출
- 목록 페이지 카테고리 토글/필터/페이지네이션은 **shallow routing**(`window.history.pushState/replaceState`)으로 URL 만 갱신 → 서버 라운드트립 없이 `useSearchParams` 파생 상태로 즉시 클라이언트 필터(홈과 동일한 반응성). `article-list.tsx`·`exam-article-filter.tsx`. `router.replace` 사용 금지(force-dynamic 재요청 유발)
- 본문 에디터 툴바의 (구) HTML 소스 삽입 버튼은 제거되고 이 엔티티로 이전됨 — 레거시 in-article raw 블록 호환은 서버 측 유지 → [`docs/editor.md`](docs/editor.md)

## 디자인 토큰 (색상)
- 색상은 모두 `src/app/globals.css` `@theme inline` 블록의 `--color-*` 토큰으로만 표기. **신규 코드에서 hex 값(`#1A1A1A`, `#1E64FA` 등) 임의 입력 금지**
- 브랜드/텍스트 토큰: `brand-blue`(#1E64FA), `brand-blue-dark`(#0E41AD), `text-primary`(#1A1A1A), `text-secondary`(#666666), `border-light`(#E0E0E0), `article-line`(#E0E9FE), `media-bg`(#f4f7ff)
- Tailwind 사용 예: `text-brand-blue`, `text-text-primary`, `text-text-secondary`, `bg-brand-blue`, `border-border-light`, `bg-border-light`
- UI 그레이스케일(`#F5F5F5` 호버 배경, `#d9d9d9` 비활성 텍스트, `#e9e9e9` 호버 다크) 은 브랜드 팔레트가 아니므로 Tailwind arbitrary 또는 native `gray-*` 사용 허용 (article-list 페이지네이션, footer SNS 버튼 hover 등)
- 다크 모드: `@custom-variant dark (&:is(.dark *))` 는 의도적으로 보존 — Tailwind v4 의 기본 `prefers-color-scheme: dark` 자동 활성을 무력화하는 가드. 본문에서 어디서도 `.dark` 클래스를 추가하지 않으므로 `dark:` 유틸리티는 영구 inert
- 신규 토큰 추가 시: `globals.css:6` `@theme` 블록에 `--color-<name>: <hex>` 추가 → `bg-<name>` / `text-<name>` / `border-<name>` 유틸리티 자동 생성

## 코드베이스 탐색 규칙
- 모든 코드 질문/작업 전: `graphify-out/GRAPH_REPORT.md` 먼저 읽기
- `graphify-out/wiki/index.md` 있으면 raw 파일 대신 그쪽 우선
- 코드 변경 후 `graphify update .` 실행 (AST 전용, 무료)

## 작업별 참조 문서 (필요 시 열람)
- 전체 개요/명령어/디렉터리 구조 → [`README.md`](README.md)
- 페이지/링크/메타데이터/sitemap 추가 → [`docs/seo-checklist.md`](docs/seo-checklist.md)
- 카테고리·네비게이션 추가 절차(catch-all 라우팅, 단일 소스, /exam 같은 별도 라우트) → [`docs/categories.md`](docs/categories.md)
- 익명 커뮤니티(/community): 익명 세션·닉네임 생성·API·디자인 토큰 → [`docs/community.md`](docs/community.md)
- 메인 헤더 '액자' 풀스크린 슬라이드쇼(이미지/유튜브·자동전환·어드민) → [`docs/picture-frame.md`](docs/picture-frame.md)
- 빠른편집 에디터(페이스트 파이프라인·HWPX·sanitize·썸네일 오버레이) → [`docs/editor.md`](docs/editor.md)
- 사업자 정보(JSON-LD Organization·푸터·연락처) → [`docs/business-info.md`](docs/business-info.md)
- 빌드/타입 에러 디버깅 회고 → [`docs/mistake-log.md`](docs/mistake-log.md)
- 기술부채 인벤토리·우선순위 개선 로드맵 → [`docs/tech-debt.md`](docs/tech-debt.md)
- 기술부채 P0·P1 개선 수행서(항목별 수정/테스트/디버깅 절차) → [`docs/tech-debt-plan.md`](docs/tech-debt-plan.md)
- 워크트리간 큐 프로토콜(content ↔ UI) → [`docs/worktree-protocol.md`](docs/worktree-protocol.md)
- 콘텐츠(원고) 작성 규칙·카테고리·frontmatter → [`AGENTS.md`](AGENTS.md)
