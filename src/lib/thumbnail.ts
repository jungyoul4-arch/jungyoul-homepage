/**
 * 썸네일 URL이 실제로 유효한 이미지인지 확인
 * placeholder 경로나 빈 문자열은 무효로 처리
 */
export function isValidThumbnail(thumbnail: string | undefined | null): boolean {
  if (!thumbnail) return false;
  if (thumbnail.includes("placeholder")) return false;
  return true;
}

// ── 표시 크기에 맞는 이미지 변형(responsive) 지원 ──
// 카드(약 328~720px)가 1920px 원본을 그대로 디코드/컴포지팅하던 비용을 줄이기 위해,
// 업로드 서빙 라우트가 `?w=` 로 사전 생성된 webp 변형(`{base}@{w}.webp`)을 서빙한다.
// 변형이 없으면 원본으로 폴백하므로(404 금지) 변형 생성 전에도 안전하다.

/** 허용 변형 폭. 서빙 라우트(?w)·thumbSrc()·재압축 스크립트·테스트가 공유하는 단일 소스. */
export const THUMB_WIDTHS = [640, 1280] as const;
export type ThumbWidth = (typeof THUMB_WIDTHS)[number];

export function isThumbWidth(w: number): w is ThumbWidth {
  return (THUMB_WIDTHS as readonly number[]).includes(w);
}

/**
 * 업로드 서빙 경로(`/api/admin|community/upload/...`)에 한해 `?w=` 변형 요청을 부착한다.
 * 외부 URL(YouTube 등)·빈 값·이미 쿼리가 있는 경우는 원본 그대로 둔다.
 */
export function thumbSrc(thumbnail: string | undefined | null, w: ThumbWidth): string {
  if (!thumbnail) return thumbnail ?? "";
  if (!isThumbWidth(w)) return thumbnail;
  const isUpload =
    thumbnail.startsWith("/api/admin/upload/") ||
    thumbnail.startsWith("/api/community/upload/");
  if (!isUpload || thumbnail.includes("?")) return thumbnail;
  return `${thumbnail}?w=${w}`;
}

/**
 * R2 원본 키 → 변형 키. `2026/06/x.jpg` + 640 → `2026/06/x@640.webp`.
 * 변형은 항상 webp 로 생성/저장한다. (파일명 안의 확장자만 치환, 디렉터리의 점은 보존)
 */
export function variantObjectKey(objectKey: string, w: ThumbWidth): string {
  const slash = objectKey.lastIndexOf("/");
  const dot = objectKey.lastIndexOf(".");
  const base = dot > slash ? objectKey.slice(0, dot) : objectKey;
  return `${base}@${w}.webp`;
}
