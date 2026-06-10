# 정율 교육정보 홈페이지

정율 교육정보 (운영: <https://www.jungyoul.net>) 미디어 사이트의 Next.js App Router 코드베이스. 포지셔닝은 "교육 정보 미디어" — 학원 홍보 사이트가 아닙니다. 레이아웃 기준은 <https://news.samsung.com/kr/> 의 구조/계층을 따릅니다.

## 기술 스택
- Next.js 16 (App Router, Turbopack dev) + React 19
- Cloudflare Pages + OpenNext (`@opennextjs/cloudflare`)
- Cloudflare D1 (SQLite) + Drizzle ORM, Cloudflare R2 (이미지)
- Tailwind CSS 4
- 인증: JWT (`jose`) + HttpOnly 쿠키, login rate limiter (Cloudflare Ratelimit)
- 라이트 모드 전용 (다크 모드 미지원)

## 디렉터리 핵심
```
src/app/                  Next.js App Router 페이지/라우트
  ├ layout.tsx            루트 레이아웃 (AuthProvider·Tracking·ScrollTop·InlineEditModal)
  ├ (main)/               메인 사이트 라우트 그룹 (URL 비반영)
  │   ├ layout.tsx        HeaderServer + main + Footer
  │   ├ page.tsx          홈
  │   ├ [slug]/page.tsx   동적 부모 메뉴 catch-all (nav_menus 기반 자동 인덱스)
  │   └ articles/, exam/, story/, teachers/, faq/, ...  명시 라우트 (별도 hero·콘텐츠 가짐)
  ├ (community)/          익명 커뮤니티 라우트 그룹 (URL 비반영)
  │   ├ layout.tsx        미니 헤더 + 축소 푸터
  │   └ community/        /community, /community/new, /community/[id]
  ├ admin/                어드민 UI (middleware 가 /admin/* 인증 보호)
  └ api/                  Route handlers (admin/* 는 requireAdmin 게이트)
src/components/           재사용 컴포넌트 (Header, ArticleList, NavTabs 등)
src/db/                   Drizzle schema + D1 client
src/lib/                  auth, data(카테고리 단일 소스), sanitize, mappers, validation
drizzle/                  마이그레이션
seed.sql                  초기 데이터 시드 (스키마 표류 주의 — docs/categories.md 참조)
docs/                     작업별 가이드 (아래 "참조 문서")
graphify-out/             코드 그래프 (탐색 우선 자료)
.queue/                   content ↔ ui 워크트리 큐 (docs/worktree-protocol.md)
```

## 라우팅 모델 (핵심)
헤더 네비게이션은 D1 `nav_menus` 테이블에서 DB-driven 으로 빌드됩니다. 부모 메뉴 클릭 시 동작:

1. **명시 라우트** (`/articles`, `/exam`, `/story`, `/teachers`, `/faq`, `/about`, `/contact`, `/location`, `/privacy`, `/terms`) — 각자 고유한 hero·메타·콘텐츠를 갖는 페이지. `src/app/(main)/` 아래에 위치. Next.js 우선순위에 의해 catch-all 보다 먼저 매칭.
2. **catch-all `(main)/[slug]/page.tsx`** — 위에 매칭되지 않은 단일 세그먼트 경로를 받아 `nav_menus` 에서 `href = "/{slug}"` 부모 행을 조회. 부모가 있으면 자식 행들을 자식 탭 인덱스로 자동 렌더 (HeroBanner + H1 + NavTabs + JSON-LD CollectionPage). 부모가 없으면 `notFound()`.
3. **`(community)/community/**`** — 별도 미니 레이아웃(카테고리 메뉴·검색·헤더 링크 버튼 미노출).

→ **콘텐츠 관리자가 어드민 `/admin/nav-menus` 에서 부모 메뉴 행만 추가하면 코드 변경 없이 즉시 라우트가 동작합니다.** 별도 hero/콘텐츠가 필요한 경우에만 `src/app/(main)/<slug>/page.tsx` 명시 페이지를 추가하면 됩니다. 자세한 절차는 [`docs/categories.md`](docs/categories.md).

## 헤더 링크 버튼 (외부/내부)
`nav_menus` 와 별개로 헤더 우측 상단 돋보기 왼편(데스크탑) 또는 상단 바 아래 **좌측** 행(모바일)에 외부 사이트 링크 버튼을 N개까지 노출 가능. 시안은 투명 배경 + 옅은 회색 테두리(파란 캡슐 X). 어드민 `/admin/header-links` 에서 라벨·URL·**버튼 이미지**·순서 편집. 모든 버튼은 `target="_blank"` 새 탭. DB: `header_links` (`src/db/schema.ts`, drizzle 마이그 `0006_*`). 버튼 글리프는 `imageUrl` 우선이고, 비어 있으면 레거시 lucide 아이콘(`src/lib/header-link-icons.ts` 화이트리스트) 폴백. 이미지 업로드는 어드민 폼에서 `/api/admin/upload` 로 R2 저장.

## 메인 헤더 '액자' 풀스크린 슬라이드쇼
헤더 내장 전용 버튼(헤더 링크 버튼 왼쪽, `picture_frame_items` 가 1개 이상일 때만 노출). 클릭 시 풀스크린 오버레이로 이미지·유튜브를 sort_order 순 무한 재생 — 이미지는 항목별 노출시간(초) 타이머, 유튜브는 영상 종료 시 자동 전환(YouTube IFrame API). 어드민 `/admin/picture-frames` 에서 CRUD (유튜브는 URL→11자 ID 추출 저장, 이미지는 `/api/admin/upload` 재사용). DB: `picture_frame_items` (drizzle `0010_magical_ink.sql`), 전역 기본 노출시간은 `site_settings` 키. 자세히는 [`docs/picture-frame.md`](docs/picture-frame.md).

## 익명 커뮤니티 (`/community`)
고등학생 위주 익명 게시판. 가입 절차 없음 — 첫 진입 시 `anon_session` 쿠키 자동 발급, 닉네임(`조용한코끼리042` 형식) 영속. 단일 피드 + 어드민 관리 태그(수능/내신/논술/진로/고민/잡담 시드) 필터. 글당 이미지 1장 첨부, 평면(flat) 댓글, 세션별 좋아요 토글. PC=sticky 사이드바, Mobile=가로 칩(동일 페이지, Tailwind `lg:` 분기). 어드민: `/admin/community/posts` (모더레이션), `/admin/community/tags` (태그 CRUD). DB: `community_*` 5개 테이블 (drizzle `0008_add_community.sql`). 본문/댓글은 `sanitizeContent()` 필수. 자세히는 [`docs/community.md`](docs/community.md).

## 보안 룰 (항상 적용)
- **JSON-LD XSS escape**: 모든 `<script type="application/ld+json">` 출력은 `JSON.stringify(...).replace(/</g, "\\u003c")` 적용 필수
- **어드민 인증**: `/api/admin/**` route handler 는 `requireAdmin()` (`src/lib/admin-auth.ts`) 첫 줄 게이트. `/admin/*` 페이지는 `src/middleware.ts` 가 JWT 검증
- **HTML sanitize**: 사용자 입력 본문은 저장 시 `sanitizeContent()` (`src/lib/sanitize.ts`) 통과. iframe 허용 호스트는 YouTube/Vimeo 만
- 자세한 SEO·보안 룰 → [`docs/seo-checklist.md`](docs/seo-checklist.md)

## 로컬 개발

### 사전 설치
```bash
npm install
```
- `.dev.vars` 에 로컬 D1 binding 과 `JWT_SECRET` 등을 설정 (Cloudflare wrangler 가 읽음)
- 로컬 D1: `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite`

### dev 서버
```bash
npm run dev              # Next.js dev (Turbopack), http://localhost:3000
```

### 운영 환경 시뮬레이션
```bash
npm run preview          # opennextjs-cloudflare build + wrangler dev, http://localhost:8787
```
Node.js 런타임 차이로 dev 에서 안 잡히는 빌드 에러를 잡습니다. 배포 전 최소 1회 실행 권장.

### 검증
```bash
rm -rf .next && npm run typecheck  # 타입체크 (tsc --noEmit, .next 캐시 stale 회피)
npm run lint                       # ESLint
npm test                           # vitest — src/lib 단위 테스트
npm run build                      # Next.js production 빌드
graphify update .                  # 코드 그래프 갱신 (코드 변경 후 필수)
```
CI(`.github/workflows/deploy.yml`)의 `verify` job 이 `lint → typecheck → test` 를 배포 전 게이트로 실행합니다.

### 배포
```bash
npm run deploy           # opennextjs-cloudflare build + wrangler deploy
```

## 워크트리 큐 (content ↔ ui)
콘텐츠 작성은 별도 워크트리에서 진행, `.queue/*.json` 으로 본 워크트리에 전달. → [`docs/worktree-protocol.md`](docs/worktree-protocol.md), [`AGENTS.md`](AGENTS.md)

## 참조 문서
- [`docs/categories.md`](docs/categories.md) — 카테고리·네비게이션 추가 절차 (catch-all 라우팅 포함)
- [`docs/community.md`](docs/community.md) — 익명 커뮤니티(/community) 세션·API·디자인 토큰
- [`docs/seo-checklist.md`](docs/seo-checklist.md) — 페이지 추가/메타데이터/JSON-LD/sitemap 체크리스트
- [`docs/editor.md`](docs/editor.md) — 어드민 본문 에디터·페이스트 파이프라인·HWPX·썸네일 오버레이
- [`docs/picture-frame.md`](docs/picture-frame.md) — 메인 헤더 '액자' 풀스크린 슬라이드쇼(이미지/유튜브·자동전환·어드민)
- [`docs/tech-debt.md`](docs/tech-debt.md) — 기술부채 진단·위험도 로드맵(최신 재진단: 2026-06-10)
- [`docs/business-info.md`](docs/business-info.md) — 사업자 정보 (Organization JSON-LD·푸터·연락처)
- [`docs/mistake-log.md`](docs/mistake-log.md) — 회고/실수 노트
- [`docs/worktree-protocol.md`](docs/worktree-protocol.md) — 워크트리 큐 프로토콜
- [`CLAUDE.md`](CLAUDE.md) — Claude 에이전트용 작업 가이드 (사람도 빠른 개요로 활용)
- `graphify-out/GRAPH_REPORT.md` — 코드 그래프 (모든 코드 작업 전 우선 열람)

## 기여 시
1. `graphify-out/GRAPH_REPORT.md` 먼저 읽기
2. 변경 후 `graphify update .` 실행
3. `npm run preview` 로 운영과 동일한 번들 확인
4. 보안 룰(JSON-LD escape, requireAdmin, sanitize) 위반 없는지 점검
