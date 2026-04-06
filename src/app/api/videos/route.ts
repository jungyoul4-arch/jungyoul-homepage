import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { videos } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const db = await getDb();
  const data = await db.select().from(videos).orderBy(asc(videos.sortOrder));
  return NextResponse.json(data);
}
