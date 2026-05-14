import { SignJWT, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { communitySessions } from "@/db/schema";
import { generateNickname } from "./community-nickname";
import { getJwtSecret } from "./jwt-secret";
import { buildCookieHeader, extractTokenFromCookies } from "./cookie-utils";

// 익명 커뮤니티 세션 — admin_token 과 별도 쿠키. 같은 JWT_SECRET 공유.
// 토큰 페이로드는 `{ sid }`(어드민은 `{ username }`) 로 구분.
const COOKIE_NAME = "anon_session";
const EXPIRY_DAYS = 365;

async function createAnonToken(sessionId: string): Promise<string> {
  const secret = await getJwtSecret();
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRY_DAYS}d`)
    .sign(secret);
}

async function verifyAnonToken(token: string): Promise<{ sid: string } | null> {
  try {
    const secret = await getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.sid !== "string") return null;
    return { sid: payload.sid };
  } catch {
    return null;
  }
}

export type AnonSession = {
  sessionId: string;
  nickname: string;
};

// 쿠키에서 익명 세션 조회. 없으면 null 반환 — 호출부는 401 또는 ensureAnonSession() 사용.
export async function getAnonSession(request: NextRequest): Promise<AnonSession | null> {
  const token = extractTokenFromCookies(COOKIE_NAME, request.headers.get("cookie"));
  if (!token) return null;
  const payload = await verifyAnonToken(token);
  if (!payload) return null;

  const db = await getDb();
  const rows = await db
    .select()
    .from(communitySessions)
    .where(eq(communitySessions.id, payload.sid))
    .limit(1);
  if (rows.length === 0) return null;
  return { sessionId: rows[0].id, nickname: rows[0].nickname };
}

// 작성/삭제/좋아요 등 mutate API 용 가드 — 세션 없으면 401 반환.
export async function requireAnonSession(
  request: NextRequest
): Promise<{ session: AnonSession; setCookie?: string } | NextResponse> {
  const existing = await getAnonSession(request);
  if (existing) return { session: existing };

  return NextResponse.json(
    { error: "익명 세션이 필요합니다. 페이지를 새로고침해주세요." },
    { status: 401 }
  );
}

// 쿠키가 없으면 발급. 페이지 첫 진입 시 호출(공개 GET /api/community/session).
export async function ensureAnonSession(
  request: NextRequest
): Promise<{ session: AnonSession; setCookie?: string }> {
  const existing = await getAnonSession(request);
  if (existing) return { session: existing };

  const db = await getDb();
  // 닉네임 충돌 대비 최대 3회 재시도. 컬럼 자체는 unique 가 아니지만 동일 닉네임 회피.
  let nickname = generateNickname();
  for (let i = 0; i < 3; i++) {
    const dup = await db
      .select({ id: communitySessions.id })
      .from(communitySessions)
      .where(eq(communitySessions.nickname, nickname))
      .limit(1);
    if (dup.length === 0) break;
    nickname = generateNickname();
  }

  const sessionId = crypto.randomUUID();
  await db.insert(communitySessions).values({ id: sessionId, nickname });
  const token = await createAnonToken(sessionId);
  const isProduction = process.env.NODE_ENV === "production";
  return {
    session: { sessionId, nickname },
    setCookie: buildCookieHeader(COOKIE_NAME, token, EXPIRY_DAYS * 86400, isProduction),
  };
}

// 응답 헬퍼 — setCookie 가 있으면 Set-Cookie 헤더 부착.
export function applySetCookie(response: NextResponse, setCookie?: string): NextResponse {
  if (setCookie) response.headers.append("Set-Cookie", setCookie);
  return response;
}
