// PDF 파일을 페이지 단위 PNG Blob 배열로 변환.
// - pdfjs-dist 는 동적 import 로만 로드 (어드민 본문 에디터에서만 필요).
// - 워커는 /public/pdfjs/pdf.worker.min.mjs (legacy 빌드) 를 정적 자산으로 서빙.
// - scale 2.0 ≈ 192dpi: A4 297mm 기준 약 2240px 너비. 가독성/용량 균형.

export interface PdfRenderOptions {
  scale?: number;
  // 문서 로드 후 페이지 수가 확정되는 시점. false 반환 시 변환을 중단(빈 배열 반환).
  // 호출자에서 사용자 확인(예: 30 페이지 초과) 또는 사전 검증에 활용.
  onStart?: (total: number) => boolean | Promise<boolean>;
  onProgress?: (done: number, total: number) => void;
}

export async function pdfToPngBlobs(
  file: File,
  opts: PdfRenderOptions = {},
): Promise<Blob[]> {
  const { scale = 2.0, onStart, onProgress } = opts;

  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const total = pdf.numPages;

  if (onStart) {
    const proceed = await onStart(total);
    if (!proceed) {
      await pdf.cleanup();
      await pdf.destroy();
      return [];
    }
  }

  const blobs: Blob[] = [];

  for (let i = 1; i <= total; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D 컨텍스트를 가져올 수 없습니다.");

    await page.render({ canvasContext: ctx, viewport }).promise;
    page.cleanup();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png"),
    );
    canvas.width = 0;
    canvas.height = 0;

    if (!blob) throw new Error(`페이지 ${i} 를 PNG 로 변환하지 못했습니다.`);
    blobs.push(blob);
    onProgress?.(i, total);
  }

  await pdf.cleanup();
  await pdf.destroy();
  return blobs;
}
