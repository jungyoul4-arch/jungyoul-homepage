import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { heroSlides, heroSlideItems, articles } from "@/db/schema";
import { asc, desc } from "drizzle-orm";
import { resolveSlides } from "@/lib/mappers";
import { toArticle } from "@/lib/mappers";

export async function GET() {
  try {
    const db = await getDb();

    const [rawSlides, rawItems, rawArticles] = await Promise.all([
      db.select().from(heroSlides).orderBy(asc(heroSlides.sortOrder)),
      db.select().from(heroSlideItems).orderBy(asc(heroSlideItems.sortOrder)),
      db.select().from(articles).orderBy(desc(articles.date)),
    ]);

    const allArticles = rawArticles.map(toArticle);
    const slides = resolveSlides(rawSlides, rawItems, allArticles);

    return NextResponse.json(slides);
  } catch (e) {
    console.error("Slides fetch error:", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "슬라이드를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
