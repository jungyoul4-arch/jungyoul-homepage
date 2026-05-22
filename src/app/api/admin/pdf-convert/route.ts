import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireAdmin } from "@/lib/admin-auth";
import { sanitizeContent } from "@/lib/sanitize";
import {
  PDF_CONVERT_MODEL,
  PDF_CONVERT_MAX_TOKENS,
  PDF_CONVERT_SYSTEM_PROMPT,
  PDF_CONVERT_TOOL,
  PAGE_RASTER_MARKER,
  buildUserMessageText,
  extractToolUseBlocks,
  parsePdfConvertResponse,
  type AnthropicContentBlock,
  type PdfBlock,
} from "@/lib/pdf-convert-prompt";

// Anthropic Messages API 직접 호출 응답 형태 (필요한 필드만).
// SDK 우회 이유: anthropics/anthropic-sdk-typescript#932 — 대용량 base64 이미지를 SDK 의
// 내부 toBase64 round-trip 이 Cloudflare Workers 에서 RangeError(stack overflow) 로 throw.
// 우리는 1600px JPEG (≈1MB) 를 매 페이지마다 보내므로 정확히 트리거 조건에 들어맞아 raw fetch 로 우회.
interface AnthropicMessagesResponse {
  content: AnthropicContentBlock[];
  usage?: { input_tokens: number; output_tokens: number };
  stop_reason?: string;
}

// base64 약 11MB 까지만 허용 (8MB raw 이미지 ≈ base64 11MB). Anthropic 이미지 한도(5MB)를 클라이언트 측에서
// 더 보수적으로 깎아 보내야 하지만, 서버에서도 백스톱.
const MAX_BASE64_LEN = 11 * 1024 * 1024;
const MAX_PAGE_TEXT_LEN = 50_000;

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문" }, { status: 400 });
  }

  const { pageImageBase64, pageText, pageNumber } = (body as {
    pageImageBase64?: unknown;
    pageText?: unknown;
    pageNumber?: unknown;
  }) ?? {};

  if (typeof pageImageBase64 !== "string" || pageImageBase64.length === 0) {
    return NextResponse.json({ error: "pageImageBase64 가 필요합니다" }, { status: 400 });
  }
  if (pageImageBase64.length > MAX_BASE64_LEN) {
    return NextResponse.json(
      { error: `페이지 이미지가 너무 큽니다 (${(pageImageBase64.length / 1024 / 1024).toFixed(1)}MB / 한도 11MB)` },
      { status: 413 },
    );
  }
  const safeText =
    typeof pageText === "string" ? pageText.slice(0, MAX_PAGE_TEXT_LEN) : "";
  const safePageNumber =
    typeof pageNumber === "number" && Number.isFinite(pageNumber) ? pageNumber : 1;

  const { env } = await getCloudflareContext({ async: true });
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "PDF 변환 기능이 설정되지 않았습니다 (ANTHROPIC_API_KEY 미설정)" },
      { status: 503 },
    );
  }

  let apiJson: AnthropicMessagesResponse;
  try {
    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: PDF_CONVERT_MODEL,
        max_tokens: PDF_CONVERT_MAX_TOKENS,
        system: PDF_CONVERT_SYSTEM_PROMPT,
        // tool_use 로 구조화 출력 강제. tool_choice 로 emit_blocks 호출을 의무화하여
        // 표 셀의 본문 따옴표 escape 실패·max_tokens 초과 잘림으로 JSON.parse 가 깨지던 경로를 제거.
        tools: [PDF_CONVERT_TOOL],
        tool_choice: { type: "tool", name: PDF_CONVERT_TOOL.name },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: pageImageBase64,
                },
              },
              {
                type: "text",
                text: buildUserMessageText({ pageNumber: safePageNumber, pageText: safeText }),
              },
            ],
          },
        ],
      }),
    });

    if (!apiRes.ok) {
      const errBody = await apiRes.text();
      return NextResponse.json(
        { error: `LLM 호출 실패: ${apiRes.status} ${errBody.slice(0, 500)}` },
        { status: 502 },
      );
    }

    apiJson = (await apiRes.json()) as AnthropicMessagesResponse;
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json({ error: `LLM 호출 실패: ${message}` }, { status: 502 });
  }

  // 정상 경로: tool_use 응답에서 emit_blocks 의 input.blocks 를 추출.
  let blocks = extractToolUseBlocks(apiJson.content);
  let usedFallback = false;

  // 보조 폴백: tool_use 가 비어 있고 텍스트만 도착한 예외 케이스.
  if (blocks.length === 0) {
    const rawText = apiJson.content
      .filter((c) => c.type === "text" && typeof c.text === "string")
      .map((c) => c.text as string)
      .join("\n");
    if (rawText) {
      blocks = parsePdfConvertResponse(rawText).blocks;
      usedFallback = true;
    }
  }

  // figure src=__PAGE_RASTER__ 가 하나라도 있으면 페이지 raster 를 R2 에 영구 저장하고 마커를 영구 URL 로 치환.
  // 본문에 실제로 삽입되지 않는 페이지의 raster 는 영구 저장 안 됨 — LLM 이 figure 를 출력한 페이지만 비용 발생.
  const needsRaster = blocks.some((b) => b.html.includes(PAGE_RASTER_MARKER));
  let rasterUrl: string | null = null;
  if (needsRaster) {
    try {
      const buf = base64ToArrayBuffer(pageImageBase64);
      const now = new Date();
      const path = `pdf-extract/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
      const random = crypto.randomUUID().slice(0, 8);
      const key = `${path}/${Date.now()}-${random}.jpg`;
      await env.IMAGES_BUCKET.put(key, buf, {
        httpMetadata: { contentType: "image/jpeg" },
      });
      rasterUrl = `/api/admin/upload/${key}`;
    } catch (e) {
      console.warn("[pdf-convert] raster upload failed", e);
    }
  }

  // 마커 치환 + 블록 단위 sanitize. sanitize 가 화이트리스트 외 태그·속성을 1차 차단.
  const cleanedBlocks: PdfBlock[] = blocks.map((b) => {
    let html = b.html;
    if (rasterUrl) {
      html = html.split(PAGE_RASTER_MARKER).join(rasterUrl);
    } else if (html.includes(PAGE_RASTER_MARKER)) {
      // raster URL 을 못 얻은 figure 는 LLM 이 만든 alt/figcaption 만 유지하기 위해 제거하지 않고
      // 마커 자리를 빈 src 로 두면 sanitize 가 제거. 안전하게 figure 자체를 placeholder p 로 폴백.
      html = `<p>[이미지 추출 실패: ${escapeAttr(extractAltOrCaption(html))}]</p>`;
    }
    return { type: b.type, html: sanitizeContent(html) };
  });

  console.info("[pdf-convert]", {
    pageNumber: safePageNumber,
    blocks: cleanedBlocks.length,
    usage: apiJson.usage,
    stopReason: apiJson.stop_reason,
    rasterUploaded: !!rasterUrl,
    usedFallback,
  });

  return NextResponse.json({
    blocks: cleanedBlocks,
    usage: apiJson.usage,
  });
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function extractAltOrCaption(html: string): string {
  const alt = html.match(/alt="([^"]*)"/i)?.[1];
  if (alt) return alt;
  const cap = html.match(/<figcaption[^>]*>([^<]*)<\/figcaption>/i)?.[1];
  return cap?.trim() || "그림";
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
