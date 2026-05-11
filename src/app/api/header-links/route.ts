import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { headerLinks } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const db = await getDb();
  const data = await db.select().from(headerLinks).orderBy(asc(headerLinks.sortOrder));
  return NextResponse.json(data);
}
