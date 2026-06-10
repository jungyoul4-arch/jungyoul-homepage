// 썸네일 비율 강제(센터 크롭) 순수 계산 유틸.
//
// 카드(16:9)와 비율이 다른 이미지를 업로드 시점에 센터 크롭으로 맞추기 위한
// 수학만 모아둔 모듈 — DOM/canvas 의존이 없어 클라이언트(image-resize,
// thumbnail-overlay-editor)·서버(upload route 화이트리스트)·vitest 가 공유한다.
// (happy-dom 에는 createImageBitmap/canvas 가 없어 크롭 수학을 분리해 테스트)

/**
 * 업로드 시점 비율 강제를 지원하는 종횡비 화이트리스트.
 * 클라이언트 prop(`aspect="16:9"`) ↔ FormData(`thumbAspect`) ↔ 서버 검증의 단일 소스.
 */
export const THUMB_ASPECTS = { "16:9": 16 / 9 } as const;
export type ThumbAspect = keyof typeof THUMB_ASPECTS;

export interface CoverCrop {
  /** 원본에서 잘라낼 센터 크롭 영역 (drawImage 9-인자 소스 사각형) */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  /** 출력 크기 — 긴 변 ≤ maxEdge 로 축소, 업스케일 없음. 비율은 targetAspect 보장 */
  outW: number;
  outH: number;
}

/**
 * 원본 비율이 target 과 상대 오차 epsilon(기본 1%) 이내인지.
 * 이미 카드 비율인 이미지는 크롭/재인코딩을 건너뛰기 위한 판정.
 */
export function aspectMatches(
  srcW: number,
  srcH: number,
  target: number,
  epsilon = 0.01,
): boolean {
  if (srcW <= 0 || srcH <= 0 || !Number.isFinite(srcW) || !Number.isFinite(srcH)) {
    return false;
  }
  return Math.abs(srcW / srcH - target) / target <= epsilon;
}

/**
 * 원본(srcW×srcH)을 targetAspect 로 센터 크롭하고 긴 변을 maxEdge 이하로
 * 축소하는 사각형/출력 크기를 계산한다.
 *
 * 호출자 주의: srcW/srcH 는 "표시 방향 기준" 치수여야 한다.
 * createImageBitmap(file, { imageOrientation: "from-image" }) 의 width/height,
 * HTMLImageElement 의 naturalWidth/naturalHeight(모던 브라우저는 EXIF 반영) 모두 충족.
 */
export function coverCropRect(
  srcW: number,
  srcH: number,
  targetAspect: number,
  maxEdge = 1920,
): CoverCrop {
  const srcAspect = srcW / srcH;
  let sx: number;
  let sy: number;
  let sw: number;
  let sh: number;
  if (srcAspect > targetAspect) {
    // 원본이 target 보다 옆으로 김 → 좌우를 잘라냄
    sh = srcH;
    sw = Math.max(1, Math.round(srcH * targetAspect));
    sx = Math.round((srcW - sw) / 2);
    sy = 0;
  } else {
    // 원본이 target 보다 세로로 김 → 위아래를 잘라냄
    sw = srcW;
    sh = Math.max(1, Math.round(srcW / targetAspect));
    sx = 0;
    sy = Math.round((srcH - sh) / 2);
  }

  // 업스케일 금지: 크롭 결과가 maxEdge 보다 작으면 그대로 둔다.
  const scale = Math.min(1, maxEdge / Math.max(sw, sh));
  const outW = Math.max(1, Math.round(sw * scale));
  // 높이는 폭에서 재유도해 출력 비율을 정확히 보장 (16:9 → 최대 1920×1080).
  const outH = Math.max(1, Math.round(outW / targetAspect));
  return { sx, sy, sw, sh, outW, outH };
}
