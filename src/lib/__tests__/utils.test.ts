import { describe, it, expect } from "vitest";
import { cn, generateSlug, placeholderGradient } from "../utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("ignores falsy values", () => {
    expect(cn("a", false && "b", undefined, null as unknown as string)).toBe("a");
  });

  it("resolves tailwind conflicts (last wins)", () => {
    expect(cn("px-4", "px-2")).toBe("px-2");
  });

  it("handles conditional classes", () => {
    const isActive = true;
    expect(cn("base", isActive && "active")).toBe("base active");
  });
});

describe("generateSlug", () => {
  it("returns a non-empty string", () => {
    const slug = generateSlug("Hello World");
    expect(slug).toBeTruthy();
  });

  it("lowercases and hyphenates English words", () => {
    const slug = generateSlug("Hello World");
    expect(slug).toMatch(/^hello-world-/);
  });

  it("strips special characters", () => {
    const slug = generateSlug("Hello! World?");
    expect(slug).not.toMatch(/[!?]/);
  });

  it("appends an 8-character suffix for uniqueness", () => {
    const slug = generateSlug("test");
    const parts = slug.split("-");
    const suffix = parts[parts.length - 1];
    expect(suffix).toHaveLength(8);
  });

  it("handles empty string gracefully by returning just the suffix", () => {
    const slug = generateSlug("   ");
    expect(slug).toHaveLength(8);
  });

  it("preserves Korean characters", () => {
    const slug = generateSlug("정율 교육");
    expect(slug).toMatch(/^정율-교육-/);
  });
});

describe("placeholderGradient", () => {
  it("returns a linear-gradient string", () => {
    const result = placeholderGradient("1");
    expect(result).toMatch(/^linear-gradient/);
  });

  it("is deterministic for the same id and preset", () => {
    expect(placeholderGradient("42", "article")).toBe(placeholderGradient("42", "article"));
  });

  it("produces different results for different ids", () => {
    expect(placeholderGradient("1", "article")).not.toBe(placeholderGradient("2", "article"));
  });

  it("produces different results for different presets", () => {
    expect(placeholderGradient("5", "article")).not.toBe(placeholderGradient("5", "teacher"));
  });

  it("defaults to article preset", () => {
    expect(placeholderGradient("10")).toBe(placeholderGradient("10", "article"));
  });

  it("handles non-numeric id gracefully (parses as 0)", () => {
    const result = placeholderGradient("not-a-number");
    expect(result).toMatch(/^linear-gradient/);
  });
});
