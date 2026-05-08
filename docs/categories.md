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
- 어드민 UI: `/admin/nav-menus` 에서 추가/수정
- 헤더 컴포넌트: `src/components/header.tsx` — `buildNavTree()` 로 평탄 → 트리 변환, DB 응답이 없으면 하드코딩 폴백 사용
- 메가메뉴/모바일 서브메뉴 자동 노출

## 새 카테고리 추가 절차

### A. "교육정보" 게시판에 단순 추가하는 경우
1. `src/lib/data.ts` — `Category` 유니온 + `categories` 배열에 `{ value, label }` 추가
2. `seed.sql` CHECK 제약에 새 값 추가 (fresh-seed 보호)
3. 끝. 자동 노출:
   - `/articles` 카테고리 탭
   - 홈 "최신 교육정보" 탭
   - 어드민 글 작성/수정 카테고리 드롭다운 (단일 소스 import)

### B. 별도 라우트(예: `/exam`) 가 필요한 경우 — 정율사관 하위처럼
1. A 단계 모두 수행
2. `/articles` 와 홈 탭에는 노출하지 않으려면:
   - `src/components/article-list.tsx` 의 탭 렌더에서 `categories.filter((c) => c.value !== "<new>")`
   - `src/components/latest-articles.tsx` 동일 처리
3. 신규 라우트 페이지 생성 — `src/app/<slug>/page.tsx`
   - `src/app/articles/page.tsx` 패턴 모방
   - 쿼리: `eq(articlesTable.category, "<new>")`
   - `<ArticleList articles={...} hideTabs />` (탭 숨김 prop)
   - JSON-LD CollectionPage 출력 시 `.replace(/</g, "\\u003c")` XSS escape (CLAUDE.md 보안 룰)
   - metadata: `title`, `description`, `alternates.canonical`
4. `src/app/sitemap.ts` 에 새 라우트 추가
5. 어드민에서 `/admin/nav-menus` 진입 → 부모 메뉴 아래에 자식 행 추가 (label, href=`/<slug>`, sortOrder)
   - DB 행은 코드와 무관하게 어드민 UI 로 관리

### 카테고리 라벨 단일 소스
`InlineEditModal`, `/admin/articles/new`, `/admin/articles/[id]/edit` 의 `categoryOptions` 는 모두 `categories.filter((c) => c.value !== "all")` 로 통합되어 있다. 라벨/value 변경은 `src/lib/data.ts` 한 곳만 수정.
