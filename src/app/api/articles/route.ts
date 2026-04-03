import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { articles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category");

  const db = await getDb();
  let query = db.select().from(articles).orderBy(desc(articles.date));

  if (category && category !== "all") {
    query = query.where(eq(articles.category, category)) as typeof query;
  }

  const data = await query;
  return NextResponse.json(data);
}
