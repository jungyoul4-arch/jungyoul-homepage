# 빠른편집 에디터 가이드

> 어드민 빠른편집 모달(`InlineEditModal`) 및 어드민 글 작성/수정 페이지에서 공유하는 본문/썸네일 편집기 동작 정리.

## 본문 에디터 (`ContentEditor`)

네이티브 `contentEditable` + 커스텀 툴바. 외부 라이브러리(TipTap/ProseMirror/Quill) 미사용.

### 페이스트 분기 우선순위
**중요**: HWPX/MS Word/Google Docs 같은 "구조 있는 페이스트"는 image item + text/html 을 동시에 제공한다. text/html 을 먼저 검사하지 않으면 표·서식이 통째 폐기됨.

1a. **구조 마크업 HTML (최우선)**: text/html 에 `<table|img|figure|blockquote|h1-6|ul|ol>` 중 하나라도 있으면 `normalizePastedHtml()` 통과 후 삽입. data:URL 이미지는 R2 로 업로드되어 영구 URL 로 치환. text/html 에 `<img>` 가 0개인데 image item 이 따로 있으면 본문 끝에 figure 로 추가 (HWPX 처럼 표는 HTML, 이미지는 별도 item 으로 보내는 케이스 보강).

1b. **일반 마크업 HTML**: text/html 길이 ≥ 100 + `<(p|div|span|br)>` 매칭 → 같은 정규화 파이프라인 통과. Mac 한컴오피스 한글 뷰어처럼 본문이 div/span 으로 감싸져 들어오는 케이스 대응.

2. **단독 이미지**: `clipboardData.items` 에 `image/*` 단독 (스크린샷 캡쳐 등) → `handleImageFiles()` → R2 업로드 → `<figure><img><figcaption>`
3. **동영상 URL**: text/plain 이 YouTube/Vimeo URL 이면 임베드 iframe 으로 변환
4. **plain text 폴백**: 줄 단위 split → `<p>` 태그로 정규화

### 페이스트 진단 로깅
`handlePaste` 진입 시 `console.info("[paste]", { types, htmlLen, htmlSample, plainLen, plainSample, itemTypes, filesCount })` 출력. 다양한 클립보드 페이로드(특히 Mac 한컴오피스 한글 뷰어) 디버그용. 충분히 데이터 수집되면 별도 PR 로 제거.

### `normalizePastedHtml()` 정리 규칙
- 위험·잡 노드 통째 제거: `<script>, <style>, <meta>, <link>, <xml>, <title>`
- `on*` inline event handler 및 `javascript:` URL 제거
- Office/HWP namespace 태그(`<o:p>`, `<w:*>`, `<m:*>`, `<v:*>`) 처리:
  - `src/href` 또는 VML/xlink namespace src 가 있으면 → `<img src>` 로 승격 (`<v:imagedata>` 등 이미지 정보 보존)
  - 없으면 unwrap (자식 텍스트만 보존)
- `<font>` unwrap
- **`<img src="file://...">` placeholder 교체** — Mac 한컴오피스 한글 뷰어 등 로컬 파일 참조 이미지는 브라우저가 못 가져오므로 `[원본 이미지 — 이미지 영역만 다시 클립보드에 복사해 별도로 붙여넣어 주세요]` 안내 span 으로 교체
- **`<div>` → `<p>` 변환** — 블록 자식 없이 텍스트만 갖는 `<div>` 는 `<p>` 로 교체 (정렬 등 인라인 스타일은 보존). 한컴 한글 뷰어/일부 브라우저 페이스트가 본문 단락을 div 로 감싸는 경우 대응.
- 클래스/스타일에서 `mso-*`, `Mso*`, `Hwp*`, `hancell*` 흔적 제거
- 빈 `<p>` 제거 (자식이 미디어 없고 텍스트도 비어있을 때)
- `data:` URL `<img>` → R2 업로드 후 영구 URL 로 src 치환. **업로드 실패 시 조용히 제거하지 않고** placeholder span(`[이미지 업로드 실패 — 다시 붙여넣어 주세요]`)으로 교체

### `insertHtmlAtCursor()` 블록 안전 삽입
- 삽입 fragment 가 `<table>/<figure>/<ul>/<ol>/<blockquote>/<h1-4>` 같은 블록 미디어를 포함하고 커서가 빈 `<p><br></p>` 안에 있으면 → 그 빈 `<p>` 를 fragment 로 통째 교체. 브라우저가 `<p>` 안 `<table>` 을 자동 변형하면서 셀/행이 누락되는 문제 방지.
- 그 외 일반 텍스트 fragment 는 기존 동작(`range.insertNode`) 유지.

### HWPX 페이스트
한컴오피스/한글에서 표·이미지가 포함된 단락을 복사한 후 본문에 붙여넣으면 위 정리 단계를 거쳐 표 구조와 이미지가 보존된다. `.hwpx` 파일 자체 업로드는 미지원 — 클립보드 경유만.

페이스트 우선순위 재정렬 이전에는 HWPX 클립보드의 image item 이 먼저 매칭되어 표 구조가 폐기되는 회귀가 있었음 → [`mistake-log.md`](mistake-log.md) 2026-05-08 항목 참고.

### 서버 sanitize
`src/lib/sanitize.ts` `sanitizeContent()` 가 `/api/admin/articles` POST/PUT 에서 본문에 적용. 화이트리스트:
- 태그: 표 계열(`table/thead/tbody/tfoot/tr/th/td/caption/col/colgroup`) + 멀티미디어(`img/iframe/figure/figcaption/video`) 등
- iframe 허용 호스트: `www.youtube.com`, `player.vimeo.com`
- 스타일: 정규식 화이트리스트 — `expression()`, `url(javascript:)` 등 거부

화이트리스트 추가 시 반드시 정규식으로 값을 좁힐 것 (e.g. `border-style: [/^(solid|dashed|dotted|double|none)$/]`).

## 썸네일 편집기

### `ThumbnailUploader`
- 드래그&드롭, 클릭, Ctrl+V 지원
- 이미지 있을 때 우상단 3개 버튼: **Type(텍스트 오버레이) / Upload(변경) / X(삭제)**
- 이미지 없을 때 업로드 영역 아래에 "텍스트만으로 썸네일 만들기" 보조 버튼 노출 → `ThumbnailOverlayEditor` 를 placeholder 모드로 호출
- 업로드 엔드포인트: `POST /api/admin/upload` (`image/jpeg|png|gif|webp`, 10MB 한도, R2 저장, `/api/admin/upload/{key}` 프록시 URL 반환)

### `ThumbnailOverlayEditor` (Canvas 2D)
- `imageUrl: string | null` — 이미지가 없으면 그라디언트(135deg, 220/40/70 → 240/50/50) 배경 위에 텍스트만 합성하여 새 썸네일 이미지 생성
- 이미지 있을 때 자연 크기, 없을 때 1280x720 (16:9) 캔버스
- 텍스트 오버레이 추가/삭제, 폰트크기·색상·굵기·정렬·그림자 컨트롤
- **위치는 5단계 프리셋 (좌상/우상/중앙/좌하/우하)** — 우측 패널의 3×3 그리드 버튼으로 선택. 가장자리 8/92% 패딩으로 잘림 방지. 드래그 이동은 지원하지 않음 (모바일·터치 환경에서 정밀 조작 어려움 대응).
- 미리보기는 DOM/CSS, 저장 시점에만 Canvas 합성 → JPEG(0.92) → R2 업로드
- 폰트: `"Pretendard","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif`
- 외부 origin 이미지가 CORS 헤더 없이 캔버스 오염을 일으키면 저장 실패 → 사용자에게 안내 표시. R2 프록시(`/api/admin/upload/[...key]`) 는 동일 origin 이라 정상 동작.

### 오버레이 메타 영구 저장 (재편집 흐름)
`articles/highlights/teachers/videos` 4개 테이블에 `thumbnail_overlays text` 컬럼이 있으며, 다음 JSON 직렬화 문자열을 저장:

```json
{
  "version": 1,
  "baseImageUrl": "/api/admin/upload/abc.jpg" | null,
  "overlays": [
    { "id": "...", "text": "...", "anchor": "tl|tr|center|bl|br",
      "fontSize": 56, "color": "#ffffff", "fontWeight": "bold",
      "textAlign": "center", "shadow": true }
  ]
}
```

- 합성 결과 JPEG 의 URL 은 그대로 `thumbnail` 컬럼에 저장 (공개 페이지/og:image 가 사용)
- `thumbnailOverlays` JSON 은 어드민 편집기 **재진입 시 baseImageUrl + overlays 시드용**. 빠른편집 모달/기사 수정 페이지 모두에서 이전 텍스트·위치·색상 그대로 복원되어 수정 가능.
- 새 이미지로 교체 시 onChange 두번째 인자에 빈 문자열을 넘겨 메타 무효화 → 다음 합성 때 새 메타 생성.
- 마이그레이션: `drizzle/0004_add_thumbnail_overlays.sql` (ALTER TABLE 4건). D1 적용은 사용자 승인 후.

### Portal 렌더링 (InlineEditModal 내부 호환)
`ThumbnailOverlayEditor` 는 `createPortal(dialog, document.body)` 로 body 직속 렌더되며 z-index 는 `z-[2000]` 이다. 이는 `InlineEditModal` (z-[1000], `slide-in-from-right` 의 transform 으로 자식 fixed 의 containing block 이 패널 박스가 되는 함정) 내부에서도 viewport 풀사이즈로 정상 표시되게 한다.
