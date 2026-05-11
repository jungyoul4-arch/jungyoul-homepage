# 카테고리·네비게이션 추가 절차

> 새 카테고리를 추가하거나 헤더 메뉴를 수정할 때 참조.

## 데이터 구조

### 카테고리 (`articles.category`)
- 단일 소스: `src/lib/data.ts` 의 `Category` 유니온 + `categories` 배열
- DB 스키마: `articles.category` text 컬럼 (Drizzle migration 에는 CHECK 제약 없음)
- `seed.sql` 에는 fresh-seed 보호용 CHECK 제약이 있으므로 새 값 추가 시 동시 갱신
- 운영 D1 DB 는 drizzle migration 으로 생성되어 CHECK 가 없음 → 카테고리 enum 확장은 마이그레이션 불필요

### 네비게이션 (`nav_menus` 테이블)
- DB-driven, parent_id 로 부모-자식 트리 구성
- 어드민 UI: `/admin/nav-menus` 에서 추가/수정 (href 는 자유 입력)
- 헤더 컴포넌트: `src/components/header.tsx` — `buildNavTree()` 로 평탄 → 트리 변환, DB 응답이 없으면 하드코딩 폴백 사용
- 메가메뉴/모바일 서브메뉴 자동 노출

### 부모 메뉴 라우팅 — catch-all 자동화
- `src/app/[slug]/page.tsx` 가 catch-all 동적 라우트로 단일 세그먼트 경로를 받는다
- `nav_menus` 에서 `parent_id IS NULL AND href = "/{slug}"` 행을 찾으면, 자식 행들을 `sortOrder asc` 로 가져와 HeroBanner + H1 + NavTabs + JSON-LD CollectionPage 를 자동 렌더
- 명시 라우트(`/articles`, `/exam`, `/teachers`, `/faq`, `/about`, `/contact`, `/location`, `/privacy`, `/terms`, `/highlights/*`, `/admin/*`, `/api/*`)는 Next.js 우선순위에 의해 catch-all 보다 먼저 매칭 → 충돌 없음
- 부모 행이 없으면 `notFound()` — 정상 404
- 로컬 dev/fresh-seed 폴백: catch-all 안의 `FALLBACK_PARENTS` 에 "정율사관" 부모만 inline 등록되어 있어, DB 가 비어도 `/jungyoul` 은 폴백으로 동작 (단일 소스 통합은 별도 작업 — `src/lib/default-nav.ts` 도입 계획)

## 새 카테고리 추가 절차

### A. "교육정보" 게시판에 단순 추가하는 경우
1. `src/lib/data.ts` — `Category` 유니온 + `categories` 배열에 `{ value, label }` 추가
2. `seed.sql` CHECK 제약에 새 값 추가 (fresh-seed 보호)
3. 끝. 자동 노출:
   - `/articles` 카테고리 탭
   - 홈 "최신 교육정보" 탭
   - 어드민 글 작성/수정 카테고리 드롭다운 (단일 소스 import)
   - 어드민 슬라이드 카테고리 드롭다운 (단일 소스 import)

### B. 새 부모 메뉴(또는 별도 게시판) 추가 — catch-all 자동 라우팅 사용

#### 기본 시나리오 — 자식 메뉴 모음만 필요할 때
어드민 작업만으로 끝. 코드 변경 0줄.

1. 어드민 `/admin/nav-menus` 진입
2. **상위 메뉴 추가** 클릭 → `label`(예: "모집안내"), `href`(예: `/admissions`) 입력 → 저장
3. 자식 행을 차례로 추가 — 각 자식의 `href` 는 기존 명시 라우트(`/teachers`, `/faq` 등) 또는 카테고리 쿼리(`/articles?category=X`) 또는 다른 부모 라우트(`/<slug>`)
4. 즉시 헤더에 새 부모 탭이 노출되고, `/admissions` 클릭 시 catch-all 이 자동 인덱스 페이지 렌더 (HeroBanner + H1 "모집안내" + 자식 탭 + JSON-LD)

→ 새 라우트 page.tsx 생성, sitemap 등록, Category enum 변경 모두 **불필요**. 운영 D1 의 `nav_menus` 데이터만 변경.

#### 고급 시나리오 — 별도 hero 이미지/콘텐츠/카테고리 필터가 필요할 때 (예: `/exam`)
1. A 단계 모두 수행 (새 카테고리 enum 등록)
2. `/articles` 와 홈 탭에는 노출하지 않으려면:
   - `src/components/article-list.tsx` 의 탭 렌더에서 `categories.filter((c) => c.value !== "<new>")`
   - `src/components/latest-articles.tsx` 동일 처리
3. **신규 라우트 페이지 생성** — `src/app/<slug>/page.tsx` (catch-all 보다 우선 매칭됨)
   - `src/app/articles/page.tsx` 또는 `src/app/exam/page.tsx` 패턴 모방
   - 쿼리: `eq(articlesTable.category, "<new>")`
   - `<ArticleList articles={...} hideTabs />` (탭 숨김 prop)
   - **JSON-LD 출력 시 `.replace(/</g, "\\u003c")` XSS escape 필수** (CLAUDE.md 보안 룰 — `src/app/location/page.tsx` 에서 누락된 적 있음, mistake-log 2026-05-11 참조)
   - metadata: `title`, `description`, `alternates.canonical`
4. `src/app/sitemap.ts` 에 새 라우트 추가
5. 어드민에서 `/admin/nav-menus` 진입 → 부모 메뉴 아래에 자식 행 추가 (label, href=`/<slug>`, sortOrder)
   - DB 행은 코드와 무관하게 어드민 UI 로 관리

### 카테고리 라벨 단일 소스
`InlineEditModal`, `/admin/articles/new`, `/admin/articles/[id]/edit`, `/admin/slides` 의 `categoryOptions` 는 모두 `src/lib/data.ts` 의 `categories` 배열을 import 한 뒤 `filter` 로 통합되어 있다. 라벨/value 변경은 `src/lib/data.ts` 한 곳만 수정.

`/admin/slides` 는 슬라이드용 빠른 글 생성에서 `exam` 카테고리를 제외한다 (별도 게시판이므로 슬라이드 메인 영역에 노출되지 않음): `categories.filter((c) => c.value !== "all" && c.value !== "exam")`.
