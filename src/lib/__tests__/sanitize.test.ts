import { describe, it, expect } from "vitest";
import { sanitizeContent, sanitizeRawContent } from "../sanitize";

describe("sanitizeContent", () => {
  it("strips script tags", () => {
    const result = sanitizeContent("<p>Hello</p><script>alert(1)</script>");
    expect(result).not.toContain("<script>");
    expect(result).toContain("<p>Hello</p>");
  });

  it("allows img tags with safe attributes", () => {
    const result = sanitizeContent('<img src="/photo.jpg" alt="사진" />');
    expect(result).toContain("<img");
    expect(result).toContain('src="/photo.jpg"');
  });

  it("strips javascript: href scheme", () => {
    const result = sanitizeContent('<a href="javascript:alert(1)">click</a>');
    expect(result).not.toContain("javascript:");
  });

  it("allows youtube iframes", () => {
    const result = sanitizeContent('<iframe src="https://www.youtube.com/embed/abc123"></iframe>');
    expect(result).toContain("<iframe");
    expect(result).toContain("youtube.com");
  });

  it("strips src from iframes on non-allowed hosts", () => {
    const result = sanitizeContent('<iframe src="https://evil.example.com/exploit"></iframe>');
    // 비허용 호스트 iframe 은 src 가 제거되어 무해한 빈 태그로 남는다 (allowedIframeHostnames)
    expect(result).not.toContain("evil.example.com");
  });

  it("allows table elements", () => {
    const html = "<table><thead><tr><th>헤더</th></tr></thead><tbody><tr><td>셀</td></tr></tbody></table>";
    const result = sanitizeContent(html);
    expect(result).toContain("<table");
    expect(result).toContain("<th>");
    expect(result).toContain("<td>");
  });

  it("strips onerror attributes", () => {
    const result = sanitizeContent('<img src="x" onerror="alert(1)" />');
    expect(result).not.toContain("onerror");
  });

  it("allows heading tags h1–h4", () => {
    const html = "<h1>제목1</h1><h2>제목2</h2><h3>제목3</h3><h4>제목4</h4>";
    const result = sanitizeContent(html);
    expect(result).toContain("<h1>");
    expect(result).toContain("<h2>");
    expect(result).toContain("<h3>");
    expect(result).toContain("<h4>");
  });

  // ── 2026-05-19 추가: Notion 페이스트 잔여 인라인 스타일 백스톱 ──

  it("strips font-size from spans (Notion 0.75rem 토막)", () => {
    const result = sanitizeContent('<p><span style="font-size:0.75rem">x</span></p>');
    expect(result).not.toMatch(/font-size/);
  });

  it("strips Notion lab() color via border shorthand on img", () => {
    const result = sanitizeContent(
      '<img src="/x.png" style="border:0px solid lab(90.952003 0 -0.000012);width:328px"/>',
    );
    // 이전 정규식 함정: 'border: /^[\\d.]+(px|em|rem)?\\s+(solid|...)/' 가 끝앵커 없어 통과시켰음.
    // 새 정책은 img 에 inline style 자체를 허용 안함.
    expect(result).not.toContain("lab(");
    expect(result).not.toMatch(/width:328px/);
    expect(result).toContain('src="/x.png"');
  });

  it("preserves text-align center on p", () => {
    const result = sanitizeContent('<p style="text-align:center">x</p>');
    expect(result).toContain("text-align:center");
  });

  it("preserves embed iframe coordinates (buildEmbedHtml output round-trip)", () => {
    // buildEmbedHtml 출력 형태 — embed wrapper <div> 의 좌표 declaration 보존.
    const html =
      '<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:0;border-radius:0;">' +
      '<iframe src="https://www.youtube.com/embed/abc12345678" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"></iframe>' +
      "</div>";
    const result = sanitizeContent(html);
    expect(result).toContain("padding-bottom:56.25%");
    expect(result).toContain("youtube.com/embed/abc12345678");
  });

  it("strips justify text-align (UI 에 양쪽 정렬 버튼 없음)", () => {
    const result = sanitizeContent('<p style="text-align:justify">x</p>');
    expect(result).not.toMatch(/text-align:\s*justify/);
  });

  it("strips color and background-color (Notion 테마 누수 방지)", () => {
    const result = sanitizeContent(
      '<p style="color:rgb(102, 102, 102);background-color:rgb(255, 255, 255);font-weight:500">x</p>',
    );
    expect(result).not.toMatch(/color\s*:/);
    expect(result).not.toMatch(/background-color/);
    expect(result).not.toMatch(/font-weight/);
  });
});

describe("sanitizeRawContent", () => {
  it("인라인 style 속성을 원형 보존한다 (font-size/color 포함)", () => {
    const result = sanitizeRawContent(
      '<p style="font-size:11px;color:#ff0000;background-color:#222;margin:40px">x</p>',
    );
    expect(result).toContain("font-size:11px");
    expect(result).toContain("color:#ff0000");
    expect(result).toContain("background-color:#222");
    expect(result).toContain("margin:40px");
  });

  it("class / id / title 을 보존한다", () => {
    const result = sanitizeRawContent('<section class="hero card" id="intro" title="t">x</section>');
    expect(result).toContain('class="hero card"');
    expect(result).toContain('id="intro"');
    expect(result).toContain("<section");
  });

  it("<style> 태그와 CSS 텍스트를 원형 보존한다 (엔티티 이스케이프 없음)", () => {
    const result = sanitizeRawContent("<style>div > p{color:red}</style><p>x</p>");
    expect(result).toContain("<style>");
    expect(result).toContain("div > p{color:red}");
  });

  it("CSS 안 </style><script> 브레이크아웃이 실행 코드로 살아남지 않는다", () => {
    const result = sanitizeRawContent('<style>p{content:"</style><script>alert(1)</script>"}</style>');
    expect(result).not.toContain("<script");
  });

  it("script/form/object/svg 는 여전히 차단", () => {
    const result = sanitizeRawContent(
      '<p>x</p><script>alert(1)</script><form><input value="a"><button>b</button></form><object data="x"></object><svg onload="x()"></svg>',
    );
    expect(result).not.toContain("<script");
    expect(result).not.toContain("<form");
    expect(result).not.toContain("<input");
    expect(result).not.toContain("<object");
    expect(result).not.toContain("<svg");
  });

  it("on* 핸들러와 javascript: 스킴은 제거", () => {
    const result = sanitizeRawContent('<p onclick="x()">a</p><a href="javascript:alert(1)">b</a>');
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("javascript:");
  });

  it("style 속성의 expression( 류 위험 패턴은 스크럽", () => {
    const result = sanitizeRawContent('<p style="width:expression(alert(1));color:blue">x</p>');
    expect(result).not.toMatch(/expression\s*\(/i);
    expect(result).toContain("color:blue");
  });

  it("h5/pre/mark 등 defaults 태그 + 래퍼 마커 속성 생존", () => {
    const result = sanitizeRawContent(
      '<div data-raw-html="a1b2c3d4" contenteditable="false"><h5>t</h5><pre>c</pre><mark>m</mark></div>',
    );
    expect(result).toContain('data-raw-html="a1b2c3d4"');
    expect(result).toContain('contenteditable="false"');
    expect(result).toContain("<h5>");
    expect(result).toContain("<pre>");
    expect(result).toContain("<mark>");
  });

  it("iframe 호스트 화이트리스트와 data: 이미지 차단은 표준과 동일", () => {
    const result = sanitizeRawContent(
      '<iframe src="https://evil.example.com/x"></iframe><img src="data:image/png;base64,AAAA">',
    );
    expect(result).not.toContain("evil.example.com");
    expect(result).not.toContain("data:image/png");
  });
});
