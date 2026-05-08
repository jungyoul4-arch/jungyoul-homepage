# 실수 노트 (Mistake Log)

기록 형식: 날짜 / 현상 / 원인 / 해결 / 교훈

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
