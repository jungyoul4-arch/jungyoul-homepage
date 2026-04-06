import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/db";
import { admin } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createToken, getTokenCookieHeader } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext({ async: true });

    // Rate limiting (graceful fallback if binding unavailable)
    try {
      const ip = request.headers.get("cf-connecting-ip") || "unknown";
      const { success: withinLimit } = await env.LOGIN_RATE_LIMITER.limit({
        key: ip,
      });
      if (!withinLimit) {
        return NextResponse.json(
          { error: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요." },
          { status: 429 }
        );
      }
    } catch {
      // Rate limiter unavailable (local dev) — allow request
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "아이디와 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const [user] = await db
      .select()
      .from(admin)
      .where(eq(admin.username, username))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: "아이디 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "아이디 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    const token = await createToken(username);
    const isProduction = !!env.JWT_SECRET;

    const response = NextResponse.json({ success: true });
    response.headers.set(
      "Set-Cookie",
      getTokenCookieHeader(token, isProduction)
    );
    return response;
  } catch (e) {
    console.error("Login error:", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "로그인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
