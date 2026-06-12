# 실수 노트 (Mistake Log)

기록 형식: 날짜 / 현상 / 원인 / 해결 / 교훈

## 2026-06-12 — 정율사관 > 학원소식(/jstory) 404 근원 해소 — catch-all 리프 카테고리 자동 렌더
- 현상: 어드민 `nav_menus` 에 정율사관(부모 `/jungyoul`) 자식으로 학원소식(href `/jstory`)을 추가하니 진입 시 404. 다른 정율사관 자식(선생님 `/teachers`·FAQ `/faq`·시험지분석 `/exam`·성장스토리 `/story`)은 모두 명시 라우트가 있어 정상
- 원인: catch-all `(main)/[slug]/page.tsx` 의 `loadMenu` 가 부모(`parent_id IS NULL AND href=/{slug}`)만 인덱스로 렌더하고, 실패 시 `getDefaultParentBySlug` 폴백 → 없으면 `notFound()`. `/jstory` 는 (a) 명시 라우트도, (b) `?category=` 쿼리도, (c) 부모 메뉴도 아닌 "자식 전용 단일 세그먼트 slug" 라 어디에도 안 잡힘. 2026-05-11 (c) / 2026-05-20 과 **동일 결함의 4회째 재발** — 그간 "명시 라우트 신설 + sitemap + 폴백 정정"의 단발 처방만 반복
- 해결 (근원적):
  - `loadMenu` 에 **리프 카테고리 분기** — 부모 매칭 실패 시 `href=/{slug}` 인 자식 메뉴를 조회해, 있고 예약어가 아니면 그 slug 를 카테고리로 하는 기사·HTML·URL 목록을 `<ArticleList hideTabs>`(hidden=false)로 렌더. 글 0건이면 "준비 중" 안내(200, 404 아님)
  - `src/lib/default-nav.ts` 에 `RESERVED_ROUTE_SLUGS`(명시 라우트 + 부모 인덱스 slug) + `extractLeafCategorySlug()` 도입. `mergeCategoryOptions`/`extractCategorySlugsFromHrefs`(→ `getCategoryOptions`/`getWritableCategorySlugs`)가 리프 path-slug 도 카테고리로 합류 → 어드민 글 작성 카테고리 드롭다운·저장 허용에 "학원소식" 자동 노출
  - 이제 **어떤 부모의 자식이든 href 를 임의 새 slug 로 추가해도 404 안 남** — 명시 라우트·sitemap·폴백 동기화 불필요(전용 hero/필터가 필요할 때만 명시 라우트). `docs/categories.md` 갱신
  - 검증: `src/lib/__tests__/default-nav.test.ts` 에 리프 카테고리 추출·합류·예약어 제외 케이스 추가(226 tests pass), typecheck 통과
- 교훈:
  - (1) **동일 결함이 3회 이상 단발 처방으로 재발하면 데이터 입력 실수가 아니라 라우팅 모델의 구조적 공백이다**. "어드민 자유 href ↔ 코드 명시 라우트" 결합을 매번 수동 동기화하는 대신 catch-all 이 미지의 자식 slug 를 카테고리로 흡수하게 일반화하니 동기화 절차 자체가 사라짐. 반복 회귀의 진짜 신호는 "절차를 더 잘 지키자"가 아니라 "절차를 없앨 구조로 바꾸자"
  - (2) **catch-all 일반화 시 예약어(RESERVED) 화이트리스트로 명시 라우트·부모 인덱스 충돌을 차단**한다. 리프 카테고리를 무제한 허용하면 명시 라우트 slug 가 카테고리로 오인될 수 있어, 명시 라우트 폴더 추가 시 `RESERVED_ROUTE_SLUGS` 동시 등록을 룰로 박제(docs/categories.md)

## 2026-05-20 — /story 명시 라우트 신설로 성장스토리 자식 메뉴 404 회귀 해소
- 현상: 헤더 "정율사관 → 성장스토리" 자식 메뉴 클릭 시 404. 운영 D1 의 `nav_menus` 자식 행은 `href=/story` 로 저장돼 있는데(backup-20260508.sql:122 기준), 코드에는 `/story` 명시 라우트가 없고 catch-all `(main)/[slug]/page.tsx` 도 `nav_menus` 부모 행(`parent_id IS NULL`) 만 인덱스 페이지로 렌더하므로 자식 href 는 부모로 매칭되지 않아 404 로 떨어짐. 2026-05-11 항목 (c) 에서 "DB 행 정정" 으로 단발 처방 제안만 남기고 코드 레벨 회귀는 미해결 상태로 침전
- 원인: (1) 폴백(`src/lib/default-nav.ts`) 의 성장스토리 href 가 `/articles?category=success` 로 운영 D1 와 어긋나 있어 폴백 환경에서도 같은 자식 클릭이 articles 페이지로 흐르는 형태로 위장됨 → 회귀 표면화 지연. (2) 본 프로젝트의 "어드민 자유 입력 href + 명시 라우트는 코드" 분리 모델에서 어드민 href 입력에 대한 코드측 라우트 동기화 절차가 `docs/categories.md` 에 "기존 카테고리 재사용 + 별도 명시 라우트" 변형 케이스로 명문화돼 있지 않아, 한 번 누락되면 다음 PR 까지 부채로 남기 쉬움
- 해결:
  - `src/app/(main)/story/page.tsx` 신설 — `/exam` 페이지의 simplified 패턴(필터·태그옵션 없음). `category="success"` 기사를 최신순으로 `<ArticleList ... hideTabs />` 로 렌더, JSON-LD CollectionPage + `renderJsonLd()` (XSS escape 헬퍼) 적용
  - `src/lib/default-nav.ts:37` 폴백 자식 href 를 `/articles?category=success` → `/story` 로 정정. 운영 D1 자식 행 href 와 일치 → 폴백 환경과 운영 환경 모두 동일 라우트로 수렴
  - `src/app/sitemap.ts` `STATIC_ROUTES` 에 `{ path: "/story", changeFrequency: "weekly", priority: 0.8 }` 추가
- 교훈:
  - (1) **어드민 자유 입력 href 는 코드 명시 라우트와 동기화 절차가 명문화돼야 후속 회귀를 예방한다**. 2026-05-08 (`nav_menus href 만 추가하고 라우트 누락`)·2026-05-11 (c) 와 동일 결함 패턴이 세 번째 재발. 단발성 진단은 매번 "DB 행을 어떻게 입력했는지" 로 분기되지만 메타 부채는 "어드민 href ↔ 코드 라우트" 결합 그 자체. `docs/categories.md` 의 시나리오 분기에 "기존 카테고리 재사용 + 별도 명시 라우트" 변형(예: success 카테고리 + `/story`) 을 추가해 어드민이 자식 href 를 새 경로로 입력할 때 코드 작업 누락을 막을 것
  - (2) **폴백 단일 소스와 운영 D1 의 href 가 어긋나면 회귀가 "위장" 된다**. 본 사례에서 폴백 자식 href 가 `/articles?category=success` 로 살아있어 로컬·fresh-seed 환경에서는 404 가 아니라 articles 페이지로 흐르므로 개발 단계에서 잡히지 않음. `default-nav.ts` 같은 폴백 SSOT 는 운영 D1 데이터(`backup-*.sql`) 와 주기적으로 diff 해 어긋남을 사전 발견할 것
  - (3) **회고 항목의 "정황상 가장 유력한 가설" 을 그대로 후속 처방 책임자에게 떠넘기지 말 것**. 2026-05-11 (c) 가 "운영 D1 에 잘못 입력된 자식 href 로 추정" 으로 끝났지만, 실제로는 운영 입력이 정상(`/story`)이고 코드 라우트 부재가 진짜 원인이었음. 가설은 "어드민 정정" 과 "코드 라우트 신설" 두 시나리오를 모두 명시한 후 실측으로 분기해야 동일 회고가 잘못된 방향으로 침전되는 것을 막음

## 2026-05-19 — paste 단계 normalize 만으로는 패치 이전 DB row 가 영구히 깨진 채 노출됨
- 현상: 2026-05-19 PR (`baa3c6d`) 이후에도 동일 기사 `d3a6632e` 본문이 가운데 정렬로 굳어 있음. curl 로 받은 라이브 HTML 안의 `.article-content` 본문에 다음 패턴이 그대로 잔존: `<figcaption>` 이 본문 단락 wrap, 직속 미디어 없는 `<figure style="text-align:left">` 가 본문 wrap, 3중 중첩 figure, `<b><p>X</p></b>` invalid HTML. `.article-content figcaption { text-align: center }` + `.article-content figure { display: flex; align-items: center }` CSS 가 이 패턴에 적용되어 가운데 정렬·과한 간격으로 렌더
- 원인: `normalizePastedHtml`(13개 패스, 5 개 구조 청소 포함) 가 **브라우저 paste 이벤트에서만** 동작. 다음 두 경로가 우회: (a) `/api/admin/articles` POST/PUT 은 `sanitizeContent` 만 호출 — sanitize 는 인라인 style/속성 화이트리스트만 거를 뿐 figure/figcaption 구조 청소는 하지 않음, (b) `(main)/articles/[slug]/page.tsx` 공개 렌더도 `sanitizeContent` 만. 즉 paste cleanup PR 이전에 paste 된 d3a6632e 본문이 이미 D1 에 굳어 있고, 어드민이 재저장해도 인라인 style 만 다듬어질 뿐 figure/figcaption 구조는 그대로 살아남음. paste 단계만 본 사고의 사각지대: **새 페이스트만 수리하고 기존 DB row 는 손대지 않음**
- 해결:
  - 신규 `src/lib/normalize-server.ts` `normalizeArticleHtml(html)` — `linkedom` 으로 서버측 Document 만들어 `normalize-paste.ts` 의 7 개 헬퍼(`cleanTextAlignNoise` · `flattenRedundantFigures` · `liftBodyFigcaptions` · `unwrapBodyFigures` · `unwrapInlineWrappingBlocks` · `stripNonAllowlistedInlineStyles` · `removeEmptyBlocks`) 를 canonical 순서로 재실행. 헬퍼들은 `(doc: Document): void` 순수 함수라 별도 포팅 없이 재사용. linkedom `Node` 클래스를 `globalThis.Node` 로 주입해 `unwrapInlineWrappingBlocks` 의 `Node.ELEMENT_NODE`/`TEXT_NODE` 상수 호환
  - 두 진입점에 wiring (sanitize **앞** 에 적용): `/api/admin/articles` POST + PUT, `(main)/articles/[slug]/page.tsx`. 공개 렌더 path 추가로 패치 이전 DB row 가 다음 페이지뷰부터 자동 치유 — DB 는 손대지 않음
  - `liftBodyFigcaptions` 보강: figcaption 이 자식으로 블록 요소(p/h1-6/div/blockquote/figure/ul/ol/li/table) 를 가지면 `<p>` 로 wrap 하면 `<p><p>X</p></p>` invalid HTML 이 생성되어 브라우저 재파싱 시 nesting 이 무너지고 idempotent 가 깨진다. 블록 자식 보유 시 unwrap 으로 분기, inline `style` 은 자식들에게 분배
  - linkedom 선택 이유: Cloudflare Workers 호환, 95KB. happy-dom(280KB devDep) 보다 가볍고 nodejs_compat 활성 환경에서 검증
  - 검증:
    - `src/lib/__tests__/normalize-server.test.ts` 신설 (8 케이스). fixture `article-d3a6632e-rendered.html` 은 라이브 사이트에서 curl 로 받은 d3a6632e 본문 raw HTML
    - `scripts/smoke-paste-cleanup.mjs` 를 wrangler dev (OpenNext 빌드) 에 대해 실행 — POST(저장 normalize) → GET API + 공개 페이지 양쪽 14 어설션 PASS
    - 별도 검증 — 깨진 d3a6632e 본문을 sqlite3 로 D1 에 직접 INSERT (API normalize 우회) → 공개 페이지 GET → 본문에서 `<figcaption>` 본문 wrap 0 개, 3중 중첩 figure 0 개, `text-align: center` 의 본문 적용 0 회 (1 회 있는 것은 진짜 캡션의 인라인 span). 공개 렌더 path 자동치유 입증
- 교훈:
  - (1) **paste-only 청소는 DB 에 굳은 row 를 손대지 않는다**. paste pipeline 을 도입할 때는 같은 정책의 server-side 백스톱을 admin 저장 경로와 **공개 렌더 경로** 양쪽에 배치해야 패치 이전 데이터까지 치유된다. 공개 렌더 backstop 이 빠지면 "DB 가 정상이 될 때까지" 라는 모호한 상태가 영구화. 본 사례에서 baa3c6d PR 이 sanitize 의 `allowedStyles` 만 좁히고 구조 청소는 paste 에만 둔 비대칭이 회귀의 직접 원인
  - (2) **library-level "헬퍼는 순수 함수" 분리는 server 재사용의 전제**. `normalize-paste.ts` 가 이미 각 패스를 `(doc: Document): void` 순수 함수로 분리·개별 export 해 둔 덕분에 server normalize 는 별도 포트 없이 linkedom 의 Document 를 그대로 넘기는 thin wrapper 로 끝남. 브라우저용 모듈에 DOM 라이브러리 의존이 깊지 않은 시그니처를 강제하면 추후 server 재사용 비용이 0 에 수렴
  - (3) **`<figcaption>` → `<p>` lift 는 figcaption 의 자식 구성에 따라 분기 필수**. figcaption 이 인라인 자식만 가지면 `<p>` 로 wrap 이 맞지만, 블록 자식(`<p>`/`<h*>`/`<div>` 등) 을 가지면 wrap 시 invalid HTML (`<p><p>...</p></p>`) 이 만들어진다. linkedom 직렬화는 invalid 라도 그대로 출력하지만 브라우저는 재파싱에서 nesting 을 자동 교정하므로 idempotent 자체 테스트로만 잡힌다. **HTML 변환 함수의 idempotent 검증은 invalid HTML 의 silent corruption 을 찾는 가장 싼 가드**
  - (4) **HTML 진단은 라이브 사이트의 curl 본문이 가장 강력한 fixture**. `scripts/smoke-paste-cleanup.mjs` 의 합성 fixture 만 봤다면 d3a6632e 의 실제 `<figcaption>` 안 `<p>` 다중 자식 패턴을 놓쳤을 가능성 (실제 unit 테스트 작성 단계에서 idempotent assertion 이 실패하며 발견). 회귀 fixture 는 합성이 아닌 운영 데이터의 raw HTML 을 그대로 동결하는 방식이 사각지대를 줄임 (mistake-log 2026-05-15 교훈(4) 강화 사례)
  - (5) **wrangler dev 는 사전 빌드된 worker 를 실행한다 — TS 수정 후 `opennextjs-cloudflare build` 재실행 필수**. `npm run dev` (`next dev`) 는 D1 binding 이 없어 admin/공개 path 의 통합 검증이 불가. `wrangler dev` 는 production-like 환경이지만 `.open-next/worker.js` 가 사전 빌드된 정적 번들이므로 코드 수정 후 즉시 반영되지 않는다. 본 PR 의 smoke 첫 실행이 12/14 실패한 이유: 빌드 전 worker 상태. 빌드 후 14/14 PASS

## 2026-05-19 — Notion 페이스트 시맨틱 청소 (2026-05-15 figure-wrapping 후속)
- 현상: 동일 기사 `news.jung-youl.com/articles/[…]-d3a6632e` 의 본문이 정렬 fix 이후에도 시각적으로 어색함. 실측(`curl --globoff` 으로 받은 6,828 bytes 본문) 결과: (a) `<span style="font-size:0.75rem">` 토막이 한 문단을 본문크기·캡션크기로 분할, (b) `<img style="border:0px solid lab(90.952003 0 -0.000012);…width:328px">` 의 Notion 클립보드 시그니처 인라인 스타일, (c) 3중 중첩 `<figure>` + 본문 텍스트가 `<figcaption>` 안에 들어가 `.article-content figcaption` 의 작은 회색 톤이 본문에 적용됨, (d) `<b><p><b>▣ ...</b></p></b>` invalid HTML, (e) 빈 `<p>/<p><br></p>` 무더기로 단락 간격 불규칙
- 원인: 2026-05-15 PR(`7fdd4e6`/`b7afcc0`) 이 정렬(text-align) 회로만 fix 했고, 회고 교훈(3) 이 명시적으로 "**`<figure>` 가 단락 컨테이너로 들어오는 외부 페이스트 패턴은 sanitize 가 화이트리스트만 통과시키므로 그대로 살아남는다. 시맨틱 청소는 페이스트 단계(`normalizePastedHtml`) 에서 잡는 게 안전**" 으로 후속을 예고. `normalizePastedHtml` 는 mso/Hwp/`<img>·<span>` 의 text-align/justify 까지만 청소했고, 일반 인라인 폰트·색·크기, 중첩 figure, 본문성 figcaption, 블록-인-인라인 invalid HTML 은 그대로 통과. 또 `sanitize.ts` `allowedStyles` 는 `font-size: /^\d+/` 로 `0.75rem` 의 선두 `0` 만 매치해 통과시키고, `border` 정규식이 끝앵커 없어 `0px solid lab(...)` 뒤를 그대로 통과시킴
- 해결:
  - 페이스트 정리 파이프라인을 `src/lib/normalize-paste.ts` pure module 로 분리. 기존 8개 패스에 4개 시맨틱 청소 패스 추가:
    - `flattenRedundantFigures` — 자식이 단일 `<figure>` 만 있는 `<figure>` 를 재귀 unwrap (최대 3회). outer figure 의 인라인 style 은 inner 로 병합 후 외곽 제거
    - `liftBodyFigcaptions` — `<figcaption>` 의 직속 부모 `<figure>` 에 형제 `<img>/<video>/<iframe>` 없으면 `<p>` 로 치환 (진짜 캡션만 보존)
    - `unwrapBodyFigures` — `<figure>` 가 직속 자식으로 미디어 (img/video/iframe) 미보유 시 unwrap. `.article-content figure { display: flex; align-items: center; padding-top: 32px }` 가 본문 단락에 적용돼 가운데 정렬·과한 간격으로 렌더되는 회귀 차단. 다중 자식 body figure 처리 (`flattenRedundantFigures` 의 단일 자식 룰 사각지대)
    - `unwrapInlineWrappingBlocks` — `<b>/<strong>/<i>/<em>/<span>` 이 블록 직접 자식을 가지면 인라인을 블록 안쪽으로 옮김 (`<b><p>X</p></b>` → `<p><b>X</b></p>`)
    - `stripNonAllowlistedInlineStyles` — 인라인 style 화이트리스트. `*` 는 `text-align: left|center|right` 만, `table/td/th` 는 표 구조용 declaration 만, `iframe` 와 embed wrapper `<div>` 는 임베드 좌표 declaration 만. 그 외 (`font-size`/`color`/`background-color`/`font-weight`/`font-style`/`border` 등) 모두 제거 → `.article-content` CSS(samsung-newsroom-feature-ui 실측값)로 폴스루
  - 빈 블록 제거 확장: `<p>` 외 `<figcaption>` 도, `<br>` 만 있어도 제거
  - `sanitize.ts` `allowedStyles` 도 동일 정책으로 축소 — `*` 키는 `text-align: left|center|right` 만, `table/td/th/iframe/div` 별도 키로 좁게 허용. 클라이언트 1차 청소 + 서버 백스톱 이중화
  - 검증: 신규 `src/lib/__tests__/normalize-paste.test.ts` (5 케이스 — Notion fixture, 사진+캡션, Google Docs 표, YouTube 임베드 라운드트립, HWPX) + 기존 `sanitize.test.ts` 4 케이스 추가 + `scripts/smoke-paste-cleanup.mjs` (PUT → GET → 공개 페이지 어설션, mistake-log 교훈(4) 권장 패턴)
- 교훈:
  - (1) **회고 교훈(3) 같은 "후속 작업" 표시는 같은 도메인의 다음 PR 에서 반드시 처리한다는 단일 출처가 되어야 함**. 본 사례에서 2026-05-15 PR 이 명시한 deferred 항목이 4일 뒤 동일 기사로 재발견됐고, 회고를 보지 않고 진단을 다시 처음부터 했다면 같은 분석을 중복 수행했을 것
  - (2) **paste 단계와 서버 sanitize 의 정책은 한 SSOT 로 묶어야 회귀가 없다**. 본 PR 은 클라이언트 `stripNonAllowlistedInlineStyles` 와 서버 `allowedStyles` 가 동일 규칙(text-align 만 + table/iframe/embed 예외)을 갖도록 동시 변경. 한쪽만 좁히면 우회 경로(API 직접 호출 등)에서 회귀
  - (3) **외부 페이스트가 인라인 폰트/크기/색을 강제하는 패턴은 화이트리스트로 폴스루를 보장하는 방향이 안전**. 본 프로젝트는 `.article-content` CSS 가 이미 *삼성 뉴스룸 기획기사 UI 레퍼런스 기반 실측값* 으로 정의돼 있어, 인라인 스타일만 제거하면 자동으로 하우스 톤으로 재설정됨. 페이스트 출처에 따라 다른 정리 로직을 분기하는 대신 "보존할 것만 화이트리스트" 일원화가 단순·안정
  - (4) **정규식 화이트리스트는 끝앵커(`$`)와 단위 정확성을 반드시 검증**. 기존 `font-size: /^\d+/` 가 `0.75rem` 을 통과시킨 패턴은 정규식 표면만 보고 "숫자만 통과" 라고 오인할 위험. mistake-log 2026-05-15 교훈(1) "단위 검증만 보고 root cause 결정 금지" 의 변형 — 단위 검증의 정규식 자체가 의도와 다르게 동작할 수 있음
  - (5) **HTML 태그 매칭 정규식은 word boundary (`\b`) 필수**. 본 PR 디버그 단계에서 `/<b[^>]*>\s*<p/i` 어설션이 `<br>\n<p>` 를 false-match. 이유: `[^>]` 가 `r` 을 받아들여 `<b` + `r` + `>` 가 매치. 수정 후 `/<b\b[^>]*>\s*<p/i` 로 word boundary 추가. 단순 `<tag` prefix 매칭은 `<tag2>` 같은 별개 태그까지 잡아내므로 항상 `\b` 또는 `(?=[\s>])` lookahead 로 종결을 보장
  - (6) **`<figure>` 시맨틱 청소는 단일 자식·다중 자식 두 경로를 모두 잡아야 함**. v1 의 `flattenRedundantFigures` 만으로는 Notion 의 본문 단락 wrapping figure (다중 figure 자식) 가 살아남아 `.article-content figure` CSS 의 flex-center 가 본문에 적용. **실제 6,828 bytes 본문 통과 디버그 단계**에서 발견 — vitest 합성 fixture 만 봤다면 놓쳤을 가능성. 운영 데이터로의 end-to-end 디버그는 합성 테스트의 사각지대를 드러낸다 (mistake-log 2026-05-15 교훈(4) 의 강화 사례)

## 2026-05-15 — 빠른편집 "왼쪽 정렬 미반영" 후속: 외부 페이스트 figure 단락 + walk-up 검출의 조상 덮어쓰기
- 현상: sanitize.ts allowedAttributes 수정 후에도, 외부 에디터(HWP/Word/CKEditor 류)로 작성된 본문을 빠른편집으로 다시 열면 **툴바 정렬 버튼이 활성화되지 않거나 클릭해도 활성 상태가 바뀌지 않는** 케이스가 남아 있음. 실측 대상: `news.jung-youl.com/articles/[…]-d3a6632e`
- 분석: 해당 게시글 본문이 `<figure style="text-align:right"><figure><figure>텍스트</figure></figure></figure>` 처럼 **`<figure>` 가 단락 컨테이너로 다중 중첩**되어 있고 `text-align` 은 최외곽에만 박혀 있음. 그 외 `<img style="text-align:left">`, `<span style="text-align:center">` 같은 무의미한 inline 정렬 노이즈도 다수
- root cause 두 갈래:
  - (Bug A — 적용 경로) `findParentBlock` 의 블록 태그 목록에 `figure` 가 없어, 안쪽 figure 텍스트에 커서를 두고 정렬 버튼을 누르면 walk-up 이 모든 figure 를 건너뛰고 wrapping `<div>` 까지 올라간다. 그 div 에 `text-align: left` 를 박지만 outer figure 의 inline `text-align: right` 가 그대로 살아 있어 안쪽 텍스트는 계속 오른쪽 정렬 → 시각 변화 0
  - (Bug B — 검출 경로) `detectBlock` 의 정렬 walk-up 이 조상의 inline/computed 로 매번 덮어쓰는 구조라, Bug A 를 고친 후에도 중간 figure 의 `getComputedStyle().textAlign` 이 외곽 figure 의 `right` 를 상속해 안쪽 사용자 선택을 "사라지게" 한다 → 왼쪽 버튼이 영영 활성화되지 못함
- 해결:
  - `findParentBlock` 에 `figure/figcaption/td/th` 추가
  - `detectBlock` 의 정렬 검출을 walk-up 누적 → **`findParentBlock` 으로 얻은 가장 가까운 블록의 `getComputedStyle().textAlign` 한 번만 읽는 방식**으로 교체. 매핑: center → center, right/end → right, 그 외(left/start/justify/match-parent/'') → left. UI 에 양쪽 정렬 버튼이 없으므로 justify 도 좌측 버튼이 받음
  - `execAlign` 에 조상 inline `text-align` 정리 루프 추가. `hasDirectInlineText()` 가드로 텍스트를 직접 가진 조상은 보존. 조상을 비우기 직전에 직속 블록 자식의 *현재 화면값* (`getComputedStyle().textAlign`) 을 snapshot 해 inline 으로 고정 — `<blockquote right><p>A</p><p>B</p></blockquote>` 에서 A 만 좌측으로 바꿔도 B 의 상속 우측이 사라지지 않게. 또한 figcaption 처럼 CSS 가 자체 정렬을 가진 자식의 시각이 ancestor 값으로 덮이는 회귀를 차단 (Playwright 실측에서 발견)
  - 검증: Playwright 로 live 게시글(`d3a6632e`) 위에 sandbox 를 만들어 실측. 5 시나리오(nested figure / multi-p blockquote / figcaption-CSS-center / plain p / justify) 모두 통과. JSDOM 으로는 CSS 상속이 시뮬레이션되지 않아 정확한 검증 불가 — 실제 브라우저에서 `getComputedStyle().textAlign` 이 상속을 반영함을 확인
  - `normalizePastedHtml` 에 paste 단계 노이즈 정리 패스 추가: `<img>`/`<span>` 의 text-align 제거, 모든 요소의 `text-align: justify` 제거
- 교훈:
  - (1) **walk-up 누적 형태의 상태 검출은 인라인-우선 정책에서 위험**. 조상이 매번 덮어쓰면 사용자가 안쪽에 막 적용한 변경이 한 틱 만에 사라진다. "가장 가까운 단락 1개 + computed" 가 inline + 상속을 모두 반영하는 단일 진실
  - (2) **검출과 적용은 같은 블록 정의(`findParentBlock`)를 공유**해야 한다. 검출은 figure 를 의도적으로 잡지만 적용은 figure 를 건너뛰는 비대칭이 곧 버그
  - (3) `<figure>` 가 단락 컨테이너로 들어오는 외부 페이스트 패턴은 sanitize 가 화이트리스트만 통과시키므로 그대로 살아남는다. 시맨틱 청소는 페이스트 단계(`normalizePastedHtml`) 에서 잡는 게 안전
  - (4) 이전 사고(같은 날짜) 의 "Chromium 좌측 비대칭" 가설은 가설 그대로는 진실이었지만, 사용자가 경험한 "정렬이 안 된다" 라는 **표면 증상은 다중 root cause** 였음. 한 가지 해결책으로 모든 증상이 사라졌는지 다른 실측 데이터로 재검증 필요

## 2026-05-15 — 빠른편집 "왼쪽 정렬 미반영" 진단에서 잘못된 root cause 가설 → 통합 테스트로 발견
- 현상: 빠른편집 모달에서 기존 텍스트가 작성된 글을 열어 왼쪽 정렬 후 저장 시 변경이 반영되지 않는다는 사용자 보고
- 1차 가설 (오류): Chromium `execCommand("justifyLeft")` 가 좌측에 대해 인라인 스타일을 안 쓰는 비대칭. `content-editor.tsx:execAlign` 의 결함이 주 원인이라고 단정. 보조 Plan 에이전트도 sanitize-html 의 `text-align` 정규식만 단위 검증 후 "통과한다"고 판단해 같은 가설을 강화
- 실제 root cause (smoke 테스트로 발견): `src/lib/sanitize.ts` 의 `allowedAttributes` 에 `<p>`, `<h1-6>`, `<blockquote>`, `<li>`, `<ul>`, `<ol>`, `<figure>`, `<figcaption>` 가 누락되어 있어 **모든 블록 태그의 `style` 속성이 통째 제거**. `text-align` 정규식까지 도달하기 전에 attribute 단계에서 차단. `<div>`·`<span>` 만 명시되어 정렬이 살아남는 비대칭 → 사용자가 정렬을 적용해도 흔적이 없는 결과
- 해결: (1) `sanitize.ts` allowedAttributes 에 위 8개 블록 태그에 `style` 추가 (값은 기존 `allowedStyles` 화이트리스트로 별도 제한 — 보안 영향 없음). (2) `content-editor.tsx` 의 `execAlign` 을 `execCommand("justifyLeft/Center/Right")` 의존 → `block.style.textAlign = align` 직접 설정으로 재구현 (Chromium 좌측 비대칭 회피). (3) `styleWithCSS=true` 마운트 시 강제. (4) `detectBlock` 에 `justify` 추가 + `getComputedStyle` 폴백. (5) toolbar 버튼 `onMouseDown={preventEditorBlur}` 로 selection 보존
- 교훈:
  - (1) **단위 검증(정규식 테스트)만 보고 root cause 결정 금지.** sanitize-html 은 attribute 단계와 style 값 단계가 별도 → 정규식이 맞아도 attribute 가 허용 안 되어 있으면 무관. 가설은 항상 **end-to-end 통합 테스트** 로 검증.
  - (2) 보조 에이전트의 분석이 깔끔하게 정리돼 있을수록 한 번 더 의심할 것. 본 사례에서 Plan 에이전트는 "85% 확신 (a) Chromium 비대칭" 으로 정량 표현했지만 실제 정답은 그 분석 밖에 있었음.
  - (3) `sanitize-html` 같은 화이트리스트 도구는 새 태그를 `allowedTags` 에 추가할 때 **`allowedAttributes` 에도 함께 추가**해야 한다는 규칙을 코드 리뷰 체크리스트로 둘 것. `<p>` 같은 너무 흔한 태그는 default 의 빈 attribute 목록을 그대로 쓰기 쉬워 함정.
  - (4) 회귀 테스트 자동화 부재 → 본 PR 의 `/tmp/smoke-alignment.mjs` 가 잡았듯 PUT → GET → 공개 페이지 HTML 까지 한 번에 어설션하는 스모크가 향후 회귀 차단에 효과적. `scripts/smoke-*.mjs` 로 이전 권장.

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
