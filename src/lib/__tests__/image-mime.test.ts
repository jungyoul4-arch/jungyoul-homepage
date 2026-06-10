import { describe, it, expect } from "vitest";
import { detectImageMime } from "../image-mime";

function bufOf(bytes: number[], padTo = 12): ArrayBuffer {
  const arr = new Uint8Array(padTo);
  arr.set(bytes.slice(0, padTo));
  return arr.buffer;
}

describe("detectImageMime", () => {
  it("JPEG(FF D8 FF) 시그니처를 인식한다", () => {
    expect(detectImageMime(bufOf([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
  });

  it("PNG(89 50 4E 47 ...) 시그니처를 인식한다", () => {
    expect(detectImageMime(bufOf([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
  });

  it("GIF(47 49 46 38) 시그니처를 인식한다", () => {
    expect(detectImageMime(bufOf([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBe("image/gif");
  });

  it("WebP(RIFF....WEBP) 시그니처를 인식한다", () => {
    expect(
      detectImageMime(
        bufOf([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50])
      )
    ).toBe("image/webp");
  });

  it("확장자만 이미지인 위조 콘텐츠(HTML 헤더)를 null 로 거부한다", () => {
    // "<!DOCTYPE" 로 시작하는 바이트 — .png 확장자로 위장해도 매직넘버 불일치.
    const html = [0x3c, 0x21, 0x44, 0x4f, 0x43, 0x54, 0x59, 0x50, 0x45, 0x20, 0x68, 0x74];
    expect(detectImageMime(bufOf(html))).toBeNull();
  });

  it("12바이트 미만 버퍼는 null 을 반환한다", () => {
    expect(detectImageMime(new Uint8Array([0xff, 0xd8, 0xff]).buffer)).toBeNull();
  });
});
