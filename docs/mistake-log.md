# 실수 노트 (Mistake Log)

기록 형식: 날짜 / 현상 / 원인 / 해결 / 교훈

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

## 2026-05-08 — Mac 한컴오피스 한글 뷰어 페이스트 — div/span 위주 마크업 + file:// 이미지
- 현상: 이전 분기 우선순위 수정 후에도 Mac 한컴오피스 한글 뷰어로 연 .hwpx 의 표·이미지가 본문에 들어오지 않음
- 원인 후보: (a) text/html 이 `<div>/<span>` 위주라 `/<(table|img|p|h1-6|...)>/` 정규식 미매치 → plain text fallback. (b) 이미지 src 가 `file://` 절대경로라 브라우저가 못 가져옴. (c) 표는 HTML, 이미지는 별도 image item 으로 분리되어 도착
- 해결: handlePaste 분기를 1a(구조 마크업)/1b(일반 마크업, 길이≥100 + p|div|span|br) 두 단계로. normalizePastedHtml 에 `<div>` → `<p>` 변환 + `file://` src placeholder 교체. text/html 에 `<img>` 0개인데 image item 있으면 본문 끝 figure 추가. 진단 `console.info("[paste]", ...)` 도 함께 추가해 실제 페이로드 형식 추후 확인
- 교훈: 비표준 페이스트는 정규식 임계값을 헐겁게 + 진단 로깅으로 실측 데이터 수집 → 패턴 확인 후 분기 정제. 이미지 item 은 HTML 처리 후에도 보강 검사가 필요
