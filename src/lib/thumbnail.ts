/**
 * 썸네일 URL이 실제로 유효한 이미지인지 확인
 * placeholder 경로나 빈 문자열은 무효로 처리
 */
export function isValidThumbnail(thumbnail: string | undefined | null): boolean {
  if (!thumbnail) return false;
  if (thumbnail.includes("placeholder")) return false;
  return true;
}
