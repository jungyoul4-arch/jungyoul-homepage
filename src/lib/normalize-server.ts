// 서버측 본문 정규화 — 공개 렌더와 어드민 저장 경로에서 공유.
// 클라이언트 paste pipeline 의 5 개 구조 청소 헬퍼를 linkedom Document 에 대해 재실행한다.
//
// 왜 서버에서도 필요한가:
//   - normalizePastedHtml(브라우저 onPaste) 는 새로 붙여넣는 본문만 정리.
//   - 2026-05-19 paste cleanup 이전에 저장된 기사(예: d3a6632e) 는 figure/figcaption 구조 손상이 D1 에 굳어 있다.
//   - sanitizeContent 는 인라인 style/속성만 다듬을 뿐 figure/figcaption 구조 청소는 하지 않으므로 어드민 재저장으로도 안 깎임.
//   - 서버 normalize 를 추가하면 다음 페이지뷰(공개 렌더) 와 다음 어드민 저장 시점에 자동 치유.
//
// linkedom 선택 이유: 95KB · Cloudflare Workers 호환 · Document API 표면이 lib.dom 과 호환.
// 헬퍼는 (doc: Document): void 시그니처 순수 함수이므로 별도 포팅 없이 재사용 가능.

import { parseHTML, Node as LinkedomNode } from "linkedom";
import {
  cleanTextAlignNoise,
  flattenRedundantFigures,
  liftBodyFigcaptions,
  unwrapBodyFigures,
  unwrapInlineWrappingBlocks,
  stripNonAllowlistedInlineStyles,
  removeEmptyBlocks,
} from "@/lib/normalize-paste";
import { sanitizeContent, sanitizeRawContent } from "@/lib/sanitize";
import {
  RAW_HTML_ATTR,
  RAW_SCOPED_ATTR,
  RAW_SLOT_ATTR,
  RAW_ID_RE,
  generateRawId,
  ensureScopedCss,
  remapScopedCssId,
} from "@/lib/raw-html";

// normalize-paste 의 unwrapInlineWrappingBlocks 는 Node.ELEMENT_NODE / Node.TEXT_NODE 상수를 참조한다.
// 브라우저·happy-dom 환경에서는 global Node 가 존재하지만 Node.js / Workers 에는 없다.
// linkedom 의 Node 클래스는 ELEMENT_NODE(=1)·TEXT_NODE(=3) 표준 상수를 가지므로 globalThis 에 주입.
// 모듈 load 시 1 회만 — 부작용은 다른 코드가 Node 글로벌을 참조할 때 linkedom Node 로 보이는 정도.
function ensureGlobalNode(): void {
  const g = globalThis as { Node?: unknown };
  if (g.Node === undefined) {
    g.Node = LinkedomNode;
  }
}

/**
 * 본문 HTML 의 구조 노이즈(중첩 figure, 본문성 figcaption, b/p invalid 등) 를 청소한다.
 * 결과는 idempotent — 이미 정규화된 HTML 을 다시 통과시켜도 동일.
 *
 * 호출 위치:
 *   - src/app/(main)/articles/[slug]/page.tsx 의 dangerouslySetInnerHTML 전
 *   - src/app/api/admin/articles/route.ts (POST) 및 [id]/route.ts (PUT)
 *
 * 반환된 HTML 은 sanitizeContent() 로 한 번 더 통과시켜 인라인 style/속성 화이트리스트 적용.
 */
export function normalizeArticleHtml(html: string): string {
  if (!html) return html;
  ensureGlobalNode();

  // linkedom 의 parseHTML 은 html/body 래퍼가 없으면 body 가 비어 있게 파싱한다 — 명시적으로 감싼다.
  const { document } = parseHTML(
    `<!DOCTYPE html><html><head></head><body>${html}</body></html>`,
  );

  // 순서는 normalize-paste.ts 의 canonical pipeline 과 동일 (lines 488-495).
  // 0) <img>/<span> 의 의미없는 text-align 및 justify 제거 (구조 청소 판단에 노이즈로 끼지 않도록 선행).
  // 1) 단일 자식 중첩 figure 평탄화 → 2) 본문성 figcaption → p lift → 3) 미디어 없는 figure unwrap →
  // 4) <b><p>X</p></b> 같은 invalid 정상화 → 5) 인라인 style 화이트리스트 →
  // 6) 빈 <figcaption> 제거 + 빈 <p> 는 <p><br></p> 로 보존 (keepEmptyParagraphs — 사용자가 에디터에서
  //    Enter 로 만든 의도적 2줄 개행 유지. paste 단계 normalizePastedHtml 은 인자 없이 호출해 노이즈 제거 유지).
  const doc = document as unknown as Document;
  cleanTextAlignNoise(doc);
  flattenRedundantFigures(doc);
  liftBodyFigcaptions(doc);
  unwrapBodyFigures(doc);
  unwrapInlineWrappingBlocks(doc);
  stripNonAllowlistedInlineStyles(doc);
  removeEmptyBlocks(doc, { keepEmptyParagraphs: true });

  return document.body.innerHTML;
}

/**
 * 본문 전체 처리의 단일 진입점 — 어드민 저장(POST/PUT)과 공개 렌더 양쪽에서 호출.
 * `sanitizeContent(normalizeArticleHtml(html))` 를 대체한다.
 *
 * raw HTML 블록(`<div data-raw-html="id">`, 에디터 "HTML 소스 삽입" 원본 보존 모드)을
 * 추출해 두고 나머지 본문에만 기존 뉴스룸 파이프라인을 적용한 뒤, raw 영역은
 * 관용 프로파일(sanitizeRawContent) + CSS 스코프 강제(ensureScopedCss)만 거쳐 제자리에 복원한다.
 *
 * 불변식:
 *   - 마커 없는 본문은 기존 경로와 바이트 동일 (fast-path) — 기존 기사 회귀 0
 *   - 멱등: processArticleHtml(processArticleHtml(x)) === processArticleHtml(x) (공개 렌더가 매 뷰 실행)
 *   - <style> 의 스코프 여부는 data-raw-scoped 마커가 아니라 stylis AST 검증(isFullyScopedCss)으로 판단
 *     — 직접 API 호출로 마커만 붙인 전역 CSS 누수 차단
 */
export function processArticleHtml(html: string): string {
  if (!html) return html;

  // 레거시 로고 이미지의 상대 경로를 절대 경로로 보정
  const fixLegacyLogoPaths = (str: string) => {
    return str
      .replace(/src=(['"])assets\/logo\.png\1/g, 'src=$1/images/logo_invid.png$1')
      .replace(/src=(['"])assets\/logo-white\.png\1/g, 'src=$1/images/logo_white.png$1');
  };

  // fast-path: raw 마커가 전혀 없으면 기존 파이프라인 그대로 적용 후 경로 보정
  if (!html.includes(RAW_HTML_ATTR) && !html.includes(RAW_SLOT_ATTR)) {
    return fixLegacyLogoPaths(sanitizeContent(normalizeArticleHtml(html)));
  }

  ensureGlobalNode();
  const { document } = parseHTML(
    `<!DOCTYPE html><html><head></head><body>${html}</body></html>`,
  );
  const doc = document as unknown as Document;

  // ① 슬롯 주입 가드 — 본문에 미리 박아둔 data-raw-slot 으로 재조립 단계를 교란하지 못하게 전부 제거
  for (const el of Array.from(doc.querySelectorAll(`[${RAW_SLOT_ATTR}]`))) {
    el.removeAttribute(RAW_SLOT_ATTR);
  }

  // ② outermost raw 영역 추출 (중첩 마커는 바깥 영역에 포함된 채로 보존)
  const all = Array.from(doc.querySelectorAll(`div[${RAW_HTML_ATTR}]`));
  const outermost = all.filter(
    (el) => !el.parentElement?.closest(`div[${RAW_HTML_ATTR}]`),
  );
  const usedIds = new Set<string>();
  const regions: string[] = [];
  for (const el of outermost) {
    let id = el.getAttribute(RAW_HTML_ATTR) ?? "";
    if (!RAW_ID_RE.test(id) || usedIds.has(id)) {
      // 불량/중복 id 는 새로 부여하고, 스코프된 CSS 의 prefix 도 함께 리맵
      // (에디터에서 블록을 통째 복사해 중복 id 가 생기는 케이스 수리)
      const newId = generateRawId();
      for (const styleEl of Array.from(el.querySelectorAll("style"))) {
        styleEl.textContent = remapScopedCssId(styleEl.textContent ?? "", id, newId);
      }
      el.setAttribute(RAW_HTML_ATTR, newId);
      id = newId;
    }
    usedIds.add(id);
    const slot = doc.createElement("div");
    slot.setAttribute(RAW_SLOT_ATTR, String(regions.length));
    regions.push((el as HTMLElement).outerHTML);
    el.replaceWith(slot);
  }

  // ③ 표준 영역: 기존 뉴스룸 파이프라인 그대로 (빈 슬롯 div 는 normalize/sanitize 양쪽에서 생존 — 검증됨)
  const standard = sanitizeContent(normalizeArticleHtml(doc.body.innerHTML));

  // ④ raw 영역: 관용 sanitize → <style> 스코프 강제
  const processedRegions = regions.map((regionHtml) => {
    const sanitized = sanitizeRawContent(regionHtml);
    const { document: regionDocument } = parseHTML(
      `<!DOCTYPE html><html><head></head><body>${sanitized}</body></html>`,
    );
    const regionDoc = regionDocument as unknown as Document;
    const root = regionDoc.querySelector(`div[${RAW_HTML_ATTR}]`);
    if (!root) return ""; // sanitize 가 래퍼를 폐기한 비정상 케이스 — 영역 자체를 버림
    const id = root.getAttribute(RAW_HTML_ATTR) ?? "";
    for (const styleEl of Array.from(root.querySelectorAll("style"))) {
      styleEl.textContent = ensureScopedCss(styleEl.textContent ?? "", id);
      styleEl.setAttribute(RAW_SCOPED_ATTR, "1");
    }
    return (root as HTMLElement).outerHTML;
  });

  // ⑤ 재조립 — 표준 파이프라인을 통과한 슬롯 div 를 raw 영역으로 치환
  const finalHtml = standard.replace(
    new RegExp(`<div ${RAW_SLOT_ATTR}="(\\d+)"[^>]*>[\\s\\S]*?</div>`, "g"),
    (_, n: string) => processedRegions[Number(n)] ?? "",
  );

  return fixLegacyLogoPaths(finalHtml);
}
