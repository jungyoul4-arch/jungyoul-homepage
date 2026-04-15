import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { navMenus } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const db = await getDb();
  const data = await db.select().from(navMenus).orderBy(asc(navMenus.sortOrder));
  return NextResponse.json(data);
}
