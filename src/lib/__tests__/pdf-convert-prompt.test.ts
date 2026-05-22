import { describe, it, expect } from "vitest";
import {
  PDF_CONVERT_MAX_TOKENS,
  PDF_CONVERT_TOOL,
  extractToolUseBlocks,
  parsePdfConvertResponse,
  type AnthropicContentBlock,
} from "../pdf-convert-prompt";

describe("PDF_CONVERT_MAX_TOKENS", () => {
  // 회귀 가드 — 8k/16k 로 내려가면 표·본문이 함께 큰 페이지에서 응답 잘림 회귀가 다시 발생.
  // 16k 가 부족했던 사례: commit 111f990 직후 더 큰 PDF 페이지에서 truncated + empty 동시 발생(2026-05-22).
  it("is at least 32000 to avoid mid-response truncation on large pages", () => {
    expect(PDF_CONVERT_MAX_TOKENS).toBeGreaterThanOrEqual(32000);
  });
});

describe("extractToolUseBlocks", () => {
  it("returns empty result for empty content", () => {
    const result = extractToolUseBlocks([]);
    expect(result.blocks).toEqual([]);
    expect(result.dropped).toBe(0);
  });

  it("extracts valid blocks from a tool_use response", () => {
    const content: AnthropicContentBlock[] = [
      {
        type: "tool_use",
        name: PDF_CONVERT_TOOL.name,
        input: {
          blocks: [
            { type: "h1", html: "<h1>제목</h1>" },
            { type: "p", html: "<p>본문</p>" },
            { type: "table", html: "<table><tbody><tr><td>셀</td></tr></tbody></table>" },
          ],
        },
      },
    ];
    const result = extractToolUseBlocks(content);
    expect(result.blocks).toHaveLength(3);
    expect(result.blocks[0]).toEqual({ type: "h1", html: "<h1>제목</h1>" });
    expect(result.dropped).toBe(0);
  });

  it("ignores non-tool_use entries silently (no drop counted)", () => {
    const content: AnthropicContentBlock[] = [
      { type: "text", text: "should be ignored" },
      {
        type: "tool_use",
        name: PDF_CONVERT_TOOL.name,
        input: { blocks: [{ type: "p", html: "<p>ok</p>" }] },
      },
    ];
    const result = extractToolUseBlocks(content);
    expect(result.blocks).toHaveLength(1);
    expect(result.dropped).toBe(0);
  });

  it("counts a block missing `html` as dropped", () => {
    const content: AnthropicContentBlock[] = [
      {
        type: "tool_use",
        name: PDF_CONVERT_TOOL.name,
        input: {
          blocks: [
            { type: "p", html: "<p>ok</p>" },
            { type: "p" }, // html 누락 — max_tokens 잘림 시뮬레이션
          ],
        },
      },
    ];
    const result = extractToolUseBlocks(content);
    expect(result.blocks).toHaveLength(1);
    expect(result.dropped).toBe(1);
  });

  it("counts a block missing `type` as dropped", () => {
    const content: AnthropicContentBlock[] = [
      {
        type: "tool_use",
        name: PDF_CONVERT_TOOL.name,
        input: {
          blocks: [
            { html: "<p>no type</p>" },
            { type: "p", html: "<p>ok</p>" },
          ],
        },
      },
    ];
    const result = extractToolUseBlocks(content);
    expect(result.blocks).toHaveLength(1);
    expect(result.dropped).toBe(1);
  });

  it("counts a block with disallowed `type` enum as dropped", () => {
    const content: AnthropicContentBlock[] = [
      {
        type: "tool_use",
        name: PDF_CONVERT_TOOL.name,
        input: {
          blocks: [
            { type: "div", html: "<div>not allowed</div>" },
            { type: "p", html: "<p>ok</p>" },
          ],
        },
      },
    ];
    const result = extractToolUseBlocks(content);
    expect(result.blocks).toHaveLength(1);
    expect(result.dropped).toBe(1);
  });

  it("counts a non-object item as dropped", () => {
    const content: AnthropicContentBlock[] = [
      {
        type: "tool_use",
        name: PDF_CONVERT_TOOL.name,
        input: {
          blocks: [null, "not-an-object", { type: "p", html: "<p>ok</p>" }],
        },
      },
    ];
    const result = extractToolUseBlocks(content);
    expect(result.blocks).toHaveLength(1);
    expect(result.dropped).toBe(2);
  });

  it("returns empty result when input.blocks is not an array", () => {
    const content: AnthropicContentBlock[] = [
      {
        type: "tool_use",
        name: PDF_CONVERT_TOOL.name,
        input: { blocks: "not-an-array" },
      },
    ];
    const result = extractToolUseBlocks(content);
    expect(result.blocks).toEqual([]);
    // 배열 자체가 없으면 항목별 폐기 카운트도 불가 — 0
    expect(result.dropped).toBe(0);
  });
});

describe("parsePdfConvertResponse (text fallback)", () => {
  it("parses a clean JSON response", () => {
    const raw = JSON.stringify({
      blocks: [{ type: "h1", html: "<h1>제목</h1>" }],
    });
    const result = parsePdfConvertResponse(raw);
    expect(result.blocks).toEqual([{ type: "h1", html: "<h1>제목</h1>" }]);
  });

  it("strips ```json``` fences", () => {
    const raw = '```json\n{"blocks":[{"type":"p","html":"<p>본문</p>"}]}\n```';
    const result = parsePdfConvertResponse(raw);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].type).toBe("p");
  });

  it("returns a single fallback paragraph block when JSON is invalid", () => {
    const result = parsePdfConvertResponse("this is not json at all");
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].type).toBe("p");
    expect(result.blocks[0].html).toContain("추출 실패");
  });
});
