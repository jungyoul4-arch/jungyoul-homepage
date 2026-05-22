/**
 * 어드민 PDF→본문 HTML 추출 도구의 Claude 비전 프롬프트.
 *
 * 출력 정책은 `src/lib/sanitize.ts` 의 화이트리스트와 정렬되어 있다.
 * 새 태그/스타일을 허용하려면 양쪽 모두 갱신해야 한다.
 */

export type PdfBlockType =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "p"
  | "table"
  | "figure"
  | "ul"
  | "ol"
  | "blockquote";

export interface PdfBlock {
  type: PdfBlockType;
  html: string;
}

export interface PdfConvertResult {
  blocks: PdfBlock[];
}

export const PDF_CONVERT_MODEL = "claude-sonnet-4-6";

// 표가 다수 들어간 페이지는 출력 토큰이 빠르게 늘어 4000 으로는 응답이 잘려 JSON 이 깨졌다.
// tool_use 로 구조화 출력을 강제하더라도 max_tokens 초과 시 부분 결과가 도착하므로 여유 마진을 둠.
export const PDF_CONVERT_MAX_TOKENS = 8000;

/** LLM 이 figure src 자리에 출력하는 마커. 서버가 페이지 raster R2 URL 로 치환. */
export const PAGE_RASTER_MARKER = "__PAGE_RASTER__";

/**
 * Claude tool_use 로 구조화 출력을 강제하기 위한 도구 정의.
 *
 * 텍스트 JSON 출력 시 본문 내 `"` escape 누락·max_tokens 잘림으로 JSON.parse 가 깨지는 회귀가 있었다.
 * tool_use 는 input 객체로 직렬화되어 도착하므로 escape/truncate 양쪽에 견고하다.
 */
export const PDF_CONVERT_TOOL = {
  name: "emit_blocks",
  description:
    "PDF 페이지를 본문 기사에 그대로 붙여 넣을 수 있는 HTML 블록 배열로 분해해 전달. type 은 블록 최상위 태그명과 정확히 일치해야 함.",
  input_schema: {
    type: "object" as const,
    properties: {
      blocks: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            type: {
              type: "string" as const,
              enum: ["h1", "h2", "h3", "h4", "p", "table", "figure", "ul", "ol", "blockquote"],
              description: "블록의 최상위 HTML 태그 이름",
            },
            html: {
              type: "string" as const,
              description: "해당 블록 1개의 완전한 HTML 문자열. 선두/말미 공백·줄바꿈 없이.",
            },
          },
          required: ["type", "html"],
        },
      },
    },
    required: ["blocks"],
  },
} as const;

export const PDF_CONVERT_SYSTEM_PROMPT = `당신은 한국 교육 미디어 어드민용 PDF→HTML 추출 어시스턴트입니다.
주어진 PDF 페이지(이미지 + 클라이언트 텍스트 추출 결과)를 본문 기사에 그대로 붙여 넣을 수 있는 HTML 블록들로 분해하세요.

# 허용 태그(이외 사용 금지)
<h1> <h2> <h3> <h4> <p> <table> <thead> <tbody> <tr> <th> <td>
<figure> <figcaption> <img> <ul> <ol> <li> <blockquote> <span>
<strong> <em> <br>

# 금지
- inline style 의 color / background-color / font-size / font-weight / font-family / line-height / letter-spacing 등 (sanitize 에서 제거됩니다)
  · 강조는 반드시 <strong> 또는 <em> 만 사용
  · 표 셀의 색상 강조도 텍스트의 <strong> 으로 변환 (예: 빨강 텍스트 "최상" → <strong>최상</strong>)
- <div> <section> <article> <nav> <aside> <header> <footer> <main> 등 컨테이너 태그
- MathML, LaTeX, KaTeX 등 수식 마크업
- 마크다운(\`\`\`html 펜스 포함), 설명 문장, 사과문

# 표 규칙
- 머리행은 <thead><tr><th>...</th></tr></thead>
- 본문 행은 <tbody><tr><td>...</td></tr></tbody>
- 셀 안 줄바꿈은 <br>
- 병합 셀은 colspan / rowspan 속성 사용 (값은 숫자만)
- 시각화 안전망: <table> 에는 style="border-collapse:collapse" 를, 각 <th>/<td> 에는 style="border:1px solid #E0E0E0" 를 부여 (사이트 CSS 와 동일 토큰 — 화이트리스트 안 값이라 sanitize 통과)

# 수식·특수기호
- 유니코드 우선: √ ² ³ ± ≤ ≥ ≠ ≈ ∞ π θ α β γ Σ Π ∫ ∂ ∇ ° ′ ″ × ÷ ∈ ∉ ⊂ ⊃ ∪ ∩ ∧ ∨ ¬ ∀ ∃
- 분수는 (분자)/(분모) 형식 (예: (x+1)/(x-1))
- 첨자: 위첨자 ² ³ ⁴ 등이 없으면 <sup>n</sup>, 아래첨자는 <sub>n</sub> (※ 단, <sup>/<sub> 도 sanitize 화이트리스트에 없으므로 가능하면 ² 같은 유니코드로 변환하고, 정 어려우면 평문 ^n 으로 표기)
- 루트 안 표현은 √(…) 괄호 묶음 (예: √(1 - x²))

# 이미지(그래프·도형·사진)
- 페이지에 그림이 있으면 <figure><img src="${PAGE_RASTER_MARKER}" alt="페이지 설명"><figcaption>설명 한 줄</figcaption></figure>
- src 자리에는 반드시 ${PAGE_RASTER_MARKER} 문자열 그대로 둘 것 (서버가 페이지 raster URL 로 치환)
- 페이지 안에 의미 있는 그림이 없으면 figure 출력을 생략

# 제목 계층
- 페이지 최상단 큰 제목 → <h1> (페이지당 최대 1개)
- 절 제목(1. / 2. / ① / ②) → <h2>
- 소절 제목(가. / 나. / ③) → <h3>
- 더 작은 강조 단락 제목 → <h4>

# 일반 본문
- 단락은 <p> (빈 단락 출력 금지)
- 글머리표(• ·) → <ul><li>
- 번호 매기기 (1) 2) 또는 가. 나.) → <ol><li>
- 인용·박스 강조 → <blockquote>

# 출력 방식 (필수)
응답은 반드시 \`emit_blocks\` 도구를 호출해 전달하세요. 일반 텍스트·마크다운·코드펜스·인사·설명은 절대 출력하지 않습니다.

- \`blocks\` 배열의 각 항목은 {type, html} 두 필드만 포함.
- \`type\` 은 그 블록의 최상위 태그 이름과 정확히 일치해야 합니다 (h1|h2|h3|h4|p|table|figure|ul|ol|blockquote).
- \`html\` 은 해당 블록 1개의 HTML (선두/말미 공백·줄바꿈 없이). 여러 단락은 각각의 blocks 항목으로 분리.
- blocks 배열의 순서는 페이지 위→아래 자연 독서 순서.
`;

export function buildUserMessageText(args: { pageNumber: number; pageText: string }): string {
  const trimmed = args.pageText.slice(0, 50_000);
  return `페이지 번호: ${args.pageNumber}

# 클라이언트 PDF.js 가 추출한 텍스트 (참고용, 순서·정확도는 100% 보장되지 않음)
${trimmed || "(빈 페이지이거나 텍스트 추출 실패)"}

위 페이지 이미지를 기준으로, 시스템 지시에 따라 \`emit_blocks\` 도구를 호출해 결과를 전달하세요.`;
}

/** Anthropic Messages API 응답 content 배열의 항목(tool_use / text). 필요한 필드만. */
export interface AnthropicContentBlock {
  type: string;
  text?: string;
  name?: string;
  input?: unknown;
}

/**
 * tool_use 응답에서 emit_blocks 의 input.blocks 를 추출 + 검증.
 * 정상 경로. 결과가 빈 배열이면 호출자가 텍스트 폴백을 시도하도록 한다.
 */
export function extractToolUseBlocks(content: readonly AnthropicContentBlock[]): PdfBlock[] {
  const out: PdfBlock[] = [];
  for (const c of content) {
    if (c.type !== "tool_use" || c.name !== PDF_CONVERT_TOOL.name) continue;
    const input = c.input;
    if (!input || typeof input !== "object") continue;
    const blocksUnknown = (input as { blocks?: unknown }).blocks;
    if (!Array.isArray(blocksUnknown)) continue;
    for (const item of blocksUnknown) {
      if (!item || typeof item !== "object") continue;
      const t = (item as { type?: unknown }).type;
      const h = (item as { html?: unknown }).html;
      if (typeof t !== "string" || typeof h !== "string") continue;
      if (!isPdfBlockType(t)) continue;
      out.push({ type: t, html: h });
    }
  }
  return out;
}

/**
 * 보조 폴백 — tool_use 가 비어 있고 text 응답이 도착한 예외 케이스용.
 * 코드펜스/잡설 방어 후 JSON.parse. 실패 시 raw 노출 없이 단순 안내 메시지를 반환.
 */
export function parsePdfConvertResponse(raw: string): PdfConvertResult {
  let body = raw.trim();

  // ```json ... ``` 또는 ``` ... ``` 펜스 제거
  const fence = body.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) body = fence[1].trim();

  // 최외곽 { ... } 추출 (응답 앞뒤로 잡설이 섞이는 경우 방어)
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start >= 0 && end > start) {
    body = body.slice(start, end + 1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { blocks: [{ type: "p", html: FALLBACK_FAILURE_HTML }] };
  }

  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { blocks?: unknown }).blocks)) {
    return { blocks: [{ type: "p", html: FALLBACK_FAILURE_HTML }] };
  }

  const out: PdfBlock[] = [];
  for (const item of (parsed as { blocks: unknown[] }).blocks) {
    if (!item || typeof item !== "object") continue;
    const t = (item as { type?: unknown }).type;
    const h = (item as { html?: unknown }).html;
    if (typeof t !== "string" || typeof h !== "string") continue;
    if (!isPdfBlockType(t)) continue;
    out.push({ type: t, html: h });
  }
  if (out.length === 0) {
    return { blocks: [{ type: "p", html: FALLBACK_FAILURE_HTML }] };
  }
  return { blocks: out };
}

const FALLBACK_FAILURE_HTML = "<p>[추출 실패: 응답을 해석하지 못했습니다. 페이지를 다시 변환하거나 다른 페이지를 시도하세요.]</p>";

function isPdfBlockType(t: string): t is PdfBlockType {
  return ["h1", "h2", "h3", "h4", "p", "table", "figure", "ul", "ol", "blockquote"].includes(t);
}
