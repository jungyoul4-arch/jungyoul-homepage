import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/db";
import { admin } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createToken, getTokenCookieHeader } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
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

    const response = NextResponse.json({ success: true });
    response.headers.set("Set-Cookie", getTokenCookieHeader(token));
    return response;
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    console.error("Login error:", message);
    return NextResponse.json(
      { error: `로그인 처리 중 오류가 발생했습니다: ${message}` },
      { status: 500 }
    );
  }
}
