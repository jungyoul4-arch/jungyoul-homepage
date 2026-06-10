// 클라이언트 업로드 전 이미지 다운스케일/재압축 유틸.
//
// 목적: 어드민/커뮤니티에서 카메라 원본(수 MB~수십 MB)을 그대로 R2 에 올리던 것을
// 브라우저 canvas 로 미리 축소해 전송량·저장량을 줄인다. (체감 저하의 주범이던
// 16.5MB / 27MB 썸네일 방지 — docs/mistake-log 및 성능 진단 참조)
//
// 설계 원칙(안전 우선):
//  - 포맷 보존: png→png(무손실), jpeg→jpeg, webp→webp. 로고(투명 png)·파비콘
//    생성(next/og, 로고 png 가정)을 깨지 않기 위해 webp 강제 변환은 하지 않는다.
//    (기존 대용량 원본의 webp 전환은 서버측 일괄 재압축 스크립트에서 처리)
//  - gif(애니메이션)·svg·디코드 불가·알 수 없는 타입은 원본 그대로 통과.
//  - 어떤 단계든 실패하면 원본 File 을 반환(업로드 자체는 항상 진행).
//  - 축소가 불필요(이미 작은 이미지)하거나 재인코딩 결과가 더 커지면 원본 유지.

import { aspectMatches, coverCropRect, type CoverCrop } from "@/lib/image-crop";

export interface ResizeOptions {
  /** 긴 변 최대 픽셀. 이보다 크면 비율 유지 축소. 기본 1920. */
  maxEdge?: number;
  /** 손실 포맷(jpeg/webp) 품질 0~1. 기본 0.82. png 는 무시(무손실). */
  quality?: number;
  /**
   * 목표 종횡비(w/h). 지정 시 센터 크롭으로 비율을 강제한다(16:9 카드용).
   * 원본 비율이 이미 ~1% 이내면 크롭 생략. gif/svg 통과·실패 시 원본 반환
   * 원칙은 유지 — 그 경우 서버 변형(thumbAspect fit:cover)이 비율을 보강한다.
   */
  aspect?: number;
}

const REENCODABLE = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function resizeImageFile(
  file: File,
  opts: ResizeOptions = {},
): Promise<File> {
  const maxEdge = opts.maxEdge ?? 1920;
  const quality = opts.quality ?? 0.82;

  // 재인코딩 대상이 아닌 타입(gif/svg/기타)은 손대지 않는다.
  if (!REENCODABLE.has(file.type)) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // 디코드 실패 → 원본 업로드
  }

  try {
    const { width, height } = bitmap;
    // 비율 강제가 필요한가 — 이미 목표 비율(~1% 이내)이면 일반 축소 경로로 처리.
    const needsCrop =
      opts.aspect != null && !aspectMatches(width, height, opts.aspect);
    const longest = Math.max(width, height);
    const scale = longest > maxEdge ? maxEdge / longest : 1;

    // 축소 불필요 + 이미 충분히 작으면(≤400KB) 재인코딩 없이 원본 사용.
    // 단, 크롭이 필요한 경우에는 fast-path 금지(반드시 재인코딩).
    if (!needsCrop && scale === 1 && file.size <= 400 * 1024) return file;

    const rect: CoverCrop = needsCrop
      ? coverCropRect(width, height, opts.aspect as number, maxEdge)
      : {
          sx: 0,
          sy: 0,
          sw: width,
          sh: height,
          outW: Math.max(1, Math.round(width * scale)),
          outH: Math.max(1, Math.round(height * scale)),
        };

    const canvas = document.createElement("canvas");
    canvas.width = rect.outW;
    canvas.height = rect.outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    // 9-인자 drawImage — 센터 크롭 영역(sx,sy,sw,sh)을 출력 크기로 그린다.
    ctx.drawImage(bitmap, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, rect.outW, rect.outH);

    const outType = file.type; // 포맷 보존
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(
        (b) => resolve(b),
        outType,
        outType === "image/png" ? undefined : quality,
      ),
    );
    if (!blob) return file;

    // 재인코딩이 오히려 커졌고 축소도 없었다면 원본 유지(주로 png 무손실 재인코딩).
    // 크롭 결과는 더 커져도 반드시 채택(비율 강제가 목적).
    if (blob.size >= file.size && scale === 1 && !needsCrop) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    const ext =
      outType === "image/png" ? "png" : outType === "image/webp" ? "webp" : "jpg";
    return new File([blob], `${base}.${ext}`, { type: outType });
  } catch {
    return file;
  } finally {
    bitmap.close?.();
  }
}
