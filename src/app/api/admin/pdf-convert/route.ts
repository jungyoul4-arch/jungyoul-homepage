import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireAdmin } from "@/lib/admin-auth";
import { sanitizeContent } from "@/lib/sanitize";
import {
  PDF_CONVERT_MODEL,
  PDF_CONVERT_MAX_TOKENS,
  PDF_CONVERT_SYSTEM_PROMPT,
  PAGE_RASTER_MARKER,
  buildUserMessageText,
  parsePdfConvertResponse,
  type PdfBlock,
} from "@/lib/pdf-convert-prompt";

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

  const client = new Anthropic({ apiKey });

  let response;
  try {
    response = await client.messages.create({
      model: PDF_CONVERT_MODEL,
      max_tokens: PDF_CONVERT_MAX_TOKENS,
      system: PDF_CONVERT_SYSTEM_PROMPT,
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
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json({ error: `LLM 호출 실패: ${message}` }, { status: 502 });
  }

  const rawText = response.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("\n");

  const parsed = parsePdfConvertResponse(rawText);

  // figure src=__PAGE_RASTER__ 가 하나라도 있으면 페이지 raster 를 R2 에 영구 저장하고 마커를 영구 URL 로 치환.
  // 본문에 실제로 삽입되지 않는 페이지의 raster 는 영구 저장 안 됨 — LLM 이 figure 를 출력한 페이지만 비용 발생.
  const needsRaster = parsed.blocks.some((b) => b.html.includes(PAGE_RASTER_MARKER));
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
  const cleanedBlocks: PdfBlock[] = parsed.blocks.map((b) => {
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
    usage: response.usage,
    rasterUploaded: !!rasterUrl,
  });

  return NextResponse.json({
    blocks: cleanedBlocks,
    usage: response.usage,
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
