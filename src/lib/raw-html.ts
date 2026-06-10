import { compile, serialize, stringify } from "stylis";

/**
 * Raw HTML 블록(에디터 "HTML 소스 삽입" 원본 보존 모드) 공용 코어.
 *
 * 순수 문자열 모듈 — DOM/linkedom import 금지. 클라이언트(normalize-paste.ts),
 * 서버(normalize-server.ts, Cloudflare Workers), 단위 테스트(node)에서 동일하게 동작해야 한다.
 *
 * 구조 개요:
 * - raw 블록은 `<div data-raw-html="<8hex id>" contenteditable="false">…</div>` 래퍼로 식별
 * - 블록 내 <style> CSS 는 stylis 로 셀렉터마다 `rawScopePrefix(id)` 가 prefix 되어 페이지 누수 차단
 * - 사이트측 격리는 globals.css 의 `.article-content [data-raw-html][data-raw-html] { all: revert }` 가 담당
 *
 * 특이성 계약 (globals.css 격리 규칙과 한 쌍 — 한쪽만 바꾸면 깨진다):
 * - 격리 규칙: 더블 속성 = (0,3,0) — `.article-content > div:not([style])` (0,2,1) 등 뉴스룸 규칙 제압
 * - 스코프 prefix: 트리플 속성 = (0,3,0) 이상 — 격리 규칙과 동점이어도 body <style> 이 head CSS 후순서라 승리
 */

export const RAW_HTML_ATTR = "data-raw-html";
export const RAW_SCOPED_ATTR = "data-raw-scoped";
export const RAW_SLOT_ATTR = "data-raw-slot";
/** 래퍼 id 형식 — HTML 속성/CSS 속성 셀렉터 양쪽에서 escape 없이 안전한 문자만 */
export const RAW_ID_RE = /^[A-Za-z0-9_-]{4,32}$/;

/** 8 hex 문자 id. crypto.getRandomValues 는 브라우저/Workers/Node 18+ 전역. */
export function generateRawId(): string {
  const bytes = new Uint8Array(4);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** 스코프 prefix — 트리플 속성으로 (0,3,0) 보장 (격리 규칙 (0,3,0) 을 동점 후순서로 이김) */
export function rawScopePrefix(id: string): string {
  return `[${RAW_HTML_ATTR}="${id}"][${RAW_HTML_ATTR}][${RAW_HTML_ATTR}]`;
}

/**
 * CSS 텍스트 보안 정화 (멱등).
 * - `@import`/`@charset`/`@namespace`: 스코프를 우회해 외부/전역 CSS 를 끌어오는 at-rule 제거
 * - `expression(` / `-moz-binding:` / `behavior:` / `url(javascript:` : 레거시 코드실행 벡터 무력화
 * 치환 결과 문자열은 원 패턴과 다시 매칭되지 않아 재적용해도 동일하다.
 */
export function sanitizeRawCssText(css: string): string {
  return css
    .replace(/@import\b[^;{}]*;?/gi, "")
    .replace(/@charset\s+("[^"]*"|'[^']*')\s*;?/gi, "")
    .replace(/@namespace\b[^;{}]*;?/gi, "")
    .replace(/expression\s*\(/gi, "blocked(")
    .replace(/-moz-binding\s*:/gi, "-moz-binding-blocked:")
    .replace(/behavior\s*:/gi, "behavior-blocked:")
    .replace(/url\(\s*(['"]?)\s*javascript:/gi, "url($1about:blank-");
}

/**
 * `</style` → `<\/style` 이스케이프 (멱등 — 결과에 백슬래시가 끼어 원 패턴과 재매칭 안 됨).
 * CSS 문자열 안에서 `\/` 는 `/` 의 유효한 escape 라 의미 불변. 문자열 밖이라면 어차피 적대 입력 —
 * 해당 규칙만 브라우저가 폐기한다. sanitize-html(htmlparser2)도 브레이크아웃을 막지만 직렬화 층에서 한 번 더 방어.
 */
function escapeStyleClose(css: string): string {
  return css.replace(/<\/style/gi, "<\\/style");
}

/**
 * CSS 를 raw 블록 범위로 스코프 재작성.
 * 1. 최상위 `html`/`body`/`:root` 셀렉터를 `&`(래퍼 자신)로 best-effort 리맵 —
 *    놓친 케이스는 `prefix html` 형태가 되어 아무것도 매칭하지 않는 fail-safe.
 * 2. stylis 로 전 규칙 prefix: 중첩/콤마/@media 내부까지 prefix, @keyframes/@font-face 는
 *    이름 그대로 최상위 호이스팅 (이름 전역성은 문서화된 v1 한계).
 */
export function scopeRawCss(css: string, id: string): string {
  const remapped = css.replace(
    /(^|[{}\s,;])(html|body|:root)(?=[\s,{.:#[>+~])/gi,
    "$1&",
  );
  const scoped = serialize(compile(`${rawScopePrefix(id)}{${remapped}}`), stringify);
  return escapeStyleClose(scoped);
}

/**
 * 저장된 CSS 가 이미 이 블록 id 로 완전히 스코프됐는지 stylis AST 로 검증.
 * `data-raw-scoped` 마커는 신뢰하지 않는다 — 직접 API 호출로 마커만 붙인
 * `<style data-raw-scoped="1">body{display:none}</style>` 류의 전역 누수를 차단하기 위함.
 * 규칙: "rule" 은 전 셀렉터가 `[data-raw-html="<id>"]` 로 시작해야 함.
 * @media/@supports/@layer/@container 는 자식 재귀, @keyframes/@font-face/주석은 통과,
 * 그 외(최상위 선언, @import 등)는 즉시 false.
 */
export function isFullyScopedCss(css: string, id: string): boolean {
  const target = `[${RAW_HTML_ATTR}="${id}"]`;
  type StylisNode = {
    type: string;
    props: string | string[];
    children: StylisNode[] | string;
  };
  function walk(nodes: StylisNode[]): boolean {
    for (const node of nodes) {
      if (node.type === "comm" || node.type === "@keyframes" || node.type === "@font-face") {
        continue;
      }
      if (node.type === "rule") {
        const props = Array.isArray(node.props) ? node.props : [node.props];
        if (!props.every((s) => typeof s === "string" && s.startsWith(target))) {
          return false;
        }
        continue;
      }
      if (node.type.startsWith("@") && Array.isArray(node.children)) {
        if (!walk(node.children)) return false;
        continue;
      }
      return false;
    }
    return true;
  }
  try {
    return walk(compile(css) as unknown as StylisNode[]);
  } catch {
    return false;
  }
}

/**
 * 정화 + (필요 시) 스코프. 이미 완전 스코프된 CSS 는 그대로 통과시켜 멱등을 보장한다
 * (재스코프하면 prefix 가 이중으로 붙어 셀렉터가 깨진다).
 */
export function ensureScopedCss(css: string, id: string): string {
  const sanitized = sanitizeRawCssText(css);
  return isFullyScopedCss(sanitized, id)
    ? escapeStyleClose(sanitized)
    : scopeRawCss(sanitized, id);
}

/** 스코프된 CSS 의 블록 id 교체 — 서버가 중복/불량 id 래퍼에 새 id 를 부여할 때 사용 */
export function remapScopedCssId(css: string, oldId: string, newId: string): string {
  return css.split(`[${RAW_HTML_ATTR}="${oldId}"]`).join(`[${RAW_HTML_ATTR}="${newId}"]`);
}
