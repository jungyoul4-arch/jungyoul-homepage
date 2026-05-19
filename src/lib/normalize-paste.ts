// 빠른편집기·어드민 글 작성/수정의 페이스트 정리 파이프라인.
// ContentEditor 의 onPaste 가 text/html 을 받아 이 함수에 통과시킨 결과를 본문에 삽입한다.
//
// 청소 패스 (DOM 위에서 순차 적용):
//   1. 위험·잡 노드 제거 (script/style/meta/link/xml/title)
//   2. inline event handler / javascript: URL 제거 (XSS)
//   3. Office/HWP namespace 태그 unwrap (<o:p>, <w:*>, <m:*>, <v:*>) — <v:imagedata> 같이 src 보유 노드는 <img> 로 승격
//   4. <font> unwrap
//   5. <img src="file://..."> placeholder span 으로 교체 (브라우저가 못 가져옴)
//   6. <div> 가 블록·미디어 자식 없이 텍스트만 가지면 <p> 로 교체 (iframe/video/img 가 있으면 보존 — embed wrapper 보호)
//   7. mso-*/Mso*/Hwp*/hancell* class·style 토큰 제거
//   8. 정렬 노이즈 정리 (b7afcc0, 2026-05-15): <img>/<span> 의 text-align 제거, text-align: justify 제거
//   9a. flattenRedundantFigures — Notion paste 의 단일 자식 중첩 <figure><figure><figure> 평탄화
//   9b. liftBodyFigcaptions — 직속 부모 <figure> 에 형제 <img>/<video>/<iframe> 없으면 <figcaption> → <p>
//   9c. unwrapBodyFigures — <figure> 가 직속 <img>/<video>/<iframe> 미보유 시 unwrap (다중 자식 body figure 처리)
//  10. unwrapInlineWrappingBlocks — <b><p>X</p></b> → <p><b>X</b></p>
//  11. stripNonAllowlistedInlineStyles — 인라인 style 화이트리스트 (text-align 외 폰트/색/크기 제거)
//  12. 빈 <p>/<figcaption> 제거 (텍스트 0, 미디어 0, <br> 만 있어도)
//  13. data:URL <img> 를 업로드 콜백으로 R2 영구 URL 로 치환 (실패 시 placeholder span)
//
// Pass 9a–9c, 10, 11, 12 확장 은 2026-05-19 추가분. mistake-log §2026-05-15 교훈(3) 의 "figure 단락 컨테이너 시맨틱 청소는 페이스트 단계에서" 후속.

export type DataUrlUploader = (file: File) => Promise<string | null>;

export interface NormalizePastedHtmlOptions {
  /** data:URL 이미지를 받아 R2 등 영구 URL 로 업로드. null 반환 시 placeholder 로 치환. 미제공 시 data:URL 이미지는 placeholder 처리. */
  uploadDataUrl?: DataUrlUploader;
}

// base64 data URL → File 변환. 붙여넣은 HTML 의 inline 이미지를 업로드하기 위해 사용.
export function dataUrlToFile(dataUrl: string, name: string): File {
  const commaIdx = dataUrl.indexOf(",");
  const header = dataUrl.slice(0, commaIdx);
  const b64 = dataUrl.slice(commaIdx + 1);
  const mime = /data:([^;]+);base64/.exec(header)?.[1] ?? "image/png";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const ext = (mime.split("/")[1] || "png").replace(/\+.*$/, "");
  const safeName = (name || "image").replace(/[^\w.-]/g, "_");
  return new File([bytes], `${safeName}.${ext}`, { type: mime });
}

function unwrap(el: Element): void {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

/** 1. 위험·잡 노드 통째 제거. */
export function removeDangerousNodes(doc: Document): void {
  doc.querySelectorAll("script, style, meta, link, xml, title").forEach((n) => n.remove());
}

/** 2. inline event handler 와 javascript: URL 제거. */
export function removeDangerousAttributes(doc: Document): void {
  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name;
      if (name.startsWith("on")) {
        el.removeAttribute(name);
        continue;
      }
      if ((name === "href" || name === "src") && /^\s*javascript:/i.test(attr.value)) {
        el.removeAttribute(name);
      }
    }
  });
}

/**
 * 3. Office/HWP namespace 태그 unwrap.
 * <v:imagedata src=...> 같이 이미지 src 를 들고 있는 노드는 <img> 로 승격해 후속 data:URL 업로드 파이프라인에 태운다.
 */
export function unwrapOfficeNamespaceTags(doc: Document): void {
  Array.from(doc.querySelectorAll("*")).forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (!(tag.includes(":") && /^(o|w|m|v):/.test(tag))) return;
    const src =
      el.getAttribute("src") ||
      el.getAttribute("href") ||
      el.getAttributeNS("urn:schemas-microsoft-com:vml", "src") ||
      el.getAttributeNS("http://www.w3.org/1999/xlink", "href");
    if (src) {
      const img = doc.createElement("img");
      img.setAttribute("src", src);
      el.replaceWith(img);
    } else {
      unwrap(el);
    }
  });
}

/** 4. <font> 도 unwrap. */
export function unwrapFontTags(doc: Document): void {
  Array.from(doc.querySelectorAll("font")).forEach(unwrap);
}

/** 5. <img src="file://..."> 는 브라우저가 못 가져오므로 안내 span 으로 교체 (한컴 한글 뷰어 등). */
export function replaceFileSchemeImages(doc: Document): void {
  Array.from(doc.querySelectorAll('img[src^="file:"]')).forEach((img) => {
    const placeholder = doc.createElement("span");
    placeholder.setAttribute(
      "style",
      "padding:2px 6px;background-color:#fef3c7;color:#92400e;font-size:12px;border-radius:2px;",
    );
    placeholder.textContent = "[원본 이미지 — 이미지 영역만 다시 클립보드에 복사해 별도로 붙여넣어 주세요]";
    img.replaceWith(placeholder);
  });
}

/** 6. <div> 가 표/이미지/리스트/임베드 같은 블록·미디어 자식 없이 텍스트만 갖고 있으면 <p> 로 교체.
 * iframe/video 를 포함시키는 이유: buildEmbedHtml() 출력의 wrapper <div> (padding-bottom 비율 + iframe) 를
 * <p> 로 변환하면 임베드 좌표 declaration 이 stripNonAllowlistedInlineStyles 의 일반 태그 규칙에 걸려 사라진다.
 */
export function convertTextOnlyDivToP(doc: Document): void {
  Array.from(doc.querySelectorAll("div")).forEach((div) => {
    const hasBlockOrMediaChild = div.querySelector(
      "div, table, figure, ul, ol, blockquote, h1, h2, h3, h4, h5, h6, p, iframe, video, img",
    );
    if (hasBlockOrMediaChild) return;
    const p = doc.createElement("p");
    while (div.firstChild) p.appendChild(div.firstChild);
    const style = div.getAttribute("style");
    if (style) p.setAttribute("style", style);
    div.replaceWith(p);
  });
}

/** 7. mso-*, Mso*, Hwp*, hancell* class·style 토큰 제거. */
export function cleanLegacyOfficeMarkup(doc: Document): void {
  doc.querySelectorAll("*").forEach((el) => {
    const cls = el.getAttribute("class");
    if (cls) {
      const cleaned = cls
        .split(/\s+/)
        .filter((c) => !/^(mso|Mso|Hwp|hancell)/.test(c))
        .join(" ")
        .trim();
      if (cleaned) el.setAttribute("class", cleaned);
      else el.removeAttribute("class");
    }
    const style = el.getAttribute("style");
    if (style && /mso-/i.test(style)) {
      const cleaned = style
        .split(/;\s*/)
        .filter((decl) => !/^\s*mso-/i.test(decl))
        .join("; ")
        .trim();
      if (cleaned) el.setAttribute("style", cleaned);
      else el.removeAttribute("style");
    }
  });
}

/**
 * 8. 정렬 노이즈 정리 (b7afcc0, mistake-log 2026-05-15).
 *  - <img>/<span> 의 text-align 은 무의미 (replaced/inline).
 *  - text-align: justify 는 에디터 UI 에 버튼이 없어 좌측 정렬과 동등으로 매핑해 페이스트 단계에서 제거.
 *
 * stripNonAllowlistedInlineStyles 가 모든 인라인 style 을 좁히는 패스 12 에서도 같은 효과를 보지만,
 * 여기서 먼저 처리해 검출 노이즈가 다른 패스의 판단에 끼어드는 것을 막는다.
 */
export function cleanTextAlignNoise(doc: Document): void {
  doc.querySelectorAll("*").forEach((el) => {
    const style = el.getAttribute("style");
    if (!style) return;
    const tag = el.tagName.toLowerCase();
    const stripInlineTextAlign = tag === "img" || tag === "span";
    const decls = style
      .split(/;\s*/)
      .map((d) => d.trim())
      .filter((d) => d !== "")
      .filter((d) => {
        const m = /^([a-z-]+)\s*:\s*(.+)$/i.exec(d);
        if (!m) return true;
        const prop = m[1].toLowerCase();
        if (prop !== "text-align") return true;
        const val = m[2].toLowerCase().trim();
        if (stripInlineTextAlign) return false;
        if (val === "justify") return false;
        return true;
      });
    const cleaned = decls.join("; ").trim();
    if (cleaned) el.setAttribute("style", cleaned);
    else el.removeAttribute("style");
  });
}

/**
 * 9a. 중첩 <figure> 평탄화.
 * 자식이 단일 <figure> 만 있는 <figure> 를 unwrap. 재귀 최대 3회.
 * Notion 클립보드가 모든 블록을 <figure><figure><figure>...</figure></figure></figure> 로 감싸는 패턴을 평탄화.
 */
export function flattenRedundantFigures(doc: Document): void {
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    Array.from(doc.querySelectorAll("figure")).forEach((fig) => {
      const children = Array.from(fig.children);
      if (children.length === 1 && children[0].tagName.toLowerCase() === "figure") {
        // outer figure 의 inline style (text-align 등) 은 안쪽으로 병합한 뒤 외곽 unwrap.
        const outerStyle = fig.getAttribute("style");
        const inner = children[0] as HTMLElement;
        if (outerStyle) {
          const innerStyle = inner.getAttribute("style") || "";
          inner.setAttribute("style", innerStyle ? `${outerStyle}; ${innerStyle}` : outerStyle);
        }
        unwrap(fig);
        changed = true;
      }
    });
    if (!changed) break;
  }
}

/**
 * 9b. 본문 <figure> unwrap.
 * <figure> 의 직속 자식 중 <img>/<video>/<iframe> 이 하나도 없으면, 그 figure 는 진짜 미디어 figure 가 아닌
 * 본문 단락을 감싼 Notion paste 잔재 — unwrap 해 자식을 부모 레벨로 끌어올린다.
 *
 * 이 패스가 없으면 .article-content figure { display: flex; align-items: center; padding-top: 32px } 가 body 단락에
 * 적용되어 본문이 가운데 정렬+추가 간격으로 렌더링되는 회귀가 생긴다 (실측 — d3a6632e 본문).
 *
 * `flattenRedundantFigures`(단일 자식) 이후에 실행되어야 한다. 다중 자식 figure 처리.
 */
export function unwrapBodyFigures(doc: Document): void {
  // bottom-up 으로 처리 (querySelectorAll 결과를 reverse) — 안쪽 figure 가 먼저 처리되어
  // 외곽 처리 시 자식 노드가 이미 단순화돼 있는 편이 안정적.
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    Array.from(doc.querySelectorAll("figure")).reverse().forEach((fig) => {
      const hasDirectMedia = Array.from(fig.children).some((c) => {
        const t = c.tagName.toLowerCase();
        return t === "img" || t === "video" || t === "iframe";
      });
      if (hasDirectMedia) return;
      unwrap(fig);
      changed = true;
    });
    if (!changed) break;
  }
}

/**
 * 10. 본문성 <figcaption> 을 <p> 로 lift.
 * 진짜 캡션의 조건: figcaption 의 **직속 부모** <figure> 가 **직속 자식**으로 <img>/<video>/<iframe> 을 갖는 경우.
 * (descendant 까지 보면 중첩 figure 안의 미디어가 외곽 figcaption 을 살려두는 회귀가 생긴다 — Notion paste 시그니처.)
 * 그 외 — 부모가 figure 가 아니거나, 형제 미디어가 없는 figcaption — 모두 본문 단락으로 본다.
 *
 * 자식 구성에 따라 두 가지 처리:
 *   - 인라인 자식만(텍스트·span·b·br 등): <p> 로 wrap 한 뒤 figcaption 자리에 교체.
 *   - 블록 자식(<p>/<h1-6>/<div>/<blockquote>/<figure>/<ul>/<ol>/<li>/<table>) 포함: 그냥 unwrap
 *     (자식을 부모로 끌어올림). 블록을 <p> 로 감싸면 <p><p>X</p></p> 같은 invalid HTML 이 생성되어
 *     브라우저 재파싱 시 nesting 이 무너진다. inline style (text-align 등) 은 자식들에게 분배.
 */
const FIGCAPTION_BLOCK_CHILD_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "div",
  "blockquote",
  "figure",
  "ul",
  "ol",
  "li",
  "table",
]);

export function liftBodyFigcaptions(doc: Document): void {
  Array.from(doc.querySelectorAll("figcaption")).forEach((cap) => {
    const parent = cap.parentElement;
    if (parent && parent.tagName.toLowerCase() === "figure") {
      const hasSiblingMedia = Array.from(parent.children).some((c) => {
        const t = c.tagName.toLowerCase();
        return t === "img" || t === "video" || t === "iframe";
      });
      if (hasSiblingMedia) return; // 진짜 캡션 보존
    }
    const hasBlockChild = Array.from(cap.children).some((c) =>
      FIGCAPTION_BLOCK_CHILD_TAGS.has(c.tagName.toLowerCase()),
    );
    if (hasBlockChild) {
      // 블록 자식 보유 — unwrap. text-align style 은 자식에게 전달.
      const capStyle = cap.getAttribute("style");
      if (capStyle) {
        Array.from(cap.children).forEach((child) => {
          const childStyle = child.getAttribute("style") || "";
          child.setAttribute("style", childStyle ? `${capStyle}; ${childStyle}` : capStyle);
        });
      }
      unwrap(cap);
      return;
    }
    const p = doc.createElement("p");
    while (cap.firstChild) p.appendChild(cap.firstChild);
    const style = cap.getAttribute("style");
    if (style) p.setAttribute("style", style);
    cap.replaceWith(p);
  });
}

/**
 * 11. 인라인 래퍼가 블록을 직접 감싸는 invalid HTML 정상화.
 * <b><p>X</p></b> → <p><b>X</b></p>. 다중 블록이면 각 블록 안쪽으로 인라인을 복제.
 */
export function unwrapInlineWrappingBlocks(doc: Document): void {
  const inlineTags = ["b", "strong", "i", "em", "span"];
  const blockTags = ["p", "h1", "h2", "h3", "h4", "h5", "h6", "div", "blockquote"];
  // DFS 한 번에 처리하기 어려우니 패스 반복 (최대 깊이 한정).
  for (let pass = 0; pass < 5; pass++) {
    let changed = false;
    for (const inlineTag of inlineTags) {
      Array.from(doc.querySelectorAll(inlineTag)).forEach((inline) => {
        const children = Array.from(inline.children);
        const hasBlockChild = children.some((c) => blockTags.includes(c.tagName.toLowerCase()));
        if (!hasBlockChild) return;
        const parent = inline.parentNode;
        if (!parent) return;
        // 각 블록 자식의 inner 콘텐츠를 인라인으로 감싼 새 블록으로 교체.
        // 인라인 외 자식(텍스트 노드, 다른 인라인)도 처리 — 각자 새 인라인 래퍼로 감싸 같은 위치에 삽입.
        const newNodes: Node[] = [];
        const inlineStyle = inline.getAttribute("style");
        const inlineClass = inline.getAttribute("class");
        for (const child of Array.from(inline.childNodes)) {
          if (
            child.nodeType === Node.ELEMENT_NODE &&
            blockTags.includes((child as Element).tagName.toLowerCase())
          ) {
            // 블록 자식 — 그 안쪽 콘텐츠를 인라인으로 감싸 그대로 자리 유지.
            const block = child as Element;
            const wrapped = doc.createElement(inlineTag);
            if (inlineStyle) wrapped.setAttribute("style", inlineStyle);
            if (inlineClass) wrapped.setAttribute("class", inlineClass);
            while (block.firstChild) wrapped.appendChild(block.firstChild);
            block.appendChild(wrapped);
            newNodes.push(block);
          } else if (
            child.nodeType === Node.TEXT_NODE ||
            child.nodeType === Node.ELEMENT_NODE
          ) {
            // 텍스트나 인라인 자식 — <p> 로 감싸고 그 안에 인라인으로 한 번 더.
            const text = (child.textContent || "").trim();
            if (!text && child.nodeType === Node.TEXT_NODE) continue;
            const p = doc.createElement("p");
            const wrapped = doc.createElement(inlineTag);
            if (inlineStyle) wrapped.setAttribute("style", inlineStyle);
            if (inlineClass) wrapped.setAttribute("class", inlineClass);
            wrapped.appendChild(child);
            p.appendChild(wrapped);
            newNodes.push(p);
          }
        }
        for (const n of newNodes) parent.insertBefore(n, inline);
        parent.removeChild(inline);
        changed = true;
      });
    }
    if (!changed) break;
  }
}

/**
 * 12. 인라인 스타일 화이트리스트 — text-align 외 폰트/색/크기/border 등 제거.
 * 클라이언트 1차 청소. 서버 sanitize 의 allowedStyles 와 동일 정책.
 *
 * 보존 규칙:
 *   - <table>/<td>/<th>: border/border-collapse/border-spacing/width/vertical-align (표 구조)
 *   - <iframe> 와 video embed wrapper <div>: position/top/left/width/height/padding-bottom/overflow/border-radius/margin (임베드 좌표)
 *   - 그 외 모든 태그: text-align: left|center|right 만
 *
 * 제거 대상 (위 예외 외): font-size, font-weight, font-style, color, background-color, line-height, letter-spacing,
 * text-decoration, text-indent, vertical-align, margin, padding, border, border-radius, width, height.
 * Notion 의 lab(...) 색, font-size:0.75rem, width:328px 등이 모두 여기서 사라져 .article-content CSS 의 삼성 뉴스룸 톤으로 폴스루.
 */
const TABLE_ALLOWED = new Set([
  "border",
  "border-collapse",
  "border-spacing",
  "width",
  "vertical-align",
]);
const IFRAME_ALLOWED = new Set([
  "position",
  "top",
  "left",
  "width",
  "height",
  "padding-bottom",
  "overflow",
  "border-radius",
  "margin",
  "border",
]);
const EMBED_DIV_ALLOWED = new Set([
  "position",
  "padding-bottom",
  "height",
  "overflow",
  "margin",
  "border-radius",
]);

function isEmbedDiv(el: Element): boolean {
  if (el.tagName.toLowerCase() !== "div") return false;
  // buildEmbedHtml() 가 만드는 video embed wrapper 는 padding-bottom 비율 + iframe 자식이 있다.
  const style = el.getAttribute("style") || "";
  if (!/padding-bottom\s*:/i.test(style)) return false;
  return !!el.querySelector("iframe");
}

export function stripNonAllowlistedInlineStyles(doc: Document): void {
  doc.querySelectorAll("*").forEach((el) => {
    const style = el.getAttribute("style");
    if (!style) return;
    const tag = el.tagName.toLowerCase();
    const embedDiv = isEmbedDiv(el);
    const allowed: Set<string> | null =
      tag === "table" || tag === "td" || tag === "th"
        ? TABLE_ALLOWED
        : tag === "iframe"
          ? IFRAME_ALLOWED
          : embedDiv
            ? EMBED_DIV_ALLOWED
            : null;

    const decls = style
      .split(/;\s*/)
      .map((d) => d.trim())
      .filter((d) => d !== "")
      .filter((d) => {
        const m = /^([a-z-]+)\s*:\s*(.+)$/i.exec(d);
        if (!m) return false;
        const prop = m[1].toLowerCase();
        const val = m[2].trim();
        if (allowed) {
          if (!allowed.has(prop)) {
            // 예외 셋이 있는 태그에서는 text-align 도 셋에 명시돼야 통과. 표/iframe 은 text-align 보존 불필요.
            // 다만 embed div 는 text-align 도 정렬 의도가 있을 수 있어 보존.
            if (embedDiv && prop === "text-align") {
              return /^(left|center|right)$/i.test(val);
            }
            return false;
          }
          return true;
        }
        // 일반 태그: text-align: left|center|right 만 보존.
        if (prop === "text-align") return /^(left|center|right)$/i.test(val);
        return false;
      });
    const cleaned = decls.join("; ").trim();
    if (cleaned) el.setAttribute("style", cleaned);
    else el.removeAttribute("style");
  });
}

/**
 * 13. 빈 <p>/<figcaption> 제거.
 * 텍스트 0 + 미디어 0. <br> 만 있어도 제거 (단, <p><br></p> 가 캐럿 placeholder 로 의도된 경우 -- 에디터가 빈 상태로 시작할 때 사용 --
 * 는 페이스트 단계에서는 무관. 페이스트 결과 HTML 에서 빈 단락은 잡 노이즈).
 */
export function removeEmptyBlocks(doc: Document): void {
  Array.from(doc.querySelectorAll("p, figcaption")).forEach((el) => {
    const hasNonBrMedia = el.querySelector("img, table, figure, iframe, video");
    if (hasNonBrMedia) return;
    const text = (el.textContent || "").trim();
    if (!text) el.remove();
  });
}

/**
 * 14. data:URL 이미지를 업로드 콜백으로 R2 영구 URL 로 치환.
 * 업로드 실패 시 placeholder span 으로 교체 (조용히 사라지지 않게).
 */
async function processDataUrlImages(doc: Document, uploader: DataUrlUploader): Promise<void> {
  const imgs = Array.from(doc.querySelectorAll('img[src^="data:"]')) as HTMLImageElement[];
  for (const img of imgs) {
    const dataUrl = img.getAttribute("src")!;
    let success = false;
    try {
      const file = dataUrlToFile(dataUrl, img.getAttribute("alt") || "image");
      const url = await uploader(file);
      if (url) {
        img.setAttribute("src", url);
        success = true;
      }
    } catch {
      /* fallthrough — placeholder 처리 */
    }
    if (!success) {
      const placeholder = doc.createElement("span");
      placeholder.setAttribute(
        "style",
        "padding:2px 6px;background-color:#fef3c7;color:#92400e;font-size:12px;border-radius:2px;",
      );
      placeholder.textContent = "[이미지 업로드 실패 — 다시 붙여넣어 주세요]";
      img.replaceWith(placeholder);
    }
  }
}

/**
 * 페이스트 정리 메인. 위 패스를 순차 적용 후 doc.body.innerHTML 반환.
 *
 * options.uploadDataUrl 미제공 시 data:URL 이미지는 placeholder span 으로 교체된다 (테스트·SSR 환경).
 */
export async function normalizePastedHtml(
  html: string,
  options?: NormalizePastedHtmlOptions,
): Promise<string> {
  const doc = new DOMParser().parseFromString(html, "text/html");

  removeDangerousNodes(doc);
  removeDangerousAttributes(doc);
  unwrapOfficeNamespaceTags(doc);
  unwrapFontTags(doc);
  replaceFileSchemeImages(doc);
  convertTextOnlyDivToP(doc);
  cleanLegacyOfficeMarkup(doc);
  cleanTextAlignNoise(doc);

  // 2026-05-19 추가: figure-wrapping 후속 시맨틱 청소.
  flattenRedundantFigures(doc);
  liftBodyFigcaptions(doc);
  unwrapBodyFigures(doc);
  unwrapInlineWrappingBlocks(doc);
  stripNonAllowlistedInlineStyles(doc);

  removeEmptyBlocks(doc);

  if (options?.uploadDataUrl) {
    await processDataUrlImages(doc, options.uploadDataUrl);
  } else {
    // 업로더 없으면 data:URL 이미지 placeholder 로 (테스트·SSR 안전).
    const imgs = Array.from(doc.querySelectorAll('img[src^="data:"]'));
    for (const img of imgs) {
      const placeholder = doc.createElement("span");
      placeholder.setAttribute(
        "style",
        "padding:2px 6px;background-color:#fef3c7;color:#92400e;font-size:12px;border-radius:2px;",
      );
      placeholder.textContent = "[이미지 업로드 — 업로더 미설정]";
      img.replaceWith(placeholder);
    }
  }

  return doc.body.innerHTML;
}
