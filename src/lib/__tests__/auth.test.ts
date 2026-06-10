import { describe, it, expect, vi } from "vitest";
import { SignJWT } from "jose";

// getCloudflareContext 가 던지면 getSecret() 은 process.env.JWT_SECRET 로 폴백한다.
// 테스트는 CF 컨텍스트가 없으므로 강제로 던지게 mock 한다.
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn(async () => {
    throw new Error("no CF context in test");
  }),
}));

const SECRET = "test-jwt-secret-please-ignore-0123456789";
process.env.JWT_SECRET = SECRET;

import { createToken, verifyToken } from "../auth";

async function mintRawToken(payload: Record<string, unknown>): Promise<string> {
  const secret = new TextEncoder().encode(SECRET);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

describe("verifyToken (admin)", () => {
  it("정상 어드민 토큰을 통과시키고 username 을 반환한다", async () => {
    const token = await createToken("admin");
    expect(await verifyToken(token)).toEqual({ username: "admin" });
  });

  it("익명 세션 토큰({ sid })을 거부한다 — 권한 상승 방지(SEC-1)", async () => {
    // 익명 커뮤니티 세션과 동일한 JWT_SECRET 으로 서명된 { sid } 토큰.
    const anon = await mintRawToken({ sid: "anon-session-id" });
    expect(await verifyToken(anon)).toBeNull();
  });

  it("username 이 문자열이 아닌 토큰을 거부한다", async () => {
    const weird = await mintRawToken({ username: 12345 });
    expect(await verifyToken(weird)).toBeNull();
  });

  it("서명이 변조된 토큰을 거부한다", async () => {
    const token = await createToken("admin");
    expect(await verifyToken(token + "tampered")).toBeNull();
  });

  it("다른 시크릿으로 서명된 토큰을 거부한다", async () => {
    const otherSecret = new TextEncoder().encode("a-totally-different-secret-value-9876");
    const foreign = await new SignJWT({ username: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(otherSecret);
    expect(await verifyToken(foreign)).toBeNull();
  });
});
