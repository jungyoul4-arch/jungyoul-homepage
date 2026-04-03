import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { articles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = await getDb();
  const [article] = await db
    .select()
    .from(articles)
    .where(eq(articles.slug, slug))
    .limit(1);

  if (!article) {
    return NextResponse.json({ error: "기사를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(article);
}
