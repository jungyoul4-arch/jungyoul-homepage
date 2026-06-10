// 업로드 이미지의 실제 바이트 시그니처(매직넘버)로 MIME 을 판별한다.
// 클라이언트가 보낸 file.type 은 위조 가능하므로, 저장 전 내용 기반으로 교차검증한다.
// 지원: JPEG, PNG, GIF, WebP. 판별 불가 시 null.
export type DetectedImageMime = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export function detectImageMime(buffer: ArrayBuffer): DetectedImageMime | null {
  const b = new Uint8Array(buffer);
  if (b.length < 12) return null;

  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) {
    return "image/png";
  }

  // GIF: 47 49 46 38 ("GIF8")
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "image/gif";

  // WebP: "RIFF" .... "WEBP" (52 49 46 46 / 57 45 42 50 at offset 8)
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}
