// normalizeArticleHtml 서버측 구조 청소 회귀 테스트.
// node 환경 (vitest 기본) — linkedom 이 자체 DOM 구현을 제공하므로 happy-dom 불필요.
//
// 검증 시나리오:
//   1. d3a6632e 라이브 본문 raw HTML — figcaption 본문 wrapper / 본문 figure / 3중 중첩 / b/p invalid 모두 청소
//   2. <figcaption><b>본문</b></figcaption> 단발 케이스 — figcaption → p lift
//   3. 본문 wrapping <figure style="text-align:left"> → unwrap 후 자식 보존
//   4. 진짜 사진+캡션 보존 — <figure><img/><figcaption>설명</figcaption></figure> 회귀 방지
//   5. <b><p>X</p></b> → <p><b>X</b></p> 정상화
//   6. idempotent — 정규화된 결과를 한 번 더 통과시켜도 동일

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeArticleHtml, processArticleHtml } from "../normalize-server";
import { sanitizeContent } from "../sanitize";

describe("normalizeArticleHtml", () => {
  it("1. cleans live d3a6632e body (figcaption body wrappers, body figures, 3-deep nesting)", () => {
    const fixture = readFileSync(
      join(__dirname, "fixtures/article-d3a6632e-rendered.html"),
      "utf8",
    );
    const out = normalizeArticleHtml(fixture);

    // (a) 본문 텍스트 손실 없음
    expect(out).toContain("안녕하세요 수학을 가르치고 있는 최희성T에요");
    expect(out).toContain("난이도 양극화 구조");
    expect(out).toContain("위에서 말했던 탐구보고서 추천 문항");
    expect(out).toContain("1학기 1차 정기고사 공통수학1 문항별 분석");

    // (b) figcaption 은 진짜 미디어 caption 만 남는다 — 본문성 figcaption 은 모두 <p> 로 lift.
    //     원본에는 figcaption 이 다수(본문 wrapper + 캡션). 두 사진의 진짜 캡션 ≤ 5 개만 잔존(빈 figcaption 도 포함).
    const captionTags = out.match(/<figcaption[^>]*>/g) || [];
    expect(captionTags.length).toBeLessThanOrEqual(5);

    // (c) 본문 wrapping figure 가 unwrap 됨 — 직속 미디어 없는 figure 가 본문에 남지 않는다.
    //     "안녕하세요" 텍스트가 figure 바로 아래에 있지 않고 본문 텍스트 노드/<p> 로 올라옴.
    expect(out).not.toMatch(/<figure[^>]*>\s*안녕하세요/);

    // (d) 3중 중첩 figure 평탄화 — figure>figure>figure 패턴이 사라진다.
    const deepNested = /<figure[^>]*>\s*<figure[^>]*>\s*<figure/i.test(out);
    expect(deepNested).toBe(false);

    // (e) 진짜 사진(img) 은 보존
    expect(out).toContain("1778228930405-b56681cd.png");
    expect(out).toContain("1778228959947-97ce3c3a.png");
  });

  it("2. lifts body figcaption to <p>", () => {
    const html = `<figcaption><b>위에서 말했던 탐구보고서 추천 문항 3가지</b></figcaption>`;
    const out = normalizeArticleHtml(html);
    expect(out).toMatch(/<p[^>]*>\s*<b[^>]*>위에서 말했던 탐구보고서 추천 문항 3가지<\/b>\s*<\/p>/);
    expect(out).not.toMatch(/<figcaption/);
  });

  it("3. unwraps figure with no direct media child, preserves inline text-align by merging into children", () => {
    const html = `<figure style="text-align:left"><figcaption>본문 텍스트</figcaption></figure>`;
    const out = normalizeArticleHtml(html);
    // figure 가 사라지고 안쪽 figcaption 이 <p> 로 lift.
    expect(out).not.toMatch(/<figure/);
    expect(out).toContain("본문 텍스트");
    expect(out).toMatch(/<p/);
  });

  it("4. preserves real image + caption figure (regression guard)", () => {
    const html = `<figure><img src="/img/x.png" alt="" /><figcaption>실제 캡션</figcaption></figure>`;
    const out = normalizeArticleHtml(html);
    expect(out).toMatch(/<figure[^>]*>/);
    expect(out).toMatch(/<img[^>]*src="\/img\/x\.png"/);
    expect(out).toMatch(/<figcaption[^>]*>실제 캡션<\/figcaption>/);
  });

  it("5. normalizes <b><p>X</p></b> to <p><b>X</b></p>", () => {
    const html = `<b><p>본문 단락</p></b>`;
    const out = normalizeArticleHtml(html);
    expect(out).not.toMatch(/<b[^>]*>\s*<p/);
    expect(out).toMatch(/<p[^>]*>\s*<b[^>]*>본문 단락<\/b>\s*<\/p>/);
  });

  it("6. is idempotent — second pass produces identical output", () => {
    const fixture = readFileSync(
      join(__dirname, "fixtures/article-d3a6632e-rendered.html"),
      "utf8",
    );
    const once = normalizeArticleHtml(fixture);
    const twice = normalizeArticleHtml(once);
    expect(twice).toBe(once);
  });

  it("7. empty / falsy input passes through unchanged", () => {
    expect(normalizeArticleHtml("")).toBe("");
  });

  it("8. text-only paragraph passes through (no over-normalization)", () => {
    const html = `<p>그냥 평문 단락입니다.</p>`;
    const out = normalizeArticleHtml(html);
    expect(out).toContain("그냥 평문 단락입니다.");
    expect(out).toMatch(/<p[^>]*>그냥 평문 단락입니다\.<\/p>/);
  });

  // ── 의도적 빈 줄(2줄 개행) 보존 — keepEmptyParagraphs (회귀: "수정 시 2줄 개행 미적용") ──

  it("9. preserves intentional empty paragraph (2줄 개행)", () => {
    const out = normalizeArticleHtml(`<p>첫 단락</p><p><br></p><p>둘째 단락</p>`);
    expect(out).toMatch(/<p>\s*<br\s*\/?>\s*<\/p>/);
    expect(out).toContain("첫 단락");
    expect(out).toContain("둘째 단락");
  });

  it("10. normalizes bare empty <p></p> to <p><br></p>", () => {
    const out = normalizeArticleHtml(`<p>a</p><p></p><p>b</p>`);
    expect(out).toMatch(/<p>\s*<br\s*\/?>\s*<\/p>/);
    expect(out).not.toMatch(/<p>\s*<\/p>/);
  });

  it("11. preserves ALL consecutive empty paragraphs (no collapse)", () => {
    const out = normalizeArticleHtml(`<p>a</p><p><br></p><p><br></p><p>b</p>`);
    const empties = out.match(/<p>\s*<br\s*\/?>\s*<\/p>/g) || [];
    expect(empties.length).toBe(2);
  });

  it("12. empty-line preservation is idempotent", () => {
    const once = normalizeArticleHtml(`<p>a</p><p></p><p><br></p><p>b</p>`);
    expect(normalizeArticleHtml(once)).toBe(once);
  });

  it("13. still removes empty figcaption even in keep mode", () => {
    const out = normalizeArticleHtml(
      `<figure><img src="/x.png" alt="" /><figcaption></figcaption></figure>`,
    );
    expect(out).not.toMatch(/<figcaption>\s*<\/figcaption>/);
  });
});

// ── processArticleHtml — raw HTML 블록 영역 분기 ──

describe("processArticleHtml", () => {
  const RAW = `<div data-raw-html="a1b2c3d4" contenteditable="false"><style data-raw-scoped="1">[data-raw-html="a1b2c3d4"][data-raw-html][data-raw-html] p{color:red;}</style><p style="font-size:11px;color:#345">원본 보존 단락</p><h5>원본 h5</h5></div>`;

  it("raw 마커 없는 본문은 기존 파이프라인과 결과가 동일하다 (fast-path)", () => {
    const html = '<p style="font-size:0.75rem;color:red">본문</p><figure><figcaption>캡션형 본문</figcaption></figure>';
    expect(processArticleHtml(html)).toBe(sanitizeContent(normalizeArticleHtml(html)));
  });

  it("표준 영역은 뉴스룸 정화, raw 영역은 원형 보존", () => {
    const html = `<p style="font-size:0.75rem;color:red">바깥 단락</p>${RAW}<p>꼬리 단락</p>`;
    const out = processArticleHtml(html);
    // 바깥: font-size/color 제거 (뉴스룸 백스톱)
    expect(out).toMatch(/<p[^>]*>바깥 단락<\/p>/);
    expect(out.split("data-raw-html")[0]).not.toContain("font-size");
    // 안쪽: 인라인 스타일·h5 보존
    expect(out).toContain("font-size:11px");
    expect(out).toContain("color:#345");
    expect(out).toContain("<h5>원본 h5</h5>");
    expect(out).toContain('data-raw-html="a1b2c3d4"');
    expect(out).toContain("꼬리 단락");
  });

  it("비스코프 <style> 은 서버에서 스코프된다 (직접 API 경로 방어)", () => {
    const html = `<div data-raw-html="beef0001"><style>body{display:none}p{color:blue}</style><p>x</p></div>`;
    const out = processArticleHtml(html);
    expect(out).toContain('[data-raw-html="beef0001"][data-raw-html][data-raw-html]');
    // body 전역 규칙이 래퍼로 리맵 — 비스코프 body{ 가 남지 않는다
    expect(out).not.toMatch(/<style[^>]*>[^<]*(^|[{};\s])body\{/);
    expect(out).toContain('data-raw-scoped="1"');
  });

  it("data-raw-scoped 마커 위조 — AST 검증으로 잡아 재스코프한다", () => {
    const html = `<div data-raw-html="beef0002"><style data-raw-scoped="1">body{display:none}</style><p>x</p></div>`;
    const out = processArticleHtml(html);
    expect(out).not.toMatch(/<style[^>]*>body\{display:none\}/);
    expect(out).toContain('[data-raw-html="beef0002"][data-raw-html][data-raw-html]');
  });

  it("멱등 — processArticleHtml 2회 적용 = 1회와 동일", () => {
    const html = `<p style="color:red">바깥</p>${RAW}`;
    const once = processArticleHtml(html);
    expect(processArticleHtml(once)).toBe(once);
  });

  it("다중 raw 영역의 순서가 보존된다", () => {
    const html = `<p>A</p><div data-raw-html="aaaa1111"><p style="color:#111">first</p></div><p>B</p><div data-raw-html="bbbb2222"><p style="color:#222">second</p></div><p>C</p>`;
    const out = processArticleHtml(html);
    const iA = out.indexOf("A"), i1 = out.indexOf("first"), iB = out.indexOf(">B<"), i2 = out.indexOf("second"), iC = out.indexOf(">C<");
    expect(iA).toBeGreaterThanOrEqual(0);
    expect(i1).toBeGreaterThan(iA);
    expect(iB).toBeGreaterThan(i1);
    expect(i2).toBeGreaterThan(iB);
    expect(iC).toBeGreaterThan(i2);
    expect(out).toContain("color:#111");
    expect(out).toContain("color:#222");
  });

  it("중첩 마커는 outermost 만 영역으로 취급 — 내부 마커는 영역 안에 보존", () => {
    const html = `<div data-raw-html="aaaa1111"><p>outer</p><div data-raw-html="bbbb2222"><p>inner</p></div></div>`;
    const out = processArticleHtml(html);
    expect(out).toContain("outer");
    expect(out).toContain("inner");
    expect(out).toContain('data-raw-html="aaaa1111"');
    expect(out).toContain('data-raw-html="bbbb2222"');
  });

  it("본문에 미리 박힌 data-raw-slot 속성은 제거된다 (슬롯 주입 가드)", () => {
    const html = `<div data-raw-slot="0"><p>가짜 슬롯</p></div><div data-raw-html="aaaa1111"><p>진짜</p></div>`;
    const out = processArticleHtml(html);
    expect(out).toContain("가짜 슬롯");
    expect(out).toContain("진짜");
    // 진짜 영역은 1개뿐 — 가짜 슬롯 div 가 raw 영역 내용으로 바꿔치기되지 않는다
    expect(out.match(/data-raw-html=/g)?.length).toBe(1);
  });

  it("불량/중복 id 는 재부여되고 스코프 CSS 도 리맵된다", () => {
    const dup = `<div data-raw-html="cccc3333"><style data-raw-scoped="1">[data-raw-html="cccc3333"][data-raw-html][data-raw-html] p{color:red;}</style><p>one</p></div>`;
    const html = dup + dup; // 에디터에서 블록 복사 → 동일 id 2개
    const out = processArticleHtml(html);
    const ids = [...out.matchAll(/data-raw-html="([^"]+)"/g)].map((m) => m[1]);
    const wrapperIds = ids.filter((_, i) => i % 1 === 0); // 모든 등장 (style prefix 포함)
    const uniqueWrapperIds = new Set(out.match(/<div data-raw-html="([^"]+)"/g));
    expect(uniqueWrapperIds.size).toBe(2); // 래퍼 id 가 서로 달라짐
    // 두 번째 블록의 style prefix 가 새 id 로 리맵되어 자기 래퍼와 일치
    const blocks = out.split("<div data-raw-html=").slice(1);
    for (const b of blocks) {
      const id = b.slice(1, b.indexOf('"', 1));
      expect(b).toContain(`[data-raw-html="${id}"]`);
    }
    expect(wrapperIds.length).toBeGreaterThan(0);
  });
});
