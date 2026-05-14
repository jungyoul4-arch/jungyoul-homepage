import { SignJWT, jwtVerify } from "jose";
import { getJwtSecret } from "./jwt-secret";
import { buildCookieHeader, extractTokenFromCookies } from "./cookie-utils";

const COOKIE_NAME = "admin_token";
const EXPIRY_DAYS = 7;

export async function createToken(username: string): Promise<string> {
  const secret = await getJwtSecret();
  return new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRY_DAYS}d`)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<{ username: string } | null> {
  try {
    const secret = await getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload as { username: string };
  } catch {
    return null;
  }
}

export function getTokenCookieHeader(token: string, isProduction = true): string {
  return buildCookieHeader(COOKIE_NAME, token, EXPIRY_DAYS * 86400, isProduction);
}

export function getLogoutCookieHeader(isProduction = true): string {
  return buildCookieHeader(COOKIE_NAME, "", 0, isProduction);
}

export function getTokenFromCookies(cookieHeader: string | null): string | null {
  return extractTokenFromCookies(COOKIE_NAME, cookieHeader);
}
