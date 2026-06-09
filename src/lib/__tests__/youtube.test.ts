import { describe, it, expect } from "vitest";
import { parseYouTubeId, isYouTubeId } from "../youtube";

describe("parseYouTubeId", () => {
  it("extracts id from watch?v= URL", () => {
    expect(parseYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts id from watch URL with extra query params", () => {
    expect(parseYouTubeId("https://www.youtube.com/watch?list=PL123&v=dQw4w9WgXcQ&t=5s")).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("extracts id from youtu.be short URL", () => {
    expect(parseYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts id from embed URL", () => {
    expect(parseYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts id from shorts URL", () => {
    expect(parseYouTubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("accepts a bare 11-char id", () => {
    expect(parseYouTubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("returns null for non-youtube URL", () => {
    expect(parseYouTubeId("https://vimeo.com/123456")).toBeNull();
  });

  it("returns null for empty / garbage input", () => {
    expect(parseYouTubeId("")).toBeNull();
    expect(parseYouTubeId("   ")).toBeNull();
    expect(parseYouTubeId("not a url")).toBeNull();
  });
});

describe("isYouTubeId", () => {
  it("accepts valid 11-char id", () => {
    expect(isYouTubeId("dQw4w9WgXcQ")).toBe(true);
  });

  it("rejects wrong length or null", () => {
    expect(isYouTubeId("short")).toBe(false);
    expect(isYouTubeId("waytoolongidvalue")).toBe(false);
    expect(isYouTubeId(null)).toBe(false);
    expect(isYouTubeId(undefined)).toBe(false);
  });
});
