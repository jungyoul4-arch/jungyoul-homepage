import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { communityTags } from "@/db/schema";

// GET: 공개 태그 목록. /api/exam-tag-options 와 동일 패턴.
export async function GET() {
  const db = await getDb();
  const data = await db.select().from(communityTags).orderBy(asc(communityTags.sortOrder));
  return NextResponse.json(data);
}
