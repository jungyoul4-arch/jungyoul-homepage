# 빠른편집 에디터 가이드

> 어드민 빠른편집 모달(`InlineEditModal`) 및 어드민 글 작성/수정 페이지에서 공유하는 본문/썸네일 편집기 동작 정리.

## 본문 에디터 (`ContentEditor`)

네이티브 `contentEditable` + 커스텀 툴바. 외부 라이브러리(TipTap/ProseMirror/Quill) 미사용.

### 페이스트 분기 우선순위
1. **이미지 파일**: `clipboardData.items` 에 `image/*` 가 있으면 `handleImageFiles()` → R2 업로드 → `<figure><img><figcaption>`
2. **동영상 URL**: text/plain 이 YouTube/Vimeo URL 이면 임베드 iframe 으로 변환
3. **HTML 마크업**: text/html 에 `<table|img|p|h1-6|ul|ol|figure|blockquote>` 중 하나라도 있으면 `normalizePastedHtml()` 통과 후 삽입
4. **plain text 폴백**: 줄 단위 split → `<p>` 태그로 정규화

### `normalizePastedHtml()` 정리 규칙
- 위험·잡 노드 통째 제거: `<script>, <style>, <meta>, <link>, <xml>, <title>`
- `on*` inline event handler 및 `javascript:` URL 제거
- Office/HWP namespace 태그(`<o:p>`, `<w:*>`, `<m:*>`, `<v:*>`) unwrap (자식 텍스트 보존)
- `<font>` unwrap
- 클래스/스타일에서 `mso-*`, `Mso*`, `Hwp*`, `hancell*` 흔적 제거
- 빈 `<p>` 제거 (자식이 미디어 없고 텍스트도 비어있을 때)
- `data:` URL `<img>` → R2 업로드 후 영구 URL 로 src 치환

### HWPX 페이스트
한컴오피스/한글에서 표·이미지가 포함된 단락을 복사한 후 빠른편집 본문에 붙여넣으면, 위 정리 단계를 거쳐 표 구조와 이미지가 보존된다. `.hwpx` 파일 자체 업로드는 미지원 — 클립보드 경유만.

### 서버 sanitize
`src/lib/sanitize.ts` `sanitizeContent()` 가 `/api/admin/articles` POST/PUT 에서 본문에 적용. 화이트리스트:
- 태그: 표 계열(`table/thead/tbody/tfoot/tr/th/td/caption/col/colgroup`) + 멀티미디어(`img/iframe/figure/figcaption/video`) 등
- iframe 허용 호스트: `www.youtube.com`, `player.vimeo.com`
- 스타일: 정규식 화이트리스트 — `expression()`, `url(javascript:)` 등 거부

화이트리스트 추가 시 반드시 정규식으로 값을 좁힐 것 (e.g. `border-style: [/^(solid|dashed|dotted|double|none)$/]`).

## 썸네일 편집기

### `ThumbnailUploader`
- 드래그&드롭, 클릭, Ctrl+V 지원
- 호버 시 3개 버튼: **Type(텍스트 오버레이) / Upload(변경) / X(삭제)**
- 업로드 엔드포인트: `POST /api/admin/upload` (`image/jpeg|png|gif|webp`, 10MB 한도, R2 저장, `/api/admin/upload/{key}` 프록시 URL 반환)

### `ThumbnailOverlayEditor` (Canvas 2D)
- 이미지가 있을 때만 진입 가능 (Type 버튼)
- 텍스트 오버레이 추가/드래그/삭제, 폰트크기·색상·굵기·정렬·그림자 컨트롤
- 미리보기는 DOM/CSS, 저장 시점에만 Canvas 합성 → JPEG(0.92) → R2 업로드
- 폰트: `"Pretendard","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif`
- 외부 origin 이미지가 CORS 헤더 없이 캔버스 오염을 일으키면 저장 실패 → 사용자에게 안내 표시. R2 프록시(`/api/admin/upload/[...key]`) 는 동일 origin 이라 정상 동작.
