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
4. **plain text 폴백**: 줄 단위 split → `<p>` 태그로 정규화. **중간 빈 줄(2줄 개행)은 `<p><br></p>` 로 보존**(선행/후행 빈 줄만 클립보드 노이즈로 트림), 각 줄은 `&,<,>` escape 후 삽입(서식 제거 목적)

### 페이스트 진단 로깅
`handlePaste` 진입 시 `console.info("[paste]", { types, htmlLen, htmlSample, plainLen, plainSample, itemTypes, filesCount })` 출력. 다양한 클립보드 페이로드(특히 Mac 한컴오피스 한글 뷰어) 디버그용. 충분히 데이터 수집되면 별도 PR 로 제거.

### `normalizePastedHtml()` 정리 규칙

> 모듈 경로: `src/lib/normalize-paste.ts`. 함수 본체와 13개 정리 패스를 pure module 로 분리해 두어 `ContentEditor` 외에도 단위 테스트·SSR 환경에서 import 가능.
> 호출 시 `uploadDataUrl: (file: File) => Promise<string | null>` 콜백을 옵션으로 받음 — 미제공 시 data:URL 이미지는 placeholder span 으로 교체된다(테스트·SSR 안전).

- 위험·잡 노드 통째 제거: `<script>, <style>, <meta>, <link>, <xml>, <title>`
- `on*` inline event handler 및 `javascript:` URL 제거
- Office/HWP namespace 태그(`<o:p>`, `<w:*>`, `<m:*>`, `<v:*>`) 처리:
  - `src/href` 또는 VML/xlink namespace src 가 있으면 → `<img src>` 로 승격 (`<v:imagedata>` 등 이미지 정보 보존)
  - 없으면 unwrap (자식 텍스트만 보존)
- `<font>` unwrap
- **`<img src="file://...">` placeholder 교체** — Mac 한컴오피스 한글 뷰어 등 로컬 파일 참조 이미지는 브라우저가 못 가져오므로 `[원본 이미지 — 이미지 영역만 다시 클립보드에 복사해 별도로 붙여넣어 주세요]` 안내 span 으로 교체
- **`<div>` → `<p>` 변환** — 블록 자식 없이 텍스트만 갖는 `<div>` 는 `<p>` 로 교체 (정렬 등 인라인 스타일은 보존). 한컴 한글 뷰어/일부 브라우저 페이스트가 본문 단락을 div 로 감싸는 경우 대응.
- 클래스/스타일에서 `mso-*`, `Mso*`, `Hwp*`, `hancell*` 흔적 제거
- **정렬 노이즈 정리** (`b7afcc0`): `<img>`/`<span>` 의 `text-align` 제거(replaced/inline 요소에 무의미), 모든 요소의 `text-align: justify` 제거(UI 에 버튼 없음 → 좌측 매핑)
- **`flattenRedundantFigures`** (2026-05-19): 자식이 단일 `<figure>` 만 있는 `<figure>` 를 재귀 unwrap(최대 3회). outer figure 의 인라인 style 은 inner 로 병합. Notion 클립보드가 모든 블록을 `<figure><figure><figure>...</figure></figure></figure>` 로 감싸는 패턴 평탄화.
- **`liftBodyFigcaptions`** (2026-05-19): `<figcaption>` 의 **직속 부모** `<figure>` 가 형제로 `<img>/<video>/<iframe>` 을 갖지 않으면 진짜 캡션이 아니라 본문 단락 — `<p>` 로 치환. Notion 본문이 `<figure><figcaption>본문…</figcaption></figure>` 로 들어오는 패턴 해소.
- **`unwrapBodyFigures`** (2026-05-19): `<figure>` 가 직속 자식으로 `<img>/<video>/<iframe>` 을 갖지 않으면 본문 단락 wrapping figure 로 보고 unwrap. `.article-content figure { display: flex; align-items: center; padding-top: 32px }` CSS 가 본문에 적용돼 가운데 정렬·과한 간격으로 렌더되는 회귀 차단. `flattenRedundantFigures`(단일 자식) 이후에 다중 자식 figure 처리.
- **`unwrapInlineWrappingBlocks`** (2026-05-19): `<b>/<strong>/<i>/<em>/<span>` 이 직접 자식으로 `<p>/<h1-h6>/<div>/<blockquote>` 를 가지면 인라인을 블록 안쪽으로 옮김 (`<b><p>X</p></b>` → `<p><b>X</b></p>`). invalid HTML 정상화.
- **`stripNonAllowlistedInlineStyles`** (2026-05-19): 인라인 `style` 화이트리스트. 보존 규칙:
  - `<table>/<td>/<th>`: `border/border-collapse/border-spacing/width/vertical-align` (표 구조)
  - `<iframe>`, video embed wrapper `<div>` (padding-bottom 비율 + iframe 자식): 임베드 좌표용 `position/top/left/width/height/padding-bottom/overflow/border-radius/margin/border` (그리고 embed div 는 `text-align` 도)
  - 그 외 모든 태그: `text-align: left|center|right` 만
  - 제거 대상(예외 외): `font-size`, `font-weight`, `font-style`, `color`, `background-color`, `line-height`, `letter-spacing`, `text-decoration`, `text-indent`, `vertical-align`, `margin`, `padding`, `border`, `border-radius`, `width/height` 등 — Notion 의 `lab(...)` 색, `font-size:0.75rem`, `width:328px` 등이 모두 여기서 사라져 `.article-content` CSS(samsung-newsroom-feature-ui 실측값)로 폴스루.
- **빈 블록 제거(`removeEmptyBlocks`)**: `<p>`/`<figcaption>` 중 텍스트 0 + 미디어 0 (br 만 있어도) 제거. **단 paste 경로에서만 전량 제거** — 저장/공개 렌더 정규화(`normalizeArticleHtml`)는 `{ keepEmptyParagraphs: true }` 로 호출해 사용자가 만든 빈 `<p>` 를 보존한다(아래 "서버 normalize" 참고). paste/저장 정책 분리.
- `data:` URL `<img>` → 업로드 콜백으로 R2 영구 URL 치환. **업로드 실패 시 조용히 제거하지 않고** placeholder span(`[이미지 업로드 실패 — 다시 붙여넣어 주세요]`)으로 교체

### `insertHtmlAtCursor()` 블록 안전 삽입
- 삽입 fragment 가 `<table>/<figure>/<ul>/<ol>/<blockquote>/<h1-4>` 같은 블록 미디어를 포함하고 커서가 빈 `<p><br></p>` 안에 있으면 → 그 빈 `<p>` 를 fragment 로 통째 교체. 브라우저가 `<p>` 안 `<table>` 을 자동 변형하면서 셀/행이 누락되는 문제 방지.
- 그 외 일반 텍스트 fragment 는 기존 동작(`range.insertNode`) 유지.

### HWPX 페이스트
한컴오피스/한글에서 표·이미지가 포함된 단락을 복사한 후 본문에 붙여넣으면 위 정리 단계를 거쳐 표 구조와 이미지가 보존된다. `.hwpx` 파일 자체 업로드는 미지원 — 클립보드 경유만.

페이스트 우선순위 재정렬 이전에는 HWPX 클립보드의 image item 이 먼저 매칭되어 표 구조가 폐기되는 회귀가 있었음 → [`mistake-log.md`](mistake-log.md) 2026-05-08 항목 참고.

### 단독 이미지 figcaption
드래그&드롭·툴바 업로드 등 단독 이미지 삽입 시 figcaption 은 `data-placeholder="이미지 설명 (선택)"` 속성만 가진 빈 contenteditable 요소로 생성된다. 어떤 마크도 자동 prefix 되지 않는다 (이전 버전의 △/▲ 자동 추가는 제거됨). 클립보드 이미지 페이스트(`normalizePastedHtml` 경로)는 기존대로 figcaption 자체를 만들지 않으므로 변경 없음.

### ▲ 마크 삽입
이미지 캡션 앞에 두는 시각 마커. **어떤 경로에서도 자동 추가되지 않으며**, 툴바 Row 2 의 ▲ 버튼으로만 현재 커서 위치에 "▲ "(▲ + 공백) 가 삽입되고 동시에 해당 블록(figcaption/p/h…)에 `style="text-align: center"` 가 직접 기록되어 가운데 정렬된다. figcaption 은 이미 CSS `text-align: center` 가 기본값이라 캡션 안에서는 시각적 변화 없음, 본문 단락에서 사용하면 그 단락만 가운데 정렬. 다른 정렬을 원하면 툴바 왼쪽/오른쪽 정렬 버튼으로 변경.

### HTML 소스 삽입 (툴바) — 원본 보존 모드
Row 2 의 HTML 버튼(`<Code>` 아이콘) → 모달(`src/components/html-input-modal.tsx`)의 textarea 에 raw HTML 소스를 붙여넣고 "삽입" → **원본 HTML 이 그대로 보존**되어 커서 위치에 raw 블록으로 삽입된다. 일반 타이핑·클립보드 페이스트는 기존 뉴스룸 파이프라인 그대로이고, **이 모달 경로만** 원본 보존이다 (2026-06-10 전환 — 이전에는 페이스트와 동일 정화였음).

**아키텍처 — 마커 기반 영역 분기**: 삽입 콘텐츠를 `<div data-raw-html="<8hex id>" contenteditable="false">` 래퍼로 감싸고 3개 층이 마커를 인식한다. 마커 없는 본문은 기존 경로와 바이트 동일(fast-path).

- **클라이언트** `normalizeRawHtml()` (`src/lib/normalize-paste.ts`): 보안 정화만(script·on핸들러·javascript: 제거 — 구조/스타일 패스 미적용) + `<style>` 수집(head 포함, 풀 문서 입력 OK)·스코프 + data:URL → R2 업로드 → 래퍼로 감쌈. 정화 후 빈 콘텐츠는 inline 에러로 거부.
- **서버** `processArticleHtml()` (`src/lib/normalize-server.ts`): `sanitizeContent(normalizeArticleHtml())` 를 대체하는 단일 진입점 (POST/PUT 저장 + 공개 렌더 3곳). outermost raw 영역을 슬롯으로 추출 → 바깥은 기존 뉴스룸 파이프라인 → 안쪽은 `sanitizeRawContent()`(관용 프로파일 — style 속성/class/id/`<style>` 태그 보존, script·form·object·svg·on*·javascript:·data:스킴·iframe 비허용 호스트는 계속 차단) + CSS 스코프 강제 → 재조립. **멱등** (공개 렌더가 매 뷰 실행).
- **CSS 격리** (`globals.css` 맨 끝, 소스 순서가 동작 조건): `.article-content [data-raw-html][data-raw-html] { all: revert }` (+preview, +`*`). 더블 속성 = (0,3,0) 으로 `.article-content > div:not([style])` (0,2,1) 등 모든 뉴스룸 규칙 제압. `all: revert` 는 상속을 차단하지 못하므로 래퍼에 `font-size:1rem` 등 타이포 4종 명시(font-family 는 의도적 페이지 상속). 결과: raw 블록 = 브라우저 기본값 + 원본 CSS.

**`<style>` 스코프 재작성** (`src/lib/raw-html.ts`, stylis 의존): 셀렉터마다 트리플 속성 prefix `[data-raw-html="<id>"][data-raw-html][data-raw-html]`(≥(0,3,0) — 격리 규칙을 동점 후순서로 이김)를 붙여 페이지 누수 차단. `html/body/:root` 는 `&`(래퍼)로 best-effort 리맵, `@media` 내부까지 prefix, `@import/@charset/@namespace`·`expression(` 류는 제거. **`data-raw-scoped` 마커는 신뢰하지 않는다** — 직접 API 로 마커만 붙인 전역 CSS 주입을 막기 위해 stylis AST 로 전 셀렉터 prefix 를 검증(`isFullyScopedCss`)하고 미달이면 재스코프. 중복/불량 id 는 서버가 재부여 + CSS prefix 리맵.

- **커서 복원**: 모달 textarea 가 포커스를 가져가면 에디터 셀렉션이 사라지므로, 버튼 클릭 시점에 Range 를 `cloneRange()` 로 저장해 두고 삽입 직전에 복원한다. 저장 Range 가 없거나 무효면 본문 끝 캐럿 폴백. 커서가 내용 있는 톱레벨 `<p>` 안이면 그 단락 뒤로 호이스팅(래퍼 div 가 p 안에 중첩되는 invalid 방지). 삽입 후 캐럿 단락(`<p><br></p>`) 동반 — 비편집 블록 뒤 이어쓰기 보장.
- **원자 블록**: 래퍼는 `contenteditable="false"` — 에디터에서 내부 수정 불가, 통째 선택·삭제만 가능. 수정하려면 삭제 후 모달로 재삽입 (재편집 모달은 v2). 에디터 init 시 `div[data-raw-html]` 에 방어적으로 재설정.
- **포털**: `createPortal(dialog, document.body)` + `z-[2000]` — InlineEditModal(z-[1000], transform containing block 함정) 내부 호환 (아래 "Portal 렌더링" 섹션과 동일 패턴). 툴바 내장이라 글 작성/수정·빠른편집 3곳 자동 노출.
- **한계 (문서화된 v1 수용 리스크)**: ① `@keyframes`/`@font-face` 이름은 전역 — 사이트의 `card-fade-up` 과 충돌 주의 ② raw 블록을 에디터 안에서 복사→붙여넣기하면 페이스트 파이프라인을 타서 뉴스룸화됨(모달로 재삽입할 것) ③ iframe 은 YouTube/Vimeo 만 ④ `html/body/:root` 셀렉터 리맵은 best-effort ⑤ `srcset`·`data:` 이미지 src 미보존(클라이언트가 R2 업로드로 치환).

**테스트**: 단위 — `src/lib/__tests__/raw-html.test.ts`(스코프/검증/멱등), `sanitize.test.ts`(sanitizeRawContent), `normalize-server.test.ts`(processArticleHtml — fast-path 동일성·멱등·마커 위조 방어), `normalize-paste.test.ts`(normalizeRawHtml). 스모크 — `scripts/smoke-raw-html.mjs` (POST→GET→공개페이지→재PUT 멱등→DELETE; 바깥 정화/안쪽 보존/스코프 어설션).

### 정렬 (왼쪽/가운데/오른쪽)
툴바의 정렬 버튼은 **`document.execCommand("justifyLeft/Center/Right")` 에 의존하지 않고** 현재 커서 위치 블록(또는 다중 블록 선택 시 그 범위 안의 모든 최상위 블록)의 `style.textAlign` 을 직접 좌/우/가운데로 설정한다. 이유:
- Chromium 의 `execCommand("justifyLeft")` 는 좌측을 "기본값" 으로 간주해 인라인 스타일을 기록하지 않고 기존 정렬을 제거만 한다 → center → left 전환 시 `text-align: left` 가 흔적 없이 사라져 사용자에게 "저장이 안 됐다" 로 보임 (Chromium bug #141729 류).
- `justifyCenter/Right` 와 동작이 비대칭이라 좌측만 보존 실패.
- 직접 DOM 조작으로 세 정렬이 동일 코드패스에서 인라인 스타일을 명시 → DB·공개 렌더 양쪽에 안정적으로 보존.

추가 안전장치: `useEffect` 마운트 시 `document.execCommand("styleWithCSS", false, "true")` 를 호출해 bold/italic 등 잔존 execCommand 호출도 인라인 style 기반 markup 을 생성하도록 강제 (Chromium 의 `<font>`/`<b>` 레거시 회피). toolbar 버튼은 `onMouseDown={preventEditorBlur}` 로 click 직전 selection 이 무너지지 않도록 보호.

**대상 블록 탐색(`findParentBlock`)**: `p/h2-4/div/blockquote/li/ul/ol` + **`figure/figcaption/td/th`**. figure/figcaption 까지 포함하는 이유 — 외부 에디터(HWP/Word/CKEditor 류) 페이스트가 `<figure>` 를 단락 컨테이너로 쓰는 경우가 흔하고(중첩 `<figure><figure><figure>text</figure></figure></figure>` 형태), figure 가 매칭되지 않으면 정렬이 wrapping `<div>` 로 올라가 시각 변화 0 으로 사라진다.

**검출(`detectBlock`)**: walk-up 으로 정렬을 누적하지 않고 **`findParentBlock` 으로 얻은 가장 가까운 단락 블록의 `getComputedStyle().textAlign` 한 번만 읽는다**. computed 는 이미 inline + CSS 상속을 모두 반영하므로 단일 read 로 충분하고, 외곽 wrapper 의 inline text-align 이 사용자의 안쪽 선택을 덮어쓰는 회귀를 차단. 매핑 매트릭스: `center` → 가운데, `right`/`end` → 오른쪽, 그 외(`left`/`start`/`justify`/`match-parent`/`""`) → 왼쪽. UI 에 양쪽 정렬 버튼이 없으므로 `justify` 는 왼쪽 버튼이 받는다.

**적용(`execAlign`) 후 조상 정리**: 안쪽 블록에 `style.textAlign = align` 을 박은 뒤, editor 까지의 조상 중 inline `text-align` 이 있고 자체 inline 텍스트를 직접 갖지 않는 wrapper(외부 페이스트의 외곽 figure 등) 의 `text-align` 을 제거한다. `hasDirectInlineText()` 가드로 텍스트를 직접 가진 조상은 보존 — 다른 단락의 의도된 정렬을 빼앗지 않는다. **단, 조상을 비우기 전에 직속 블록 자식의 "현재 시각 정렬"을 `getComputedStyle` 로 snapshot 해 inline 으로 고정**(자체 inline 정렬이 있는 형제는 건드리지 않음). 단순히 ancestor 의 inline 값을 박으면 CSS 가 자체 정렬을 갖는 자식(`figcaption` 의 CSS `text-align:center` 등)이 의도치 않게 ancestor 값으로 덮여 시각이 변한다 — computed 를 읽어 *현재 화면값* 을 명시하므로 ancestor 가 사라져도 시각 연속성 유지.

**페이스트 단계 노이즈 정리(`normalizePastedHtml`)**: mso-* 제거 직후 추가 패스에서 (a) `<img>`/`<span>` 의 `text-align` 선언 제거(replaced/inline 요소라 무의미) (b) 모든 요소에서 `text-align: justify` 제거(UI 에 양쪽 정렬 버튼 없음). 다른 정렬값(left/center/right)은 보존.

### 서버 sanitize
`src/lib/sanitize.ts` `sanitizeContent()` 가 `/api/admin/articles` POST/PUT 에서 본문에 적용. 공개 페이지 렌더(`dangerouslySetInnerHTML`)에서도 한 번 더 적용(이중 sanitize, idempotent). 화이트리스트:
- 태그: 표 계열(`table/thead/tbody/tfoot/tr/th/td/caption/col/colgroup`) + 멀티미디어(`img/iframe/figure/figcaption/video`) 등
- 속성: 정렬 등 인라인 스타일 보존을 위해 블록 태그(`p/h1-h6/blockquote/ul/ol/li/figure/figcaption`)와 인라인 컨테이너(`div/span`)에 `style` 허용. **단, 값은 `allowedStyles` 화이트리스트로 한정**.
- iframe 허용 호스트: `www.youtube.com`, `player.vimeo.com`
- 스타일: 정규식 화이트리스트 — `expression()`, `url(javascript:)` 등 거부

**`allowedStyles` 정책** (2026-05-19 축소 — 클라이언트 `stripNonAllowlistedInlineStyles` 와 동일 정책의 서버측 백스톱):
- `*` 키: `text-align: left|center|right` 만. `font-size/color/background-color/font-weight/font-style/border` 등은 보존하지 않는다(인라인 의도가 정상 작성 흐름에서 만들어질 수 없으며, 외부 페이스트는 paste 단계에서 1차 제거됨). `.article-content` CSS(samsung-newsroom-feature-ui 실측값)로 폴스루.
- `iframe`, `div` (video embed wrapper) 별도 키: 임베드 좌표 declaration 보존 (`buildEmbedHtml()` 출력 라운드트립).
- `table/td/th` 별도 키: 표 구조용 `border/border-collapse/border-spacing/width/vertical-align`.

> ⚠️ **새 태그를 `allowedTags` 에 추가할 때 `allowedAttributes` 에 `style` 등 필요한 속성을 함께 등록**하지 않으면 attribute 단계에서 통째로 제거되어 `allowedStyles` 의 값 검사까지 도달하지 못한다. 정렬 비반영 사고(2026-05-15 mistake-log) 가 이 함정에서 발생.

화이트리스트 추가 시 반드시 정규식으로 값을 좁힐 것 (e.g. `border-style: [/^(solid|dashed|dotted|double|none)$/]`).

### 서버 normalize (구조 청소)
`src/lib/normalize-server.ts` `normalizeArticleHtml()` 가 sanitize **앞에** 적용된다 — 어드민 저장(`/api/admin/articles` POST/PUT) 과 공개 페이지 렌더(`(main)/articles/[slug]/page.tsx`) 양쪽 모두.

**왜 sanitize 만으로 부족한가**: `sanitizeContent` 는 인라인 style/속성 화이트리스트만 적용한다. figure/figcaption 의 **구조** 청소(중첩 평탄화, 본문성 figcaption → p lift, 미디어 없는 figure unwrap) 는 하지 않는다. 따라서 2026-05-19 paste cleanup(`baa3c6d`) 이전에 저장된 기사 본문은 어드민 재저장으로도 깨끗해지지 않고, 다음 패턴이 D1 에 굳어 있다 → `.article-content figcaption { text-align: center }` 와 `.article-content figure { display: flex; align-items: center }` CSS 가 적용되어 본문이 가운데 정렬로 렌더 (실측 — d3a6632e).

`normalizeArticleHtml` 은 `normalize-paste.ts` 의 7 개 헬퍼(`cleanTextAlignNoise` · `flattenRedundantFigures` · `liftBodyFigcaptions` · `unwrapBodyFigures` · `unwrapInlineWrappingBlocks` · `stripNonAllowlistedInlineStyles` · `removeEmptyBlocks`)를 linkedom 으로 만든 서버 Document 에 동일 순서로 재실행한다.

**핵심 효과 (idempotent)**:
- 어드민 저장 경로: paste 우회(직접 API 호출 등) 로 들어오는 손상 본문도 동일 정책으로 정리되어 DB 에 깨끗하게 저장.
- 공개 렌더 경로: 패치 이전에 저장된 기사도 다음 페이지뷰부터 자동 치유. DB 는 손대지 않음.

**linkedom 선택 이유**: Cloudflare Workers 호환, 95KB. `nodejs_compat` 플래그 활성 환경에서 동작 검증. `normalize-paste.ts` 의 헬퍼들이 `(doc: Document): void` 순수 함수라 별도 포트(port) 없이 그대로 재사용. linkedom `Node` 클래스를 `globalThis.Node` 로 주입해 `unwrapInlineWrappingBlocks` 가 참조하는 `Node.ELEMENT_NODE`/`Node.TEXT_NODE` 상수가 동작하도록 한다.

**liftBodyFigcaptions 의 블록 자식 처리** (2026-05-19 추가분): figcaption 이 자식으로 `<p>/<h1-6>/<div>/<blockquote>/<figure>/<ul>/<ol>/<li>/<table>` 을 가지면 `<p>` 로 wrap 하지 않고 unwrap 한다. wrap 하면 `<p><p>X</p></p>` invalid HTML 이 생성되어 브라우저 재파싱 시 nesting 이 무너지고 idempotent 가 깨진다. inline `style`(text-align) 은 자식들에게 분배.

**빈 줄(2줄 개행) 보존** (회귀 "수정 시 2줄 개행 미적용"): `removeEmptyBlocks` 는 paste 경로(`normalizePastedHtml`)에서는 인자 없이 호출되어 모든 빈 `<p>`/`<figcaption>` 를 제거(Notion 등 단락 노이즈 청소)하지만, 서버 `normalizeArticleHtml` 에서는 `{ keepEmptyParagraphs: true }` 로 호출해 사용자가 에디터에서 Enter 로 만든 빈 `<p>` 를 `<p><br></p>` 로 정규화해 **보존**한다(빈 `<figcaption>` 캡션 잔재는 보존 모드에서도 계속 제거). paste 본문은 이미 paste 단계에서 노이즈가 제거된 뒤 에디터에 들어오므로, 저장 단계 보존이 노이즈를 되살리지 않는다(정책 분리). 빈 `<p>` → `<p><br></p>` 정규화가 idempotency 의 핵심. CSS 는 `.article-content p { padding-top:32px; line-height:30px }` 로 빈 단락당 약 2배(≈62px) 간격을 만들어 별도 CSS 불필요. 연속 빈 줄은 제한 없이 입력한 만큼 보존.

**테스트**: `src/lib/__tests__/normalize-server.test.ts` 가 라이브 d3a6632e raw HTML 을 fixture (`fixtures/article-d3a6632e-rendered.html`) 로 두고 검증(빈 줄 보존·정규화·idempotency 는 케이스 9~13). `scripts/smoke-paste-cleanup.mjs` 는 POST→GET→공개페이지 라운드트립을 wrangler dev 에서 실측 (POST 경로 normalize 검증).

## 썸네일 편집기

### `ThumbnailUploader`
- 드래그&드롭, 클릭, Ctrl+V 지원
- 이미지 있을 때 우상단 3개 버튼: **Type(텍스트 오버레이) / Upload(변경) / X(삭제)**
- 이미지 없을 때 업로드 영역 아래에 "텍스트만으로 썸네일 만들기" 보조 버튼 노출 → `ThumbnailOverlayEditor` 를 placeholder 모드로 호출
- 업로드 엔드포인트: `POST /api/admin/upload` (`image/jpeg|png|gif|webp`, 30MB 한도, R2 저장, `/api/admin/upload/{key}` 프록시 URL 반환)

### `ThumbnailOverlayEditor` (Canvas 2D)
- `imageUrl: string | null` — 이미지가 없으면 그라디언트(135deg, 220/40/70 → 240/50/50) 배경 위에 텍스트만 합성하여 새 썸네일 이미지 생성
- 이미지 있을 때 자연 크기, 없을 때 1280x720 (16:9) 캔버스
- 텍스트 오버레이 추가/삭제, 폰트크기·색상·굵기·정렬·그림자 컨트롤
- **위치는 5단계 프리셋 (좌상/우상/중앙/좌하/우하)** — 우측 패널의 3×3 그리드 버튼으로 선택. 가장자리 8/92% 패딩으로 잘림 방지. 드래그 이동은 지원하지 않음 (모바일·터치 환경에서 정밀 조작 어려움 대응).
- 미리보기는 DOM/CSS, 저장 시점에만 Canvas 합성 → JPEG(0.92) → R2 업로드
- 폰트: `"Pretendard","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif`
- 외부 origin 이미지가 CORS 헤더 없이 캔버스 오염을 일으키면 저장 실패 → 사용자에게 안내 표시. R2 프록시(`/api/admin/upload/[...key]`) 는 동일 origin 이라 정상 동작.

#### 미리보기 ↔ 저장 결과 일치 (cqw 비율 + max-width 84%)
DOM 미리보기와 캔버스 합성을 동일한 좌표·크기 비율로 맞추기 위해:
- 미리보기 박스(`width: min(100%, 720px)`)에 `containerType: inline-size` 지정. 자식 텍스트 박스는 cqw 단위로 캔버스 자연 너비 기준 비율 표시.
- `fontSize: max(8px, ${o.fontSize / refW * 100}cqw)` (`refW = naturalSize?.w ?? 1280`). 56px → 720px 박스에서 ≈31.5px 로 정확히 비례.
- `maxWidth: 84cqw` + `whiteSpace: pre-wrap` + `wordBreak: break-word` 로 어떤 앵커·길이에서도 8/92% 패딩 안쪽에 머무름.
- 캔버스 합성도 `wrapByMaxWidth(ctx, line, size.w * 0.84)` 헬퍼로 동일 84% 기준 wrap. 저장된 JPEG 의 줄바꿈/위치가 미리보기와 일치.

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

## PDF 객체 추출 도구

`/admin/articles/new` 본문 작성기의 "PDF 객체 추출" 도구 (`PdfExtractorModal` + `POST /api/admin/pdf-convert`). PDF 를 페이지 단위로 raster + 클라이언트 텍스트 추출 후, Claude Vision (`claude-sonnet-4-6`) 의 `emit_blocks` tool_use 로 본문 HTML 블록(`h1/h2/h3/h4/p/table/figure/ul/ol/blockquote`)을 받는다. 페이지마다 단일 fetch 호출, 순차 처리.

### 누락 감지 (2026-05-22 회귀 대응)

LLM 응답이 `max_tokens` 한도에 부딪쳐 잘리거나 형식 검증 실패로 일부 블록이 폐기될 수 있다. 라우트가 다음 세 가지 플래그를 응답에 함께 실어 보내고, 모달이 이를 시각화한다.

- `truncated: true` — Anthropic 응답의 `stop_reason === "max_tokens"`. 마지막 블록(또는 페이지 후반부)이 누락됐을 가능성.
- `droppedBlocks: number` — `extractToolUseBlocks` 가 형식 검증(`type`/`html` 누락·enum 미일치)으로 폐기한 항목 수. 대개 max_tokens 잘림으로 마지막 객체가 파편화된 결과.
- `empty: true` — `blocks` 가 0개. 빈 페이지이거나 LLM 응답 실패.

모달 동작:
- 위 셋 중 하나라도 truthy 인 페이지는 카드 우상단·상태 라인에 주황 ⚠ 배지 + "누락 우려 — 응답 잘림 (max_tokens 초과) · 형식 폐기 N개 · 빈 응답" 라벨.
- "변환 결과 미리보기" details 는 누락 우려 페이지를 우선 정렬 + `open` 기본값(접혀 있던 회귀 해소).
- 카드 하단·미리보기 라인에 **"이 페이지만 다시 변환"** 버튼. 자동 재시도는 하지 않는다(토큰 낭비 최소화 — 사용자가 결정).
- "완료된 페이지 본문에 삽입" 클릭 시 누락 우려 페이지가 선택에 포함돼 있으면 `window.confirm` 으로 한 번 더 경고.

### max_tokens 정책
`PDF_CONVERT_MAX_TOKENS = 32000` (`src/lib/pdf-convert-prompt.ts`). Claude Sonnet 4.6 출력 한도(64k)의 절반으로 안전 마진. 평균 비용은 LLM 이 실제 출력한 만큼만 부과되어 큰 페이지에서만 약 2배. 변경 시 `src/lib/__tests__/pdf-convert-prompt.test.ts` 의 회귀 가드(`toBeGreaterThanOrEqual(32000)`) 가 잡는다.

**상향 이력**:
- 4000 → 8000 (commit 9d0ef79): 표 응답 JSON 파싱 회귀 해소
- 8000 → 16000 (commit 111f990): 17행 평가표 페이지에서 truncated + 페이지 통째 누락(`상원고-test-e56f69cf` 사례)
- 16000 → 32000 (2026-05-22 회귀): 표 + 본문이 함께 큰 페이지에서 `truncated && empty` 동시 발생. LLM 이 tool_use 의 input JSON 생성 도중 max_tokens 에 도달하면 Anthropic 이 미완성 input.blocks 를 정상 형태로 노출하지 않아 `extractToolUseBlocks` 가 0 블록을 반환 → 페이지 통째 누락. 클라이언트는 `formatWarning()` 에서 두 신호 동시 발생을 "출력 한도 초과 — 페이지가 너무 큼" 단일 메시지로 통합 표시한다.

### 페이지 raster 영구화
LLM 이 figure 블록을 출력한 페이지에 한해 (`html.includes("__PAGE_RASTER__")`) 페이지 JPEG 를 R2 (`pdf-extract/YYYY/MM/...`) 에 업로드하고 마커를 `/api/admin/upload/{key}` 로 치환. figure 가 없는 페이지의 raster 는 영구 저장하지 않아 비용을 최소화한다.

### 단위 테스트
`src/lib/__tests__/pdf-convert-prompt.test.ts` 가 `extractToolUseBlocks` 의 dropped 카운트(`type/html` 누락·enum 미일치·non-object)와 `parsePdfConvertResponse` 폴백을 커버. 실제 Anthropic 호출은 비결정적이라 단위 픽스처로 결정적 회귀를 잡는다.
