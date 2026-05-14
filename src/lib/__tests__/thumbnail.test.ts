import { describe, it, expect } from "vitest";
import { isValidThumbnail } from "../thumbnail";

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
