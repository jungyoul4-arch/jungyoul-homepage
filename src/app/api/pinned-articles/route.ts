import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { pinnedArticles } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const db = await getDb();
  const data = await db.select().from(pinnedArticles).orderBy(asc(pinnedArticles.slot));
  return NextResponse.json(data);
}
