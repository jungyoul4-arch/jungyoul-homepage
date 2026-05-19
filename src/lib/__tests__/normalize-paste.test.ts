// @vitest-environment happy-dom
//
// normalizePastedHtml 통합 회귀 테스트.
// happy-dom 환경 필요 (DOMParser/Element API 의존). vitest.config.ts 의 기본 node 환경을
// 이 파일만 happy-dom 으로 오버라이드.
//
// 5 케이스 (계획서 §검증):
//   1. Notion 클립보드 fixture — 손상 패턴 5종 모두 청소
//   2. 사진+캡션 정상 케이스 — 보존 (회귀 방지)
//   3. Google Docs 표 페이스트 — 표 구조·border 보존, font-size 제거
//   4. YouTube 임베드 라운드트립 — buildEmbedHtml 출력이 다시 통과해도 좌표 보존
//   5. HWPX 분기 — <v:imagedata> src 가 <img> 로 승격 (2026-05-08 회귀 보존)

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizePastedHtml } from "../normalize-paste";

describe("normalizePastedHtml", () => {
  it("1. cleans Notion clipboard paste (font-size, lab(), nested figures, body figcaptions, invalid bp wrap)", async () => {
    const fixture = readFileSync(
      join(__dirname, "fixtures/notion-paste.html"),
      "utf8",
    );
    const out = await normalizePastedHtml(fixture);

    // (a) font-size 인라인 모두 제거 (0.75rem 토막, 12px 캡션 등)
    expect(out).not.toMatch(/font-size\s*:/);
    // (b) Notion lab() 색 제거
    expect(out).not.toContain("lab(");
    // (c) Notion 강제 폭 (인라인 width:328px) 제거
    expect(out).not.toMatch(/width:\s*328px/);
    // (d) 본문성 figcaption 모두 <p> 로 lift — 안쪽 본문에 figcaption 남으면 안됨.
    //     단, 진짜 사진+캡션의 figcaption 은 보존 — fixture 의 <figure><img/><figcaption>1학기 1차 정기고사…</figcaption></figure> 는 살아있어야.
    const figcaptionMatches = out.match(/<figcaption[^>]*>/g) || [];
    expect(figcaptionMatches.length).toBe(1);
    expect(out).toContain("1학기 1차 정기고사 공통수학1 문항별 분석");
    // (e) 중첩 figure 평탄화 — 깊이 ≤ 2 (figure>img+figcaption 형태만 남음)
    const deepNested = /<figure[^>]*>\s*<figure[^>]*>\s*<figure/i.test(out);
    expect(deepNested).toBe(false);
    // (f) <b><p>X</p></b> 정상화 → <p><b>X</b></p>
    //     주의: <b\b 의 \b 는 word boundary — <br>, <base> 같은 다른 태그와의 false match 방지.
    expect(out).not.toMatch(/<b\b[^>]*>\s*<p/i);
    expect(out).toContain("▣ 단원별 주요 체크포인트");
    // (g) 빈 <p>, <p><br/></p>, <p><span><br/></span></p> 제거
    expect(out).not.toMatch(/<p>\s*<\/p>/);
    expect(out).not.toMatch(/<p>\s*<br[^>]*>\s*<\/p>/);
    // (h) 본문 텍스트 손실 없음 (핵심 키워드 잔존)
    expect(out).toContain("안녕하세요 수학을 가르치고 있는 최희성T에요");
    expect(out).toContain("난이도 양극화 구조");
    expect(out).toContain("연립하거나 다항식의 구조를");
    expect(out).toContain("13번, 15번, 16번 문항이");
    expect(out).toContain("홀수인");
    // (i) Notion 의 color/background-color/font-weight 모두 제거
    expect(out).not.toMatch(/color\s*:\s*rgb/);
    expect(out).not.toMatch(/background-color/);
    expect(out).not.toMatch(/font-weight/);
  });

  it("2. preserves image + caption (사진+캡션 정상 케이스, 회귀 방지)", async () => {
    const input = `<figure><img src="/photo.jpg" alt="설명"/><figcaption>실제 캡션입니다</figcaption></figure>`;
    const out = await normalizePastedHtml(input);
    expect(out).toContain("<figure");
    expect(out).toContain('src="/photo.jpg"');
    expect(out).toContain("<figcaption");
    expect(out).toContain("실제 캡션입니다");
  });

  it("3. preserves table border/structure, strips font-size (Google Docs 표 페이스트)", async () => {
    const input = `<table><tbody><tr><td style="border:1px solid #ccc;font-size:14px;background-color:#eee">셀</td></tr></tbody></table>`;
    const out = await normalizePastedHtml(input);
    expect(out).toContain("<table");
    expect(out).toContain("<td");
    expect(out).toContain("셀");
    expect(out).toMatch(/border\s*:/);
    expect(out).not.toMatch(/font-size/);
    expect(out).not.toMatch(/background-color/);
  });

  it("4. preserves YouTube embed wrapper coordinates (idempotent paste)", async () => {
    // buildEmbedHtml() 의 실제 출력 형식.
    // happy-dom 이 iframe src 를 자동 페치하지 않도록 RFC 2606 reserved TLD 사용 (.invalid).
    // 본 테스트는 출력 HTML 의 좌표 declaration 보존만 검증하므로 호스트 실재성 무관.
    const input =
      `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:0;border-radius:0;" contenteditable="false">` +
      `<iframe src="https://embed.test.invalid/abc12345678" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe>` +
      `</div>`;
    const out = await normalizePastedHtml(input);
    expect(out).toContain("padding-bottom:56.25%");
    expect(out).toContain("embed.test.invalid/abc12345678");
    expect(out).toMatch(/<iframe/);
  });

  it("5. promotes v:imagedata src to <img> (HWPX 분기, 2026-05-08 회귀 보존)", async () => {
    // <v:imagedata> 네임스페이스 prefix 가 인식되도록 xmlns 선언 포함.
    const input = `<div xmlns:v="urn:schemas-microsoft-com:vml"><v:imagedata src="https://example.com/hwp-image.png"/></div>`;
    const out = await normalizePastedHtml(input);
    expect(out).toContain('src="https://example.com/hwp-image.png"');
    expect(out).toContain("<img");
    expect(out).not.toContain("<v:imagedata");
  });

  // ── 격리 단위 검증 ──

  it("preserves text-align: center on <p>", async () => {
    const out = await normalizePastedHtml('<p style="text-align:center">x</p>');
    expect(out).toContain("text-align:");
    expect(out).toContain("center");
  });

  it("strips text-align from <img> and <span> (b7afcc0 정렬 노이즈)", async () => {
    const out = await normalizePastedHtml(
      '<p><img src="/x.png" style="text-align:left"/><span style="text-align:center">x</span></p>',
    );
    expect(out).not.toMatch(/<img[^>]*text-align/);
    expect(out).not.toMatch(/<span[^>]*text-align/);
  });

  it("strips text-align: justify (좌측 매핑)", async () => {
    const out = await normalizePastedHtml('<p style="text-align:justify">x</p>');
    expect(out).not.toMatch(/text-align:\s*justify/);
  });

  it("uses uploader when provided for data:URL images", async () => {
    // 1x1 transparent PNG data URL
    const dataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const uploader = async () => "/uploaded/image.png";
    const out = await normalizePastedHtml(`<img src="${dataUrl}" alt="t"/>`, {
      uploadDataUrl: uploader,
    });
    expect(out).toContain('src="/uploaded/image.png"');
    expect(out).not.toContain("data:image/png;base64");
  });

  it("falls back to placeholder when uploader returns null", async () => {
    const dataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const uploader = async () => null;
    const out = await normalizePastedHtml(`<img src="${dataUrl}" alt="t"/>`, {
      uploadDataUrl: uploader,
    });
    expect(out).not.toContain("data:image/png;base64");
    expect(out).toContain("이미지 업로드 실패");
  });

  it("strips script/style/javascript: URLs (XSS 방어 회귀 보존)", async () => {
    const out = await normalizePastedHtml(
      '<p>x</p><script>alert(1)</script><a href="javascript:alert(1)">y</a>',
    );
    expect(out).not.toContain("<script");
    expect(out).not.toContain("javascript:");
  });

  it("unwraps multi-child body <figure> (no media direct child)", async () => {
    // Notion paste 의 본문 단락 wrapping figure — flattenRedundantFigures 의 단일 자식 룰로 처리 안 됨.
    const input = `<figure style="text-align:left"><figure>단락 1</figure><figure>단락 2</figure><figure><b>단락 3</b></figure></figure>`;
    const out = await normalizePastedHtml(input);
    // <figure> 가 모두 사라져야 함 (미디어 0).
    expect(out).not.toContain("<figure");
    expect(out).toContain("단락 1");
    expect(out).toContain("단락 2");
    expect(out).toContain("단락 3");
  });

  it("preserves figure when nested figure has media (outer kept if it's the media wrapper)", async () => {
    // figure 가 직접 img/video/iframe 을 가지지 않더라도, 자식 figure 가 media 를 가지면
    // 자식 figure 가 보존되어야 한다. 외곽은 unwrap.
    const input = `<figure><figure><img src="/x.png"/><figcaption>cap</figcaption></figure></figure>`;
    const out = await normalizePastedHtml(input);
    expect(out).toContain('src="/x.png"');
    expect(out).toContain("cap");
    expect(out).toContain("<figcaption");
    // 적어도 안쪽 figure 는 보존
    expect(out).toMatch(/<figure[^>]*>.*<img/i);
  });

  it("does NOT confuse <br> + <p> with invalid <b><p> wrapping", async () => {
    // 정규식 어설션 false-match 회귀 방지 (디버그 단계 발견).
    // <br>\s*<p> 는 정상 마크업이며 unwrapInlineWrappingBlocks 대상 아님.
    const out = await normalizePastedHtml("<p>x</p><br/><p>y</p>");
    expect(out).toContain("x");
    expect(out).toContain("y");
    expect(out).not.toMatch(/<b\b[^>]*>\s*<p/i);
  });

  it("real-article body integration (smoke: 6,828 bytes from d3a6632e)", async () => {
    // 합성 fixture 외에 실제 운영 본문 형태와 가까운 통합 케이스.
    // 핵심 손상 패턴 5종 + 외곽 figure 단락 wrapping 을 한 번에 검증.
    const input = `
<div>
  <blockquote style="text-align:left"><figure><figure><figure><br/></figure></figure></figure></blockquote>
  <figure style="text-align:left">
    <figure>안녕하세요 — 본문 1</figure>
    <figure><span>본문 2</span></figure>
    <figure><br/><b>본문 3 (굵게)</b></figure>
  </figure>
  <figure>
    <img src="https://example.com/chart.png" alt="chart" style="border:0px solid lab(90 0 0);width:328px"/>
    <figcaption><span style="color:rgb(102, 102, 102);font-size:12px">실제 캡션</span></figcaption>
  </figure>
  <p><span style="font-size:0.75rem">토막 1 </span><span style="font-size:0.75rem">토막 2</span></p>
  <b><p><b>▣ 섹션 헤더</b></p></b>
  <p></p>
  <p><br/></p>
</div>`;
    const out = await normalizePastedHtml(input);
    // 핵심 잡 마크업 모두 제거
    expect(out).not.toMatch(/font-size\s*:/);
    expect(out).not.toContain("lab(");
    expect(out).not.toMatch(/width\s*:\s*328px/);
    expect(out).not.toMatch(/<b\b[^>]*>\s*<p/i);
    expect(out).not.toMatch(/<p>\s*<\/p>/);
    expect(out).not.toMatch(/<p>\s*<br[^>]*>\s*<\/p>/);
    // 본문 단락 wrapping figure 제거
    const figs = out.match(/<figure[^>]*>/g) || [];
    expect(figs.length).toBe(1); // 단 하나 — chart 이미지의 figure
    // 진짜 사진+캡션 보존
    expect(out).toContain('src="https://example.com/chart.png"');
    expect(out).toContain("실제 캡션");
    expect(out).toContain("<figcaption");
    // 본문 텍스트 모두 잔존
    expect(out).toContain("본문 1");
    expect(out).toContain("본문 2");
    expect(out).toContain("본문 3");
    expect(out).toContain("토막 1");
    expect(out).toContain("토막 2");
    expect(out).toContain("▣ 섹션 헤더");
  });
});
