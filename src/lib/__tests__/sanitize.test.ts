import { describe, it, expect } from "vitest";
import { sanitizeContent } from "../sanitize";

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
});
