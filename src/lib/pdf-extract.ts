"use client";

/**
 * 클라이언트 전용 PDF.js 래퍼.
 *
 * - pdfjs-dist 는 server bundle/Workers 런타임에서 폰트·canvas API 미지원으로 import 만 해도 깨진다.
 *   → 반드시 dynamic import 로 client chunk 에 격리한다.
 * - worker URL 은 `new URL(...)` 패턴으로 Next/Turbopack 가 client asset 으로 emit 하게 한다.
 *
 * 외부에서는 이 모듈을 client component 안에서만 import 할 것.
 */

type PdfjsModule = typeof import("pdfjs-dist");
type PDFDocumentProxy = import("pdfjs-dist").PDFDocumentProxy;
type TextItem = import("pdfjs-dist/types/src/display/api").TextItem;

let cached: PdfjsModule | null = null;

async function getPdfjs(): Promise<PdfjsModule> {
  if (cached) return cached;
  const mod = await import("pdfjs-dist");
  // Turbopack/webpack5 가 worker 를 client chunk 로 emit 하게 한다 — runtime 에 별도 다운로드 불필요.
  mod.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  cached = mod;
  return mod;
}

export async function loadPdf(file: File): Promise<PDFDocumentProxy> {
  const pdfjs = await getPdfjs();
  const buf = await file.arrayBuffer();
  const task = pdfjs.getDocument({ data: buf });
  return task.promise;
}

export interface PageRaster {
  /** base64 인코딩된 JPEG (data:URL prefix 제외) — 서버 LLM 변환에 직접 사용 */
  jpegBase64: string;
  /** `data:image/jpeg;base64,...` 전체 — `<img src>` 로 즉시 미리보기에 사용 */
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * 페이지를 raster 로 렌더.
 *
 * - 가로 maxWidth 픽셀 이내로 scale 산정 (vision LLM 의 이미지 한도와 모바일 캔버스 메모리 제약 절충).
 * - JPEG 0.85 — 본문 figure 로 삽입되어도 충분한 가독성, 페이지당 ≈ 300~800KB.
 */
export async function renderPageRaster(
  pdf: PDFDocumentProxy,
  pageNum: number,
  maxWidth = 1600,
): Promise<PageRaster> {
  const page = await pdf.getPage(pageNum);
  const naturalViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(maxWidth / naturalViewport.width, 2);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D 컨텍스트를 만들 수 없습니다");

  // 흰 배경 보장 (투명 PDF → JPEG 변환 시 검은 배경 회피)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport }).promise;

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const commaIdx = dataUrl.indexOf(",");
  const jpegBase64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : "";

  return { jpegBase64, dataUrl, width: canvas.width, height: canvas.height };
}

export interface PageTextItem {
  str: string;
  /** PDF 좌표계 (왼쪽 아래 원점). y 는 viewport.height - transform[5] 로 위쪽 원점으로 변환되어 들어옴. */
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
}

export async function extractPageText(
  pdf: PDFDocumentProxy,
  pageNum: number,
): Promise<{ items: PageTextItem[]; joined: string }> {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();

  const items: PageTextItem[] = [];
  for (const it of content.items) {
    if (!("str" in it)) continue; // marked-content 등 제외
    const t = it as TextItem;
    const transform = t.transform ?? [1, 0, 0, 1, 0, 0];
    items.push({
      str: t.str,
      x: transform[4] ?? 0,
      y: viewport.height - (transform[5] ?? 0),
      width: t.width ?? 0,
      height: t.height ?? 0,
      fontSize: Math.hypot(transform[0] ?? 0, transform[1] ?? 0),
    });
  }

  // LLM 보조 입력용 단순 join — 자연 독서 순으로 정렬 후 줄바꿈 분리는 LLM 에 맡긴다.
  // (좌표 기반 라인 클러스터링은 휴리스틱 정확도가 낮아 보조용으로는 단순 join 이 더 안정적)
  const joined = items
    .map((i) => i.str)
    .filter((s) => s.length > 0)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return { items, joined };
}

export async function extractPageMeta(
  pdf: PDFDocumentProxy,
  pageNum: number,
): Promise<{ width: number; height: number }> {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1 });
  return { width: viewport.width, height: viewport.height };
}
