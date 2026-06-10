import sanitizeHtml from "sanitize-html";
import { sanitizeRawCssText } from "./raw-html";

export function sanitizeContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "iframe",
      "h1",
      "h2",
      "h3",
      "h4",
      "figure",
      "figcaption",
      "br",
      "span",
      "video",
      "table",
      "thead",
      "tbody",
      "tfoot",
      "tr",
      "th",
      "td",
      "caption",
      "col",
      "colgroup",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "style", "width", "height"],
      iframe: ["src", "style", "allow", "allowfullscreen"],
      // data-raw-slot: processArticleHtml 의 raw 영역 placeholder 가 표준 파이프라인을 통과할 때 생존해야 함
      div: ["style", "contenteditable", "data-raw-slot"],
      span: ["style"],
      // 블록 요소에도 style 허용 — text-align 등 정렬 인라인 스타일이 살아남아야
      // 빠른편집/풀편집에서 적용한 정렬이 DB → 공개 렌더까지 보존된다.
      // 허용 가능한 속성 값은 allowedStyles 의 화이트리스트로 별도 제한.
      p: ["style"],
      h1: ["style"],
      h2: ["style"],
      h3: ["style"],
      h4: ["style"],
      h5: ["style"],
      h6: ["style"],
      blockquote: ["style"],
      ul: ["style"],
      ol: ["style"],
      li: ["style"],
      figure: ["style"],
      figcaption: ["style"],
      table: ["style", "border", "cellpadding", "cellspacing"],
      tr: ["style"],
      td: ["colspan", "rowspan", "style", "align", "valign"],
      th: ["colspan", "rowspan", "style", "align", "valign", "scope"],
      col: ["span", "style"],
      colgroup: ["span", "style"],
      "*": ["class"],
    },
    // 인라인 스타일은 거의 모두 클라이언트 paste 단계의 stripNonAllowlistedInlineStyles 에서 1차 제거됨.
    // 여기는 서버측 백스톱 — 외부 API 직접 호출 등 paste 우회 경로에서도 동일 정책이 적용되도록.
    //
    // 정책:
    //   - 모든 태그: text-align: left|center|right 만.
    //     (justify 는 에디터 UI 에 버튼이 없어 좌측 매핑으로 paste 단계에서 이미 제거됨.)
    //   - <table>/<td>/<th>: 표 구조 보존을 위해 border/border-collapse/border-spacing/width/vertical-align 만.
    //   - <iframe> / video embed wrapper <div>: buildEmbedHtml 의 좌표 declaration 보존을 위해 별도 키.
    //   - 그 외 인라인 폰트/크기/색 등은 보존하지 않음 — .article-content CSS (samsung-newsroom-feature-ui 실측값) 로 폴스루.
    //
    // 정상 작성 흐름에서 본문에 font-size/color 가 들어올 경로가 부재(content-editor.tsx Toolbar 에 색·크기 버튼 없음).
    // Notion·Google Docs 등 외부 페이스트의 lab(...) 색·font-size:0.75rem·width:328px 도 paste 단계와 이 백스톱 양쪽에서 차단.
    allowedStyles: {
      "*": {
        "text-align": [/^(left|center|right)$/],
      },
      iframe: {
        "position": [/^(relative|absolute)$/],
        "top": [/^-?\d+/],
        "left": [/^-?\d+/],
        "width": [/^\d+/],
        "height": [/^\d+/],
        "border": [/^0$|^none$/],
      },
      div: {
        // YouTube/Vimeo 임베드 컨테이너용 (buildEmbedHtml 출력 좌표 보존).
        "position": [/^relative$/],
        "padding-bottom": [/^\d+/],
        "height": [/^0$/],
        "overflow": [/^hidden$/],
        "margin": [/^0$/],
        "border-radius": [/^0$/],
      },
      table: {
        "border": [/^[\d.]+/],
        "border-collapse": [/^(collapse|separate)$/],
        "border-spacing": [/^\d+/],
        "width": [/^\d+/],
      },
      td: {
        "border": [/^[\d.]+/],
        "width": [/^\d+/],
        "vertical-align": [/^(top|middle|bottom|baseline)$/],
      },
      th: {
        "border": [/^[\d.]+/],
        "width": [/^\d+/],
        "vertical-align": [/^(top|middle|bottom|baseline)$/],
      },
    },
    allowedIframeHostnames: ["www.youtube.com", "player.vimeo.com"],
    allowedSchemes: ["http", "https", "mailto"],
  });
}

/**
 * raw HTML 블록(data-raw-html 영역) 전용 관용 sanitize 프로파일.
 *
 * 목적이 sanitizeContent 와 정반대다 — 뉴스룸 스타일로 깎는 게 아니라 "원본 보존".
 * 인라인 style 속성·class·id 와 <style> 태그(CSS 텍스트)를 그대로 통과시키되,
 * 코드 실행/주입 경계만 유지한다:
 *   - 차단 유지: script/form/input/button/object/embed/link/meta/svg, on* 핸들러,
 *     javascript: 스킴, data: 스킴(이미지 — 클라이언트가 이미 R2 업로드로 치환), iframe 호스트 화이트리스트
 *   - <style> 의 CSS 는 여기서 텍스트만 통과시키고, 스코프 강제(전역 누수 차단)는
 *     normalize-server.ts processArticleHtml 이 raw-html.ts ensureScopedCss 로 수행한다.
 *
 * allowVulnerableTags: <style> 을 allowedTags 에 넣기 위한 sanitize-html 플래그.
 * CSS 텍스트는 raw-html.ts(sanitizeRawCssText + 스코프 검증)가 별도 정화하므로 경고를 의도적으로 수용.
 *
 * allowedStyles 키가 없는 것은 의도 — sanitize-html 은 allowedStyles 부재 시 style 속성을
 * postcss 라운드트립만 거쳐 원형 보존한다. 위험 패턴(expression( 등)은 transformTags 에서 스크럽.
 */
export function sanitizeRawContent(html: string): string {
  return sanitizeHtml(html, {
    allowVulnerableTags: true,
    // defaults 에 h1-h6/hr/pre/code/sub/sup/u/s/mark/small/dl/dt/dd/section/header/footer/aside/
    // figure/figcaption/table 계열이 이미 포함됨 — 미디어와 style 만 추가
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "iframe",
      "video",
      "style",
    ]),
    allowedAttributes: {
      "*": ["style", "class", "id", "title"],
      a: ["href", "target", "rel", "name"],
      img: ["src", "alt", "width", "height"],
      iframe: ["src", "allow", "allowfullscreen", "width", "height"],
      div: ["data-raw-html", "contenteditable"],
      style: ["data-raw-scoped"],
      table: ["border", "cellpadding", "cellspacing"],
      td: ["colspan", "rowspan", "align", "valign"],
      th: ["colspan", "rowspan", "align", "valign", "scope"],
      col: ["span"],
      colgroup: ["span"],
    },
    transformTags: {
      "*": (tagName, attribs) => {
        // style 속성값의 레거시 실행 벡터 스크럽 (at-rule 제거 부분은 속성 문맥에서 자연 no-op)
        if (attribs.style) {
          attribs.style = sanitizeRawCssText(attribs.style);
        }
        return { tagName, attribs };
      },
    },
    allowedIframeHostnames: ["www.youtube.com", "player.vimeo.com"],
    allowedSchemes: ["http", "https", "mailto"],
  });
}
