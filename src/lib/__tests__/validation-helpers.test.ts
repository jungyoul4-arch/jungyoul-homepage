import { describe, it, expect, vi } from "vitest";

// Mock heavy Next.js / drizzle / DB imports so the module loads in plain Node
vi.mock("next/server", () => ({
  NextResponse: { json: vi.fn() },
}));
vi.mock("drizzle-zod", () => {
  const chain = () => ({ omit: vi.fn(() => ({})), pick: vi.fn(() => ({})) });
  return {
    createInsertSchema: vi.fn(chain),
    createUpdateSchema: vi.fn(chain),
  };
});
vi.mock("@/db/schema", () => ({
  articles: {},
  highlights: {},
  teachers: {},
  videos: {},
  trackingCodes: {},
  navMenus: {},
  headerLinks: {},
  examTagOptions: {},
  communityPosts: {},
  communityComments: {},
  communityTags: {},
}));

import { isUniqueConstraintError } from "../validation";

describe("isUniqueConstraintError", () => {
  it("returns true for Error with direct UNIQUE message", () => {
    const e = new Error("UNIQUE constraint failed: articles.slug");
    expect(isUniqueConstraintError(e)).toBe(true);
  });

  it("returns false for unrelated Error messages", () => {
    const e = new Error("some other database error");
    expect(isUniqueConstraintError(e)).toBe(false);
  });

  it("returns true when cause contains UNIQUE message", () => {
    const inner = new Error("UNIQUE constraint failed: community_posts.id");
    const outer = new Error("wrapped");
    outer.cause = inner;
    expect(isUniqueConstraintError(outer)).toBe(true);
  });

  it("returns true for non-Error objects that stringify to UNIQUE message", () => {
    const weirdObj = { toString: () => "Error: UNIQUE constraint failed: table.col" };
    expect(isUniqueConstraintError(weirdObj)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isUniqueConstraintError(null)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isUniqueConstraintError("")).toBe(false);
  });

  it("returns false for unrelated string", () => {
    expect(isUniqueConstraintError("random error text")).toBe(false);
  });
});
