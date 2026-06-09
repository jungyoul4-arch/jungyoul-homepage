import { describe, it, expect } from "vitest";
import {
  isValidThumbnail,
  isThumbWidth,
  thumbSrc,
  variantObjectKey,
  THUMB_WIDTHS,
} from "../thumbnail";

describe("isValidThumbnail", () => {
  it("returns false for null", () => {
    expect(isValidThumbnail(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isValidThumbnail(undefined)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidThumbnail("")).toBe(false);
  });

  it("returns false when url contains 'placeholder'", () => {
    expect(isValidThumbnail("/images/placeholder.jpg")).toBe(false);
    expect(isValidThumbnail("placeholder")).toBe(false);
    expect(isValidThumbnail("https://cdn.example.com/placeholder/img.png")).toBe(false);
  });

  it("returns true for a valid absolute URL", () => {
    expect(isValidThumbnail("https://r2.example.com/uploads/photo.jpg")).toBe(true);
  });

  it("returns true for a valid relative path", () => {
    expect(isValidThumbnail("/images/article-cover.webp")).toBe(true);
  });
});

describe("isThumbWidth", () => {
  it("accepts only whitelisted widths", () => {
    expect(isThumbWidth(640)).toBe(true);
    expect(isThumbWidth(1280)).toBe(true);
  });

  it("rejects non-whitelisted / invalid widths", () => {
    expect(isThumbWidth(320)).toBe(false);
    expect(isThumbWidth(641)).toBe(false);
    expect(isThumbWidth(0)).toBe(false);
    expect(isThumbWidth(Number.NaN)).toBe(false);
  });

  it("THUMB_WIDTHS is the single source of allowed widths", () => {
    expect([...THUMB_WIDTHS]).toEqual([640, 1280]);
  });
});

describe("variantObjectKey", () => {
  it("replaces the filename extension with @{w}.webp", () => {
    expect(variantObjectKey("2026/06/x.jpg", 640)).toBe("2026/06/x@640.webp");
    expect(variantObjectKey("2026/06/x.jpeg", 1280)).toBe("2026/06/x@1280.webp");
    expect(variantObjectKey("community/2026/06/abc.png", 640)).toBe(
      "community/2026/06/abc@640.webp",
    );
  });

  it("appends suffix when the filename has no extension", () => {
    expect(variantObjectKey("2026/06/x", 640)).toBe("2026/06/x@640.webp");
  });

  it("does not strip a dot that belongs to a directory, not the filename", () => {
    expect(variantObjectKey("a.b/c", 640)).toBe("a.b/c@640.webp");
  });
});

describe("thumbSrc", () => {
  it("appends ?w= for internal admin upload paths", () => {
    expect(thumbSrc("/api/admin/upload/2026/06/x.jpg", 640)).toBe(
      "/api/admin/upload/2026/06/x.jpg?w=640",
    );
  });

  it("appends ?w= for internal community upload paths", () => {
    expect(thumbSrc("/api/community/upload/community/2026/06/x.jpg", 1280)).toBe(
      "/api/community/upload/community/2026/06/x.jpg?w=1280",
    );
  });

  it("leaves external URLs untouched (e.g. YouTube)", () => {
    const yt = "https://img.youtube.com/vi/abc12345678/hqdefault.jpg";
    expect(thumbSrc(yt, 640)).toBe(yt);
  });

  it("leaves non-upload relative paths untouched", () => {
    expect(thumbSrc("/images/foo.jpg", 640)).toBe("/images/foo.jpg");
  });

  it("does not double up when a query string already exists", () => {
    expect(thumbSrc("/api/admin/upload/x.jpg?v=1", 640)).toBe(
      "/api/admin/upload/x.jpg?v=1",
    );
  });

  it("returns empty string for empty/null/undefined", () => {
    expect(thumbSrc("", 640)).toBe("");
    expect(thumbSrc(null, 640)).toBe("");
    expect(thumbSrc(undefined, 640)).toBe("");
  });
});
