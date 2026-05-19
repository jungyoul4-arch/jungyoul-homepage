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
  // 4) <b><p>X</p></b> 같은 invalid 정상화 → 5) 인라인 style 화이트리스트 → 6) 빈 <p>/<figcaption> 제거.
  const doc = document as unknown as Document;
  cleanTextAlignNoise(doc);
  flattenRedundantFigures(doc);
  liftBodyFigcaptions(doc);
  unwrapBodyFigures(doc);
  unwrapInlineWrappingBlocks(doc);
  stripNonAllowlistedInlineStyles(doc);
  removeEmptyBlocks(doc);

  return document.body.innerHTML;
}
