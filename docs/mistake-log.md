# 실수 노트 (Mistake Log)

기록 형식: 날짜 / 현상 / 원인 / 해결 / 교훈

## 2026-05-14 — 신규 vitest 9종 도입 직후 husky pre-commit 실패 + sanitize iframe 결함 발견
- 현상: `lint-staged` 의 `bash -c 'npx tsc --noEmit'` 가 3개 TS 에러로 husky pre-commit (code 1) 실패. 추가로 `npm test` 실행 시 (a) `validation-helpers.test.ts` 가 `createInsertSchema(...).pick is not a function` 으로 모듈 로드 실패, (b) `sanitize.test.ts` "strips iframes from non-allowed hosts" 가 `<iframe></iframe>` 잔재로 실패
- 원인:
  - **TS 3건**: 신규 테스트가 소스에 없는 export 를 import (`HEADER_LINK_ICONS` 가 `const` 만, `HEADER_LINK_ICON_NAMES` 미존재, `cn` 미존재). 테스트 작성자가 shadcn 컨벤션을 가정했으나 `src/components/ui/button.tsx` 삭제와 함께 `cn` 도입이 누락된 상태였음
  - **validation 테스트 mock 결손**: `vi.mock("drizzle-zod", ...)` 가 `omit()` 만 노출했는데 `validation.ts:174,178` 가 community 스키마에서 `pick()` 체인 사용. 프로덕션 코드는 정상(실제 ZodObject 는 `pick`/`omit` 둘 다 보유), 모킹만 불완전
  - **sanitize 결함**: `sanitize-html` 의 `allowedIframeHostnames` 가 src 만 strip 하고 빈 `<iframe></iframe>` 태그를 남김. 무해하지만 CLAUDE.md "iframe 허용 호스트는 YouTube/Vimeo 만" 의도와 미정합. 테스트가 이 갭을 노출
- 해결:
  - `HEADER_LINK_ICONS` `export` + `HEADER_LINK_ICON_NAMES = Object.keys(HEADER_LINK_ICONS)` 추가
  - `clsx`/`tailwind-merge` 추가 후 `cn(...inputs) = twMerge(clsx(inputs))` 를 `src/lib/utils.ts` 에 신설 (shadcn 컨벤션)
  - `vi.mock("drizzle-zod", ...)` 가 chain 헬퍼로 `omit`/`pick` 동시 반환하도록 수정
  - `src/lib/sanitize.ts` 에 `exclusiveFilter: (frame) => frame.tag === "iframe" && !frame.attribs.src` 추가 — src 없는 iframe 전체 제거. 유튜브/Vimeo iframe 은 src 보존되므로 영향 없음
- 결과: 9개 테스트 파일 78건 모두 통과(`Tests 78 passed`). `npx tsc --noEmit` 0 에러
- 교훈:
  (1) **테스트 작성자와 소스 변경자가 분리된 PR 흐름** 에서는 import-export 정합성이 자주 깨진다 — pre-commit 의 `tsc --noEmit` 가 마지막 방어선. lint-staged 가 `*.ts` 변경분에서만 동작하므로, 테스트만 추가하고 소스 변경 없는 커밋도 `tsc` 가 트리거되도록 staged glob 확인 권장.
  (2) **`vi.mock` 은 production 코드의 호출 표면 전체** 를 노출해야 한다. drizzle-zod 처럼 체인이 길어지는 API 는 `pick`/`omit`/`required`/`partial` 등 사용되는 메서드를 모두 mock chain 에 두자.
  (3) **`sanitize-html`의 `allowedIframeHostnames` 는 src 만 strip** 하고 태그를 남긴다. 호스트 화이트리스트와 "잘못된 iframe = 완전 제거" 의도가 일치하려면 `exclusiveFilter` 가 함께 필요. 외부 라이브러리의 부분 sanitize 동작은 테스트로 가시화하지 않으면 발견하기 어려움.

## 2026-05-14 — JSON-LD XSS escape 전수검증 — 전원 renderJsonLd() 헬퍼 적용 확인
- 현상: JSON-LD `<script type="application/ld+json">` 출력 지점 13개 전수 감사 실시
- 결과: `src/app` 내 모든 13개 파일이 `renderJsonLd()` 헬퍼(`src/lib/json-ld.ts`) 를 사용하고 있음. 인라인 `JSON.stringify` + `dangerouslySetInnerHTML` 직접 사용 0건, 원시 `.replace(/</g, "\\u003c")` 잔재 0건
- 해결: 코드 수정 없음. `docs/seo-checklist.md` 의 grep 점검 명령을 `renderJsonLd` 기준으로 갱신하고 인라인 패턴 잔재 확인 명령 추가
- 교훈: `renderJsonLd()` 헬퍼로의 이행(2026-05-11) 이 완전히 정착됨. 새 JSON-LD 추가 시 반드시 헬퍼를 사용하고, 아래 grep 으로 자가 점검할 것:
  ```bash
  grep -rL "renderJsonLd" $(grep -rl "application/ld+json" src/app)
  grep -rn 'dangerouslySetInnerHTML.*JSON\.stringify' src/app
  ```

## 2026-05-13 — 디자인 토큰 마이그레이션 후 hex 잔재 추가 발견 (`text-[#666]`, `border-[#E0E0E0]`)
- 현상: hex → 토큰 마이그레이션을 27 파일에 일괄 적용한 직후 검증 단계에서 (a) `text-[#666]` 8 곳(`article-list.tsx` × 5, `highlights-carousel.tsx` × 3), (b) `border-[#E0E0E0]`/`bg-[#e0e0e0]` 11 곳(`footer.tsx`/`latest-articles.tsx`/`media-library.tsx`/`highlights-carousel.tsx`/`[slug]/page.tsx`/`exam/page.tsx`/`articles/page.tsx`) 잔재 검출. **장 검색이 `#1A1A1A`/`#666666`/`#1E64FA`/`#0E41AD` 4 개 long-form 만 대상으로 진행돼 3-char shorthand(`#666`) 와 동일 색이지만 다른 토큰명에 매핑되는 값(`#E0E0E0` = `border-light`) 이 누락**
- 원인: 마이그레이션 grep 대상 hex 가 brand color 4 개 long-form 만 포함. `#666` (= `#666666` shorthand) 과 `--color-border-light` 정의 후 추가된 `#E0E0E0` 잔재가 인지되지 않음
- 해결: (a) `text-[#666]` 8 곳 → `text-text-secondary`. (b) `border-[#E0E0E0]`·`bg-[#e0e0e0]` 11 곳 → `border-border-light`·`bg-border-light`. UI 그레이스케일(`#F5F5F5` 호버, `#d9d9d9` 비활성, `#e9e9e9` 호버 다크) 은 브랜드 팔레트가 아니므로 보존
- 교훈: (1) 디자인 토큰 grep 은 **shorthand(`#abc` = `#aabbcc`) 와 대소문자 모두 대상으로 포함**해야 안전. 즉 `[#1aA-Fa-f]{3,6}` 류 정규식으로 한 번 더 sweep. (2) 토큰 추가 시점이 마이그레이션 시점과 **다르면** 추가된 토큰에 대응하는 잔재가 새로 생김 → 토큰 추가 PR 에서 그 토큰의 hex 잔재도 함께 처리. (3) `globals.css` 의 토큰 정의 자체에는 hex 가 남아있는 게 정상(SSOT) — grep 결과에서 그것만 제외

## 2026-05-11 — 헤더 링크 버튼 모바일 정렬·이미지 첨부·정율사관 자식 라우팅 별도 진단
- 현상: (a) 모바일에서 헤더 외부 링크 버튼(`QA 튜터링`·`클래스인-티처`)이 우측 정렬·파란 캡슐(`bg-[#1E64FA]`) 로 노출, (b) 어드민 폼은 lucide 아이콘 이름 입력만 받아 임의 로고/이미지 첨부 불가, (c) 사용자가 "정율사관 → 성장스토리" 자식 메뉴 클릭 시 404 가 *여전히* 재현됨을 보고
- 해결 (a)+(b): `header.tsx` 모바일 컨테이너 `justify-end` → `justify-start`, 두 분기(데스크탑/모바일) 버튼 클래스를 `bg-[#1E64FA] text-white` → `border border-gray-200 text-[#1A1A1A]` (투명 + 옅은 테두리) 로 교체. `header_links.image_url` 컬럼 추가(drizzle `0006_*`) + 어드민 폼에서 `/api/admin/upload` 직접 업로드(`ThumbnailUploader` 는 오버레이 기능까지 들고 있어 과도 → 인라인 파일 input 사용). 헤더 글리프는 `imageUrl` 우선 + lucide 폴백 헬퍼(`renderHeaderLinkGlyph`)로 분리, `createElement` 로 ESLint `react-hooks/static-components` 룰 회피. 어드민 신규 UI 는 lucide 입력 제거하고 이미지 업로드만 노출, 레거시 데이터는 노란 안내 배지로 표시
- 회귀 진단 (c): `986c2bc`(기술부채 수정 — catch-all 도입)와 `3d8fc9c`(메타 부채 수정 — 폴백 단일소스/JSON-LD 헬퍼) 모두 **부모 메뉴 404** 만 해결. 자식 라우팅은 처음부터 작업 범위 밖이었음. 폴백(`default-nav.ts:37`)의 성장스토리 href = `/articles?category=success` (정상). 자식 404 가 *발생* 한다는 것은 **운영 D1 의 `nav_menus` 자식 행 href 가 어드민 자유 입력 검증 부족(`trim()` 만)으로 잘못 입력되어 폴백을 덮은 상태**가 가장 유력. 진단 절차: `SELECT id,label,href FROM nav_menus WHERE parent_id=(SELECT id FROM nav_menus WHERE href='/jungyoul' AND parent_id IS NULL);` 후 어드민에서 정정
- 교훈: (1) 회고 문서가 *부모/자식* 을 구분 명시하지 않으면 다음 회기에 "함께 해결되었을 것" 으로 오인됨 — 동일 도메인 작업이라도 라우팅 트리 깊이마다 별도 항목 권장. (2) lucide 아이콘 화이트리스트 같은 *코드-바운드* 입력은 외부 자산(이미지)으로 확장될 가능성이 높음 — 초기 설계 시 어드민이 자유 자산을 첨부할 수 있는 컬럼을 함께 두면 후속 마이그레이션 없이 확장. (3) ESLint 룰 위반은 인라인 `.map()` 콜백에서는 안 잡혀도 별도 함수형 컴포넌트로 추출하는 순간 잡힌다 — `createElement` + ReactNode 헬퍼 패턴을 기억할 것

## 2026-05-11 — JSON-LD escape · 폴백 네비 · sitemap 메타 부채 일괄 해소 (후속)
- 현상: 같은 날 표면 부채 4건(catch-all, location escape, slides 단일 소스, verification placeholder) 을 수정한 커밋 `986c2bc` 직후, 동일 회고가 "별도 작업" 으로 미룬 메타 부채 3건이 그대로 남아있음을 검증. (1) 13개 페이지가 인라인 `.replace(/</g, "<")` 복붙 (2) 폴백 네비가 `header.tsx`/`[slug]/page.tsx` 두 곳 분산 (3) sitemap 9개 경로 하드코딩
- 해결: (1) `src/lib/json-ld.ts` 의 `renderJsonLd(schema)` 헬퍼 1곳에 escape 내장 → 11개 페이지 14개 script 태그가 `dangerouslySetInnerHTML={renderJsonLd(...)}` 사용. (2) `src/lib/default-nav.ts` 신설 → `DEFAULT_NAV` 가 카테고리 자식을 `categories` 에서 derive (이중 동기화 방지). `header.tsx` 와 `[slug]/page.tsx` 가 동일 단일 소스 사용. (3) `sitemap.ts` 가 `nav_menus` 부모 행을 DB 에서 읽어 동적 추가, DB 빈 경우 `DEFAULT_NAV` 폴백. 정적 페이지는 `STATIC_ROUTES` 로 분리
- 회귀: 1차 작업 후 ck 에이전트 검증에서 `/exam` 이 fresh-seed 시 sitemap 누락 발견(DEFAULT_NAV 부모에 없음). `STATIC_ROUTES` 에 `/exam` 명시 추가로 해결. 신규 부모 메뉴 추가 시 sitemap 자동 반영은 유지
- 교훈: 표면 부채 fix 와 메타 부채 fix 는 동일 PR 에서 함께 끝내야 했음. 분리하면 잔존 부채가 "별도 작업" 으로 침전. 단일 소스 통합 후에는 폴백 경로 자체가 회귀 영역이라 항상 fresh-seed/DB-empty 시나리오를 명시적으로 점검할 것

## 2026-05-11 — "정율사관" 부모 메뉴 404 + catch-all 라우팅 도입 (메타 부채 해소)
- 현상: 헤더의 "정율사관" 탭 클릭 시 404. 어드민 `/admin/nav-menus` 에서 부모 행(`href="/jungyoul"`)은 운영 D1 에 등록되어 있었으나 `src/app/jungyoul/page.tsx` 가 없었음
- 원인 (메타): 어드민 nav_menus href 가 자유 입력인데, 입력된 href 에 해당하는 App Router 페이지를 개발자가 동시에 만들지 않으면 404. 어드민과 코드의 결합. `2026-05-08 nav_menus href 만 추가하고 라우트 누락` 회고와 동일 패턴이 재발한 셈
- 단발성 해결: `src/app/jungyoul/page.tsx` 신설 (HeroBanner + H1 + DB-driven 자식 탭 + JSON-LD CollectionPage + 폴백)
- **근본 해결**: catch-all 동적 라우트 `src/app/[slug]/page.tsx` 도입. `nav_menus` 부모/자식을 자동으로 인덱스 페이지로 렌더. `src/app/jungyoul/page.tsx` 는 catch-all 로 흡수되어 삭제. 명시 라우트는 Next.js 우선순위로 보호 → 충돌 없음. 어드민에서 새 부모 메뉴 등록 시 코드 변경 0 줄로 즉시 동작 (자세한 절차는 [`categories.md`](categories.md))
- 교훈: 동일 부채가 재발하면 표면 수정 말고 메타 부채를 해소. "관리자 입력 → 코드 변경 필요" 결합은 자동 라우팅·단일 소스로 끊어 둘 것

## 2026-05-11 — catch-all 변경 후 dev 서버 hot reload stale (.next 캐시 재발)
- 현상: `[slug]/page.tsx` 의 `loadMenu` 반환 타입을 `{ parent, children }` 에서 `{ label, children }` 으로 평탄화한 직후, `/jungyoul` 이 200 → 404 로 회귀. 타입체크는 통과
- 원인: Next.js 16 Turbopack dev 가 catch-all 디렉터리의 변경된 인터페이스를 hot reload 로 다시 잡지 못하고 이전 컴파일 결과를 사용
- 해결: dev 서버 stop → `rm -rf .next` → `npm run dev` 재기동. 200 응답으로 복귀
- 교훈: catch-all/동적 라우트의 *시그니처/타입 변경* 은 hot reload 가 약함. 변경 직후 동작이 이상하면 가장 먼저 `.next` 청소. `2026-04-08` 회고의 일반 원칙이 dev 단계에서도 적용됨

## 2026-05-11 — JSON-LD XSS escape 누락 (location 페이지)
- 현상: 부채 감사 중 `src/app/location/page.tsx` 의 Place JSON-LD 가 `.replace(/</g, "\\u003c")` 누락 발견. 다른 12 개 페이지는 모두 적용
- 원인: 인라인 JSON.stringify 패턴이 12 곳에 복붙되어 있어 한 곳에서 escape 호출이 누락돼도 grep 외에 자동 감지 수단이 없음
- 해결: `}),` → `}).replace(/</g, "\\u003c"),` 1 줄 수정
- 교훈: 보안 룰의 적용 보장이 grep 의 인간 주의력에 의존하면 누락 재발 가능. 구조적으로 막으려면 `src/lib/json-ld.ts` 같은 헬퍼 (`renderJsonLd(schema)` 가 escape 까지 내장) 로 이행 — 별도 리팩토링 항목

## 2026-05-11 — `admin/slides` 카테고리 옵션 단일 소스 위반 ("exam" 누락)
- 현상: 슬라이드 빠른 글 생성 폼의 카테고리 드롭다운에서 "시험지 분석" 미노출. 다른 어드민 페이지(`InlineEditModal`, `/admin/articles/new`, `/admin/articles/[id]/edit`)는 정상
- 원인: `src/app/admin/slides/page.tsx:28-33` 에서 `categoryOptions` 를 하드코딩 (4개). `src/lib/data.ts` 의 `categories` 단일 소스를 import 하지 않아 "exam" 추가 시 자동 반영 안 됨
- 해결: `import { categories } from "@/lib/data"` 후 `categories.filter((c) => c.value !== "all" && c.value !== "exam")` 로 변경. 단, 슬라이드 메인 영역에 시험지 분석을 노출하지 않는 운영 정책상 exam 만 추가로 제외
- 교훈: `2026-05-08` 의 categoryOptions 3 중 중복 통합 작업 시 slides 페이지가 누락됐던 것. 단일 소스로의 통합은 grep 으로 후보를 모두 추출한 뒤 일괄 적용해야 누락이 없음

## 2026-05-11 — `layout.tsx` verification.google 빌드 placeholder 잔존
- 현상: `metadata.verification.google` 값이 `"REPLACE_WITH_GOOGLE_VERIFICATION_CODE"` 인 채로 빌드/배포. 다행히 `layout.tsx` 본문의 `<meta name="google-site-verification">` 에 실제 코드가 박혀 있어 인증 자체는 동작
- 원인: 초기 부트스트랩에서 `metadata.verification` 객체를 자리만 잡아두고 잊음. verification 정의가 두 곳(metadata + 직접 meta 태그)으로 중복
- 해결: `metadata.verification` 항목 제거. 직접 `<meta>` 태그 1 곳을 단일 소스로 유지
- 교훈: `REPLACE_WITH_` 같은 placeholder 는 lint 룰 또는 pre-deploy grep 으로 강제 검출. SEO 체크리스트에 명시했지만 실제 점검 자동화는 없는 상태

## 2026-04-08 — .next 캐시로 인한 거짓 타입 에러
- 현상: `tsc --noEmit` 실행 시 `.next/types/routes.d 2.ts`에서 중복 선언 에러 발생
- 원인: 이전 빌드의 `.next` 캐시가 현재 코드와 불일치
- 해결: `rm -rf .next` 후 재실행
- 교훈: 대규모 파일 변경(라우트 추가/이동) 후에는 `.next` 캐시 삭제 후 타입 체크 실행

## 2026-05-08 — `nav_menus` href 만 추가하고 라우트 누락
- 현상: 어드민 `/admin/nav-menus` UI 에서 새 메뉴 행(href=`/exam`)을 추가했지만, 클릭 시 404
- 원인: nav_menus 는 DB-driven 이라 어드민이 자유 href 입력 가능. 하지만 실제 라우트 파일(`src/app/<slug>/page.tsx`)과 `articles.category` enum 은 코드 영역
- 해결: `Category` 유니온/`categories` 배열 확장 + `/exam` 라우트 신설 + `seed.sql` CHECK 갱신 + `sitemap.ts` 등록
- 교훈: nav_menus 추가만으로는 게시판이 활성화되지 않는다. 게시판형 카테고리는 [`categories.md`](categories.md) 절차로 일괄 처리

## 2026-05-08 — categoryOptions 3중 중복으로 enum 확장 누락 위험
- 현상: 카테고리 추가 시 `inline-edit-modal.tsx`/`admin/articles/new`/`admin/articles/[id]/edit` 세 곳의 로컬 `categoryOptions` 를 모두 갱신해야 함
- 해결: 세 곳을 `categories.filter((c) => c.value !== "all")` 로 통합 → `src/lib/data.ts` 단일 소스
- 교훈: 동일 enum/lookup 이 2회 이상 중복되면 즉시 단일 소스로 통합. 이후 `Category` 추가 시 1곳만 수정

## 2026-05-08 — 썸네일 오버레이가 "이미지 있을 때만" 진입 가능
- 현상: 새 기사 작성·빠른편집 모달에서 기본 썸네일을 업로드하지 않으면 텍스트 오버레이 모달 자체가 보이지 않음
- 원인: `thumbnail-uploader.tsx` 의 Type 버튼이 `hasImage` 분기 내부에만 렌더링되었고, `ThumbnailOverlayEditor` 도 `editingOverlay && hasImage` 가드로 마운트가 막힘
- 해결: Type 버튼을 업로드 영역 아래 "텍스트만으로 썸네일 만들기" 보조 버튼으로 항상 노출. `imageUrl: string | null` 로 옵셔널화하여 그라디언트 배경 + Canvas 합성 fallback 추가
- 교훈: 진입 UI가 콘텐츠 존재에 의존하면, 빈 상태에서 기능 발견 자체가 불가능. 빈 상태 진입점을 별도 affordance 로 보장할 것

## 2026-05-08 — InlineEditModal 자식 모달의 stacking 함정
- 현상: 빠른편집 모달(z-[1000]) 안에서 `ThumbnailOverlayEditor` (`fixed inset-0 z-50`) 가 호출되면 슬라이드 패널 박스에 갇혀 사이드바처럼 작게 떠 보임
- 원인: 부모 패널의 `animate-in slide-in-from-right` 가 transform을 적용해 자식의 `position:fixed` containing block 이 viewport 가 아닌 패널이 됨. 또한 z-50 < z-1000
- 해결: `ThumbnailOverlayEditor` 를 `createPortal(dialog, document.body)` 로 감싸고 z-index 를 `z-[2000]` 으로 상향
- 교훈: 모달 안에서 다른 모달을 띄우는 패턴은 반드시 Portal + 상위 z-index 로. 부모 transform 이 fixed 자식의 containing block 을 바꾸는 점 주의

## 2026-05-08 — HWPX 페이스트 분기 우선순위 오류로 표/이미지 손실
- 현상: 한컴오피스에서 표+이미지 영역 복사 후 본문에 붙여넣으면 텍스트만 들어오고 표/이미지가 사라짐
- 원인: `content-editor.tsx` `handlePaste` 가 `clipboardData.items` 의 image/* 를 먼저 검사하고 `return` → HWPX 의 `text/html`(표 마크업 + inline 이미지) 가 통째 폐기. 또 한컴 일부 버전은 text/html 미제공 → plain text fallback 으로 떨어짐. data:URL 이미지 업로드 실패 시 `img.remove()` 로 조용히 사라짐
- 해결: 분기 순서를 `text/html` 우선 → 단독 이미지 → 동영상 URL → plain text fallback 으로 재정렬. `<v:imagedata>` 같은 한컴 전용 노드의 src 를 `<img>` 로 승격. 업로드 실패 시 placeholder span 으로 교체. 빈 `<p>` 안에 `<table>` 삽입 시 부모 분할
- 교훈: 페이스트 분기는 "더 풍부한 구조" 를 가진 MIME 을 항상 먼저 검사. image item 은 단독 이미지 페이스트가 아닌 한 부수적 데이터로 취급

## 2026-05-08 — 썸네일 오버레이 메타 미저장 → 빠른편집 모달에서 재편집 불가
- 현상: 새 글 작성에서 썸네일에 텍스트 오버레이를 합성한 뒤, 빠른편집 모달에서 다시 열면 이전 텍스트/위치/색상 그대로 수정 불가. 새 오버레이 추가/삭제만 가능
- 원인: ThumbnailOverlayEditor 가 `useState<TextOverlay[]>([makeOverlay()])` 로 매번 fresh 초기화. 합성된 JPEG 만 R2 에 저장되고 overlays 메타데이터가 어디에도 보존되지 않음
- 해결: `articles/highlights/teachers/videos` 4개 테이블에 `thumbnail_overlays text` 컬럼 추가(드리즐 마이그 0004). JSON `{ version, baseImageUrl, overlays }` 직렬화. ThumbnailOverlayEditor 에 `existingOverlays` prop 추가, ThumbnailUploader 의 `onChange(url, overlaysJson?)` 시그니처 확장
- 교훈: "합성된 결과만" 저장하는 설계는 재편집 자유도를 통째로 잃는다. 사용자 입력 메타와 렌더 결과를 분리 저장 (메타는 어드민 전용, 결과는 공개 페이지용)

## 2026-05-08 — 썸네일 오버레이 드래그 UX → 5단계 위치 프리셋
- 현상: 미리보기 박스가 작아 텍스트 위치 드래그 정밀 조작이 어려움. 모바일/터치 환경에서는 거의 불가
- 해결: `xPct/yPct` 자유 좌표를 `anchor: "tl"|"tr"|"center"|"bl"|"br"` 5단계 enum 으로 교체. 우측 패널 3×3 그리드 버튼(귀퉁이 4 + 중앙 1, 빈 4셀은 spacer). 드래그 핸들러 일체 제거. ANCHOR_POSITIONS 에 8/92% 가장자리 패딩으로 잘림 방지. renderToBlob 에서 anchor 별로 ctx.textAlign/textBaseline 자동 결정
- 교훈: 자유도가 높은 컨트롤이 항상 좋은 UX 는 아니다. 모바일/터치 사용자가 있으면 프리셋 기반이 정확도/속도 모두 우월

## 2026-05-12 — `/exam` 페이지 500 — `exam_tag_options` 테이블 마이그레이션 미적용
- 현상: 운영 D1에 `0007_add_exam_tags.sql` 마이그레이션이 적용되지 않은 상태에서 `/exam` 페이지 접속 시 500 반환
- 원인: `src/app/exam/page.tsx` RSC에서 `examTagOptionsTable` 조회를 비보호 drizzle 쿼리로 실행 — 테이블이 없으면 D1이 에러를 throw
- 해결: `safeExamTagOptions(db)` 헬퍼로 try/catch 감싸고 에러 시 `[]` 반환 → 페이지는 정상 렌더, 필터 UI는 빈 옵션(builtin 폴백 적용)으로 동작
- 교훈: RSC에서 새로 추가된 테이블을 조회할 때는 해당 마이그레이션이 모든 환경에 적용되었다고 가정하지 말 것. 테이블 부재를 graceful 하게 처리하는 try/catch + 빈 배열 폴백을 기본 패턴으로 사용

## 2026-05-12 — Miniflare D1 UNIQUE 제약 에러가 `Error` 인스턴스가 아닐 수 있음
- 현상: `exam_tag_options` 에 중복 값 삽입 시 API 가 409 대신 500 반환
- 원인: Miniflare(로컬 D1 에뮬레이터)가 던지는 UNIQUE 제약 위반 에러가 표준 `Error` 인스턴스가 아닌 경우가 있어 `e instanceof Error && e.message.includes("UNIQUE")` 검사가 false 로 평가
- 해결: `src/app/api/admin/exam-tag-options/route.ts` 에서 `String(e).includes("UNIQUE") || e?.cause?.message?.includes?.("UNIQUE")` 형태로 양쪽 체크. `instanceof Error` 의존 제거
- 영향 범위: `src/app/api/admin/articles/[id]/route.ts` 등 D1 UNIQUE 에러를 `instanceof Error` 로만 검사하는 다른 route handler 에도 동일 취약점이 잠재. 운영 환경에서는 재현 빈도가 낮더라도 방어 코드 권장
- 교훈: Miniflare 에뮬레이터는 `Error` 서브클래스가 아닌 객체를 throw 할 수 있다. D1 에러 체크는 항상 `String(e)` + `e?.cause?.message` 를 함께 확인

## 2026-05-08 — Mac 한컴오피스 한글 뷰어 페이스트 — div/span 위주 마크업 + file:// 이미지
- 현상: 이전 분기 우선순위 수정 후에도 Mac 한컴오피스 한글 뷰어로 연 .hwpx 의 표·이미지가 본문에 들어오지 않음
- 원인 후보: (a) text/html 이 `<div>/<span>` 위주라 `/<(table|img|p|h1-6|...)>/` 정규식 미매치 → plain text fallback. (b) 이미지 src 가 `file://` 절대경로라 브라우저가 못 가져옴. (c) 표는 HTML, 이미지는 별도 image item 으로 분리되어 도착
- 해결: handlePaste 분기를 1a(구조 마크업)/1b(일반 마크업, 길이≥100 + p|div|span|br) 두 단계로. normalizePastedHtml 에 `<div>` → `<p>` 변환 + `file://` src placeholder 교체. text/html 에 `<img>` 0개인데 image item 있으면 본문 끝 figure 추가. 진단 `console.info("[paste]", ...)` 도 함께 추가해 실제 페이로드 형식 추후 확인
- 교훈: 비표준 페이스트는 정규식 임계값을 헐겁게 + 진단 로깅으로 실측 데이터 수집 → 패턴 확인 후 분기 정제. 이미지 item 은 HTML 처리 후에도 보강 검사가 필요
