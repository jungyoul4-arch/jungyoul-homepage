import { describe, it, expect } from "vitest";
import { encodeCursor, decodeCursor } from "../community-cursor";

describe("encodeCursor", () => {
  it("returns a non-empty base64 string", () => {
    const cursor = encodeCursor("2024-01-01T00:00:00.000Z", "abc-123");
    expect(cursor).toBeTruthy();
    expect(typeof cursor).toBe("string");
  });

  it("does not include trailing = padding", () => {
    const cursor = encodeCursor("2024-01-01T00:00:00.000Z", "uuid-xyz");
    expect(cursor).not.toMatch(/=+$/);
  });
});

describe("decodeCursor", () => {
  it("returns null for null input", () => {
    expect(decodeCursor(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(decodeCursor("")).toBeNull();
  });

  it("returns null for invalid base64", () => {
    expect(decodeCursor("!!!not-base64!!!")).toBeNull();
  });

  it("returns null when decoded string has no pipe separator", () => {
    const noPipe = btoa("nopipe");
    expect(decodeCursor(noPipe)).toBeNull();
  });

  it("roundtrips correctly with encodeCursor", () => {
    const createdAt = "2024-06-15T12:30:00.000Z";
    const id = "550e8400-e29b-41d4-a716-446655440000";
    const cursor = encodeCursor(createdAt, id);
    const decoded = decodeCursor(cursor);
    expect(decoded).toEqual({ createdAt, id });
  });

  it("handles UUID-style ids with multiple hyphens", () => {
    const createdAt = "2026-01-01T00:00:00.000Z";
    const id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const cursor = encodeCursor(createdAt, id);
    const decoded = decodeCursor(cursor);
    expect(decoded?.id).toBe(id);
    expect(decoded?.createdAt).toBe(createdAt);
  });
});
