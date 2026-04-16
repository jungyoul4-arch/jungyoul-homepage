import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { pinnedArticles } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    const db = await getDb();
    const data = await db.select().from(pinnedArticles).orderBy(asc(pinnedArticles.slot));
    return NextResponse.json(data);
  } catch {
    // 테이블 미존재 등 DB 에러 시 빈 배열 반환
    return NextResponse.json([]);
  }
}
