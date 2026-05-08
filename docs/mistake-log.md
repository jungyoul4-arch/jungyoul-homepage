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
