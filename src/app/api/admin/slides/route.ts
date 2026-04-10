import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { heroSlides, heroSlideItems, articles } from "@/db/schema";
import { asc, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { errorResponse } from "@/lib/validation";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const db = await getDb();

    const [slides, items, allArticles] = await Promise.all([
      db.select().from(heroSlides).orderBy(asc(heroSlides.sortOrder)),
      db.select().from(heroSlideItems).orderBy(asc(heroSlideItems.sortOrder)),
      db.select().from(articles).orderBy(desc(articles.date)),
    ]);

    return NextResponse.json({ slides, items, articles: allArticles });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { items } = body as {
      items: { articleId: string; role: string }[];
    };

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "최소 1개의 슬롯이 필요합니다." },
        { status: 400 },
      );
    }

    if (!items.some((i) => i.role === "main")) {
      return NextResponse.json(
        { error: "메인 슬롯이 필요합니다." },
        { status: 400 },
      );
    }

    const db = await getDb();
    const slideId = crypto.randomUUID();

    const [{ maxOrder }] = await db
      .select({
        maxOrder: sql<number>`COALESCE(MAX(${heroSlides.sortOrder}), -1)`,
      })
      .from(heroSlides);

    await db.insert(heroSlides).values({
      id: slideId,
      sortOrder: maxOrder + 1,
    });

    for (let i = 0; i < items.length; i++) {
      await db.insert(heroSlideItems).values({
        id: crypto.randomUUID(),
        slideId,
        articleId: items[i].articleId,
        role: items[i].role,
        sortOrder: i,
      });
    }

    return NextResponse.json({ id: slideId }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
