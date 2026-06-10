import { SignJWT, jwtVerify } from "jose";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const COOKIE_NAME = "admin_token";
const EXPIRY_DAYS = 7;

async function getSecret(): Promise<Uint8Array> {
  let secret: string | undefined;

  // Route Handler 등에서는 getCloudflareContext로 접근
  try {
    const { env } = await getCloudflareContext({ async: true });
    secret = env.JWT_SECRET;
  } catch {
    // Middleware(Edge runtime)에서는 process.env로 접근
    secret = process.env.JWT_SECRET;
  }

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return new TextEncoder().encode(secret);
}

export async function createToken(username: string): Promise<string> {
  const secret = await getSecret();
  return new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRY_DAYS}d`)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<{ username: string } | null> {
  try {
    const secret = await getSecret();
    const { payload } = await jwtVerify(token, secret);
    // 페이로드 형태 검증 — 같은 JWT_SECRET 으로 서명된 익명 세션 토큰({ sid })이
    // admin_token 자리에 들어와도 통과하지 않도록 username 필드를 명시 확인.
    if (typeof payload.username !== "string") return null;
    return { username: payload.username };
  } catch {
    return null;
  }
}

export function getTokenCookieHeader(token: string, isProduction = true): string {
  const secure = isProduction ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${EXPIRY_DAYS * 86400}${secure}`;
}

export function getLogoutCookieHeader(isProduction = true): string {
  const secure = isProduction ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function getTokenFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}
