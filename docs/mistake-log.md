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
