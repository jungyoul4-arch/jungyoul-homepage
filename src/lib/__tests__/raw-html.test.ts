// raw-html.ts — raw HTML 블록 CSS 스코프/정화 코어 테스트.
// node 환경 (vitest 기본) — 순수 문자열 모듈이라 DOM 불필요.

import { describe, it, expect } from "vitest";
import {
  RAW_ID_RE,
  generateRawId,
  rawScopePrefix,
  sanitizeRawCssText,
  scopeRawCss,
  isFullyScopedCss,
  ensureScopedCss,
  remapScopedCssId,
} from "../raw-html";

const ID = "a1b2c3d4";
const PREFIX = `[data-raw-html="${ID}"][data-raw-html][data-raw-html]`;

describe("generateRawId", () => {
  it("8자리 hex 를 생성하고 RAW_ID_RE 를 통과한다", () => {
    const id = generateRawId();
    expect(id).toMatch(/^[0-9a-f]{8}$/);
    expect(RAW_ID_RE.test(id)).toBe(true);
  });
});

describe("sanitizeRawCssText", () => {
  it("@import / @charset / @namespace 를 제거한다", () => {
    const css = `@charset "utf-8";@import url("https://evil.example.com/x.css");@namespace svg url(http://www.w3.org/2000/svg);p{color:red}`;
    const out = sanitizeRawCssText(css);
    expect(out).not.toContain("@import");
    expect(out).not.toContain("@charset");
    expect(out).not.toContain("@namespace");
    expect(out).toContain("p{color:red}");
  });

  it("expression( / -moz-binding / behavior: / url(javascript: 을 무력화한다", () => {
    const css = `a{width:expression(alert(1));-moz-binding:url(x.xml);behavior:url(x.htc);background:url(javascript:alert(1))}`;
    const out = sanitizeRawCssText(css);
    expect(out).not.toMatch(/expression\s*\(/i);
    expect(out).not.toMatch(/-moz-binding\s*:/i);
    expect(out).not.toMatch(/(^|[^-])behavior\s*:/i);
    expect(out).not.toMatch(/url\(\s*['"]?\s*javascript:/i);
  });

  it("멱등 — 두 번 적용해도 동일", () => {
    const css = `@import "x.css";a{width:expression(1);color:blue}`;
    const once = sanitizeRawCssText(css);
    expect(sanitizeRawCssText(once)).toBe(once);
  });
});

describe("scopeRawCss", () => {
  it("일반/콤마 셀렉터에 prefix 를 붙인다", () => {
    const out = scopeRawCss("p{color:red}.foo,.bar{margin:0}", ID);
    expect(out).toContain(`${PREFIX} p{color:red;}`);
    expect(out).toContain(`${PREFIX} .foo,${PREFIX} .bar{margin:0;}`);
  });

  it("html/body/:root 셀렉터를 래퍼(&) 로 리맵한다", () => {
    const out = scopeRawCss("body{background:#fff} :root{--x:1} html{font-size:14px}", ID);
    // & 는 prefix 자체가 된다 — body/html/:root 규칙이 래퍼에 적용
    expect(out).toContain(`${PREFIX}{background:#fff;}`);
    expect(out).toContain(`${PREFIX}{--x:1;}`);
    expect(out).toContain(`${PREFIX}{font-size:14px;}`);
    expect(out).not.toMatch(/ body\{/);
  });

  it("@media 내부 규칙도 prefix 된다", () => {
    const out = scopeRawCss("@media (max-width:600px){h2{font-size:2rem}}", ID);
    expect(out).toContain("@media (max-width:600px)");
    expect(out).toContain(`${PREFIX} h2{font-size:2rem;}`);
  });

  it("@keyframes 는 이름 그대로 최상위 호이스팅된다 (문서화된 한계)", () => {
    const out = scopeRawCss("@keyframes spin{to{transform:rotate(1turn)}}", ID);
    expect(out).toContain("@keyframes spin");
    expect(out).not.toContain(`${PREFIX} @keyframes`);
  });

  it("</style 브레이크아웃을 이스케이프한다", () => {
    const out = scopeRawCss('p::after{content:"</style><script>x</script>"}', ID);
    expect(out).not.toContain("</style>");
    expect(out).toContain("<\\/style");
  });
});

describe("isFullyScopedCss", () => {
  it("스코프된 CSS 는 true", () => {
    const scoped = scopeRawCss("p{color:red}.a,.b{margin:0}@media (min-width:100px){h2{margin:0}}", ID);
    expect(isFullyScopedCss(scoped, ID)).toBe(true);
  });

  it("비스코프/타 id 스코프/최상위 선언은 false", () => {
    expect(isFullyScopedCss("p{color:red}", ID)).toBe(false);
    expect(isFullyScopedCss(scopeRawCss("p{color:red}", "deadbeef"), ID)).toBe(false);
    expect(isFullyScopedCss("color:red", ID)).toBe(false);
    // 마커 위조 공격 시나리오 — body 전역 규칙
    expect(isFullyScopedCss("body{display:none}", ID)).toBe(false);
  });

  it("@media 안에 비스코프 규칙이 숨어 있으면 false, @keyframes 는 면제", () => {
    expect(isFullyScopedCss(`${PREFIX} p{color:red}@media (min-width:1px){h2{margin:0}}`, ID)).toBe(false);
    expect(isFullyScopedCss(`${PREFIX} p{color:red}@keyframes spin{to{opacity:0}}`, ID)).toBe(true);
  });
});

describe("ensureScopedCss", () => {
  it("비스코프 CSS 는 정화 후 스코프된다", () => {
    const out = ensureScopedCss('@import "x.css";p{color:red}', ID);
    expect(out).not.toContain("@import");
    expect(out).toContain(`${PREFIX} p{color:red;}`);
  });

  it("이중 적용 = 동일 출력 (멱등 — 재스코프로 prefix 가 이중으로 붙지 않는다)", () => {
    const once = ensureScopedCss("p{color:red}.foo{margin:0}@media (min-width:1px){.b{padding:0}}", ID);
    const twice = ensureScopedCss(once, ID);
    expect(twice).toBe(once);
    expect(twice).not.toContain(`${PREFIX} ${PREFIX}`);
  });
});

describe("remapScopedCssId", () => {
  it("스코프 prefix 의 id 를 교체한다", () => {
    const scoped = scopeRawCss("p{color:red}", ID);
    const remapped = remapScopedCssId(scoped, ID, "deadbeef");
    expect(remapped).toContain(`[data-raw-html="deadbeef"]`);
    expect(remapped).not.toContain(`[data-raw-html="${ID}"]`);
    expect(isFullyScopedCss(remapped, "deadbeef")).toBe(true);
  });
});

describe("rawScopePrefix", () => {
  it("트리플 속성 = 특이성 (0,3,0) 보장 형태", () => {
    expect(rawScopePrefix(ID)).toBe(PREFIX);
  });
});
