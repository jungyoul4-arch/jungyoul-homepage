import { describe, it, expect } from "vitest";
import { generateNickname } from "../community-nickname";

describe("generateNickname", () => {
  it("returns a non-empty string", () => {
    expect(generateNickname()).toBeTruthy();
    expect(typeof generateNickname()).toBe("string");
  });

  it("ends with a zero-padded 3-digit number", () => {
    const nickname = generateNickname();
    expect(nickname).toMatch(/\d{3}$/);
  });

  it("produces different values across calls (randomness check)", () => {
    const results = new Set(Array.from({ length: 20 }, () => generateNickname()));
    expect(results.size).toBeGreaterThan(1);
  });

  it("zero-pads the number so it is always 3 digits", () => {
    for (let i = 0; i < 30; i++) {
      const nickname = generateNickname();
      const numPart = nickname.slice(-3);
      expect(numPart).toMatch(/^\d{3}$/);
    }
  });
});
