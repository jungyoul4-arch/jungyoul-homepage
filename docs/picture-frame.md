# 메인 헤더 '액자' 풀스크린 슬라이드쇼

메인 헤더의 **액자** 버튼을 누르면 어드민이 등록한 이미지·유튜브 영상을 화면 전체에 순서대로
재생하는 기능. (마지막 → 처음 무한 반복)

## 동작 요약
- **버튼 위치**: 헤더 링크 버튼(예: qa튜터링) **왼쪽**. 데스크탑(돋보기 왼편)·모바일(상단 바 아래 행) 모두 노출.
- **노출 조건**: `picture_frame_items` 가 1개 이상일 때만. 0개면 버튼 자체가 숨겨짐.
- **이미지**: 항목별 `durationSec`(초) 후 자동 전환. 값이 없으면 전역 기본값 사용.
- **유튜브**: 표시 시간 무시. **영상 재생이 끝나면**(IFrame API `ENDED`) 자동 전환. 단일 영상이면 반복 재생.
- **조작**: 닫기(우상단 X / Esc), 수동 이동(◀▶ / ←→, 2개 이상일 때), 하단 인덱스 표시.
- **풀스크린**: `fixed inset-0` 뷰포트 오버레이 + 열릴 때 네이티브 `requestFullscreen()` best-effort.

## 데이터
- 테이블 `picture_frame_items` (drizzle 마이그 `0010_magical_ink.sql`):
  `id, media_type("image"|"youtube"), image_url, youtube_id(11자), duration_sec, sort_order, created_at`.
  스키마: `src/db/schema.ts` / 검증: `src/lib/validation.ts` (`insert/updatePictureFrameItemSchema`,
  image 면 imageUrl 필수·youtube 면 11자 ID 필수 refine).
- 전역 기본 표시 시간: `site_settings` key `picture_frame_default_interval`(초, 문자열).
  로고 전용 부수효과가 있는 `/api/admin/settings` 와 분리해 **별도 라우트**로 관리.

## API
- 공개: `GET /api/picture-frames` → `{ items: [...sortOrder ASC], defaultIntervalSec }` (인증 없음).
- 어드민(`requireAdmin`): `POST /api/admin/picture-frames`, `PUT|DELETE /api/admin/picture-frames/[id]`,
  `PUT /api/admin/picture-frames/reorder { ids: string[] }`,
  `GET|PUT /api/admin/picture-frames/settings { defaultIntervalSec }`.
- 이미지 업로드는 기존 `/api/admin/upload`(R2) 재사용.

## 어드민 UI
- `/admin/picture-frames` (사이드바 "콘텐츠 관리" 그룹, `src/app/admin/picture-frames/page.tsx`).
- 항목별 미디어 종류 토글(이미지 업로드 / 유튜브 URL 입력), 표시 시간(이미지 전용), Up/Down 재정렬, 수정/삭제.
- 유튜브는 전체 URL 입력 → `parseYouTubeId`(`src/lib/youtube.ts`)로 11자 ID 추출 후 저장. 썸네일은
  `https://img.youtube.com/vi/{id}/mqdefault.jpg` (next.config `remotePatterns` 에 `img.youtube.com` 등록됨).
- 상단에 전역 기본 표시 시간 입력(신규 이미지 항목 프리필).

## 렌더링 경로
- SSR: `src/components/header-server.tsx` 가 `picture_frame_items` **개수**만 조회해 `<Header hasPictureFrame>` prop 전달
  (FOUC 없이 버튼 노출 결정). 실제 슬라이드 데이터는 오버레이가 열릴 때 클라이언트에서 `/api/picture-frames` 지연 fetch.
- 버튼·상태: `src/components/header.tsx` (`frameOpen` state).
- 오버레이: `src/components/picture-frame-overlay.tsx` ("use client").
  유튜브는 IFrame Player API(`https://www.youtube.com/iframe_api`, 1회 로드) — `YT.Player` 가 전달 엘리먼트를
  iframe 으로 치환하므로 슬라이드마다 새 자식 div 를 만들고 cleanup 시 `destroy()`.

## 보안/규약
- 유튜브는 11자 ID 만 저장/렌더(스키마 정규식) — 임의 URL 주입 차단. 이미지는 자사 R2 경로.
- React 렌더라 별도 XSS escape 불필요. CSP 헤더 없음(youtube iframe_api 스크립트/iframe 로드 허용).
  `X-Frame-Options: DENY` 는 우리 페이지가 외부에 임베드되는 것만 막으며 우리가 youtube 를 임베드하는 데 영향 없음.
- 색상은 globals.css 토큰/Tailwind 유틸. 오버레이는 검정 배경 + 반투명 흰색 컨트롤.

## 자동재생 주의
- 오버레이는 사용자 클릭(제스처)으로 열리므로 유튜브 소리 자동재생이 일반적으로 허용됨.
  차단 환경에서 무음 재생을 원하면 `picture-frame-overlay.tsx` 의 `playerVars` 에 `mute: 1` 추가.

## 검증
- 유닛: `npm test` (`src/lib/__tests__/youtube.test.ts` — URL 파싱).
- 로컬 D1: `npx wrangler d1 execute jungyoul-db --local --file=drizzle/0010_magical_ink.sql`
  (마이그레이션 트래킹이 비어 `migrations apply` 가 0000부터 재적용·충돌하는 경우 `--file` 직접 실행).
  운영: 배포 시 `npx wrangler d1 migrations apply jungyoul-db --remote`.
- E2E: `npm run dev` → 어드민에서 이미지·유튜브 등록 → 메인에서 액자 버튼 클릭 → 자동/종료 전환·무한 루프 확인.
