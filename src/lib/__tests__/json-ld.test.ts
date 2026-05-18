import { describe, it, expect } from "vitest";
import { renderJsonLd } from "../json-ld";

describe("renderJsonLd", () => {
  it("returns an object with __html property", () => {
    const result = renderJsonLd({ type: "Article" });
    expect(result).toHaveProperty("__html");
  });

  it("escapes < to \\u003c to prevent XSS", () => {
    const schema = { script: "<script>alert(1)</script>" };
    const result = renderJsonLd(schema);
    expect(result.__html).not.toContain("<");
    expect(result.__html).toContain("\\u003c");
  });

  it("preserves valid JSON structure after escaping", () => {
    const schema = { name: "정율", url: "https://example.com" };
    const result = renderJsonLd(schema);
    const parsed = JSON.parse(result.__html);
    expect(parsed).toEqual(schema);
  });

  it("handles nested objects with angle brackets", () => {
    const schema = { html: "<b>bold</b>", nested: { tag: "<img>" } };
    const result = renderJsonLd(schema);
    expect(result.__html).not.toContain("<");
  });

  it("handles arrays", () => {
    const schema = ["<item>", "safe"];
    const result = renderJsonLd(schema);
    expect(result.__html).not.toContain("<");
    expect(result.__html).toContain("\\u003c");
  });
});
