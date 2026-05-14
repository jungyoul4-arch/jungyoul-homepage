export function buildCookieHeader(
  name: string,
  token: string,
  maxAgeSeconds: number,
  isProduction = true,
): string {
  const secure = isProduction ? "; Secure" : "";
  return `${name}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

export function extractTokenFromCookies(
  name: string,
  cookieHeader: string | null,
): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}
